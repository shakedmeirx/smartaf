import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import AppShell from '@/components/navigation/AppShell';
import BabysitterCard from '@/components/parent/BabysitterCard';
import AppPrimaryButton from '@/components/ui/AppPrimaryButton';
import AppText from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useAppState } from '@/context/AppContext';
import { findPairChatThread } from '@/lib/requestLookup';
import { loadRatingAveragesForIds, RatingAverage } from '@/lib/ratings';
import { BabyCityPalette, ParentDesignTokens, getRoleTheme } from '@/constants/theme';
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
      title={strings.savedBabysittersTitle}
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
        ListHeaderComponent={<View style={styles.listHeaderSpacer} />}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="heart" size={54} color={`${BabyCityPalette.primary}88`} />
            </View>
            <AppText variant="h2" weight="800" align="center" style={styles.emptyTitle}>
              {strings.favoritesEmpty}
            </AppText>
            <AppText variant="body" tone="muted" align="center" style={styles.emptyBody}>
              {strings.favoritesEmptyHint}
            </AppText>
            <AppPrimaryButton
              label={strings.savedBabysittersEmptyAction}
              onPress={() => router.replace('/parent')}
              style={styles.emptyButton}
            />
          </View>
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
                variant="saved"
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
    paddingTop: 14,
    paddingBottom: 34,
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  listHeaderSpacer: {
    height: 4,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 40,
    paddingHorizontal: 28,
    paddingVertical: 34,
    backgroundColor: '#ffffff',
    shadowColor: BabyCityPalette.primary,
    shadowOpacity: 0.08,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  emptyIconWrap: {
    width: 130,
    height: 130,
    borderRadius: 65,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ParentDesignTokens.surfaces.cardMuted,
    marginBottom: 24,
  },
  emptyTitle: {
    maxWidth: 260,
  },
  emptyBody: {
    marginTop: 10,
    marginBottom: 26,
    maxWidth: 280,
    lineHeight: 24,
  },
  emptyButton: {
    minWidth: 210,
  },
});
