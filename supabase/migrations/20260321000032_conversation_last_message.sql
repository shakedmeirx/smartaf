-- ─── Conversation last-message denormalisation ────────────────────────────────
-- Adds three columns to conversations so the realtime subscription can deliver
-- "new message" signals without the client needing a separate messages channel.
-- A SECURITY DEFINER trigger function keeps these columns up-to-date whenever a
-- message is inserted, bypassing RLS so the update always succeeds.

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS last_message_at        timestamptz,
  ADD COLUMN IF NOT EXISTS last_message_sender_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_message_text       text;

-- ─── Trigger function ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_update_conversation_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
  SET
    last_message_at        = NEW.created_at,
    last_message_sender_id = NEW.sender_id,
    last_message_text      = NEW.text
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$;

-- ─── Trigger ──────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_conversation_last_message ON public.messages;

CREATE TRIGGER trg_conversation_last_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.fn_update_conversation_last_message();
