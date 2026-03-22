ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_by_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

WITH pairs_to_close AS (
  SELECT DISTINCT parent_id, babysitter_id
  FROM public.requests
  WHERE status = 'accepted'::public.request_status
    AND (
      hidden_for_parent = true
      OR hidden_for_babysitter = true
    )
)
UPDATE public.conversations c
SET closed_at = COALESCE(c.closed_at, now())
FROM pairs_to_close p
WHERE c.parent_id = p.parent_id
  AND c.babysitter_id = p.babysitter_id
  AND c.closed_at IS NULL;

WITH pairs_to_close AS (
  SELECT DISTINCT parent_id, babysitter_id
  FROM public.requests
  WHERE status = 'accepted'::public.request_status
    AND (
      hidden_for_parent = true
      OR hidden_for_babysitter = true
    )
)
UPDATE public.requests r
SET hidden_for_parent = true,
    hidden_for_babysitter = true
FROM pairs_to_close p
WHERE r.parent_id = p.parent_id
  AND r.babysitter_id = p.babysitter_id
  AND r.status = 'accepted'::public.request_status;

WITH ranked_active AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY parent_id, babysitter_id
      ORDER BY created_at DESC, id DESC
    ) AS row_rank
  FROM public.conversations
  WHERE closed_at IS NULL
)
UPDATE public.conversations c
SET closed_at = now()
FROM ranked_active r
WHERE c.id = r.id
  AND r.row_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS conversations_active_pair_unique_idx
  ON public.conversations (parent_id, babysitter_id)
  WHERE closed_at IS NULL;

CREATE OR REPLACE FUNCTION public.close_chat_for_current_user(
  p_parent_id uuid,
  p_babysitter_id uuid
)
RETURNS public.conversations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation public.conversations;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'missing-user';
  END IF;

  IF auth.uid() <> p_parent_id
     AND NOT public.caller_owns_babysitter_profile(p_babysitter_id) THEN
    RAISE EXCEPTION 'not-allowed';
  END IF;

  SELECT *
  INTO v_conversation
  FROM public.conversations
  WHERE parent_id = p_parent_id
    AND babysitter_id = p_babysitter_id
    AND closed_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'conversation-not-found';
  END IF;

  UPDATE public.conversations
  SET closed_at = now(),
      closed_by_user_id = auth.uid()
  WHERE id = v_conversation.id
  RETURNING * INTO v_conversation;

  UPDATE public.requests
  SET hidden_for_parent = true,
      hidden_for_babysitter = true
  WHERE parent_id = p_parent_id
    AND babysitter_id = p_babysitter_id
    AND status = 'accepted'::public.request_status;

  RETURN v_conversation;
END;
$$;

GRANT EXECUTE ON FUNCTION public.close_chat_for_current_user(uuid, uuid) TO authenticated;

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

  IF EXISTS (
    SELECT 1
    FROM public.conversations
    WHERE parent_id = p_parent_id
      AND babysitter_id = p_babysitter_id
      AND closed_at IS NULL
  ) THEN
    RAISE EXCEPTION 'conversation-exists';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.requests
    WHERE parent_id = p_parent_id
      AND babysitter_id = p_babysitter_id
      AND initiated_by = p_initiated_by
      AND status = 'declined'::public.request_status
  ) THEN
    RAISE EXCEPTION 'declined-block';
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

DROP POLICY IF EXISTS "Participants can send messages" ON public.messages;

CREATE POLICY "Participants can send messages"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND c.closed_at IS NULL
        AND (
          auth.uid() = c.parent_id
          OR public.caller_owns_babysitter_profile(c.babysitter_id)
        )
    )
  );
