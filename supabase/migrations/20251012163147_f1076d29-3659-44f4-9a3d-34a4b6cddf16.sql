-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create surveys table
CREATE TABLE public.surveys (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  sections JSONB NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  share_token TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  expired_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on surveys
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;

-- Surveys policies
CREATE POLICY "Users can view own surveys"
  ON public.surveys
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view active surveys by share token"
  ON public.surveys
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Users can insert own surveys"
  ON public.surveys
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own surveys"
  ON public.surveys
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own surveys"
  ON public.surveys
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create survey_responses table
CREATE TABLE public.survey_responses (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  responses JSONB NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on survey_responses
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

-- Survey responses policies
CREATE POLICY "Anyone can insert responses for active surveys"
  ON public.survey_responses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.surveys
      WHERE id = survey_id
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
    )
  );

CREATE POLICY "Survey owners can view responses"
  ON public.survey_responses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.surveys
      WHERE id = survey_id
      AND user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger for surveys updated_at
CREATE TRIGGER update_surveys_updated_at
  BEFORE UPDATE ON public.surveys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for share_token lookups
CREATE INDEX idx_surveys_share_token ON public.surveys(share_token);

-- Create index for survey_responses lookups
CREATE INDEX idx_survey_responses_survey_id ON public.survey_responses(survey_id);