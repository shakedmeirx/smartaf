-- ─────────────────────────────────────────────────────────────────────────────
-- BabysitConnect — Row Level Security policies
-- Run after 20260313000001_schema.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Convention used throughout:
--   USING(...)      controls which rows a SELECT/UPDATE/DELETE can touch
--   WITH CHECK(...) controls which rows an INSERT/UPDATE can write
-- Both clauses must pass for UPDATE.
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable RLS on every table. No policy = no access (deny-by-default).
ALTER TABLE public.users                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.babysitter_profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.babysitter_languages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.babysitter_age_groups    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.babysitter_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.babysitter_superpowers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.babysitter_personality_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.babysitter_availability  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites                ENABLE ROW LEVEL SECURITY;

-- ─── Helper: is the caller a babysitter who owns a given profile? ─────────────
-- Reused in multiple policies. Defined as a stable function so Postgres can
-- inline it efficiently rather than re-running the subquery per row.

CREATE OR REPLACE FUNCTION public.caller_owns_babysitter_profile(profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.babysitter_profiles
    WHERE id = profile_id
      AND user_id = auth.uid()
  );
$$;

-- ─── users ────────────────────────────────────────────────────────────────────

-- Any signed-in user can read any user row.
-- Needed so the inbox and chat screens can display parent/babysitter names.
CREATE POLICY "Authenticated users can read all users"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (true);

-- A user can only update their own row.
CREATE POLICY "Users can update their own row"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING    (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- INSERT is performed by app logic right after OTP sign-in, using the
-- anon/service key. No self-insert policy needed for authenticated users.

-- ─── parent_profiles ──────────────────────────────────────────────────────────

CREATE POLICY "Parents can read their own profile"
  ON public.parent_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Parents can create their own profile"
  ON public.parent_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Parents can update their own profile"
  ON public.parent_profiles
  FOR UPDATE
  TO authenticated
  USING    (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── babysitter_profiles ──────────────────────────────────────────────────────

-- All authenticated users can browse babysitter profiles.
CREATE POLICY "Babysitter profiles are publicly readable"
  ON public.babysitter_profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- A babysitter can only create/update/delete their own profile.
CREATE POLICY "Babysitters can create their own profile"
  ON public.babysitter_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Babysitters can update their own profile"
  ON public.babysitter_profiles
  FOR UPDATE
  TO authenticated
  USING    (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Babysitters can delete their own profile"
  ON public.babysitter_profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ─── Babysitter join tables (languages, age groups, etc.) ─────────────────────
-- Same pattern for all six tables: anyone can read, only the owning babysitter
-- can write. Using the helper function keeps each policy short.

-- babysitter_languages
CREATE POLICY "Babysitter languages are publicly readable"
  ON public.babysitter_languages FOR SELECT TO authenticated USING (true);

CREATE POLICY "Babysitters can manage their own languages"
  ON public.babysitter_languages FOR ALL TO authenticated
  USING    (public.caller_owns_babysitter_profile(babysitter_id))
  WITH CHECK (public.caller_owns_babysitter_profile(babysitter_id));

-- babysitter_age_groups
CREATE POLICY "Babysitter age groups are publicly readable"
  ON public.babysitter_age_groups FOR SELECT TO authenticated USING (true);

CREATE POLICY "Babysitters can manage their own age groups"
  ON public.babysitter_age_groups FOR ALL TO authenticated
  USING    (public.caller_owns_babysitter_profile(babysitter_id))
  WITH CHECK (public.caller_owns_babysitter_profile(babysitter_id));

-- babysitter_certifications
CREATE POLICY "Babysitter certifications are publicly readable"
  ON public.babysitter_certifications FOR SELECT TO authenticated USING (true);

CREATE POLICY "Babysitters can manage their own certifications"
  ON public.babysitter_certifications FOR ALL TO authenticated
  USING    (public.caller_owns_babysitter_profile(babysitter_id))
  WITH CHECK (public.caller_owns_babysitter_profile(babysitter_id));

-- babysitter_superpowers
CREATE POLICY "Babysitter superpowers are publicly readable"
  ON public.babysitter_superpowers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Babysitters can manage their own superpowers"
  ON public.babysitter_superpowers FOR ALL TO authenticated
  USING    (public.caller_owns_babysitter_profile(babysitter_id))
  WITH CHECK (public.caller_owns_babysitter_profile(babysitter_id));

-- babysitter_personality_tags
CREATE POLICY "Babysitter personality tags are publicly readable"
  ON public.babysitter_personality_tags FOR SELECT TO authenticated USING (true);

CREATE POLICY "Babysitters can manage their own personality tags"
  ON public.babysitter_personality_tags FOR ALL TO authenticated
  USING    (public.caller_owns_babysitter_profile(babysitter_id))
  WITH CHECK (public.caller_owns_babysitter_profile(babysitter_id));

-- babysitter_availability
CREATE POLICY "Babysitter availability is publicly readable"
  ON public.babysitter_availability FOR SELECT TO authenticated USING (true);

CREATE POLICY "Babysitters can manage their own availability"
  ON public.babysitter_availability FOR ALL TO authenticated
  USING    (public.caller_owns_babysitter_profile(babysitter_id))
  WITH CHECK (public.caller_owns_babysitter_profile(babysitter_id));

-- ─── requests ─────────────────────────────────────────────────────────────────

-- Visible to: the parent who created it, OR the babysitter it was sent to.
CREATE POLICY "Requests visible to their parent and babysitter"
  ON public.requests
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = parent_id
    OR public.caller_owns_babysitter_profile(babysitter_id)
  );

-- Only parents can submit requests, and only on their own behalf.
CREATE POLICY "Parents can create requests"
  ON public.requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = parent_id
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'babysitter'::public.user_role IS FALSE
        AND role = 'parent'::public.user_role
    )
  );

-- Only the addressed babysitter can change the status (accept / decline).
-- Parents cannot modify a request after sending it.
CREATE POLICY "Babysitters can update request status"
  ON public.requests
  FOR UPDATE
  TO authenticated
  USING    (public.caller_owns_babysitter_profile(babysitter_id))
  WITH CHECK (public.caller_owns_babysitter_profile(babysitter_id));

-- ─── conversations ────────────────────────────────────────────────────────────

-- Visible to both participants.
CREATE POLICY "Conversations visible to their participants"
  ON public.conversations
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = parent_id
    OR public.caller_owns_babysitter_profile(babysitter_id)
  );

-- Only the babysitter can open a conversation (they are the one accepting).
-- The linked request must already be accepted — prevents creating ghost conversations.
CREATE POLICY "Babysitters can open conversations for accepted requests"
  ON public.conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.caller_owns_babysitter_profile(babysitter_id)
    AND EXISTS (
      SELECT 1 FROM public.requests
      WHERE id = request_id AND status = 'accepted'
    )
  );

-- ─── messages ─────────────────────────────────────────────────────────────────

-- Participants can read messages in their conversations.
CREATE POLICY "Messages visible to conversation participants"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (
          auth.uid() = c.parent_id
          OR public.caller_owns_babysitter_profile(c.babysitter_id)
        )
    )
  );

-- Either participant can send a message, but only as themselves.
CREATE POLICY "Participants can send messages"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (
          auth.uid() = c.parent_id
          OR public.caller_owns_babysitter_profile(c.babysitter_id)
        )
    )
  );

-- ─── favorites ────────────────────────────────────────────────────────────────

CREATE POLICY "Parents can read their own favorites"
  ON public.favorites
  FOR SELECT
  TO authenticated
  USING (auth.uid() = parent_id);

CREATE POLICY "Parents can add favorites"
  ON public.favorites
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = parent_id);

-- DELETE is the "unfavorite" action.
CREATE POLICY "Parents can remove their own favorites"
  ON public.favorites
  FOR DELETE
  TO authenticated
  USING (auth.uid() = parent_id);
