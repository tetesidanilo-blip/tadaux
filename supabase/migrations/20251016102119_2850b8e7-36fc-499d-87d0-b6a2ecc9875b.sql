-- Create triggers to update user counters when surveys are created/deleted
CREATE TRIGGER update_survey_counters
AFTER INSERT OR DELETE ON public.surveys
FOR EACH ROW
EXECUTE FUNCTION public.update_user_counters();

-- Create triggers to update response counters when responses are submitted
CREATE TRIGGER update_response_counters
AFTER INSERT ON public.survey_responses
FOR EACH ROW
EXECUTE FUNCTION public.update_user_counters();

-- Backfill existing surveys count for all users
UPDATE public.profiles p
SET surveys_created_count = (
  SELECT COUNT(*)
  FROM public.surveys s
  WHERE s.user_id = p.id
)
WHERE EXISTS (
  SELECT 1 FROM public.surveys s WHERE s.user_id = p.id
);

-- Backfill existing responses count for all users
UPDATE public.profiles p
SET total_responses_collected = (
  SELECT COUNT(*)
  FROM public.survey_responses sr
  JOIN public.surveys s ON sr.survey_id = s.id
  WHERE s.user_id = p.id
)
WHERE EXISTS (
  SELECT 1 
  FROM public.survey_responses sr
  JOIN public.surveys s ON sr.survey_id = s.id
  WHERE s.user_id = p.id
);