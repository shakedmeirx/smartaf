import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { strings } from '@/locales';
import { useAppState } from '@/context/AppContext';
import AppShell from '@/components/navigation/AppShell';
import {
  ChatThreadCard,
  RequestCard,
  RequestInboxTab,
  SegmentTabs,
} from '@/components/requests/RequestSurface';
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
  const theme = getRoleTheme('parent');

  const incomingOnlyRequests = useMemo(
    () => buildIncomingRequests(incomingRequests),
    [incomingRequests]
  );

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
      title={strings.navChats}
      activeTab="chats"
      backgroundColor={theme.screenBackground}
      enableRootTabSwipe
    >
      <View style={styles.container}>
        <SegmentTabs
          role="parent"
          segment={selectedTab}
          onChange={setSelectedTab}
          chatsCount={chatThreads.length}
          incomingCount={incomingOnlyRequests.length}
        />

        {selectedTab === 'chats' ? (
          <FlatList
            data={chatThreads}
            keyExtractor={item => item.requestId}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            refreshing={refreshing}
            onRefresh={handleRefresh}
            renderItem={({ item }) => (
              <ChatThreadCard
                thread={item}
                onHide={hideRequest}
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <ScreenStateCard
                  role="parent"
                  icon="chatbubbles-outline"
                  title={strings.requestsChatsEmpty}
                />
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
              <View style={styles.emptyWrap}>
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
    </AppShell>
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
  container: {
    flex: 1,
    paddingHorizontal: ParentDesignTokens.spacing.pageHorizontal,
    paddingTop: ParentDesignTokens.spacing.pageVertical,
    backgroundColor: BabyCityPalette.canvas,
  },
  list: {
    paddingTop: 14,
    paddingBottom: 40,
    flexGrow: 1,
  },
  emptyWrap: {
    flex: 1,
    minHeight: 260,
  },
});
