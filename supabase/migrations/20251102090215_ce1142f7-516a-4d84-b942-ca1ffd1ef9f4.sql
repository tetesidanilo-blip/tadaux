-- ============================================
-- WEEK 1 DAY 3-5: PERFORMANCE & SECURITY
-- ============================================

-- 1. PERFORMANCE: Ottimizza extract_survey_keywords con set-based approach
CREATE OR REPLACE FUNCTION public.extract_survey_keywords_v2(
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
  stopwords TEXT[] := ARRAY['il', 'la', 'di', 'da', 'con', 'per', 'su', 'tra', 'fra', 'che', 'come', 'una', 'uno', 'dei', 'del', 'alla', 'nel', 'nella'];
BEGIN
  RETURN ARRAY(
    SELECT DISTINCT lower(word)
    FROM (
      -- Parole da titolo
      SELECT unnest(string_to_array(lower(title), ' ')) AS word
      UNION
      -- Parole da descrizione
      SELECT unnest(string_to_array(lower(COALESCE(description, '')), ' ')) AS word
      UNION
      -- Parole da sezioni
      SELECT unnest(string_to_array(lower(section->>'name'), ' ')) AS word
      FROM jsonb_array_elements(survey_data) AS section
      WHERE section ? 'name'
      UNION
      -- Parole da domande
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

-- Aggiorna trigger per usare nuova funzione v2
DROP TRIGGER IF EXISTS trigger_update_template_keywords ON public.survey_templates;
CREATE TRIGGER trigger_update_template_keywords
BEFORE INSERT OR UPDATE ON public.survey_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_template_keywords();

-- Aggiorna la funzione del trigger per usare v2
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
  
  NEW.keywords := public.extract_survey_keywords_v2(
    survey_data.sections,
    survey_data.title,
    survey_data.description
  );
  
  RETURN NEW;
END;
$$;

-- 2. PERFORMANCE: Indice per paginazione ordinata Q Shop
CREATE INDEX IF NOT EXISTS idx_templates_popularity 
ON public.survey_templates(times_cloned DESC, created_at DESC);

-- 3. SECURITY: Rafforzamento RLS policies su survey_templates
DROP POLICY IF EXISTS "Anyone can view active templates" ON public.survey_templates;
DROP POLICY IF EXISTS "Creators can view own templates" ON public.survey_templates;

CREATE POLICY "Public can view published templates"
ON public.survey_templates
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.surveys s
    WHERE s.id = survey_templates.survey_id
      AND s.is_active = true
      AND s.status = 'published'
  )
);

CREATE POLICY "Creators can view own templates"
ON public.survey_templates
FOR SELECT
USING (auth.uid() = creator_id);