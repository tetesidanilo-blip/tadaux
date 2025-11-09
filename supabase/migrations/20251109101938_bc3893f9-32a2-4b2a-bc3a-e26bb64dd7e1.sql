-- SECURITY FIX: Protezione dati personali dalla raccolta pubblica
-- Il problema: La policy attuale permette a CHIUNQUE (anche non autenticato) di vedere
-- i profili con available_for_research = true, esponendo dati sensibili

-- 1. Rimuovi la policy pericolosa che espone dati a utenti non autenticati
DROP POLICY IF EXISTS "Users can view research-available profiles" ON public.profiles;

-- 2. Crea nuova policy che richiede AUTENTICAZIONE per vedere profili di ricerca
-- Questa policy permette solo a utenti AUTENTICATI di vedere profili research-available
CREATE POLICY "Authenticated users can view research-available profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  available_for_research = true 
  OR auth.uid() = id
);

-- 3. Commento sulla sicurezza
COMMENT ON POLICY "Authenticated users can view research-available profiles" ON public.profiles IS
  'SECURITY: Richiede autenticazione per visualizzare profili disponibili per ricerca. 
  Previene scraping di dati personali da parte di attori malintenzionati non autenticati.';