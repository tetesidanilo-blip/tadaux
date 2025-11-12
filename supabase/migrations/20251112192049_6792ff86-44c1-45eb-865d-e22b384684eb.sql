-- Seed the first admin user (idempotent)
-- This allows the user to bootstrap the role system

INSERT INTO public.user_roles (user_id, role, created_by)
SELECT 
  '26c8bd6f-2ef7-4365-b900-ab9d926c1af3'::uuid,
  'admin'::app_role,
  '26c8bd6f-2ef7-4365-b900-ab9d926c1af3'::uuid
WHERE NOT EXISTS (
  SELECT 1 
  FROM public.user_roles 
  WHERE user_id = '26c8bd6f-2ef7-4365-b900-ab9d926c1af3'
    AND role = 'admin'::app_role
);