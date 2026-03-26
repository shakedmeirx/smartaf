ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS email text;

COMMENT ON COLUMN public.users.email IS
  'Optional email copied from Supabase Auth for social sign-in and support/account requests.';

UPDATE public.users AS public_users
SET email = auth_users.email
FROM auth.users AS auth_users
WHERE public_users.id = auth_users.id
  AND public_users.email IS NULL
  AND auth_users.email IS NOT NULL;
