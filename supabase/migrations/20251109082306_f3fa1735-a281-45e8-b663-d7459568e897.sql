-- Optimize reward_profile_completion to batch credit updates
CREATE OR REPLACE FUNCTION public.reward_profile_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  rewarded_fields JSONB;
  reward_amount INTEGER := 0;
  reward_descriptions TEXT[] := '{}';
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Get current rewarded fields
    rewarded_fields := COALESCE(NEW.profile_fields_rewarded, '{}'::jsonb);
    
    -- Full name: reward only if not previously rewarded AND field is being set from NULL
    IF OLD.full_name IS NULL 
       AND NEW.full_name IS NOT NULL 
       AND NOT (rewarded_fields ? 'full_name') THEN
      reward_amount := reward_amount + 10;
      reward_descriptions := array_append(reward_descriptions, 'Nome completo');
      rewarded_fields := jsonb_set(rewarded_fields, '{full_name}', 'true'::jsonb);
    END IF;
    
    -- Country: reward only if not previously rewarded AND field is being set from NULL
    IF OLD.country IS NULL 
       AND NEW.country IS NOT NULL 
       AND NOT (rewarded_fields ? 'country') THEN
      reward_amount := reward_amount + 10;
      reward_descriptions := array_append(reward_descriptions, 'Paese');
      rewarded_fields := jsonb_set(rewarded_fields, '{country}', 'true'::jsonb);
    END IF;
    
    -- Age range: reward only if not previously rewarded AND field is being set from NULL
    IF OLD.age_range IS NULL 
       AND NEW.age_range IS NOT NULL 
       AND NOT (rewarded_fields ? 'age_range') THEN
      reward_amount := reward_amount + 10;
      reward_descriptions := array_append(reward_descriptions, 'Fascia età');
      rewarded_fields := jsonb_set(rewarded_fields, '{age_range}', 'true'::jsonb);
    END IF;
    
    -- Interests: reward only if not previously rewarded AND interests are being added from empty/NULL
    IF (OLD.interests IS NULL OR array_length(OLD.interests, 1) IS NULL) 
       AND array_length(NEW.interests, 1) > 0 
       AND NOT (rewarded_fields ? 'interests') THEN
      reward_amount := reward_amount + 10;
      reward_descriptions := array_append(reward_descriptions, 'Interessi');
      rewarded_fields := jsonb_set(rewarded_fields, '{interests}', 'true'::jsonb);
    END IF;
    
    -- Call update_user_credits ONCE with total amount if any fields were completed
    IF reward_amount > 0 THEN
      PERFORM public.update_user_credits(
        NEW.id, 
        reward_amount, 
        'profile_completion', 
        NEW.id, 
        'Campi completati: ' || array_to_string(reward_descriptions, ', ')
      );
    END IF;
    
    -- Update the rewarded fields tracker
    NEW.profile_fields_rewarded := rewarded_fields;
  END IF;
  
  RETURN NEW;
END;
$function$;