-- Week 2 Day 3-4: Credit System Enhancements

-- 1. Add profile_fields_rewarded column to track which fields have been rewarded
ALTER TABLE public.profiles
ADD COLUMN profile_fields_rewarded JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.profiles.profile_fields_rewarded IS 'Tracks which profile fields have already received credit rewards to prevent exploit';

-- 2. Update reward_profile_completion function to prevent exploit
CREATE OR REPLACE FUNCTION public.reward_profile_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  rewarded_fields JSONB;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Get current rewarded fields
    rewarded_fields := COALESCE(NEW.profile_fields_rewarded, '{}'::jsonb);
    
    -- Full name: reward only if not previously rewarded AND field is being set from NULL
    IF OLD.full_name IS NULL 
       AND NEW.full_name IS NOT NULL 
       AND NOT (rewarded_fields ? 'full_name') THEN
      PERFORM public.update_user_credits(NEW.id, 10, 'profile_completion', NEW.id, 'Nome completo aggiunto');
      rewarded_fields := jsonb_set(rewarded_fields, '{full_name}', 'true'::jsonb);
    END IF;
    
    -- Country: reward only if not previously rewarded AND field is being set from NULL
    IF OLD.country IS NULL 
       AND NEW.country IS NOT NULL 
       AND NOT (rewarded_fields ? 'country') THEN
      PERFORM public.update_user_credits(NEW.id, 10, 'profile_completion', NEW.id, 'Paese aggiunto');
      rewarded_fields := jsonb_set(rewarded_fields, '{country}', 'true'::jsonb);
    END IF;
    
    -- Age range: reward only if not previously rewarded AND field is being set from NULL
    IF OLD.age_range IS NULL 
       AND NEW.age_range IS NOT NULL 
       AND NOT (rewarded_fields ? 'age_range') THEN
      PERFORM public.update_user_credits(NEW.id, 10, 'profile_completion', NEW.id, 'Fascia età aggiunta');
      rewarded_fields := jsonb_set(rewarded_fields, '{age_range}', 'true'::jsonb);
    END IF;
    
    -- Interests: reward only if not previously rewarded AND interests are being added from empty/NULL
    IF (OLD.interests IS NULL OR array_length(OLD.interests, 1) IS NULL) 
       AND array_length(NEW.interests, 1) > 0 
       AND NOT (rewarded_fields ? 'interests') THEN
      PERFORM public.update_user_credits(NEW.id, 10, 'profile_completion', NEW.id, 'Interessi aggiunti');
      rewarded_fields := jsonb_set(rewarded_fields, '{interests}', 'true'::jsonb);
    END IF;
    
    -- Update the rewarded fields tracker
    NEW.profile_fields_rewarded := rewarded_fields;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 3. Add index on credit_transactions for better query performance
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_created 
ON public.credit_transactions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_type 
ON public.credit_transactions(transaction_type, created_at DESC);