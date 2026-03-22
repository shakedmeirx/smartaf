// Supabase Edge Function: send-push
// Receives a recipientUserId + notification payload, looks up the recipient's
// Expo push tokens, and sends them via the Expo Push API.
// Called by the app after sending a message or creating a request.

import { createClient } from 'npm:@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushPayload {
  recipientUserId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

Deno.serve(async (req: Request) => {
  // Only allow POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let payload: PushPayload;
  try {
    payload = await req.json() as PushPayload;
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const { recipientUserId, title, body, data } = payload;
  if (!recipientUserId || !title || !body) {
    return new Response('Missing required fields', { status: 400 });
  }

  // Use service role to look up tokens (bypasses RLS)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: rows, error } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', recipientUserId);

  if (error) {
    console.error('push_tokens lookup error:', error.message);
    return new Response('DB error', { status: 500 });
  }

  const tokens = (rows ?? []).map((r: { token: string }) => r.token).filter(Boolean);
  if (tokens.length === 0) {
    // No tokens registered for this user — silently succeed
    return new Response(JSON.stringify({ sent: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Send via Expo Push API (batched)
  const messages = tokens.map(token => ({
    to: token,
    title,
    body,
    data: data ?? {},
    sound: 'default',
    priority: 'high',
    channelId: 'default',
  }));

  const expoRes = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(messages),
  });

  if (!expoRes.ok) {
    const text = await expoRes.text();
    console.error('Expo Push API error:', text);
    return new Response('Expo error', { status: 502 });
  }

  return new Response(JSON.stringify({ sent: tokens.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
