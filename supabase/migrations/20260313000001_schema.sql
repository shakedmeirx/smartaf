-- ─────────────────────────────────────────────────────────────────────────────
-- BabysitConnect — initial schema
-- Run this in the Supabase SQL editor, or via: supabase db push
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Enum types ───────────────────────────────────────────────────────────────

CREATE TYPE public.user_role AS ENUM ('parent', 'babysitter');

CREATE TYPE public.request_status AS ENUM ('pending', 'accepted', 'declined');

-- ─── users ────────────────────────────────────────────────────────────────────
-- One row per account. id mirrors auth.users.id (Supabase Auth UUID).
-- Created by the app immediately after a successful OTP sign-in.

CREATE TABLE public.users (
  id          uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        public.user_role  NOT NULL,
  name        text        NOT NULL,
  phone       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── parent_profiles ──────────────────────────────────────────────────────────
-- Holds parent-specific fields. Currently thin — expands later with address,
-- number of children, etc.

CREATE TABLE public.parent_profiles (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── babysitter_profiles ──────────────────────────────────────────────────────

CREATE TABLE public.babysitter_profiles (
  id                    uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid    NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  city                  text    NOT NULL,
  bio                   text    NOT NULL DEFAULT '',
  hourly_rate           integer NOT NULL CHECK (hourly_rate > 0),  -- in whole shekels
  years_experience      text    NOT NULL,                          -- '1–2' | '2–3' | '3–5' | '5+'
  age                   integer CHECK (age > 0),
  has_car               boolean NOT NULL DEFAULT false,
  has_first_aid         boolean NOT NULL DEFAULT false,
  special_needs         boolean NOT NULL DEFAULT false,
  is_verified           boolean NOT NULL DEFAULT false,
  has_references        boolean NOT NULL DEFAULT false,
  is_accepting_requests boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- ─── Babysitter multi-value fields (join tables) ──────────────────────────────
-- Each row links a babysitter profile to one value.
-- Composite PK prevents duplicates without a separate unique index.

CREATE TABLE public.babysitter_languages (
  babysitter_id  uuid  NOT NULL REFERENCES public.babysitter_profiles(id) ON DELETE CASCADE,
  language       text  NOT NULL,
  PRIMARY KEY (babysitter_id, language)
);

CREATE TABLE public.babysitter_age_groups (
  babysitter_id  uuid  NOT NULL REFERENCES public.babysitter_profiles(id) ON DELETE CASCADE,
  age_group      text  NOT NULL,
  PRIMARY KEY (babysitter_id, age_group)
);

CREATE TABLE public.babysitter_certifications (
  babysitter_id  uuid  NOT NULL REFERENCES public.babysitter_profiles(id) ON DELETE CASCADE,
  certification  text  NOT NULL,
  PRIMARY KEY (babysitter_id, certification)
);

CREATE TABLE public.babysitter_superpowers (
  babysitter_id  uuid  NOT NULL REFERENCES public.babysitter_profiles(id) ON DELETE CASCADE,
  superpower     text  NOT NULL,
  PRIMARY KEY (babysitter_id, superpower)
);

CREATE TABLE public.babysitter_personality_tags (
  babysitter_id  uuid  NOT NULL REFERENCES public.babysitter_profiles(id) ON DELETE CASCADE,
  tag            text  NOT NULL,
  PRIMARY KEY (babysitter_id, tag)
);

CREATE TABLE public.babysitter_availability (
  babysitter_id  uuid  NOT NULL REFERENCES public.babysitter_profiles(id) ON DELETE CASCADE,
  slot           text  NOT NULL,
  PRIMARY KEY (babysitter_id, slot)
);

-- ─── requests ─────────────────────────────────────────────────────────────────

CREATE TABLE public.requests (
  id               uuid                 PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id        uuid                 NOT NULL REFERENCES public.users(id),
  babysitter_id    uuid                 NOT NULL REFERENCES public.babysitter_profiles(id),
  status           public.request_status NOT NULL DEFAULT 'pending',
  date             date                 NOT NULL,
  time             time                 NOT NULL,
  num_children     integer              NOT NULL CHECK (num_children > 0),
  child_age_range  text[]               NOT NULL DEFAULT '{}',
  area             text                 NOT NULL,
  note             text                 NOT NULL DEFAULT '',
  created_at       timestamptz          NOT NULL DEFAULT now()
);

-- ─── conversations ────────────────────────────────────────────────────────────
-- Created by app logic when a babysitter accepts a request.
-- UNIQUE on request_id enforces the 1-request-to-1-conversation rule.

CREATE TABLE public.conversations (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id     uuid        NOT NULL UNIQUE REFERENCES public.requests(id) ON DELETE CASCADE,
  parent_id      uuid        NOT NULL REFERENCES public.users(id),
  babysitter_id  uuid        NOT NULL REFERENCES public.babysitter_profiles(id),
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ─── messages ─────────────────────────────────────────────────────────────────
-- Ordered by created_at ASC in all queries.

CREATE TABLE public.messages (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  uuid        NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id        uuid        NOT NULL REFERENCES public.users(id),
  text             text        NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ─── favorites ────────────────────────────────────────────────────────────────
-- UNIQUE constraint enables ON CONFLICT DO NOTHING for idempotent toggles.

CREATE TABLE public.favorites (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id      uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  babysitter_id  uuid        NOT NULL REFERENCES public.babysitter_profiles(id) ON DELETE CASCADE,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (parent_id, babysitter_id)
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
-- Covering the most common query patterns in the app.

-- Babysitter inbox: find all requests addressed to a babysitter
CREATE INDEX ON public.requests (babysitter_id);
-- Parent view: find all requests made by a parent
CREATE INDEX ON public.requests (parent_id);
-- Filter pending / accepted / declined quickly
CREATE INDEX ON public.requests (status);

-- Load messages for a conversation, sorted by time
CREATE INDEX ON public.messages (conversation_id, created_at ASC);

-- Parent favorites list
CREATE INDEX ON public.favorites (parent_id);

-- Browse babysitters by city
CREATE INDEX ON public.babysitter_profiles (city);

-- Filter by language (most common filter in the parent browse screen)
CREATE INDEX ON public.babysitter_languages (language);
