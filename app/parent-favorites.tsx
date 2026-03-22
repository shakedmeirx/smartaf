import { useEffect, useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import AppShell from '@/components/navigation/AppShell';
import BabysitterCard from '@/components/parent/BabysitterCard';
import ScreenStateCard from '@/components/ui/ScreenStateCard';
import AppCard from '@/components/ui/AppCard';
import SectionHeader from '@/components/ui/SectionHeader';
import { useAppState } from '@/context/AppContext';
import { findPairChatThread } from '@/lib/requestLookup';
import { loadRatingAveragesForIds, RatingAverage } from '@/lib/ratings';
import { ParentDesignTokens, getRoleTheme } from '@/constants/theme';
import { strings } from '@/locales';

export default function ParentFavoritesScreen() {
  const { babysitters, favoriteBabysitterIds, toggleFavorite, currentUserId, chatThreads } = useAppState();
  const theme = getRoleTheme('parent');

  const [ratingsMap, setRatingsMap] = useState<Record<string, RatingAverage>>({});

  const favorites = babysitters.filter(b => favoriteBabysitterIds.has(b.id));

  useEffect(() => {
    const ids = favorites.map(b => b.id);
    loadRatingAveragesForIds(ids).then(setRatingsMap);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favoriteBabysitterIds]);

  return (
    <AppShell
      title={strings.myFavorites}
      activeTab="favorites"
      backgroundColor={theme.screenBackground}
      enableRootTabSwipe
    >
      <FlatList
        data={favorites}
        keyExtractor={item => item.id}
        contentContainerStyle={[
          styles.list,
          favorites.length === 0 && styles.listEmpty,
        ]}
        ListHeaderComponent={
          <AppCard
            role="parent"
            variant="hero"
            backgroundColor={theme.highlightedSurface}
            borderColor="transparent"
            style={styles.heroCard}
          >
            <SectionHeader
              title={strings.myFavorites}
              subtitle={
                favorites.length > 0
                  ? strings.browseBabysitters
                  : strings.favoritesEmpty
              }
            />
          </AppCard>
        }
        ListEmptyComponent={
          <ScreenStateCard
            role="parent"
            icon="heart-outline"
            title={strings.favoritesEmpty}
            body={strings.favoritesEmptyHint}
            actionLabel={strings.browseBabysitters}
            onActionPress={() => router.replace('/parent')}
          />
        }
        renderItem={({ item }) => (
          (() => {
            const existingThread =
              currentUserId
                ? findPairChatThread(chatThreads, currentUserId, item.id)
                : null;

            return (
              <BabysitterCard
                babysitter={item}
                onPress={() => router.push(`/babysitter-profile?id=${item.id}`)}
                onSendMessage={() => {
                  if (existingThread) {
                    router.push(
                      `/chat?requestId=${existingThread.requestId}&name=${encodeURIComponent(item.name)}`
                    );
                    return;
                  }

                  router.push(`/send-request?id=${item.id}&name=${encodeURIComponent(item.name)}`);
                }}
                messageButtonLabel={
                  existingThread
                    ? strings.alreadyChattingCta
                    : strings.sendMessage
                }
                isFavorite
                onToggleFavorite={() => toggleFavorite(item.id)}
                averageStars={ratingsMap[item.id]?.averageStars ?? null}
                ratingCount={ratingsMap[item.id]?.ratingCount ?? 0}
              />
            );
          })()
        )}
      />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: ParentDesignTokens.spacing.pageHorizontal,
    paddingTop: ParentDesignTokens.spacing.pageVertical,
    paddingBottom: 32,
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  heroCard: {
    marginBottom: ParentDesignTokens.spacing.cardGap,
  },
});
