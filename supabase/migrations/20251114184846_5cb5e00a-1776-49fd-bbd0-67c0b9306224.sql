-- ================================================
-- FUNZIONE: deduct_credits_for_clone
-- Gestisce la deduzione atomica dei crediti per la clonazione di template
-- con protezione contro race conditions tramite row-level locking
-- ================================================

CREATE OR REPLACE FUNCTION public.deduct_credits_for_clone(
  user_id_input UUID,
  template_id_input UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _template RECORD;
  _profile RECORD;
  _required_credits INTEGER;
  _new_balance INTEGER;
BEGIN
  -- 1. Lock e recupera dati del template
  SELECT credit_price, is_free, creator_id
  INTO _template
  FROM survey_templates
  WHERE id = template_id_input
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found: %', template_id_input;
  END IF;
  
  -- 2. Lock e recupera dati del profilo utente (CRITICAL: previene race conditions)
  SELECT credits, subscription_tier
  INTO _profile
  FROM profiles
  WHERE id = user_id_input
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found: %', user_id_input;
  END IF;
  
  -- 3. Calcola crediti richiesti
  _required_credits := CASE WHEN _template.is_free THEN 0 ELSE _template.credit_price END;
  
  -- 4. Logica di autorizzazione
  -- Template gratuito → sempre permesso
  IF _template.is_free THEN
    RAISE NOTICE '[DeductCredits] Template % is free, no deduction needed', template_id_input;
    RETURN TRUE;
  END IF;
  
  -- Utenti PRO/Business → sempre permesso senza costi
  IF _profile.subscription_tier IN ('pro', 'business') THEN
    RAISE NOTICE '[DeductCredits] User % has % tier, no deduction needed', user_id_input, _profile.subscription_tier;
    RETURN TRUE;
  END IF;
  
  -- Utenti FREE → verifica crediti e deduce
  IF _profile.credits < _required_credits THEN
    RAISE NOTICE '[DeductCredits] Insufficient credits: required=%, available=%', _required_credits, _profile.credits;
    RETURN FALSE;
  END IF;
  
  -- 5. Deduzione atomica dei crediti (protezione contro race conditions garantita da FOR UPDATE)
  UPDATE profiles
  SET 
    credits = credits - _required_credits,
    updated_at = now()
  WHERE id = user_id_input
  RETURNING credits INTO _new_balance;
  
  -- 6. Registra la transazione di crediti
  INSERT INTO credit_transactions (
    user_id,
    amount,
    balance_after,
    transaction_type,
    reference_id,
    description
  )
  VALUES (
    user_id_input,
    -_required_credits,
    _new_balance,
    'template_clone_deduction',
    template_id_input,
    format('Deduzione crediti per clonazione template (pre-clone check)')
  );
  
  RAISE NOTICE '[DeductCredits] Successfully deducted % credits from user %, new balance: %', 
    _required_credits, user_id_input, _new_balance;
  
  RETURN TRUE;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '[DeductCredits] Error: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Commento documentazione
COMMENT ON FUNCTION public.deduct_credits_for_clone IS 
'Deduce atomicamente i crediti per la clonazione di un template. 
Usa FOR UPDATE per prevenire race conditions.
Ritorna TRUE se l''operazione ha successo o non è necessaria (template free/utente pro).
Ritorna FALSE se i crediti sono insufficienti.';