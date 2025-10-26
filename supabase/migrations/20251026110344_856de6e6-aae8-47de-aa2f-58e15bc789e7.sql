-- Fix security warnings: aggiungi search_path alle funzioni

-- Fix 1: update_template_keywords
CREATE OR REPLACE FUNCTION public.update_template_keywords()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Fix 2: extract_survey_keywords
CREATE OR REPLACE FUNCTION public.extract_survey_keywords(
  survey_data JSONB, 
  title TEXT, 
  description TEXT
)
RETURNS TEXT[]
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
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