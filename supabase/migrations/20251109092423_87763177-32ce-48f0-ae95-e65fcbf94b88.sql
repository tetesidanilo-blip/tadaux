-- CRITICAL SECURITY FIX: Protezione user_id da esposizione pubblica
-- Rimuove policy pericolosa e implementa accesso sicuro via share_token

-- 1. Drop della policy troppo permissiva che espone user_id
DROP POLICY IF EXISTS "Anyone can view active surveys by share token" ON public.surveys;

-- 2. Crea funzione security definer per accesso pubblico sicuro
-- Questa funzione restituisce SOLO i dati necessari, senza esporre user_id
CREATE OR REPLACE FUNCTION public.get_public_survey_by_token(_share_token text)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  sections jsonb,
  language text,
  expires_at timestamp with time zone,
  expired_message text,
  share_token text,
  status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    s.id,
    s.title,
    s.description,
    s.sections,
    s.language,
    s.expires_at,
    s.expired_message,
    s.share_token,
    s.status
  FROM public.surveys s
  WHERE s.share_token = _share_token
    AND s.is_active = true
    AND s.status = 'published'
    AND (s.expires_at IS NULL OR s.expires_at > now())
  LIMIT 1;
$$;

-- 3. Funzione per verificare se un survey è accessibile pubblicamente
CREATE OR REPLACE FUNCTION public.is_survey_publicly_accessible(_survey_id uuid, _share_token text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.surveys
    WHERE id = _survey_id
      AND share_token = _share_token
      AND is_active = true
      AND status = 'published'
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

-- 4. Policy più restrittiva: solo per community surveys AUTENTICATI
-- Questa policy NON espone user_id a utenti non autenticati
CREATE POLICY "Authenticated users can view community surveys safely"
ON public.surveys
FOR SELECT
TO authenticated
USING (
  visible_in_community = true 
  AND status = 'published' 
  AND is_active = true
);

-- 5. Mantieni policy per owner (già esistente, sicura)
-- "Users can view own surveys" - già presente e sicura

-- 6. Grant execute sulla funzione pubblica
GRANT EXECUTE ON FUNCTION public.get_public_survey_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_survey_publicly_accessible(uuid, text) TO anon, authenticated;

-- 7. Commento sulla sicurezza
COMMENT ON FUNCTION public.get_public_survey_by_token IS 
  'SECURITY: Restituisce survey pubblici via share_token SENZA esporre user_id. Usare questa funzione per accesso pubblico.';

COMMENT ON POLICY "Authenticated users can view community surveys safely" ON public.surveys IS
  'SECURITY: Permette solo utenti AUTENTICATI di vedere community surveys. user_id è visibile solo ad utenti autenticati.';