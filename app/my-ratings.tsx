import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import AppShell from '@/components/navigation/AppShell';
import AppCard from '@/components/ui/AppCard';
import AppScreen from '@/components/ui/AppScreen';
import AppText from '@/components/ui/AppText';
import SectionHeader from '@/components/ui/SectionHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import ScreenStateCard from '@/components/ui/ScreenStateCard';
import { BabyCityPalette, ParentDesignTokens, getRoleTheme } from '@/constants/theme';
import { useAppState } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { strings } from '@/locales';
import type { BabysitterRating } from '@/types/rating';

export default function MyRatingsScreen() {
  const { currentUserId } = useAppState();
  const theme = getRoleTheme('parent');

  const [ratings, setRatings] = useState<(BabysitterRating & { babysitterName?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUserId) { setLoading(false); return; }
    loadMyRatings(currentUserId);
  }, [currentUserId]);

  async function loadMyRatings(parentId: string) {
    const { data } = await supabase
      .from('babysitter_ratings')
      .select(`
        id, parent_id, babysitter_id, stars, review_text, created_at,
        babysitter_profiles!babysitter_id ( users!user_id ( name ) )
      `)
      .eq('parent_id', parentId)
      .order('created_at', { ascending: false });

    if (data) {
      setRatings(
        data.map((row: any) => ({
          id: row.id,
          parentId: row.parent_id,
          babysitterId: row.babysitter_id,
          stars: row.stars,
          reviewText: row.review_text ?? null,
          createdAt: row.created_at,
          babysitterName: row.babysitter_profiles?.users?.name ?? undefined,
        }))
      );
    }
    setLoading(false);
  }

  return (
    <AppShell
      title={strings.ratingsGivenTitle}
      activeTab="settings"
      backgroundColor={theme.screenBackground}
      showBackButton
      onBack={() => router.back()}
    >
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={BabyCityPalette.primary} />
        </View>
      ) : (
        <AppScreen scrollable backgroundColor={theme.screenBackground}>
          <AppCard
            role="parent"
            variant="hero"
            backgroundColor={theme.highlightedSurface}
            borderColor="transparent"
            style={styles.heroCard}
          >
            <SectionHeader
              title={strings.ratingsGivenTitle}
              subtitle={ratings.length > 0 ? strings.ratingsTitle : strings.ratingsGivenEmpty}
            />
          </AppCard>
          {ratings.length === 0 ? (
            <ScreenStateCard
              role="parent"
              icon="star-outline"
              title={strings.ratingsGivenEmpty}
              body={strings.ratingsGivenEmptyHint}
              actionLabel={strings.navChats}
              onActionPress={() => router.push('/parent-requests')}
            />
          ) : (
            ratings.map(r => (
              <AppCard key={r.id} variant="list" style={styles.card}>
                <View style={styles.cardTop}>
                  <StatusBadge label={`${r.stars}/5`} status="completed" />
                  {r.babysitterName ? (
                    <AppText variant="bodyLarge" weight="700" style={styles.name}>
                      {r.babysitterName}
                    </AppText>
                  ) : null}
                </View>
                <AppText variant="body" style={styles.stars}>
                  {'★'.repeat(r.stars)}
                  {'☆'.repeat(5 - r.stars)}
                </AppText>
                {r.reviewText ? (
                  <AppText variant="body" style={styles.review}>
                    {r.reviewText}
                  </AppText>
                ) : null}
              </AppCard>
            ))
          )}
        </AppScreen>
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    marginBottom: ParentDesignTokens.spacing.cardGap,
  },
  card: {
    marginBottom: ParentDesignTokens.spacing.cardGap,
  },
  cardTop: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  stars: {
    color: '#e89a30',
    marginBottom: 6,
  },
  name: {
    writingDirection: 'rtl',
  },
  review: {
    lineHeight: 20,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
