import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, RefreshControl, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AppShell from '@/components/navigation/AppShell';
import AppCard from '@/components/ui/AppCard';
import AppPrimaryButton from '@/components/ui/AppPrimaryButton';
import AppScreen from '@/components/ui/AppScreen';
import AppText from '@/components/ui/AppText';
import { BabyCityPalette, getRoleTheme } from '@/constants/theme';
import { useAppState } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { strings } from '@/locales';
import { supabase } from '@/lib/supabase';

type BlockedUserRow = {
  blocked_user_id: string;
  created_at: string;
  users: {
    name?: string | null;
  } | null;
};

type BlockedUserItem = {
  userId: string;
  name: string;
  createdAt: string;
};

function formatBlockedDate(value: string) {
  try {
    return new Intl.DateTimeFormat('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function BlockedUsersScreen() {
  const { activeRole } = useAuth();
  const { currentUserId, unblockUser } = useAppState();
  const theme = getRoleTheme(activeRole === 'babysitter' ? 'babysitter' : 'parent');
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const blockedCountLabel = useMemo(() => {
    if (blockedUsers.length === 0) {
      return strings.blockedUsersEmptyTitle;
    }

    if (blockedUsers.length === 1) {
      return strings.blockedUsersSingleCount;
    }

    return strings.blockedUsersCount(blockedUsers.length);
  }, [blockedUsers.length]);

  const loadBlockedUsers = useCallback(async (showLoader = true) => {
    if (!currentUserId) {
      setBlockedUsers([]);
      setLoading(false);
      return;
    }

    if (showLoader) {
      setLoading(true);
    }

    const { data, error } = await supabase
      .from('user_blocks')
      .select('blocked_user_id, created_at, users!blocked_user_id(name)')
      .eq('blocker_user_id', currentUserId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('loadBlockedUsers error:', error.message);
      setBlockedUsers([]);
      setLoading(false);
      return;
    }

    const nextUsers = ((data ?? []) as BlockedUserRow[]).map(row => ({
      userId: row.blocked_user_id,
      createdAt: row.created_at,
      name: row.users?.name?.trim() || strings.notFilled,
    }));

    setBlockedUsers(nextUsers);
    setLoading(false);
  }, [currentUserId]);

  useEffect(() => {
    void loadBlockedUsers();
  }, [loadBlockedUsers]);

  async function handleRefresh() {
    try {
      setRefreshing(true);
      await loadBlockedUsers(false);
    } finally {
      setRefreshing(false);
    }
  }

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/settings');
  }

  function handleUnblock(user: BlockedUserItem) {
    Alert.alert(
      strings.unblockUserConfirmTitle,
      strings.unblockUserConfirmBody,
      [
        {
          text: strings.myPostsDeleteConfirmCancel,
          style: 'cancel',
        },
        {
          text: strings.unblockUserConfirmAction,
          style: 'destructive',
          onPress: () => {
            void confirmUnblock(user);
          },
        },
      ]
    );
  }

  async function confirmUnblock(user: BlockedUserItem) {
    try {
      setBusyUserId(user.userId);
      const result = await unblockUser(user.userId);

      if (!result.success) {
        Alert.alert(strings.unblockUserError);
        return;
      }

      setBlockedUsers(previous => previous.filter(item => item.userId !== user.userId));
      Alert.alert(strings.unblockUserSuccess);
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <AppShell
      title={strings.settingsBlockedUsers}
      activeTab="settings"
      backgroundColor={theme.screenBackground}
      showBackButton
      onBack={handleBack}
      hideHeaderMenuButton
      backButtonVariant="icon"
    >
      <AppScreen
        scrollable
        backgroundColor={theme.screenBackground}
        contentContainerStyle={styles.content}
        scrollProps={{
          refreshControl: <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />,
        }}
      >
        <View style={styles.header}>
          <AppText variant="h2" weight="800" style={styles.title}>
            {strings.settingsBlockedUsers}
          </AppText>
          <AppText variant="body" tone="muted" style={styles.subtitle}>
            {strings.blockedUsersSubtitle}
          </AppText>
          <AppText variant="caption" weight="700" style={styles.count}>
            {blockedCountLabel}
          </AppText>
        </View>

        {loading ? (
          <AppCard style={styles.emptyCard}>
            <AppText variant="bodyLarge" weight="700" align="center">
              {strings.blockedUsersLoading}
            </AppText>
          </AppCard>
        ) : blockedUsers.length === 0 ? (
          <AppCard style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="shield-checkmark-outline" size={28} color={BabyCityPalette.primary} />
            </View>
            <AppText variant="h3" weight="800" align="center">
              {strings.blockedUsersEmptyTitle}
            </AppText>
            <AppText variant="body" tone="muted" align="center" style={styles.emptyBody}>
              {strings.blockedUsersEmptyBody}
            </AppText>
          </AppCard>
        ) : (
          <View style={styles.list}>
            {blockedUsers.map(user => (
              <AppCard key={user.userId} style={styles.userCard}>
                <View style={styles.userCardTop}>
                  <View style={styles.userMeta}>
                    <AppText variant="h3" weight="800" style={styles.userName}>
                      {user.name}
                    </AppText>
                    <AppText variant="caption" tone="muted">
                      {strings.blockedUsersSince(formatBlockedDate(user.createdAt))}
                    </AppText>
                  </View>
                  <View style={styles.userIconWrap}>
                    <Ionicons name="ban-outline" size={22} color={BabyCityPalette.primary} />
                  </View>
                </View>

                <AppPrimaryButton
                  label={busyUserId === user.userId ? strings.unblockUserBusy : strings.unblockUser}
                  onPress={() => handleUnblock(user)}
                  backgroundColor="#ffffff"
                  borderColor={BabyCityPalette.primary}
                  textColor={BabyCityPalette.primary}
                  disabled={busyUserId === user.userId}
                  style={styles.unblockButton}
                />
              </AppCard>
            ))}
          </View>
        )}
      </AppScreen>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 18,
    paddingBottom: 140,
  },
  header: {
    gap: 8,
    alignItems: 'flex-end',
  },
  title: {
    width: '100%',
  },
  subtitle: {
    width: '100%',
    lineHeight: 24,
  },
  count: {
    color: BabyCityPalette.primary,
  },
  list: {
    gap: 14,
  },
  emptyCard: {
    gap: 14,
    alignItems: 'center',
    paddingVertical: 28,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${BabyCityPalette.primary}14`,
  },
  emptyBody: {
    lineHeight: 24,
    maxWidth: 320,
  },
  userCard: {
    gap: 16,
  },
  userCardTop: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  userMeta: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 6,
  },
  userName: {
    width: '100%',
  },
  userIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${BabyCityPalette.primary}12`,
  },
  unblockButton: {
    minHeight: 48,
  },
});
