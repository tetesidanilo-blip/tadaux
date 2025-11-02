-- ============================================
-- WEEK 1 DAY 1-2: CRITICAL BLOCKERS FIX
-- ============================================

-- 1. FIX RACE CONDITION: Update credits function with row-level locking
CREATE OR REPLACE FUNCTION public.update_user_credits(
  _user_id UUID,
  _amount INTEGER,
  _transaction_type TEXT,
  _reference_id UUID DEFAULT NULL,
  _description TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_balance INTEGER;
  current_balance INTEGER;
BEGIN
  -- CRITICAL: Row-level lock per prevenire race conditions
  SELECT credits INTO current_balance
  FROM public.profiles
  WHERE id = _user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found: %', _user_id;
  END IF;
  
  -- Verifica che l'operazione non porti a crediti negativi
  IF current_balance + _amount < 0 THEN
    RAISE EXCEPTION 'Insufficient credits: current=%, requested=%, result=%',
      current_balance, _amount, current_balance + _amount;
  END IF;
  
  -- Aggiorna crediti (ATOMIC dentro transazione)
  UPDATE public.profiles
  SET credits = credits + _amount,
      updated_at = now()
  WHERE id = _user_id
  RETURNING credits INTO new_balance;
  
  -- Registra transazione
  INSERT INTO public.credit_transactions (
    user_id, 
    amount, 
    balance_after, 
    transaction_type, 
    reference_id, 
    description
  )
  VALUES (
    _user_id, 
    _amount, 
    new_balance, 
    _transaction_type, 
    _reference_id, 
    _description
  );
  
  RETURN new_balance;
END;
$$;

-- 2. PREVENT FREE TIER BYPASS: Add constraint to survey_templates
ALTER TABLE public.survey_templates
ADD CONSTRAINT check_free_tier_pricing 
CHECK (
  (is_free = true AND credit_price = 0) OR 
  (is_free = false AND credit_price > 0)
);

-- 3. PREVENT FREE TIER BYPASS: Trigger to validate pricing based on user tier
CREATE OR REPLACE FUNCTION public.validate_template_pricing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_tier TEXT;
BEGIN
  -- Ottieni tier dell'utente
  SELECT subscription_tier INTO user_tier
  FROM public.profiles
  WHERE id = NEW.creator_id;
  
  -- FREE tier può creare solo template gratuiti
  IF user_tier = 'free' AND (NEW.is_free = false OR NEW.credit_price > 0) THEN
    RAISE EXCEPTION 'Free tier users can only create free templates (0 credits)';
  END IF;
  
  -- PRO tier può creare template a pagamento
  IF user_tier = 'pro' AND NEW.is_free = true THEN
    NEW.credit_price := 0;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_template_pricing_trigger
BEFORE INSERT OR UPDATE ON public.survey_templates
FOR EACH ROW
EXECUTE FUNCTION public.validate_template_pricing();

-- 4. PREVENT DUPLICATE TEMPLATES: Unique index per survey_id e creator_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_template_per_user_survey
ON public.survey_templates(creator_id, survey_id);

-- 5. PREVENT DUPLICATE TEMPLATES: Trigger function
CREATE OR REPLACE FUNCTION public.prevent_duplicate_template()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.survey_templates 
    WHERE survey_id = NEW.survey_id 
    AND creator_id = NEW.creator_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'Template already exists for this survey';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_duplicate_template_trigger
BEFORE INSERT OR UPDATE ON public.survey_templates
FOR EACH ROW
EXECUTE FUNCTION public.prevent_duplicate_template();