import { FlatList, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import AppShell from '@/components/navigation/AppShell';
import ParentPostCard from '@/components/babysitter/ParentPostCard';
import ScreenStateCard from '@/components/ui/ScreenStateCard';
import AppCard from '@/components/ui/AppCard';
import AppText from '@/components/ui/AppText';
import SectionHeader from '@/components/ui/SectionHeader';
import { useAppState } from '@/context/AppContext';
import { findPairChatThread } from '@/lib/requestLookup';
import { BabysitterDesignTokens, getRoleTheme } from '@/constants/theme';
import { strings } from '@/locales';
import { ParentPost } from '@/types/post';
import { supabase } from '@/lib/supabase';

export default function BabysitterSavedScreen() {
  const { posts, savedPostIds, toggleSavedPost, currentBabysitterProfileId, chatThreads } = useAppState();
  const theme = getRoleTheme('babysitter');

  const savedPosts = posts.filter(post => savedPostIds.has(post.id));

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
    >
      <FlatList
        data={savedPosts}
        keyExtractor={item => item.id}
        contentContainerStyle={[
          styles.list,
          savedPosts.length === 0 && styles.listEmpty,
        ]}
        ListHeaderComponent={
          <AppCard
            role="babysitter"
            variant="hero"
            backgroundColor={theme.highlightedSurface}
            borderColor="transparent"
            style={styles.heroCard}
          >
            <SectionHeader
              title={strings.mySavedPosts}
              subtitle={
                savedPosts.length > 0
                  ? strings.babysitterDashboardSubtitle
                  : strings.savedPostsEmpty
              }
            />
          </AppCard>
        }
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
          <ScreenStateCard
            role="babysitter"
            icon="bookmark-outline"
            title={strings.savedPostsEmpty}
          />
        }
      />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: BabysitterDesignTokens.spacing.pageHorizontal,
    paddingTop: BabysitterDesignTokens.spacing.pageVertical,
    paddingBottom: 32,
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  heroCard: {
    marginBottom: BabysitterDesignTokens.spacing.cardGap,
  },
});
