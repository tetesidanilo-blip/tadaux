-- Optimize clone_template_atomic to batch credit operations
CREATE OR REPLACE FUNCTION public.clone_template_atomic(
  _template_id UUID,
  _cloner_id UUID,
  _custom_title TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _template RECORD;
  _survey RECORD;
  _new_survey_id UUID;
  _new_balance INTEGER;
  _required_credits INTEGER;
  _available_credits INTEGER;
  _cloner_new_balance INTEGER;
  _creator_new_balance INTEGER;
BEGIN
  -- Lock del template per prevenire race conditions
  SELECT st.*, s.title, s.description, s.sections, s.language
  INTO _template
  FROM survey_templates st
  JOIN surveys s ON s.id = st.survey_id
  WHERE st.id = _template_id
  AND s.is_active = true
  AND s.status = 'published'
  FOR UPDATE OF st;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Template not found or not available'
    );
  END IF;
  
  -- Verifica che non sia il proprio template
  IF _template.creator_id = _cloner_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot clone your own template'
    );
  END IF;
  
  -- Verifica crediti (con lock)
  SELECT credits INTO _available_credits
  FROM profiles
  WHERE id = _cloner_id
  FOR UPDATE;
  
  _required_credits := CASE WHEN _template.is_free THEN 0 ELSE _template.credit_price END;
  
  IF _available_credits < _required_credits THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient credits',
      'required', _required_credits,
      'available', _available_credits
    );
  END IF;
  
  -- 1. Clona il survey
  INSERT INTO surveys (
    user_id,
    title,
    description,
    sections,
    language,
    status,
    is_active,
    visible_in_community,
    responses_public
  )
  VALUES (
    _cloner_id,
    COALESCE(_custom_title, _template.title || ' (Copia)'),
    _template.description,
    _template.sections,
    _template.language,
    'draft',
    true,
    false,
    false
  )
  RETURNING id INTO _new_survey_id;
  
  -- 2. OPTIMIZED: Aggiorna crediti in batch se necessario
  IF _required_credits > 0 THEN
    -- Batch update dei crediti per entrambi gli utenti con una CTE
    WITH updated_profiles AS (
      UPDATE public.profiles
      SET 
        credits = CASE 
          WHEN id = _cloner_id THEN credits - _required_credits
          WHEN id = _template.creator_id THEN credits + _required_credits
          ELSE credits
        END,
        updated_at = now()
      WHERE id IN (_cloner_id, _template.creator_id)
      RETURNING id, credits
    )
    SELECT credits INTO _cloner_new_balance
    FROM updated_profiles
    WHERE id = _cloner_id;
    
    -- 3. OPTIMIZED: Batch insert delle transazioni di credito
    INSERT INTO public.credit_transactions (
      user_id, 
      amount, 
      balance_after, 
      transaction_type, 
      reference_id, 
      description
    )
    SELECT * FROM (
      VALUES 
        (
          _cloner_id, 
          -_required_credits, 
          _cloner_new_balance, 
          'template_clone', 
          _new_survey_id, 
          'Clonato template: ' || _template.title
        ),
        (
          _template.creator_id, 
          _required_credits, 
          (SELECT credits FROM profiles WHERE id = _template.creator_id), 
          'template_clone_earned', 
          _new_survey_id, 
          'Template clonato da altro utente'
        )
    ) AS t(user_id, amount, balance_after, transaction_type, reference_id, description);
  END IF;
  
  -- 4. Aggiorna statistiche template
  UPDATE survey_templates
  SET 
    times_cloned = times_cloned + 1,
    total_credits_earned = total_credits_earned + _required_credits,
    updated_at = now()
  WHERE id = _template_id;
  
  -- 5. Registra la clonazione
  INSERT INTO survey_clones (
    template_id,
    cloned_survey_id,
    cloner_id,
    original_creator_id,
    credits_paid
  )
  VALUES (
    _template_id,
    _new_survey_id,
    _cloner_id,
    _template.creator_id,
    _required_credits
  );
  
  -- Ritorna successo con dati
  RETURN jsonb_build_object(
    'success', true,
    'survey_id', _new_survey_id,
    'credits_spent', _required_credits
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Rollback automatico, ritorna errore
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;