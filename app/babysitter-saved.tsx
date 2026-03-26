import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import AppShell from '@/components/navigation/AppShell';
import AppCard from '@/components/ui/AppCard';
import AppPrimaryButton from '@/components/ui/AppPrimaryButton';
import ParentPostCard from '@/components/babysitter/ParentPostCard';
import AppText from '@/components/ui/AppText';
import { useAppState } from '@/context/AppContext';
import { findPairChatThread } from '@/lib/requestLookup';
import { BabyCityPalette, BabysitterDesignTokens, getRoleTheme } from '@/constants/theme';
import { strings } from '@/locales';
import { ParentPost } from '@/types/post';
import { supabase } from '@/lib/supabase';

export default function BabysitterSavedScreen() {
  const {
    posts,
    savedPostIds,
    toggleSavedPost,
    currentBabysitterProfileId,
    chatThreads,
    refreshBabysitterData,
  } = useAppState();
  const theme = getRoleTheme('babysitter');
  const [refreshing, setRefreshing] = useState(false);

  const savedPosts = posts.filter(post => savedPostIds.has(post.id));

  async function handleRefresh() {
    try {
      setRefreshing(true);
      await refreshBabysitterData();
    } finally {
      setRefreshing(false);
    }
  }

  async function handleViewProfile(post: ParentPost) {
    if (post.parentProfileId) {
      router.push({ pathname: '/family-profile', params: { id: post.parentProfileId } });
      return;
    }

    const { data } = await supabase
      .from('parent_profiles')
      .select('id')
      .eq('user_id', post.parentId)
      .maybeSingle();

    if (data?.id) {
      router.push({ pathname: '/family-profile', params: { id: data.id as string } });
    }
  }

  return (
    <AppShell
      title={strings.mySavedPosts}
      activeTab="saved"
      backgroundColor={theme.screenBackground}
      enableRootTabSwipe
      showBackButton
      backButtonVariant="icon"
      onBack={() => {
        if (router.canGoBack()) {
          router.back();
          return;
        }
        router.replace('/babysitter');
      }}
    >
      <View style={styles.screen}>
        <FlatList
          data={savedPosts}
          keyExtractor={item => item.id}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.list,
            savedPosts.length === 0 && styles.listEmpty,
          ]}
          ListHeaderComponent={<View style={styles.listHeaderSpacer} />}
          renderItem={({ item, index }) => (
            (() => {
              const existingThread =
                currentBabysitterProfileId
                  ? findPairChatThread(chatThreads, item.parentId, currentBabysitterProfileId)
                  : null;

              return (
                <ParentPostCard
                  post={item}
                  index={index}
                  onViewProfile={() => void handleViewProfile(item)}
                  onSendMessage={() => {
                    if (existingThread) {
                      router.push(
                        `/chat?requestId=${existingThread.requestId}&name=${encodeURIComponent(item.parentName ?? '')}`
                      );
                      return;
                    }

                    router.push(
                      `/send-request?id=${item.parentId}&name=${encodeURIComponent(item.parentName ?? '')}&targetRole=parent`
                    );
                  }}
                  messageButtonLabel={
                    existingThread
                      ? strings.alreadyChattingCta
                      : strings.postSendMessage
                  }
                  isSaved={savedPostIds.has(item.id)}
                  onToggleSave={() => void toggleSavedPost(item.id)}
                />
              );
            })()
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <AppCard style={styles.emptyCard}>
                <View style={styles.emptyAmbientOrbPrimary} />
                <View style={styles.emptyAmbientOrbSecondary} />

                <View style={styles.emptyBadgeWrap}>
                  <View style={styles.emptyIconWrap}>
                    <MaterialIcons name="bookmark" size={42} color={BabyCityPalette.primary} />
                  </View>
                  <View style={styles.emptyAccentChip}>
                    <MaterialIcons name="favorite" size={18} color="#ffffff" />
                  </View>
                </View>

                <AppText variant="h2" weight="800" align="center" style={styles.emptyTitle}>
                  {strings.savedPostsEmpty}
                </AppText>
                <AppText variant="body" tone="muted" align="center" style={styles.emptyBody}>
                  {strings.savedPostsEmptyHint}
                </AppText>
                <AppPrimaryButton
                  label={strings.savedPostsEmptyAction}
                  onPress={() => router.replace('/babysitter')}
                  style={styles.emptyButton}
                />
              </AppCard>

              <View style={styles.emptyTipRow}>
                <MaterialIcons name="info-outline" size={16} color={`${BabyCityPalette.textSecondary}b8`} />
                <AppText variant="caption" tone="muted" style={styles.emptyTipText}>
                  {strings.savedPostsTip}
                </AppText>
              </View>
            </View>
          }
        />
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  list: {
    paddingHorizontal: BabysitterDesignTokens.spacing.pageHorizontal,
    paddingTop: 4,
    paddingBottom: 34,
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  listHeaderSpacer: {
    height: 2,
  },
  emptyWrap: {
    alignItems: 'center',
  },
  emptyCard: {
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
    paddingHorizontal: 28,
    paddingVertical: 40,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(219,208,231,0.35)',
    shadowColor: BabyCityPalette.primary,
    shadowOpacity: 0.08,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
    width: '100%',
  },
  emptyAmbientOrbPrimary: {
    position: 'absolute',
    top: -44,
    right: -46,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(112,42,225,0.06)',
  },
  emptyAmbientOrbSecondary: {
    position: 'absolute',
    bottom: -32,
    left: -30,
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: 'rgba(233,222,245,0.44)',
  },
  emptyBadgeWrap: {
    position: 'relative',
    marginBottom: 28,
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BabysitterDesignTokens.surfaces.cardMuted,
  },
  emptyAccentChip: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff8eac',
    borderWidth: 4,
    borderColor: '#ffffff',
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
  emptyTipRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
  },
  emptyTipText: {
    textAlign: 'center',
  },
});
