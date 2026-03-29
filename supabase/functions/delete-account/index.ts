import { createClient } from 'npm:@supabase/supabase-js@2';

type DeleteAccountPayload = {
  reason?: string | null;
};

type UserRow = {
  id: string;
  name: string | null;
};

type ProfileRow = {
  id?: string | null;
  profile_photo_path?: string | null;
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return json({ error: 'Missing authorization' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return json({ error: 'Missing Supabase environment' }, 500);
  }

  const authedClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  const {
    data: { user },
    error: userError,
  } = await authedClient.auth.getUser();

  if (userError || !user) {
    return json({ error: 'Unauthorized' }, 401);
  }

  let payload: DeleteAccountPayload = {};
  try {
    payload = await req.json() as DeleteAccountPayload;
  } catch {
    payload = {};
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

  const [{ data: userRow }, { data: parentProfile }, { data: babysitterProfile }] = await Promise.all([
    adminClient
      .from('users')
      .select('id, name')
      .eq('id', user.id)
      .maybeSingle<UserRow>(),
    adminClient
      .from('parent_profiles')
      .select('profile_photo_path')
      .eq('user_id', user.id)
      .maybeSingle<ProfileRow>(),
    adminClient
      .from('babysitter_profiles')
      .select('id, profile_photo_path')
      .eq('user_id', user.id)
      .maybeSingle<ProfileRow>(),
  ]);

  const galleryPhotos =
    babysitterProfile?.id
      ? await adminClient
          .from('babysitter_gallery_photos')
          .select('storage_path')
          .eq('babysitter_id', babysitterProfile.id)
      : { data: null };

  const parentPhotoPaths = [parentProfile?.profile_photo_path].filter(
    (value): value is string => !!value
  );
  const babysitterPhotoPaths = [
    babysitterProfile?.profile_photo_path,
    ...((galleryPhotos.data ?? []).map(row => row.storage_path as string | null)),
  ].filter((value): value is string => !!value);

  if (parentPhotoPaths.length > 0) {
    await adminClient.storage.from('parent-photos').remove(parentPhotoPaths);
  }

  if (babysitterPhotoPaths.length > 0) {
    await adminClient.storage.from('babysitter-photos').remove(babysitterPhotoPaths);
  }

  const deletionEmail = user.email?.trim() || `deleted-user+${user.id}@smartaf.invalid`;
  const deletionPhone = user.phone?.trim() || null;
  const displayName =
    userRow?.name?.trim() ||
    (typeof user.user_metadata?.name === 'string' ? user.user_metadata.name.trim() : '') ||
    deletionPhone ||
    deletionEmail;

  await adminClient.from('support_requests').insert({
    user_id: user.id,
    request_type: 'delete',
    status: 'resolved',
    name: displayName,
    email: deletionEmail,
    phone: deletionPhone,
    subject: 'Self-serve account deletion',
    message: payload.reason?.trim() || 'User initiated self-serve account deletion from the app.',
    metadata: {
      source: 'in_app_delete_account',
      deleted_via: 'edge_function',
      executed_at: new Date().toISOString(),
    },
  });

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);

  if (deleteError) {
    console.error('delete-account error:', deleteError.message);
    return json({ error: 'Unable to delete account' }, 500);
  }

  return json({ success: true });
});
