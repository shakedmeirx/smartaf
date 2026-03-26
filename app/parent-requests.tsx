import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { strings } from '@/locales';
import { useAppState } from '@/context/AppContext';
import AppShell from '@/components/navigation/AppShell';
import AppText from '@/components/ui/AppText';
import {
  ChatThreadCard,
  RequestCard,
  RequestInboxTab,
} from '@/components/requests/RequestSurface';
import SearchField from '@/components/ui/SearchField';
import ScreenStateCard from '@/components/ui/ScreenStateCard';
import { BabyCityPalette, ParentDesignTokens, getRoleTheme } from '@/constants/theme';
import { Request } from '@/types/request';

export default function ParentRequestsScreen() {
  const {
    incomingRequests,
    chatThreads,
    refreshParentData,
    updateRequestStatus,
    hideRequest,
  } = useAppState();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<RequestInboxTab>('chats');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const theme = getRoleTheme('parent');

  const incomingOnlyRequests = useMemo(
    () => buildIncomingRequests(incomingRequests),
    [incomingRequests]
  );

  const filteredThreads = useMemo(
    () => searchQuery.trim()
      ? chatThreads.filter(t =>
          t.counterpartName.toLowerCase().includes(searchQuery.trim().toLowerCase())
        )
      : chatThreads,
    [chatThreads, searchQuery]
  );

  async function handleRefresh() {
    try {
      setRefreshing(true);
      await refreshParentData();
    } finally {
      setRefreshing(false);
    }
  }

  function handleTabChange(nextTab: RequestInboxTab) {
    setSelectedTab(nextTab);
    if (nextTab !== 'chats') {
      setIsDeleteMode(false);
    }
  }

  function handleToggleDeleteMode() {
    if (selectedTab !== 'chats') {
      setSelectedTab('chats');
      setIsDeleteMode(true);
      return;
    }

    setIsDeleteMode(current => !current);
  }

  return (
    <AppShell
      title={strings.navChats}
      activeTab="chats"
      backgroundColor={theme.screenBackground}
      enableRootTabSwipe
      floatingActionButton={
        selectedTab === 'chats' ? (
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.9}
            onPress={handleToggleDeleteMode}
            style={styles.fab}
          >
            <LinearGradient
              colors={[BabyCityPalette.primary, '#6411d5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fabGradient}
            >
              <MaterialIcons name={isDeleteMode ? 'close' : 'edit'} size={24} color="#ffffff" />
            </LinearGradient>
          </TouchableOpacity>
        ) : null
      }
    >
      <View style={styles.screen}>
        <View style={styles.backdropOrbTop} />
        <View style={styles.backdropOrbBottom} />

        <View style={styles.container}>
          <View style={styles.searchField}>
            <SearchField
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={strings.searchChatsPlaceholder}
              showFilterButton={false}
            />
          </View>

          <View style={styles.segmentWrap}>
            <SegmentButton
              label={strings.requestsChatsSection}
              count={chatThreads.length}
              active={selectedTab === 'chats'}
              onPress={() => handleTabChange('chats')}
            />
            <SegmentButton
              label={strings.requestsIncomingSection}
              count={incomingOnlyRequests.length}
              active={selectedTab === 'incoming'}
              onPress={() => handleTabChange('incoming')}
            />
          </View>

          {selectedTab === 'chats' ? (
            <FlatList
              data={filteredThreads}
              keyExtractor={item => item.requestId}
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
              refreshing={refreshing}
              onRefresh={handleRefresh}
              renderItem={({ item }) => (
                <ChatThreadCard
                  thread={item}
                  onHide={hideRequest}
                  showDeleteButton={isDeleteMode}
                />
              )}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <View style={styles.emptyIconWrap}>
                    <MaterialIcons name="forum" size={54} color={BabyCityPalette.primary} />
                  </View>
                  <AppText variant="h2" weight="800" align="center" style={styles.emptyTitle}>
                    {strings.requestsChatsEmpty}
                  </AppText>
                  <AppText variant="body" tone="muted" align="center" style={styles.emptyBody}>
                    {strings.parentArea}
                  </AppText>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => router.replace('/parent')}
                    style={styles.emptyCta}
                  >
                    <LinearGradient
                      colors={[BabyCityPalette.primary, '#6411d5']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.emptyCtaGradient}
                    >
                      <AppText variant="body" weight="800" style={styles.emptyCtaText}>
                        {strings.findBabysitter}
                      </AppText>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              }
            />
          ) : (
            <FlatList
              data={incomingOnlyRequests}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
              refreshing={refreshing}
              onRefresh={handleRefresh}
              renderItem={({ item }) => (
                <RequestCard
                  role="parent"
                  request={item}
                  canRespond
                  onUpdateStatus={updateRequestStatus}
                  onHide={hideRequest}
                />
              )}
              ListEmptyComponent={
                <View style={styles.emptyStateCardWrap}>
                  <ScreenStateCard
                    role="parent"
                    icon="mail-open-outline"
                    title={strings.requestsIncomingSectionEmpty}
                  />
                </View>
              }
            />
          )}
        </View>
      </View>
    </AppShell>
  );
}

type SegmentButtonProps = {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
};

function SegmentButton({ label, count, active, onPress }: SegmentButtonProps) {
  const badge = count > 99 ? '99+' : count > 0 ? String(count) : null;

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      style={[styles.segmentButton, active && styles.segmentButtonActive]}
      onPress={onPress}
    >
      {badge ? (
        <View style={[styles.segmentBadge, active && styles.segmentBadgeActive]}>
          <AppText
            variant="caption"
            weight="800"
            style={[styles.segmentBadgeText, active && styles.segmentBadgeTextActive]}
          >
            {badge}
          </AppText>
        </View>
      ) : null}
      <AppText
        variant="body"
        weight="800"
        style={[styles.segmentText, active && styles.segmentTextActive]}
      >
        {label}
      </AppText>
    </TouchableOpacity>
  );
}

function buildIncomingRequests(incomingRequests: Request[]) {
  return [...incomingRequests]
    .filter(request => request.status !== 'accepted')
    .sort((a, b) => {
      if (a.status === b.status) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      if (a.status === 'pending') return -1;
      if (b.status === 'pending') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BabyCityPalette.canvas,
  },
  backdropOrbTop: {
    position: 'absolute',
    top: -40,
    right: -90,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(112,42,225,0.08)',
  },
  backdropOrbBottom: {
    position: 'absolute',
    bottom: 100,
    left: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(112,42,225,0.05)',
  },
  container: {
    flex: 1,
    paddingHorizontal: ParentDesignTokens.spacing.pageHorizontal,
    paddingTop: ParentDesignTokens.spacing.pageVertical,
    backgroundColor: 'transparent',
  },
  searchField: {
    marginBottom: 18,
  },
  segmentWrap: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginBottom: 18,
  },
  segmentButton: {
    flex: 1,
    minHeight: 52,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.72)',
    paddingHorizontal: 14,
  },
  segmentButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  segmentBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(112,42,225,0.1)',
  },
  segmentBadgeActive: {
    backgroundColor: BabyCityPalette.primary,
  },
  segmentBadgeText: {
    color: BabyCityPalette.primary,
  },
  segmentBadgeTextActive: {
    color: '#ffffff',
  },
  segmentText: {
    color: BabyCityPalette.textSecondary,
  },
  segmentTextActive: {
    color: '#242f41',
  },
  list: {
    paddingTop: 4,
    paddingBottom: 132,
    flexGrow: 1,
  },
  emptyWrap: {
    flex: 1,
    minHeight: 420,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  emptyIconWrap: {
    width: 128,
    height: 128,
    borderRadius: 64,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ecf1ff',
    marginBottom: 20,
  },
  emptyTitle: {
    color: '#242f41',
    marginBottom: 10,
  },
  emptyBody: {
    maxWidth: 260,
    lineHeight: 22,
    marginBottom: 22,
  },
  emptyCta: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  emptyCtaGradient: {
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  emptyCtaText: {
    color: '#ffffff',
  },
  emptyStateCardWrap: {
    flex: 1,
    minHeight: 280,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: BabyCityPalette.primary,
    shadowOpacity: 0.28,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  fabGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
