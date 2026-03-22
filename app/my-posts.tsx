import React from 'react';
import {
  View,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { strings } from '@/locales';
import { useAppState } from '@/context/AppContext';
import AppShell from '@/components/navigation/AppShell';
import AppCard from '@/components/ui/AppCard';
import AppPrimaryButton from '@/components/ui/AppPrimaryButton';
import AppScreen from '@/components/ui/AppScreen';
import SectionHeader from '@/components/ui/SectionHeader';
import ScreenStateCard from '@/components/ui/ScreenStateCard';
import ParentOwnedPostCard from '@/components/parent/ParentOwnedPostCard';
import { ParentPost } from '@/types/post';
import { ParentDesignTokens, getRoleTheme } from '@/constants/theme';

export default function MyPostsScreen() {
  const { myPosts, togglePostActive, deletePost, refreshParentData } = useAppState();
  const theme = getRoleTheme('parent');
  const [refreshing, setRefreshing] = React.useState(false);

  async function handleRefresh() {
    try {
      setRefreshing(true);
      await refreshParentData();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <AppShell
      title={strings.myPosts}
      activeTab="home"
      backgroundColor={theme.screenBackground}
      showBackButton
      onBack={() => {
        if (router.canGoBack()) { router.back(); return; }
        router.replace('/parent');
      }}
    >
      <AppScreen
        scrollable
        backgroundColor={theme.screenBackground}
        scrollProps={{
          refreshControl: <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />,
          showsVerticalScrollIndicator: false,
        }}
      >
        <AppCard
          role="parent"
          variant="hero"
          backgroundColor={theme.highlightedSurface}
          borderColor="transparent"
          style={styles.heroCard}
        >
          <SectionHeader
            title={strings.myPosts}
            subtitle={myPosts.length > 0 ? strings.createPostSubtitle : strings.myPostsEmptyHint}
          />
          <AppPrimaryButton
            label={strings.myPostsNewPost}
            onPress={() => router.push('/create-post')}
            style={styles.newPostButton}
          />
        </AppCard>

        {myPosts.length === 0 ? (
          <ScreenStateCard
            role="parent"
            icon="document-text-outline"
            title={strings.myPostsEmpty}
            body={strings.myPostsEmptyHint}
          />
        ) : (
          <View style={styles.feed}>
            {myPosts.map(post => (
              <PostRow
                key={post.id}
                post={post}
                onToggle={isActive => togglePostActive(post.id, isActive)}
                onDelete={() => {
                  Alert.alert(
                    strings.myPostsDeleteConfirmTitle,
                    strings.myPostsDeleteConfirmMessage,
                    [
                      { text: strings.myPostsDeleteConfirmCancel, style: 'cancel' },
                      {
                        text: strings.myPostsDeleteConfirmOk,
                        style: 'destructive',
                        onPress: () => deletePost(post.id),
                      },
                    ],
                  );
                }}
              />
            ))}
          </View>
        )}
      </AppScreen>
    </AppShell>
  );
}

// ─── PostRow ──────────────────────────────────────────────────────────────────

function PostRow({
  post,
  onToggle,
  onDelete,
}: {
  post: ParentPost;
  onToggle: (isActive: boolean) => void;
  onDelete: () => void;
}) {
  return (
    <ParentOwnedPostCard
      post={post}
      mode="management"
      onPress={() => router.push({ pathname: '/create-post', params: { postId: post.id } })}
      onEdit={() => router.push({ pathname: '/create-post', params: { postId: post.id } })}
      onToggleActive={() => onToggle(!post.isActive)}
      onDelete={onDelete}
    />
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  heroCard: {
    marginBottom: ParentDesignTokens.spacing.cardGap,
  },
  newPostButton: {
    marginTop: 14,
  },
  feed: {
    gap: 14,
  },
});
