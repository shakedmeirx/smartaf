CREATE OR REPLACE FUNCTION public.restore_hidden_chat_visibility_for_current_user(
  p_parent_id uuid,
  p_babysitter_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer := 0;
BEGIN
  IF auth.uid() = p_parent_id THEN
    UPDATE public.requests
    SET hidden_for_parent = false
    WHERE parent_id = p_parent_id
      AND babysitter_id = p_babysitter_id
      AND status = 'accepted'
      AND hidden_for_parent = true;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
  END IF;

  IF public.caller_owns_babysitter_profile(p_babysitter_id) THEN
    UPDATE public.requests
    SET hidden_for_babysitter = false
    WHERE parent_id = p_parent_id
      AND babysitter_id = p_babysitter_id
      AND status = 'accepted'
      AND hidden_for_babysitter = true;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
  END IF;

  RAISE EXCEPTION 'not-allowed';
END;
$$;

GRANT EXECUTE ON FUNCTION public.restore_hidden_chat_visibility_for_current_user(uuid, uuid) TO authenticated;
