-- ============================================================================
-- SCRIPT DI SINCRONIZZAZIONE SCHEMA DATABASE ESTERNO
-- ============================================================================
-- Questo script deve essere eseguito nel SQL Editor del database esterno
-- Supabase (wnehlqsibqgzydkteptf.supabase.co)
-- 
-- ISTRUZIONI:
-- 1. Accedi al dashboard Supabase del database esterno
-- 2. Vai su SQL Editor
-- 3. Copia e incolla TUTTO questo script
-- 4. Esegui lo script
-- ============================================================================

-- ============================================================================
-- STEP 1: ENUM TYPES
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- STEP 2: CREATE TABLES
-- ============================================================================

-- Table: profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  subscription_tier text DEFAULT 'free',
  subscription_expires_at timestamp with time zone,
  available_for_research boolean DEFAULT false,
  profile_completed boolean DEFAULT false,
  surveys_created_count integer DEFAULT 0,
  total_responses_collected integer DEFAULT 0,
  credits integer NOT NULL DEFAULT 10,
  profile_fields_rewarded jsonb DEFAULT '{}'::jsonb,
  full_name text,
  interests text[] DEFAULT '{}',
  age_range text,
  country text,
  PRIMARY KEY (id)
);

-- Table: surveys
CREATE TABLE IF NOT EXISTS public.surveys (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  sections jsonb NOT NULL,
  language text NOT NULL DEFAULT 'en',
  status text NOT NULL DEFAULT 'draft',
  is_active boolean NOT NULL DEFAULT true,
  visible_in_community boolean DEFAULT false,
  responses_public boolean DEFAULT false,
  share_token text NOT NULL,
  expires_at timestamp with time zone,
  expired_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: survey_responses
CREATE TABLE IF NOT EXISTS public.survey_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL,
  responses jsonb NOT NULL,
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: credit_transactions
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  balance_after integer NOT NULL,
  transaction_type text NOT NULL,
  reference_id uuid,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: survey_templates
CREATE TABLE IF NOT EXISTS public.survey_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL,
  creator_id uuid NOT NULL,
  is_free boolean NOT NULL DEFAULT true,
  credit_price integer NOT NULL DEFAULT 0,
  times_cloned integer NOT NULL DEFAULT 0,
  total_credits_earned integer NOT NULL DEFAULT 0,
  keywords text[] DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (survey_id, creator_id)
);

-- Table: survey_clones
CREATE TABLE IF NOT EXISTS public.survey_clones (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  template_id uuid,
  cloned_survey_id uuid NOT NULL,
  cloner_id uuid NOT NULL,
  original_creator_id uuid NOT NULL,
  credits_paid integer NOT NULL DEFAULT 0,
  cloned_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: research_requests
CREATE TABLE IF NOT EXISTS public.research_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  survey_id uuid,
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  topics text[] DEFAULT '{}',
  target_participants integer NOT NULL DEFAULT 10,
  current_participants integer NOT NULL DEFAULT 0,
  deadline timestamp with time zone,
  matching_enabled boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  target_age_ranges text[] DEFAULT '{}',
  target_countries text[] DEFAULT '{}',
  target_interests text[] DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: participant_applications
CREATE TABLE IF NOT EXISTS public.participant_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  research_request_id uuid NOT NULL,
  participant_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: community_groups
CREATE TABLE IF NOT EXISTS public.community_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  platform text NOT NULL,
  invite_link text NOT NULL,
  topics text[] DEFAULT '{}',
  member_count integer DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  PRIMARY KEY (id),
  UNIQUE (user_id, role)
);

-- Table: stripe_payments
CREATE TABLE IF NOT EXISTS public.stripe_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  stripe_payment_intent_id text NOT NULL,
  amount_cents integer NOT NULL,
  credits_purchased integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  metadata jsonb,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- ============================================================================
-- STEP 3: CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_surveys_user_id ON public.surveys(user_id);
CREATE INDEX IF NOT EXISTS idx_surveys_share_token ON public.surveys(share_token);
CREATE INDEX IF NOT EXISTS idx_surveys_status ON public.surveys(status);
CREATE INDEX IF NOT EXISTS idx_survey_responses_survey_id ON public.survey_responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_survey_templates_creator_id ON public.survey_templates(creator_id);
CREATE INDEX IF NOT EXISTS idx_survey_templates_survey_id ON public.survey_templates(survey_id);
CREATE INDEX IF NOT EXISTS idx_research_requests_user_id ON public.research_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_participant_applications_research_request_id ON public.participant_applications(research_request_id);
CREATE INDEX IF NOT EXISTS idx_participant_applications_participant_id ON public.participant_applications(participant_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- ============================================================================
-- STEP 4: ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_clones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participant_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_payments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 5: DATABASE FUNCTIONS
-- ============================================================================

-- Function: has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function: update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Function: handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

-- Function: extract_survey_keywords
CREATE OR REPLACE FUNCTION public.extract_survey_keywords(survey_data jsonb, title text, description text)
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  keywords TEXT[] := '{}';
  section JSONB;
  question JSONB;
  word TEXT;
BEGIN
  FOR word IN SELECT unnest(string_to_array(lower(title), ' '))
  LOOP
    IF length(word) >= 3 THEN
      keywords := array_append(keywords, word);
    END IF;
  END LOOP;
  
  IF description IS NOT NULL THEN
    FOR word IN SELECT unnest(string_to_array(lower(description), ' '))
    LOOP
      IF length(word) >= 3 THEN
        keywords := array_append(keywords, word);
      END IF;
    END LOOP;
  END IF;
  
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
  
  RETURN ARRAY(SELECT DISTINCT unnest(keywords));
END;
$$;

-- Function: extract_survey_keywords_v2
CREATE OR REPLACE FUNCTION public.extract_survey_keywords_v2(survey_data jsonb, title text, description text)
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  stopwords TEXT[] := ARRAY['il', 'la', 'di', 'da', 'con', 'per', 'su', 'tra', 'fra', 'che', 'come', 'una', 'uno', 'dei', 'del', 'alla', 'nel', 'nella'];
BEGIN
  RETURN ARRAY(
    SELECT DISTINCT lower(word)
    FROM (
      SELECT unnest(string_to_array(lower(title), ' ')) AS word
      UNION
      SELECT unnest(string_to_array(lower(COALESCE(description, '')), ' ')) AS word
      UNION
      SELECT unnest(string_to_array(lower(section->>'name'), ' ')) AS word
      FROM jsonb_array_elements(survey_data) AS section
      WHERE section ? 'name'
      UNION
      SELECT unnest(string_to_array(lower(question->>'text'), ' ')) AS word
      FROM jsonb_array_elements(survey_data) AS section,
           jsonb_array_elements(section->'questions') AS question
      WHERE section ? 'questions' AND question ? 'text'
    ) AS all_words
    WHERE length(word) >= 3
      AND word NOT IN (SELECT unnest(stopwords))
    ORDER BY word
  );
END;
$$;

-- Function: update_user_credits
CREATE OR REPLACE FUNCTION public.update_user_credits(
  _user_id uuid, 
  _amount integer, 
  _transaction_type text, 
  _reference_id uuid DEFAULT NULL, 
  _description text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_balance INTEGER;
  current_balance INTEGER;
BEGIN
  SELECT credits INTO current_balance
  FROM public.profiles
  WHERE id = _user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found: %', _user_id;
  END IF;
  
  IF current_balance + _amount < 0 THEN
    RAISE EXCEPTION 'Insufficient credits: current=%, requested=%, result=%',
      current_balance, _amount, current_balance + _amount;
  END IF;
  
  UPDATE public.profiles
  SET credits = credits + _amount,
      updated_at = now()
  WHERE id = _user_id
  RETURNING credits INTO new_balance;
  
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

-- Function: get_public_survey_by_token
CREATE OR REPLACE FUNCTION public.get_public_survey_by_token(_share_token text)
RETURNS TABLE(
  id uuid, 
  title text, 
  description text, 
  sections jsonb, 
  language text, 
  expires_at timestamp with time zone, 
  expired_message text, 
  share_token text, 
  status text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    s.id,
    s.title,
    s.description,
    s.sections,
    s.language,
    s.expires_at,
    s.expired_message,
    s.share_token,
    s.status
  FROM public.surveys s
  WHERE s.share_token = _share_token
    AND s.is_active = true
    AND s.status = 'published'
    AND (s.expires_at IS NULL OR s.expires_at > now())
  LIMIT 1;
$$;

-- Function: is_survey_publicly_accessible
CREATE OR REPLACE FUNCTION public.is_survey_publicly_accessible(_survey_id uuid, _share_token text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.surveys
    WHERE id = _survey_id
      AND share_token = _share_token
      AND is_active = true
      AND status = 'published'
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

-- Function: clone_template_atomic
CREATE OR REPLACE FUNCTION public.clone_template_atomic(
  _template_id uuid, 
  _cloner_id uuid, 
  _custom_title text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _template RECORD;
  _new_survey_id UUID;
  _required_credits INTEGER;
  _available_credits INTEGER;
  _cloner_new_balance INTEGER;
BEGIN
  SELECT st.*, s.title, s.description, s.sections, s.language
  INTO _template
  FROM survey_templates st
  JOIN surveys s ON s.id = st.survey_id
  WHERE st.id = _template_id
  AND s.is_active = true
  AND s.status = 'published'
  FOR UPDATE OF st;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Template not found or not available');
  END IF;
  
  IF _template.creator_id = _cloner_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot clone your own template');
  END IF;
  
  SELECT credits INTO _available_credits
  FROM profiles WHERE id = _cloner_id FOR UPDATE;
  
  _required_credits := CASE WHEN _template.is_free THEN 0 ELSE _template.credit_price END;
  
  IF _available_credits < _required_credits THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient credits',
      'required', _required_credits,
      'available', _available_credits
    );
  END IF;
  
  INSERT INTO surveys (
    user_id, title, description, sections, language,
    status, is_active, visible_in_community, responses_public
  )
  VALUES (
    _cloner_id,
    COALESCE(_custom_title, _template.title || ' (Copia)'),
    _template.description, _template.sections, _template.language,
    'draft', true, false, false
  )
  RETURNING id INTO _new_survey_id;
  
  IF _required_credits > 0 THEN
    WITH updated_profiles AS (
      UPDATE public.profiles
      SET credits = CASE 
          WHEN id = _cloner_id THEN credits - _required_credits
          WHEN id = _template.creator_id THEN credits + _required_credits
          ELSE credits
        END,
        updated_at = now()
      WHERE id IN (_cloner_id, _template.creator_id)
      RETURNING id, credits
    )
    SELECT credits INTO _cloner_new_balance
    FROM updated_profiles WHERE id = _cloner_id;
    
    INSERT INTO public.credit_transactions (
      user_id, amount, balance_after, transaction_type, reference_id, description
    )
    SELECT * FROM (
      VALUES 
        (_cloner_id, -_required_credits, _cloner_new_balance, 'template_clone', _new_survey_id, 'Clonato template: ' || _template.title),
        (_template.creator_id, _required_credits, (SELECT credits FROM profiles WHERE id = _template.creator_id), 'template_clone_earned', _new_survey_id, 'Template clonato da altro utente')
    ) AS t(user_id, amount, balance_after, transaction_type, reference_id, description);
  END IF;
  
  UPDATE survey_templates
  SET times_cloned = times_cloned + 1,
      total_credits_earned = total_credits_earned + _required_credits,
      updated_at = now()
  WHERE id = _template_id;
  
  INSERT INTO survey_clones (template_id, cloned_survey_id, cloner_id, original_creator_id, credits_paid)
  VALUES (_template_id, _new_survey_id, _cloner_id, _template.creator_id, _required_credits);
  
  RETURN jsonb_build_object('success', true, 'survey_id', _new_survey_id, 'credits_spent', _required_credits);
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================================
-- STEP 6: RLS POLICIES
-- ============================================================================

-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Authenticated users can view research-available profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view research-available profiles" ON public.profiles
  FOR SELECT USING ((available_for_research = true) OR (auth.uid() = id));

-- Surveys policies
DROP POLICY IF EXISTS "Users can view own surveys" ON public.surveys;
CREATE POLICY "Users can view own surveys" ON public.surveys
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own surveys" ON public.surveys;
CREATE POLICY "Users can insert own surveys" ON public.surveys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own surveys" ON public.surveys;
CREATE POLICY "Users can update own surveys" ON public.surveys
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own surveys" ON public.surveys;
CREATE POLICY "Users can delete own surveys" ON public.surveys
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can view community surveys" ON public.surveys;
CREATE POLICY "Authenticated users can view community surveys" ON public.surveys
  FOR SELECT USING ((visible_in_community = true) AND (status = 'published') AND (is_active = true));

-- Survey responses policies
DROP POLICY IF EXISTS "Anyone can insert responses for active surveys" ON public.survey_responses;
CREATE POLICY "Anyone can insert responses for active surveys" ON public.survey_responses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM surveys
      WHERE surveys.id = survey_responses.survey_id
        AND surveys.is_active = true
        AND (surveys.expires_at IS NULL OR surveys.expires_at > now())
    )
  );

DROP POLICY IF EXISTS "Survey owners can view responses" ON public.survey_responses;
CREATE POLICY "Survey owners can view responses" ON public.survey_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM surveys
      WHERE surveys.id = survey_responses.survey_id
        AND surveys.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Anyone can view public survey responses" ON public.survey_responses;
CREATE POLICY "Anyone can view public survey responses" ON public.survey_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM surveys
      WHERE surveys.id = survey_responses.survey_id
        AND surveys.responses_public = true
        AND surveys.is_active = true
    )
  );

-- Credit transactions policies
DROP POLICY IF EXISTS "Users can view own transactions" ON public.credit_transactions;
CREATE POLICY "Users can view own transactions" ON public.credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Survey templates policies
DROP POLICY IF EXISTS "Creators can view own templates" ON public.survey_templates;
CREATE POLICY "Creators can view own templates" ON public.survey_templates
  FOR SELECT USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Public can view published templates" ON public.survey_templates;
CREATE POLICY "Public can view published templates" ON public.survey_templates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM surveys s
      WHERE s.id = survey_templates.survey_id
        AND s.is_active = true
        AND s.status = 'published'
    )
  );

DROP POLICY IF EXISTS "Creators can insert own templates" ON public.survey_templates;
CREATE POLICY "Creators can insert own templates" ON public.survey_templates
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can update own templates" ON public.survey_templates;
CREATE POLICY "Creators can update own templates" ON public.survey_templates
  FOR UPDATE USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can delete own templates" ON public.survey_templates;
CREATE POLICY "Creators can delete own templates" ON public.survey_templates
  FOR DELETE USING (auth.uid() = creator_id);

-- Survey clones policies
DROP POLICY IF EXISTS "Users can view own clones" ON public.survey_clones;
CREATE POLICY "Users can view own clones" ON public.survey_clones
  FOR SELECT USING (auth.uid() = cloner_id);

DROP POLICY IF EXISTS "Users can insert own clones" ON public.survey_clones;
CREATE POLICY "Users can insert own clones" ON public.survey_clones
  FOR INSERT WITH CHECK (auth.uid() = cloner_id);

-- User roles policies
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Community groups policies
DROP POLICY IF EXISTS "Anyone can view active community groups" ON public.community_groups;
CREATE POLICY "Anyone can view active community groups" ON public.community_groups
  FOR SELECT USING (is_active = true);

-- Research requests policies
DROP POLICY IF EXISTS "Users can view own research requests" ON public.research_requests;
CREATE POLICY "Users can view own research requests" ON public.research_requests
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can view active research requests" ON public.research_requests;
CREATE POLICY "Authenticated users can view active research requests" ON public.research_requests
  FOR SELECT USING ((status = 'active') OR (user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own research requests" ON public.research_requests;
CREATE POLICY "Users can insert own research requests" ON public.research_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own research requests" ON public.research_requests;
CREATE POLICY "Users can update own research requests" ON public.research_requests
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own research requests" ON public.research_requests;
CREATE POLICY "Users can delete own research requests" ON public.research_requests
  FOR DELETE USING (auth.uid() = user_id);

-- Participant applications policies
DROP POLICY IF EXISTS "Participants can view own applications" ON public.participant_applications;
CREATE POLICY "Participants can view own applications" ON public.participant_applications
  FOR SELECT USING (auth.uid() = participant_id);

DROP POLICY IF EXISTS "Research owners can view applications to their requests" ON public.participant_applications;
CREATE POLICY "Research owners can view applications to their requests" ON public.participant_applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM research_requests
      WHERE research_requests.id = participant_applications.research_request_id
        AND research_requests.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Participants can insert own applications" ON public.participant_applications;
CREATE POLICY "Participants can insert own applications" ON public.participant_applications
  FOR INSERT WITH CHECK (auth.uid() = participant_id);

DROP POLICY IF EXISTS "Research owners can update applications to their requests" ON public.participant_applications;
CREATE POLICY "Research owners can update applications to their requests" ON public.participant_applications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM research_requests
      WHERE research_requests.id = participant_applications.research_request_id
        AND research_requests.user_id = auth.uid()
    )
  );

-- Stripe payments policies
DROP POLICY IF EXISTS "Users can view own payments" ON public.stripe_payments;
CREATE POLICY "Users can view own payments" ON public.stripe_payments
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 7: TRIGGERS
-- ============================================================================

-- Trigger: handle_new_user on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: update timestamps on profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: update timestamps on surveys
DROP TRIGGER IF EXISTS update_surveys_updated_at ON public.surveys;
CREATE TRIGGER update_surveys_updated_at
  BEFORE UPDATE ON public.surveys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: update timestamps on survey_templates
DROP TRIGGER IF EXISTS update_survey_templates_updated_at ON public.survey_templates;
CREATE TRIGGER update_survey_templates_updated_at
  BEFORE UPDATE ON public.survey_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: update timestamps on research_requests
DROP TRIGGER IF EXISTS update_research_requests_updated_at ON public.research_requests;
CREATE TRIGGER update_research_requests_updated_at
  BEFORE UPDATE ON public.research_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- SCRIPT COMPLETATO
-- ============================================================================
-- 
-- PROSSIMI STEP:
-- 1. Verifica che lo script sia stato eseguito senza errori
-- 2. Torna su Lovable e testa il backup completo da admin
-- 3. I dati ora verranno copiati correttamente nel database esterno
--
-- ============================================================================
