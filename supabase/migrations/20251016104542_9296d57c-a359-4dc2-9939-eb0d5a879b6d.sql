-- Add visibility columns to surveys table
ALTER TABLE public.surveys 
ADD COLUMN IF NOT EXISTS visible_in_community boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS responses_public boolean DEFAULT false;

-- Create function to auto-set community visibility for FREE tier users
CREATE OR REPLACE FUNCTION public.set_free_tier_survey_visibility()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_tier text;
BEGIN
  -- Get user's subscription tier
  SELECT subscription_tier INTO user_tier
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  -- If FREE tier and published, force community visibility
  IF user_tier = 'free' AND NEW.status = 'published' THEN
    NEW.visible_in_community = true;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to enforce FREE tier visibility
DROP TRIGGER IF EXISTS enforce_free_tier_visibility ON public.surveys;
CREATE TRIGGER enforce_free_tier_visibility
BEFORE INSERT OR UPDATE ON public.surveys
FOR EACH ROW
EXECUTE FUNCTION public.set_free_tier_survey_visibility();

-- Update existing FREE tier published surveys to be visible
UPDATE public.surveys s
SET visible_in_community = true
FROM public.profiles p
WHERE s.user_id = p.id 
  AND p.subscription_tier = 'free'
  AND s.status = 'published';

-- Allow authenticated users to view surveys visible in community
CREATE POLICY "Authenticated users can view community surveys"
ON public.surveys
FOR SELECT
TO authenticated
USING (
  visible_in_community = true 
  AND status = 'published' 
  AND is_active = true
);

-- Allow public access to responses if survey owner made them public
CREATE POLICY "Anyone can view public survey responses"
ON public.survey_responses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.surveys
    WHERE surveys.id = survey_responses.survey_id
    AND surveys.responses_public = true
    AND surveys.is_active = true
  )
);