import { supabase } from './supabase';
import type { BabysitterRating } from '@/types/rating';

export type RatingAverage = {
  averageStars: number;
  ratingCount: number;
};

/**
 * Fetches stars for ALL babysitters in a single query and returns a map
 * keyed by babysitter_profile id. Used by discovery screens to avoid N+1.
 */
export async function loadRatingAverages(): Promise<Record<string, RatingAverage>> {
  const { data, error } = await supabase
    .from('babysitter_ratings')
    .select('babysitter_id, stars');

  if (error || !data) return {};

  const acc: Record<string, { sum: number; count: number }> = {};
  for (const row of data as Array<{ babysitter_id: string; stars: number }>) {
    const entry = acc[row.babysitter_id];
    if (entry) {
      entry.sum += row.stars;
      entry.count += 1;
    } else {
      acc[row.babysitter_id] = { sum: row.stars, count: 1 };
    }
  }

  const result: Record<string, RatingAverage> = {};
  for (const [id, { sum, count }] of Object.entries(acc)) {
    result[id] = {
      averageStars: Math.round((sum / count) * 10) / 10,
      ratingCount: count,
    };
  }
  return result;
}

/**
 * Fetches stars only for a specific set of babysitter IDs. Use this when
 * displaying a small subset (e.g. favorites) to avoid loading all ratings.
 */
export async function loadRatingAveragesForIds(ids: string[]): Promise<Record<string, RatingAverage>> {
  if (ids.length === 0) return {};

  const { data, error } = await supabase
    .from('babysitter_ratings')
    .select('babysitter_id, stars')
    .in('babysitter_id', ids);

  if (error || !data) return {};

  const acc: Record<string, { sum: number; count: number }> = {};
  for (const row of data as Array<{ babysitter_id: string; stars: number }>) {
    const entry = acc[row.babysitter_id];
    if (entry) {
      entry.sum += row.stars;
      entry.count += 1;
    } else {
      acc[row.babysitter_id] = { sum: row.stars, count: 1 };
    }
  }

  const result: Record<string, RatingAverage> = {};
  for (const [id, { sum, count }] of Object.entries(acc)) {
    result[id] = {
      averageStars: Math.round((sum / count) * 10) / 10,
      ratingCount: count,
    };
  }
  return result;
}

export async function loadBabysitterRatings(babysitterId: string): Promise<{
  ratings: BabysitterRating[];
  averageStars: number | null;
}> {
  const { data, error } = await supabase
    .from('babysitter_ratings')
    .select('id, parent_id, babysitter_id, stars, review_text, created_at, users!parent_id ( name )')
    .eq('babysitter_id', babysitterId)
    .order('created_at', { ascending: false });

  if (error || !data) return { ratings: [], averageStars: null };

  const ratings: BabysitterRating[] = data.map((row: any) => ({
    id: row.id,
    parentId: row.parent_id,
    babysitterId: row.babysitter_id,
    stars: row.stars,
    reviewText: row.review_text ?? null,
    createdAt: row.created_at,
    parentName: row.users?.name ?? undefined,
  }));

  const averageStars =
    ratings.length > 0
      ? Math.round((ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length) * 10) / 10
      : null;

  return { ratings, averageStars };
}

export async function loadParentExistingRating(
  parentId: string,
  babysitterId: string
): Promise<BabysitterRating | null> {
  const { data, error } = await supabase
    .from('babysitter_ratings')
    .select('id, parent_id, babysitter_id, stars, review_text, created_at')
    .eq('parent_id', parentId)
    .eq('babysitter_id', babysitterId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    parentId: data.parent_id,
    babysitterId: data.babysitter_id,
    stars: data.stars,
    reviewText: data.review_text ?? null,
    createdAt: data.created_at,
  };
}

export async function submitRating(
  parentId: string,
  babysitterId: string,
  stars: number,
  reviewText: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('babysitter_ratings')
    .upsert(
      {
        parent_id: parentId,
        babysitter_id: babysitterId,
        stars,
        review_text: reviewText.trim() || null,
      },
      { onConflict: 'parent_id,babysitter_id' }
    );

  return { error: error?.message ?? null };
}
