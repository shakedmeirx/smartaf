ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS initiated_by public.user_role NOT NULL DEFAULT 'parent';

COMMENT ON COLUMN public.requests.initiated_by IS
  'Which side created the request: parent or babysitter.';

DROP POLICY IF EXISTS "Parents can create requests" ON public.requests;
DROP POLICY IF EXISTS "Babysitters can update request status" ON public.requests;
DROP POLICY IF EXISTS "Babysitters can open conversations for accepted requests" ON public.conversations;

CREATE POLICY "Participants can create requests"
  ON public.requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      initiated_by = 'parent'::public.user_role
      AND auth.uid() = parent_id
      AND EXISTS (
        SELECT 1
        FROM public.parent_profiles
        WHERE user_id = auth.uid()
      )
    )
    OR
    (
      initiated_by = 'babysitter'::public.user_role
      AND public.caller_owns_babysitter_profile(babysitter_id)
      AND EXISTS (
        SELECT 1
        FROM public.parent_profiles
        WHERE user_id = parent_id
      )
    )
  );

CREATE POLICY "Recipients can update request status"
  ON public.requests
  FOR UPDATE
  TO authenticated
  USING (
    (
      initiated_by = 'parent'::public.user_role
      AND public.caller_owns_babysitter_profile(babysitter_id)
    )
    OR
    (
      initiated_by = 'babysitter'::public.user_role
      AND auth.uid() = parent_id
    )
  )
  WITH CHECK (
    status IN ('accepted'::public.request_status, 'declined'::public.request_status)
    AND (
      (
        initiated_by = 'parent'::public.user_role
        AND public.caller_owns_babysitter_profile(babysitter_id)
      )
      OR
      (
        initiated_by = 'babysitter'::public.user_role
        AND auth.uid() = parent_id
      )
    )
  );

CREATE POLICY "Recipients can open conversations for accepted requests"
  ON public.conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.requests r
      WHERE r.id = request_id
        AND r.status = 'accepted'::public.request_status
        AND r.parent_id = conversations.parent_id
        AND r.babysitter_id = conversations.babysitter_id
        AND (
          (
            r.initiated_by = 'parent'::public.user_role
            AND public.caller_owns_babysitter_profile(conversations.babysitter_id)
          )
          OR
          (
            r.initiated_by = 'babysitter'::public.user_role
            AND auth.uid() = conversations.parent_id
          )
        )
    )
  );
