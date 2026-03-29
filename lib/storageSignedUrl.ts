import { supabase } from '@/lib/supabase';

const DEFAULT_SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7;
const CACHE_REFRESH_BUFFER_MS = 60 * 1000;

type SignedUrlCacheEntry = {
  url: string;
  expiresAt: number;
};

const signedUrlCache = new Map<string, SignedUrlCacheEntry>();

function buildCacheKey(bucket: string, path: string) {
  return `${bucket}:${path}`;
}

export async function getSignedStorageUrl(
  bucket: string,
  path: string,
  expiresIn = DEFAULT_SIGNED_URL_TTL_SECONDS
) {
  if (!path) {
    return '';
  }

  const key = buildCacheKey(bucket, path);
  const cached = signedUrlCache.get(key);

  if (cached && cached.expiresAt > Date.now() + CACHE_REFRESH_BUFFER_MS) {
    return cached.url;
  }

  const storage = supabase.storage.from(bucket) as unknown as {
    createSignedUrl: (
      objectPath: string,
      ttlSeconds: number
    ) => Promise<{ data?: { signedUrl?: string | null } | null; error?: { message?: string | null } | null }>;
  };

  const { data, error } = await storage.createSignedUrl(path, expiresIn);

  if (error || !data?.signedUrl) {
    if (error?.message) {
      console.error(`getSignedStorageUrl(${bucket}) error:`, error.message);
    }
    return '';
  }

  const separator = data.signedUrl.includes('?') ? '&' : '?';
  const url = `${data.signedUrl}${separator}t=${Date.now()}`;

  signedUrlCache.set(key, {
    url,
    expiresAt: Date.now() + expiresIn * 1000,
  });

  return url;
}

export async function getSignedStorageUrlMap(
  bucket: string,
  paths: string[],
  expiresIn = DEFAULT_SIGNED_URL_TTL_SECONDS
) {
  const uniquePaths = Array.from(new Set(paths.filter(Boolean)));
  const entries = await Promise.all(
    uniquePaths.map(async path => [path, await getSignedStorageUrl(bucket, path, expiresIn)] as const)
  );

  return new Map(entries);
}
