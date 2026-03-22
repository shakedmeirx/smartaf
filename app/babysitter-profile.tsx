import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Modal, Share,
  StyleSheet, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import AppShell from '@/components/navigation/AppShell';
import BabysitterProfileView from '@/components/profile/BabysitterProfileView';
import { loadBabysitterProfileById } from '@/lib/babysitterProfile';
import { loadBabysitterRatings, loadParentExistingRating, submitRating } from '@/lib/ratings';
import { recordPositiveEvent } from '@/lib/reviewPrompt';
import { useAppState } from '@/context/AppContext';
import { BabysitterRating } from '@/types/rating';
import AppCard from '@/components/ui/AppCard';
import AppButton from '@/components/ui/AppButton';
import AppText from '@/components/ui/AppText';
import AppTextArea from '@/components/ui/AppTextArea';
import {
  BabyCityChipTones,
  BabyCityGeometry,
  BabyCityPalette,
  ParentDesignTokens,
  getRoleTheme,
} from '@/constants/theme';
import { strings } from '@/locales';
import { findPairChatThread } from '@/lib/requestLookup';

const STAR_COUNT = 5;

export default function BabysitterProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentUserId, chatThreads, sentRequests } = useAppState();
  const theme = getRoleTheme('parent');

  const [babysitter, setBabysitter] = useState<Awaited<ReturnType<typeof loadBabysitterProfileById>>['babysitter']>(null);
  const [galleryPhotoUrls, setGalleryPhotoUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [ratings, setRatings] = useState<BabysitterRating[]>([]);
  const [averageStars, setAverageStars] = useState<number | null>(null);

  // Rating modal
  const [rateModalVisible, setRateModalVisible] = useState(false);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingText, setRatingText] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  const canRate =
    !!currentUserId &&
    sentRequests.some(r => r.babysitterId === id && r.status === 'accepted');
  const existingThread =
    currentUserId && id
      ? findPairChatThread(chatThreads, currentUserId, id)
      : null;

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    loadProfile();
    fetchRatings();
  }, [id]);

  // Pre-fill existing rating when modal opens
  useEffect(() => {
    if (!rateModalVisible || !id || !currentUserId) return;
    loadParentExistingRating(currentUserId, id).then(existing => {
      if (existing) {
        setRatingStars(existing.stars);
        setRatingText(existing.reviewText ?? '');
      }
    });
  }, [rateModalVisible]);

  async function loadProfile() {
    if (!id) return;
    const isFirstLoad = !refreshing;
    if (isFirstLoad) setLoading(true);
    setNotFound(false);
    const result = await loadBabysitterProfileById(id);
    setBabysitter(result.babysitter);
    setGalleryPhotoUrls(result.galleryPhotoUrls);
    setNotFound(result.notFound);
    setLoading(false);
  }

  async function fetchRatings() {
    if (!id) return;
    const result = await loadBabysitterRatings(id);
    setRatings(result.ratings);
    setAverageStars(result.averageStars);
  }

  async function handleRefresh() {
    try {
      setRefreshing(true);
      await Promise.all([loadProfile(), fetchRatings()]);
    } finally {
      setRefreshing(false);
    }
  }

  async function handleSubmitRating() {
    if (!id || !currentUserId) return;
    setRatingSubmitting(true);
    const { error } = await submitRating(currentUserId, id, ratingStars, ratingText);
    setRatingSubmitting(false);
    if (error) {
      Alert.alert(strings.ratingError, error);
      return;
    }
    setRateModalVisible(false);
    Alert.alert(strings.ratingSuccess);
    fetchRatings();
    recordPositiveEvent();
  }

  async function handleShare() {
    if (!id || !babysitter) return;
    const url = `babysitconnect:///babysitter-profile?id=${id}`;
    await Share.share({ message: `${strings.shareBabysitterText}\n${url}` });
  }

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/parent');
  }

  if (loading) {
    return (
      <AppShell title={strings.navProfile} activeTab="home" backgroundColor={theme.screenBackground} subtitle={null} showBackButton onBack={handleBack}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.filterAccent} />
        </View>
      </AppShell>
    );
  }

  if (notFound || !babysitter || !id) {
    return (
      <AppShell title={strings.navProfile} activeTab="home" backgroundColor={theme.screenBackground} subtitle={null} showBackButton onBack={handleBack}>
        <View style={styles.centered}>
          <AppText variant="bodyLarge" tone="muted" align="center" style={styles.notFoundText}>
            {strings.profileNotFound}
          </AppText>
        </View>
      </AppShell>
    );
  }

  return (
    <>
      <AppShell title={strings.navProfile} activeTab="home" backgroundColor={theme.screenBackground} subtitle={null} showBackButton onBack={handleBack} onShare={handleShare}>
        <BabysitterProfileView
          babysitter={babysitter}
          galleryPhotoUrls={galleryPhotoUrls}
          ratings={ratings}
          averageStars={averageStars}
          canRate={canRate}
          onRate={() => setRateModalVisible(true)}
          requestActionLabel={existingThread ? strings.alreadyChattingCta : strings.sendMessage}
          onSendRequest={() => {
            if (existingThread) {
              router.push(
                `/chat?requestId=${existingThread.requestId}&name=${encodeURIComponent(babysitter.name)}`
              );
              return;
            }

            router.push(`/send-request?id=${id}&name=${encodeURIComponent(babysitter.name)}&targetRole=babysitter`);
          }}
          onRefresh={handleRefresh}
          refreshing={refreshing}
        />
      </AppShell>

      <Modal
        visible={rateModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <AppCard role="parent" variant="panel" style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setRateModalVisible(false)}
                disabled={ratingSubmitting}
              >
                <Ionicons name="close" size={20} color={theme.inactiveColor} />
              </TouchableOpacity>

              <View style={styles.modalHeaderText}>
                <AppText variant="h2" weight="800" style={[styles.modalTitle, { color: theme.title }]}>
                  {strings.rateThisBabysitter}
                </AppText>
              </View>
            </View>

            <AppText variant="body" weight="700" tone="muted" style={styles.modalLabel}>
              {strings.ratingStarsLabel}
            </AppText>
            <View style={styles.starsRow}>
              {Array.from({ length: STAR_COUNT }).map((_, i) => (
                <TouchableOpacity key={i} style={styles.starTouch} onPress={() => setRatingStars(i + 1)}>
                  <AppText style={[styles.starBtn, i < ratingStars && styles.starBtnActive]}>★</AppText>
                </TouchableOpacity>
              ))}
            </View>

            <AppTextArea
              label={strings.ratingReviewLabel}
              value={ratingText}
              onChangeText={setRatingText}
              placeholder={strings.ratingReviewPlaceholder}
              containerStyle={styles.reviewField}
            />

            <View style={styles.modalActions}>
              <AppButton
                label={strings.myPostsDeleteConfirmCancel}
                variant="secondary"
                textColor={theme.inactiveColor}
                backgroundColor={ParentDesignTokens.surfaces.controlMuted}
                borderColor={BabyCityPalette.border}
                onPress={() => setRateModalVisible(false)}
                disabled={ratingSubmitting}
                style={styles.cancelButton}
              />
              <AppButton
                label={ratingSubmitting ? strings.ratingSubmitting : strings.ratingSubmit}
                style={styles.submitButton}
                onPress={handleSubmitRating}
                disabled={ratingSubmitting}
                loading={ratingSubmitting}
              />
            </View>
          </AppCard>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundText: {
    maxWidth: 300,
  },
  // Rating modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  modalCard: {
    paddingBottom: 18,
  },
  modalHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 16,
    gap: BabyCityGeometry.spacing.md,
  },
  modalHeaderText: {
    flex: 1,
    alignItems: 'flex-end',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: BabyCityGeometry.radius.control,
    backgroundColor: ParentDesignTokens.surfaces.cardMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
  },
  modalLabel: {
    marginBottom: 8,
  },
  starsRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginBottom: 20,
  },
  starTouch: {
    paddingHorizontal: 2,
  },
  starBtn: {
    fontSize: 36,
    color: BabyCityPalette.borderSoft,
  },
  starBtnActive: {
    color: BabyCityChipTones.warning.text,
  },
  reviewField: {
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row-reverse',
    gap: 12,
  },
  submitButton: {
    flex: 1,
  },
  cancelButton: {
    flex: 0.5,
  },
});
