-- Parent posts: a parent explicitly publishes a "looking for babysitter" ad.
-- Babysitters browse these posts and can send a quick message from them.
-- The 1-to-1 request/chat system is unchanged — posts are only a discovery layer.

CREATE TABLE public.parent_posts (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id       uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  area            text        NOT NULL DEFAULT '',
  date            date,
  time            time,
  num_children    integer     CHECK (num_children IS NULL OR num_children > 0),
  child_age_range text[]      NOT NULL DEFAULT '{}',
  note            text        NOT NULL DEFAULT '',
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON public.parent_posts (parent_id);
CREATE INDEX ON public.parent_posts (is_active, created_at DESC);

-- RLS
ALTER TABLE public.parent_posts ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can see active posts
CREATE POLICY "Anyone authenticated can view active posts"
  ON public.parent_posts FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = true);

-- Parents can always see their own posts regardless of is_active
CREATE POLICY "Parents can view their own posts"
  ON public.parent_posts FOR SELECT
  USING (auth.uid() = parent_id);

-- Parents can create their own posts
CREATE POLICY "Parents can create posts"
  ON public.parent_posts FOR INSERT
  WITH CHECK (auth.uid() = parent_id);

-- Parents can update their own posts
CREATE POLICY "Parents can update their own posts"
  ON public.parent_posts FOR UPDATE
  USING (auth.uid() = parent_id);

-- Parents can delete their own posts
CREATE POLICY "Parents can delete their own posts"
  ON public.parent_posts FOR DELETE
  USING (auth.uid() = parent_id);
