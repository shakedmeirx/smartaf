ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS hidden_for_parent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hidden_for_babysitter boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.hide_request_for_current_user(p_request_id uuid)
RETURNS public.requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.requests;
BEGIN
  SELECT *
  INTO v_request
  FROM public.requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'request-not-found';
  END IF;

  IF auth.uid() = v_request.parent_id THEN
    UPDATE public.requests
    SET hidden_for_parent = true
    WHERE id = p_request_id
    RETURNING * INTO v_request;

    RETURN v_request;
  END IF;

  IF public.caller_owns_babysitter_profile(v_request.babysitter_id) THEN
    UPDATE public.requests
    SET hidden_for_babysitter = true
    WHERE id = p_request_id
    RETURNING * INTO v_request;

    RETURN v_request;
  END IF;

  RAISE EXCEPTION 'not-allowed';
END;
$$;

GRANT EXECUTE ON FUNCTION public.hide_request_for_current_user(uuid) TO authenticated;
