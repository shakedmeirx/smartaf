CREATE TABLE IF NOT EXISTS public.user_blocks (
  blocker_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  blocked_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (blocker_user_id, blocked_user_id),
  CONSTRAINT user_blocks_not_self CHECK (blocker_user_id <> blocked_user_id)
);

CREATE INDEX IF NOT EXISTS user_blocks_blocked_user_id_idx
  ON public.user_blocks (blocked_user_id, created_at DESC);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_blocks_insert_own" ON public.user_blocks;
CREATE POLICY "user_blocks_insert_own"
  ON public.user_blocks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = blocker_user_id);

DROP POLICY IF EXISTS "user_blocks_select_involved" ON public.user_blocks;
CREATE POLICY "user_blocks_select_involved"
  ON public.user_blocks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = blocker_user_id OR auth.uid() = blocked_user_id);

DROP POLICY IF EXISTS "user_blocks_delete_own" ON public.user_blocks;
CREATE POLICY "user_blocks_delete_own"
  ON public.user_blocks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = blocker_user_id);

CREATE OR REPLACE FUNCTION public.users_are_blocked(
  p_first_user_id uuid,
  p_second_user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_blocks
    WHERE (blocker_user_id = p_first_user_id AND blocked_user_id = p_second_user_id)
       OR (blocker_user_id = p_second_user_id AND blocked_user_id = p_first_user_id)
  );
$$;

REVOKE ALL ON FUNCTION public.users_are_blocked(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.users_are_blocked(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.block_user(
  p_blocked_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_own_babysitter_profile_id uuid;
  v_blocked_babysitter_profile_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'missing-user';
  END IF;

  IF p_blocked_user_id IS NULL OR p_blocked_user_id = auth.uid() THEN
    RAISE EXCEPTION 'invalid-target';
  END IF;

  INSERT INTO public.user_blocks (blocker_user_id, blocked_user_id)
  VALUES (auth.uid(), p_blocked_user_id)
  ON CONFLICT (blocker_user_id, blocked_user_id) DO NOTHING;

  SELECT id
  INTO v_own_babysitter_profile_id
  FROM public.babysitter_profiles
  WHERE user_id = auth.uid()
  LIMIT 1;

  SELECT id
  INTO v_blocked_babysitter_profile_id
  FROM public.babysitter_profiles
  WHERE user_id = p_blocked_user_id
  LIMIT 1;

  UPDATE public.conversations
  SET closed_at = now(),
      closed_by_user_id = auth.uid()
  WHERE closed_at IS NULL
    AND (
      (v_blocked_babysitter_profile_id IS NOT NULL
        AND parent_id = auth.uid()
        AND babysitter_id = v_blocked_babysitter_profile_id)
      OR
      (v_own_babysitter_profile_id IS NOT NULL
        AND parent_id = p_blocked_user_id
        AND babysitter_id = v_own_babysitter_profile_id)
    );

  UPDATE public.requests
  SET hidden_for_parent = true,
      hidden_for_babysitter = true
  WHERE (
      v_blocked_babysitter_profile_id IS NOT NULL
      AND parent_id = auth.uid()
      AND babysitter_id = v_blocked_babysitter_profile_id
    )
    OR (
      v_own_babysitter_profile_id IS NOT NULL
      AND parent_id = p_blocked_user_id
      AND babysitter_id = v_own_babysitter_profile_id
    );

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.block_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.block_user(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.prevent_messages_for_blocked_pairs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_user_id uuid;
  v_babysitter_user_id uuid;
BEGIN
  SELECT c.parent_id, bp.user_id
  INTO v_parent_user_id, v_babysitter_user_id
  FROM public.conversations c
  JOIN public.babysitter_profiles bp ON bp.id = c.babysitter_id
  WHERE c.id = NEW.conversation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'conversation-not-found';
  END IF;

  IF public.users_are_blocked(v_parent_user_id, v_babysitter_user_id) THEN
    RAISE EXCEPTION 'user-blocked';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_block_guard ON public.messages;
CREATE TRIGGER messages_block_guard
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_messages_for_blocked_pairs();

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
  v_babysitter_user_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'missing-user';
  END IF;

  IF p_request_type NOT IN ('quick_message', 'full_childcare') THEN
    RAISE EXCEPTION 'invalid-request-type';
  END IF;

  SELECT user_id
  INTO v_babysitter_user_id
  FROM public.babysitter_profiles
  WHERE id = p_babysitter_id
  LIMIT 1;

  IF NOT FOUND OR v_babysitter_user_id IS NULL THEN
    RAISE EXCEPTION 'invalid-target';
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

  IF public.users_are_blocked(p_parent_id, v_babysitter_user_id) THEN
    RAISE EXCEPTION 'user-blocked';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_parent_id::text), hashtext(p_babysitter_id::text));

  IF EXISTS (
    SELECT 1
    FROM public.conversations
    WHERE parent_id = p_parent_id
      AND babysitter_id = p_babysitter_id
      AND closed_at IS NULL
  ) THEN
    RAISE EXCEPTION 'conversation-exists';
  END IF;

  SELECT *
  INTO v_request
  FROM public.requests
  WHERE parent_id = p_parent_id
    AND babysitter_id = p_babysitter_id
    AND initiated_by = p_initiated_by
    AND status = 'pending'::public.request_status
  ORDER BY created_at DESC, id DESC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    UPDATE public.requests
    SET request_type = p_request_type,
        date = p_date,
        time = p_time,
        num_children = p_num_children,
        child_age_range = COALESCE(p_child_age_range, '{}'::text[]),
        area = COALESCE(p_area, ''),
        note = COALESCE(p_note, ''),
        hidden_for_parent = false,
        hidden_for_babysitter = false,
        created_at = now()
    WHERE id = v_request.id
    RETURNING * INTO v_request;

    UPDATE public.requests
    SET hidden_for_parent = true,
        hidden_for_babysitter = true
    WHERE parent_id = p_parent_id
      AND babysitter_id = p_babysitter_id
      AND initiated_by = p_initiated_by
      AND status = 'pending'::public.request_status
      AND id <> v_request.id;

    RETURN v_request;
  END IF;

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
