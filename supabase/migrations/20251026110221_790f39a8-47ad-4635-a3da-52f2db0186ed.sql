-- 1. Aggiungi campo crediti a profiles
ALTER TABLE public.profiles 
ADD COLUMN credits INTEGER DEFAULT 10 NOT NULL;

-- Aggiorna utenti esistenti con 10 crediti iniziali
UPDATE public.profiles SET credits = 10 WHERE credits = 0;

-- 2. Crea tabella survey_templates
CREATE TABLE public.survey_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID REFERENCES public.surveys(id) ON DELETE CASCADE NOT NULL,
  creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Pricing
  is_free BOOLEAN DEFAULT true NOT NULL,
  credit_price INTEGER DEFAULT 0 NOT NULL CHECK (credit_price >= 0 AND credit_price <= 100),
  
  -- Stats
  times_cloned INTEGER DEFAULT 0 NOT NULL,
  total_credits_earned INTEGER DEFAULT 0 NOT NULL,
  
  -- Metadata ricerca
  keywords TEXT[] DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  UNIQUE(survey_id)
);

-- Indici per performance
CREATE INDEX idx_survey_templates_keywords ON public.survey_templates USING GIN(keywords);
CREATE INDEX idx_survey_templates_creator ON public.survey_templates(creator_id);
CREATE INDEX idx_survey_templates_price ON public.survey_templates(is_free, credit_price);

-- RLS Policies
ALTER TABLE public.survey_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active templates"
ON public.survey_templates FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.surveys s 
    WHERE s.id = survey_templates.survey_id 
    AND s.is_active = true 
    AND s.status = 'published'
  )
);

CREATE POLICY "Creators can insert own templates"
ON public.survey_templates FOR INSERT
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update own templates"
ON public.survey_templates FOR UPDATE
USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete own templates"
ON public.survey_templates FOR DELETE
USING (auth.uid() = creator_id);

-- 3. Crea tabella survey_clones (tracking)
CREATE TABLE public.survey_clones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.survey_templates(id) ON DELETE SET NULL,
  cloned_survey_id UUID REFERENCES public.surveys(id) ON DELETE CASCADE NOT NULL,
  cloner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  original_creator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
  
  credits_paid INTEGER DEFAULT 0 NOT NULL,
  cloned_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  UNIQUE(cloned_survey_id)
);

CREATE INDEX idx_survey_clones_cloner ON public.survey_clones(cloner_id);
CREATE INDEX idx_survey_clones_creator ON public.survey_clones(original_creator_id);

ALTER TABLE public.survey_clones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own clones"
ON public.survey_clones FOR SELECT
USING (auth.uid() = cloner_id);

CREATE POLICY "Users can insert own clones"
ON public.survey_clones FOR INSERT
WITH CHECK (auth.uid() = cloner_id);

-- 4. Crea tabella credit_transactions (audit)
CREATE TABLE public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  transaction_type TEXT NOT NULL,
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_credit_transactions_user_date ON public.credit_transactions(user_id, created_at DESC);
CREATE INDEX idx_credit_transactions_type ON public.credit_transactions(transaction_type);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
ON public.credit_transactions FOR SELECT
USING (auth.uid() = user_id);

-- 5. Crea tabella stripe_payments (infrastruttura futura)
CREATE TABLE public.stripe_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,
  amount_cents INTEGER NOT NULL,
  credits_purchased INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_stripe_payments_user ON public.stripe_payments(user_id);
CREATE INDEX idx_stripe_payments_status ON public.stripe_payments(status);

ALTER TABLE public.stripe_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments"
ON public.stripe_payments FOR SELECT
USING (auth.uid() = user_id);

-- 6. Function: Aggiorna crediti (ACID-safe)
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
BEGIN
  -- Aggiorna crediti (ATOMIC)
  UPDATE public.profiles
  SET credits = GREATEST(0, credits + _amount)
  WHERE id = _user_id
  RETURNING credits INTO new_balance;
  
  -- Registra transazione
  INSERT INTO public.credit_transactions (user_id, amount, balance_after, transaction_type, reference_id, description)
  VALUES (_user_id, _amount, new_balance, _transaction_type, _reference_id, _description);
  
  RETURN new_balance;
END;
$$;

-- 7. Function: Estrai keywords per ricerca
CREATE OR REPLACE FUNCTION public.extract_survey_keywords(
  survey_data JSONB, 
  title TEXT, 
  description TEXT
)
RETURNS TEXT[]
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  keywords TEXT[] := '{}';
  section JSONB;
  question JSONB;
  word TEXT;
BEGIN
  -- Aggiungi parole da titolo (minimo 3 caratteri)
  FOR word IN SELECT unnest(string_to_array(lower(title), ' '))
  LOOP
    IF length(word) >= 3 THEN
      keywords := array_append(keywords, word);
    END IF;
  END LOOP;
  
  -- Aggiungi parole da descrizione
  IF description IS NOT NULL THEN
    FOR word IN SELECT unnest(string_to_array(lower(description), ' '))
    LOOP
      IF length(word) >= 3 THEN
        keywords := array_append(keywords, word);
      END IF;
    END LOOP;
  END IF;
  
  -- Aggiungi parole dalle sezioni
  FOR section IN SELECT * FROM jsonb_array_elements(survey_data)
  LOOP
    IF section ? 'name' THEN
      FOR word IN SELECT unnest(string_to_array(lower(section->>'name'), ' '))
      LOOP
        IF length(word) >= 3 THEN
          keywords := array_append(keywords, word);
        END IF;
      END LOOP;
    END IF;
    
    -- Aggiungi parole dalle domande
    IF section ? 'questions' THEN
      FOR question IN SELECT * FROM jsonb_array_elements(section->'questions')
      LOOP
        IF question ? 'text' THEN
          FOR word IN SELECT unnest(string_to_array(lower(question->>'text'), ' '))
          LOOP
            IF length(word) >= 3 THEN
              keywords := array_append(keywords, word);
            END IF;
          END LOOP;
        END IF;
      END LOOP;
    END IF;
  END LOOP;
  
  -- Rimuovi duplicati
  RETURN ARRAY(SELECT DISTINCT unnest(keywords));
END;
$$;

-- 8. Trigger: Auto-pubblica template FREE
CREATE OR REPLACE FUNCTION public.auto_publish_free_tier_template()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_tier TEXT;
BEGIN
  -- Solo per nuovi survey o cambio a published
  IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != 'published')) AND 
     NEW.status = 'published' AND NEW.is_active = true THEN
    
    SELECT subscription_tier INTO user_tier
    FROM public.profiles
    WHERE id = NEW.user_id;
    
    -- Auto-pubblica per FREE tier
    IF user_tier = 'free' THEN
      INSERT INTO public.survey_templates (survey_id, creator_id, is_free, credit_price, keywords)
      VALUES (
        NEW.id, 
        NEW.user_id, 
        true, 
        0,
        public.extract_survey_keywords(NEW.sections, NEW.title, NEW.description)
      )
      ON CONFLICT (survey_id) DO UPDATE SET
        keywords = public.extract_survey_keywords(NEW.sections, NEW.title, NEW.description),
        updated_at = now();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_publish_free_template
AFTER INSERT OR UPDATE ON public.surveys
FOR EACH ROW
EXECUTE FUNCTION public.auto_publish_free_tier_template();

-- 9. Trigger: Aggiorna keywords su update
CREATE OR REPLACE FUNCTION public.update_template_keywords()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  survey_data RECORD;
BEGIN
  SELECT title, description, sections INTO survey_data
  FROM public.surveys
  WHERE id = NEW.survey_id;
  
  NEW.keywords := public.extract_survey_keywords(
    survey_data.sections,
    survey_data.title,
    survey_data.description
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_keywords
BEFORE INSERT OR UPDATE ON public.survey_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_template_keywords();

-- 10. Trigger: Premi crediti per compilazione profilo
CREATE OR REPLACE FUNCTION public.reward_profile_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ricompensa per ogni campo compilato (solo su cambio da NULL)
  IF TG_OP = 'UPDATE' THEN
    -- Full name
    IF OLD.full_name IS NULL AND NEW.full_name IS NOT NULL THEN
      PERFORM public.update_user_credits(NEW.id, 10, 'profile_completion', NEW.id, 'Nome completo aggiunto');
    END IF;
    
    -- Country
    IF OLD.country IS NULL AND NEW.country IS NOT NULL THEN
      PERFORM public.update_user_credits(NEW.id, 10, 'profile_completion', NEW.id, 'Paese aggiunto');
    END IF;
    
    -- Age range
    IF OLD.age_range IS NULL AND NEW.age_range IS NOT NULL THEN
      PERFORM public.update_user_credits(NEW.id, 10, 'profile_completion', NEW.id, 'Fascia età aggiunta');
    END IF;
    
    -- Interests
    IF (OLD.interests IS NULL OR array_length(OLD.interests, 1) IS NULL) AND 
       array_length(NEW.interests, 1) > 0 THEN
      PERFORM public.update_user_credits(NEW.id, 10, 'profile_completion', NEW.id, 'Interessi aggiunti');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_reward_profile_completion
AFTER UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.reward_profile_completion();