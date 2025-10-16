-- Expand profiles table with subscription tier and demographic fields
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_tier text DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'business'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_expires_at timestamp with time zone;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS interests text[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS age_range text CHECK (age_range IN ('18-24', '25-34', '35-44', '45-54', '55-64', '65+'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS available_for_research boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_completed boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS surveys_created_count integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_responses_collected integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Update RLS policies for profiles
DROP POLICY IF EXISTS "Users can view research-available profiles" ON public.profiles;
CREATE POLICY "Users can view research-available profiles"
  ON public.profiles FOR SELECT
  USING (available_for_research = true OR auth.uid() = id);

-- Function to check Free tier limits
CREATE OR REPLACE FUNCTION public.check_free_tier_limits()
RETURNS TRIGGER AS $$
DECLARE
  user_tier text;
  survey_count integer;
  response_count integer;
BEGIN
  -- Get user tier and counts
  SELECT subscription_tier, surveys_created_count, total_responses_collected
  INTO user_tier, survey_count, response_count
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- Check Free tier limits
  IF user_tier = 'free' THEN
    IF TG_TABLE_NAME = 'surveys' AND survey_count >= 10 THEN
      RAISE EXCEPTION 'Free tier limit reached: maximum 10 surveys allowed. Upgrade to Pro to create more.';
    END IF;
    IF TG_TABLE_NAME = 'survey_responses' THEN
      -- For responses, check the survey creator's limit
      DECLARE
        creator_id uuid;
        creator_tier text;
        creator_response_count integer;
      BEGIN
        SELECT user_id INTO creator_id FROM public.surveys WHERE id = NEW.survey_id;
        SELECT subscription_tier, total_responses_collected 
        INTO creator_tier, creator_response_count
        FROM public.profiles WHERE id = creator_id;
        
        IF creator_tier = 'free' AND creator_response_count >= 20 THEN
          RAISE EXCEPTION 'Survey creator has reached Free tier limit: maximum 20 responses allowed.';
        END IF;
      END;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Triggers to enforce Free tier limits
DROP TRIGGER IF EXISTS enforce_free_tier_survey_limit ON public.surveys;
CREATE TRIGGER enforce_free_tier_survey_limit
  BEFORE INSERT ON public.surveys
  FOR EACH ROW
  EXECUTE FUNCTION public.check_free_tier_limits();

DROP TRIGGER IF EXISTS enforce_free_tier_response_limit ON public.survey_responses;
CREATE TRIGGER enforce_free_tier_response_limit
  BEFORE INSERT ON public.survey_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.check_free_tier_limits();

-- Function to update user counters
CREATE OR REPLACE FUNCTION public.update_user_counters()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'surveys' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE public.profiles 
      SET surveys_created_count = surveys_created_count + 1
      WHERE id = NEW.user_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE public.profiles 
      SET surveys_created_count = GREATEST(0, surveys_created_count - 1)
      WHERE id = OLD.user_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'survey_responses' THEN
    IF TG_OP = 'INSERT' THEN
      -- Find the survey creator and increment their response count
      UPDATE public.profiles p
      SET total_responses_collected = total_responses_collected + 1
      FROM public.surveys s
      WHERE s.id = NEW.survey_id AND p.id = s.user_id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Triggers to update counters
DROP TRIGGER IF EXISTS update_survey_counter ON public.surveys;
CREATE TRIGGER update_survey_counter
  AFTER INSERT OR DELETE ON public.surveys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_counters();

DROP TRIGGER IF EXISTS update_response_counter ON public.survey_responses;
CREATE TRIGGER update_response_counter
  AFTER INSERT ON public.survey_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_counters();