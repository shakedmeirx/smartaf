import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

const CHAT_AVATAR_IMAGES = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBc6iYsifyWdqkjpPBA27Gq3V7pPA6uGp6r_EmBad4LbYxeauBgC29MvFH0JxzDO4JNQ7lptnU2FynTu47kVRMo4z89MHU6xYSdiIbuFWkoxP8jnoxCChliw5xR8MECIkFH4tjOuUPqPaZP7TCIdZGEaOWqbOwxT1nnn6djdf3p-F_te7GBnwphiq6Xi9WTthjB2zg9GIkja6QW6ivzOYdqh7o24tGAJNMrLUYnFwAKfXGDyLBs_17FnWX3M1HS59gRzWPlsNY70IF1',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCvsPzgy88QrOjx7xvUeGthrcXa6o1N6iqWn4YvVVpN3PaOm05WCiUoOgb3yLxFc-r8ZvJto-jTB1EdPmRgPlKKwpyvGamkRFkYZzrSPqYoAtT0u5AW5lBtkeMRuAyGQDEaiI12lSBlbBTjgbjJB1RFLctOXnKMsyZTZVSCNlEin-J1lAdHjdKjTT2A3e7Yj1fuL0nX-djGY-TKGy4jAw0JKbfhg0hJj3ARqXnC1J5rRTa2GsxG0A-0MKGHXm8RLCKV7VA2Fgui19xP',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCrjIaW_F_IrY0lFjQwb3MjkE7ln-QUf0YB6yO64decjijcJq7z74GPvpgh5SZ2qYsmwt24aXBAxQXly9uZCFTbZhCtlLOpYAib3S3Z9I4ypgzyyXcKLVYqnEOlNx-98K2MvhP3xF7g9gEzxsGdDTuiKx5ye1d_AXzlknjJh91FGsSNn_iT6dWCq3Wk-cif4NWmlfjqwK_7-wQERlw79y38X9J4N_00T-3gw_CrC29W9g9GeK5OGTjcJ-aPvC8mF80QQe_Ja9iFK-_Z',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuByZn1dLEWfZ4nvUnlddg1W3PMtOtsTOIxR6vggHy-NB-2tsrwh5J-tTueevwpJUAxZ7i_c9z-QKzvd-wqssFQ3wPAz5lRcIl0vHxMhCU_Xeswse-QuZYqSw3Eo6kn04xcMnViims6cizVV37ROdc7ExWGyHPlZBUMdraneA0sjqeqBO48Awf8Ih1UmpOZeJ5RmVEGPs3dYWwYEnNR1Ixn7C7xW64lcFBNQwIJViGqWhFKJ_8TmI44evTtLPgqQdL_axIJZ9OR4xo9u',
];
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

  return (
    <AppShell
      title={strings.navChats}
      activeTab="chats"
      backgroundColor={theme.screenBackground}
      enableRootTabSwipe
    >
      <View style={styles.container}>
        <View style={styles.searchField}>
          <SearchField
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={'חיפוש שיחות'}
            filterLabel={strings.filterButton}
            onFilterPress={() => {}}
          />
        </View>

        <SegmentTabs
          role="babysitter"
          segment={selectedTab}
          onChange={setSelectedTab}
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
            renderItem={({ item, index }) => (
              <ChatThreadCard
                thread={item}
                onHide={hideRequest}
                placeholderPhotoUrl={CHAT_AVATAR_IMAGES[index % CHAT_AVATAR_IMAGES.length]}
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
    paddingHorizontal: BabysitterDesignTokens.spacing.pageHorizontal,
    paddingTop: BabysitterDesignTokens.spacing.pageVertical,
    backgroundColor: BabysitterDesignTokens.surfaces.screen,
  },
  searchField: {
    marginBottom: 12,
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
