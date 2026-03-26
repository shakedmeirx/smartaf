import React, { useMemo } from 'react';
import {
  Alert,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { strings } from '@/locales';
import { useAppState } from '@/context/AppContext';
import AppShell from '@/components/navigation/AppShell';
import AppCard from '@/components/ui/AppCard';
import AppPrimaryButton from '@/components/ui/AppPrimaryButton';
import AppScreen from '@/components/ui/AppScreen';
import AppText from '@/components/ui/AppText';
import SmartafWordmark from '@/components/ui/SmartafWordmark';
import AvatarCircle from '@/components/ui/AvatarCircle';
import ParentOwnedPostCard from '@/components/parent/ParentOwnedPostCard';
import { ParentPost } from '@/types/post';
import { BabyCityPalette, BabyCityShadows, ParentDesignTokens, getRoleTheme } from '@/constants/theme';

export default function MyPostsScreen() {
  const { myPosts, togglePostActive, deletePost, refreshParentData } = useAppState();
  const theme = getRoleTheme('parent');
  const [refreshing, setRefreshing] = React.useState(false);
  const sortedPosts = useMemo(
    () => [...myPosts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [myPosts]
  );
  const activePostsCount = useMemo(() => myPosts.filter(post => post.isActive).length, [myPosts]);
  const inactivePostsCount = myPosts.length - activePostsCount;

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
      backButtonVariant="icon"
      swapHeaderEdgeControls
      hideHeaderMenuButton
      onBack={() => {
        if (router.canGoBack()) { router.back(); return; }
        router.replace('/parent');
      }}
      titleContent={
        <View style={styles.headerBrandWrap}>
          <SmartafWordmark size="sm" textColor={BabyCityPalette.primary} />
        </View>
      }
      renderHeaderActions={({ openMenu, drawerPhotoUrl, drawerInitials }) => (
        <View style={styles.headerActions}>
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.84}
            onPress={openMenu}
            style={styles.headerAvatarButton}
          >
            <AvatarCircle
              name={drawerInitials || strings.appName}
              photoUrl={drawerPhotoUrl ?? undefined}
              size={36}
              tone="accent"
            />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.84}
            onPress={openMenu}
            style={styles.headerMenuButton}
          >
            <MaterialIcons name="menu" size={20} color={BabyCityPalette.primary} />
          </TouchableOpacity>
        </View>
      )}
      bottomOverlay={
        <LinearGradient
          colors={['rgba(248,250,255,0)', 'rgba(248,250,255,0.92)', '#f8faff']}
          locations={[0, 0.35, 1]}
          style={styles.bottomOverlay}
        >
          <AppPrimaryButton
            label={strings.myPostsNewPost}
            onPress={() => router.push('/create-post')}
            style={styles.primaryCta}
          />
        </LinearGradient>
      }
    >
      <AppScreen
        scrollable
        backgroundColor={theme.screenBackground}
        contentContainerStyle={styles.screenContent}
        scrollProps={{
          refreshControl: <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />,
          showsVerticalScrollIndicator: false,
        }}
      >
        <View style={styles.backdropOrbTop} />
        <View style={styles.backdropOrbBottom} />

        <View style={styles.heroSection}>
          <AppText variant="h1" weight="800" style={[styles.heroTitle, { color: theme.title }]}>
            {strings.myPosts}
          </AppText>
          <AppText variant="body" style={styles.heroSubtitle}>
            {sortedPosts.length > 0 ? strings.createPostSubtitle : strings.myPostsEmptyHint}
          </AppText>
        </View>

        <AppCard style={[styles.summaryCard, BabyCityShadows.soft]}>
          <LinearGradient
            colors={['rgba(255,255,255,0.95)', 'rgba(240,244,255,0.95)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.summaryGlowLarge} />
          <View style={styles.summaryGlowSmall} />

          <View style={styles.summaryHeader}>
            <View style={styles.summaryStats}>
              <View style={styles.summaryStatChip}>
                <AppText variant="caption" weight="700" style={styles.summaryStatLabel}>
                  {strings.myPostsInactive}
                </AppText>
                <AppText variant="bodyLarge" weight="800" style={styles.summaryStatValue}>
                  {inactivePostsCount}
                </AppText>
              </View>
              <View style={[styles.summaryStatChip, styles.summaryStatChipPrimary]}>
                <AppText variant="caption" weight="700" style={styles.summaryStatLabelPrimary}>
                  {strings.myPostsActive}
                </AppText>
                <AppText variant="bodyLarge" weight="800" style={styles.summaryStatValuePrimary}>
                  {activePostsCount}
                </AppText>
              </View>
            </View>

            <View style={styles.summaryCopy}>
              <AppText variant="caption" weight="700" style={styles.summaryEyebrow}>
                {strings.myPosts}
              </AppText>
              <AppText variant="h2" weight="800" style={styles.summaryTitle}>
                {sortedPosts.length}
              </AppText>
              <AppText variant="body" tone="muted" style={styles.summaryBody}>
                {sortedPosts.length > 0 ? strings.createPostSubtitle : strings.myPostsEmptyHint}
              </AppText>
            </View>
          </View>
        </AppCard>

        {sortedPosts.length === 0 ? (
          <AppCard style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <MaterialIcons name="campaign" size={34} color={BabyCityPalette.primary} />
            </View>
            <AppText variant="h2" weight="800" align="center" style={styles.emptyTitle}>
              {strings.myPostsEmpty}
            </AppText>
            <AppText variant="body" tone="muted" align="center" style={styles.emptyBody}>
              {strings.myPostsEmptyHint}
            </AppText>
          </AppCard>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <AppText variant="body" tone="muted" style={styles.sectionHint}>
                {activePostsCount} {strings.myPostsActive} · {inactivePostsCount} {strings.myPostsInactive}
              </AppText>
              <View style={styles.sectionTitleWrap}>
                <View style={styles.sectionIconChip}>
                  <MaterialIcons name="campaign" size={20} color={BabyCityPalette.primary} />
                </View>
                <AppText variant="bodyLarge" weight="800">
                  {strings.myPosts}
                </AppText>
              </View>
            </View>

            <View style={styles.feed}>
              {sortedPosts.map(post => (
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
          </>
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
  headerBrandWrap: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatarButton: {
    borderRadius: 999,
  },
  headerMenuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(240,244,255,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(205,221,254,0.65)',
  },
  bottomOverlay: {
    paddingHorizontal: ParentDesignTokens.spacing.pageHorizontal,
    paddingTop: 22,
    paddingBottom: 10,
  },
  primaryCta: {
    minHeight: 58,
  },
  screenContent: {
    paddingHorizontal: ParentDesignTokens.spacing.pageHorizontal,
    paddingTop: ParentDesignTokens.spacing.pageVertical,
    paddingBottom: 136,
  },
  backdropOrbTop: {
    position: 'absolute',
    top: -30,
    left: -42,
    width: 168,
    height: 168,
    borderRadius: 84,
    backgroundColor: 'rgba(112,42,225,0.08)',
  },
  backdropOrbBottom: {
    position: 'absolute',
    right: -22,
    top: 148,
    width: 122,
    height: 122,
    borderRadius: 61,
    backgroundColor: 'rgba(255,142,172,0.08)',
  },
  heroSection: {
    alignItems: 'flex-end',
    marginBottom: 18,
    gap: 10,
  },
  heroTitle: {
    fontSize: 34,
    lineHeight: 42,
    textAlign: 'right',
  },
  heroSubtitle: {
    textAlign: 'right',
    lineHeight: 24,
    color: BabyCityPalette.textSecondary,
    maxWidth: 320,
  },
  summaryCard: {
    position: 'relative',
    overflow: 'hidden',
    padding: 22,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(205,221,254,0.5)',
  },
  summaryGlowLarge: {
    position: 'absolute',
    left: -36,
    top: -42,
    width: 136,
    height: 136,
    borderRadius: 68,
    backgroundColor: 'rgba(233,222,245,0.78)',
  },
  summaryGlowSmall: {
    position: 'absolute',
    right: 18,
    bottom: -22,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(205,221,254,0.52)',
  },
  summaryHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  summaryCopy: {
    flex: 1,
    alignItems: 'flex-end',
  },
  summaryEyebrow: {
    color: BabyCityPalette.primary,
    marginBottom: 4,
  },
  summaryTitle: {
    color: BabyCityPalette.textPrimary,
    fontSize: 40,
    lineHeight: 46,
    marginBottom: 4,
  },
  summaryBody: {
    textAlign: 'right',
    lineHeight: 22,
  },
  summaryStats: {
    gap: 10,
  },
  summaryStatChip: {
    minWidth: 102,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(205,221,254,0.75)',
    alignItems: 'center',
  },
  summaryStatChipPrimary: {
    backgroundColor: BabyCityPalette.primary,
    borderColor: 'rgba(112,42,225,0.55)',
  },
  summaryStatLabel: {
    color: BabyCityPalette.textSecondary,
    marginBottom: 2,
  },
  summaryStatValue: {
    color: BabyCityPalette.textPrimary,
  },
  summaryStatLabelPrimary: {
    color: 'rgba(255,255,255,0.82)',
    marginBottom: 2,
  },
  summaryStatValuePrimary: {
    color: '#ffffff',
  },
  emptyCard: {
    alignItems: 'center',
    paddingHorizontal: 26,
    paddingVertical: 34,
    borderWidth: 1,
    borderColor: 'rgba(205,221,254,0.55)',
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: ParentDesignTokens.surfaces.cardMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyTitle: {
    marginBottom: 8,
  },
  emptyBody: {
    lineHeight: 24,
    maxWidth: 280,
  },
  sectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    marginBottom: 14,
  },
  sectionHint: {
    textAlign: 'left',
    flexShrink: 1,
  },
  sectionTitleWrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  sectionIconChip: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${BabyCityPalette.primary}12`,
  },
  feed: {
    gap: 14,
  },
});
