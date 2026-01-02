CREATE OR REPLACE FUNCTION public.extract_survey_keywords_v2(survey_data jsonb, title text, description text)
 RETURNS text[]
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  stopwords TEXT[] := ARRAY['il', 'la', 'di', 'da', 'con', 'per', 'su', 'tra', 'fra', 'che', 'come', 'una', 'uno', 'dei', 'del', 'alla', 'nel', 'nella'];
  result TEXT[];
BEGIN
  SELECT ARRAY_AGG(DISTINCT word ORDER BY word)
  INTO result
  FROM (
    -- Parole da titolo
    SELECT lower(unnest(string_to_array(title, ' '))) AS word
    UNION
    -- Parole da descrizione
    SELECT lower(unnest(string_to_array(COALESCE(description, ''), ' '))) AS word
    UNION
    -- Parole da sezioni
    SELECT lower(unnest(string_to_array(section->>'name', ' '))) AS word
    FROM jsonb_array_elements(survey_data) AS section
    WHERE section ? 'name'
    UNION
    -- Parole da domande
    SELECT lower(unnest(string_to_array(question->>'text', ' '))) AS word
    FROM jsonb_array_elements(survey_data) AS section,
         jsonb_array_elements(section->'questions') AS question
    WHERE section ? 'questions' AND question ? 'text'
  ) AS all_words
  WHERE length(word) >= 3
    AND word != ALL(stopwords);
  
  RETURN COALESCE(result, '{}'::TEXT[]);
END;
$function$;