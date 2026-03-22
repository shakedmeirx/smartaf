CREATE OR REPLACE FUNCTION public.create_request_with_limit(
  p_parent_id uuid,
  p_babysitter_id uuid,
  p_initiated_by public.user_role,
  p_request_type text,
  p_date date,
  p_time time,
  p_num_children integer,
  p_child_age_range text[],
  p_area text,
  p_note text
)
RETURNS public.requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.requests;
  v_today_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'missing-user';
  END IF;

  IF p_request_type NOT IN ('quick_message', 'full_childcare') THEN
    RAISE EXCEPTION 'invalid-request-type';
  END IF;

  IF p_initiated_by = 'parent'::public.user_role THEN
    IF auth.uid() <> p_parent_id THEN
      RAISE EXCEPTION 'invalid-target';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.parent_profiles
      WHERE user_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'missing-user';
    END IF;
  ELSIF p_initiated_by = 'babysitter'::public.user_role THEN
    IF NOT public.caller_owns_babysitter_profile(p_babysitter_id) THEN
      RAISE EXCEPTION 'invalid-target';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.parent_profiles
      WHERE user_id = p_parent_id
    ) THEN
      RAISE EXCEPTION 'invalid-target';
    END IF;
  ELSE
    RAISE EXCEPTION 'invalid-target';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(auth.uid()::text), hashtext(p_initiated_by::text));

  SELECT COUNT(*)
  INTO v_today_count
  FROM public.requests
  WHERE initiated_by = p_initiated_by
    AND (
      (p_initiated_by = 'parent'::public.user_role AND parent_id = p_parent_id)
      OR
      (p_initiated_by = 'babysitter'::public.user_role AND babysitter_id = p_babysitter_id)
    )
    AND (created_at AT TIME ZONE 'Asia/Jerusalem')::date = (now() AT TIME ZONE 'Asia/Jerusalem')::date;

  IF v_today_count >= 20 THEN
    RAISE EXCEPTION 'daily-limit';
  END IF;

  INSERT INTO public.requests (
    parent_id,
    babysitter_id,
    initiated_by,
    request_type,
    status,
    date,
    time,
    num_children,
    child_age_range,
    area,
    note
  )
  VALUES (
    p_parent_id,
    p_babysitter_id,
    p_initiated_by,
    p_request_type,
    'pending'::public.request_status,
    p_date,
    p_time,
    p_num_children,
    COALESCE(p_child_age_range, '{}'::text[]),
    COALESCE(p_area, ''),
    COALESCE(p_note, '')
  )
  RETURNING *
  INTO v_request;

  RETURN v_request;
END;
$$;

REVOKE ALL ON FUNCTION public.create_request_with_limit(
  uuid,
  uuid,
  public.user_role,
  text,
  date,
  time,
  integer,
  text[],
  text,
  text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_request_with_limit(
  uuid,
  uuid,
  public.user_role,
  text,
  date,
  time,
  integer,
  text[],
  text,
  text
) TO authenticated;
