-- SECURITY FIX: Protezione research requests da accesso pubblico
-- Il problema: La policy attuale permette a CHIUNQUE (anche non autenticato) di vedere
-- le research requests attive, esponendo dati sensibili e permettendo furto di idee

-- 1. Rimuovi la policy pericolosa che espone research requests a utenti non autenticati
DROP POLICY IF EXISTS "Anyone can view active research requests" ON public.research_requests;

-- 2. Crea nuova policy che richiede AUTENTICAZIONE per vedere research requests
-- Questa policy permette solo a utenti AUTENTICATI di vedere research requests attive
CREATE POLICY "Authenticated users can view active research requests"
ON public.research_requests
FOR SELECT
TO authenticated
USING (
  status = 'active'
  OR user_id = auth.uid()
);

-- 3. Commento sulla sicurezza
COMMENT ON POLICY "Authenticated users can view active research requests" ON public.research_requests IS
  'SECURITY: Richiede autenticazione per visualizzare research requests attive. 
  Previene furto di idee di ricerca e targeting di partecipanti da parte di competitor non autenticati.
  Il creatore può sempre vedere le proprie research requests indipendentemente dallo status.';