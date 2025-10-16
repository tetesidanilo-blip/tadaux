-- Create research_requests table
CREATE TABLE public.research_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id UUID REFERENCES public.surveys(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  topics TEXT[] DEFAULT '{}',
  target_participants INTEGER NOT NULL DEFAULT 10,
  current_participants INTEGER NOT NULL DEFAULT 0,
  deadline TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'completed')),
  matching_enabled BOOLEAN NOT NULL DEFAULT false,
  target_age_ranges TEXT[] DEFAULT '{}',
  target_countries TEXT[] DEFAULT '{}',
  target_interests TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for research_requests
ALTER TABLE public.research_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for research_requests
CREATE POLICY "Anyone can view active research requests"
ON public.research_requests
FOR SELECT
USING (status = 'active');

CREATE POLICY "Users can view own research requests"
ON public.research_requests
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own research requests"
ON public.research_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own research requests"
ON public.research_requests
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own research requests"
ON public.research_requests
FOR DELETE
USING (auth.uid() = user_id);

-- Create participant_applications table
CREATE TABLE public.participant_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  research_request_id UUID NOT NULL REFERENCES public.research_requests(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(research_request_id, participant_id)
);

-- Enable RLS for participant_applications
ALTER TABLE public.participant_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for participant_applications
CREATE POLICY "Participants can view own applications"
ON public.participant_applications
FOR SELECT
USING (auth.uid() = participant_id);

CREATE POLICY "Research owners can view applications to their requests"
ON public.participant_applications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.research_requests
    WHERE id = participant_applications.research_request_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Participants can insert own applications"
ON public.participant_applications
FOR INSERT
WITH CHECK (auth.uid() = participant_id);

CREATE POLICY "Research owners can update applications to their requests"
ON public.participant_applications
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.research_requests
    WHERE id = participant_applications.research_request_id
    AND user_id = auth.uid()
  )
);

-- Create community_groups table
CREATE TABLE public.community_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  platform TEXT NOT NULL CHECK (platform IN ('whatsapp', 'discord', 'telegram', 'other')),
  invite_link TEXT NOT NULL,
  topics TEXT[] DEFAULT '{}',
  member_count INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for community_groups
ALTER TABLE public.community_groups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for community_groups
CREATE POLICY "Anyone can view active community groups"
ON public.community_groups
FOR SELECT
USING (is_active = true);

-- Create function to update participant count
CREATE OR REPLACE FUNCTION public.update_research_request_participants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.research_requests
    SET current_participants = (
      SELECT COUNT(*)
      FROM public.participant_applications
      WHERE research_request_id = NEW.research_request_id
      AND status = 'approved'
    )
    WHERE id = NEW.research_request_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.research_requests
    SET current_participants = (
      SELECT COUNT(*)
      FROM public.participant_applications
      WHERE research_request_id = OLD.research_request_id
      AND status = 'approved'
    )
    WHERE id = OLD.research_request_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for updating participant count
CREATE TRIGGER update_research_request_participants_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.participant_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_research_request_participants();

-- Create trigger for updated_at on research_requests
CREATE TRIGGER update_research_requests_updated_at
BEFORE UPDATE ON public.research_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on participant_applications
CREATE TRIGGER update_participant_applications_updated_at
BEFORE UPDATE ON public.participant_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on community_groups
CREATE TRIGGER update_community_groups_updated_at
BEFORE UPDATE ON public.community_groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();