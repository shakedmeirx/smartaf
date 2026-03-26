import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { strings } from '@/locales';
import { useAppState } from '@/context/AppContext';
import AppShell from '@/components/navigation/AppShell';
import {
  ChatThreadCard,
  RequestInboxTab,
  SegmentTabs,
} from '@/components/requests/RequestSurface';
import IncomingRequestCard from '@/components/babysitter/IncomingRequestCard';
import ScreenStateCard from '@/components/ui/ScreenStateCard';
import SearchField from '@/components/ui/SearchField';
import { BabysitterDesignTokens, getRoleTheme } from '@/constants/theme';
import { Request } from '@/types/request';


export default function BabysitterInboxScreen() {
  const {
    incomingRequests,
    chatThreads,
    updateRequestStatus,
    refreshBabysitterData,
    hideRequest,
  } = useAppState();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<RequestInboxTab>('chats');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const theme = getRoleTheme('babysitter');

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
      await refreshBabysitterData();
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
        <View style={styles.container}>
          <View style={styles.searchField}>
            <SearchField
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={strings.searchChatsPlaceholder}
              showFilterButton={false}
            />
          </View>

          <SegmentTabs
            role="babysitter"
            segment={selectedTab}
            onChange={handleTabChange}
            chatsCount={filteredThreads.length}
            incomingCount={incomingOnlyRequests.length}
          />

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
                  <ScreenStateCard
                    role="babysitter"
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
                <IncomingRequestCard
                  request={item}
                  canRespond
                  onUpdateStatus={updateRequestStatus}
                  onHide={hideRequest}
                />
              )}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <ScreenStateCard
                    role="babysitter"
                    icon="mail-open-outline"
                    title={strings.requestsIncomingSectionEmpty}
                  />
                </View>
              }
            />
          )}
        </View>

        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.9}
          onPress={handleToggleDeleteMode}
        >
          <MaterialIcons name={isDeleteMode ? 'close' : 'edit'} size={24} color="#ffffff" />
        </TouchableOpacity>
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
  screen: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: BabysitterDesignTokens.spacing.pageHorizontal,
    paddingTop: BabysitterDesignTokens.spacing.pageVertical,
    backgroundColor: BabysitterDesignTokens.surfaces.screen,
  },
  searchField: {
    marginBottom: 16,
  },
  list: {
    paddingTop: 14,
    paddingBottom: 120,
    flexGrow: 1,
  },
  emptyWrap: {
    flex: 1,
    minHeight: 260,
  },
  fab: {
    position: 'absolute',
    left: 20,
    bottom: 18,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#702ae1',
    shadowColor: '#702ae1',
    shadowOpacity: 0.28,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 22,
    elevation: 6,
  },
});
