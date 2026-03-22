-- Add request_type discriminator to distinguish quick messages from full childcare requests

ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS request_type text NOT NULL DEFAULT 'full_childcare'
  CHECK (request_type IN ('quick_message', 'full_childcare'));

-- Fix broken constraint: quick_message requests have num_children = 0
ALTER TABLE public.requests DROP CONSTRAINT IF EXISTS requests_num_children_check;
ALTER TABLE public.requests ADD CONSTRAINT requests_num_children_check
  CHECK (num_children >= 0);

-- Backfill: existing rows with sentinel date '2100-01-01' are quick_message
UPDATE public.requests
  SET request_type = 'quick_message'
  WHERE date = '2100-01-01';
