-- Contact fields belong in auth, not in the publicly joined users table.
-- Keep the columns for backward compatibility, but clear existing values.

UPDATE public.users
SET
  phone = NULL,
  email = NULL
WHERE phone IS NOT NULL OR email IS NOT NULL;

COMMENT ON COLUMN public.users.phone IS
  'Deprecated. Phone numbers are stored in auth and should not be exposed through public.users.';

COMMENT ON COLUMN public.users.email IS
  'Deprecated. Emails are stored in auth and should not be exposed through public.users.';
