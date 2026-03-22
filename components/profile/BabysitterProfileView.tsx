import { Image, Linking, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { strings } from '@/locales';
import { Babysitter } from '@/types/babysitter';
import { BabysitterRating } from '@/types/rating';
import AvatarCircle from '@/components/ui/AvatarCircle';
import {
  BabyCityChipTones,
  BabyCityGeometry,
  BabyCityPalette,
  BabyCityShadows,
  getRoleTheme,
} from '@/constants/theme';
import AppText from '@/components/ui/AppText';
import AppButton from '@/components/ui/AppButton';
import AppCard from '@/components/ui/AppCard';
import InfoChip from '@/components/ui/InfoChip';
import SectionHeader from '@/components/ui/SectionHeader';

type Props = {
  babysitter: Babysitter;
  galleryPhotoUrls: string[];
  ratings?: BabysitterRating[];
  averageStars?: number | null;
  canRate?: boolean;
  onRate?: () => void;
  onSendRequest?: () => void;
  requestActionLabel?: string;
  onEditProfile?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
};

export default function BabysitterProfileView({
  babysitter,
  galleryPhotoUrls,
  ratings = [],
  averageStars = null,
  canRate = false,
  onRate,
  onSendRequest,
  requestActionLabel,
  onEditProfile,
  refreshing = false,
  onRefresh,
}: Props) {
  const theme = getRoleTheme('parent');
  const {
    name,
    age,
    city,
    bio,
    hourlyRate,
    languages,
    hasCar,
    yearsExperience,
    ageGroups,
    certifications,
    hasFirstAid,
    specialNeeds,
    superpowers,
    personalityTags,
    isVerified,
    hasReferences,
    availability,
    extras,
    preferredLocation,
    profilePhotoUrl,
  } = babysitter;

  const trustChips = [
    isVerified ? { label: strings.verifiedBadge, tone: 'success' as const } : null,
    hasFirstAid ? { label: strings.firstAidBadge, tone: 'accent' as const } : null,
    hasCar ? { label: strings.hasCarBadge, tone: 'primary' as const } : null,
    hasReferences ? { label: strings.referencesBadge, tone: 'muted' as const } : null,
    specialNeeds ? { label: strings.specialNeedsBadge, tone: 'warning' as const } : null,
  ].filter(Boolean) as Array<{ label: string; tone: 'success' | 'accent' | 'primary' | 'muted' | 'warning' }>;

  const detailSections = [
    availability.length > 0 ? { title: strings.availabilityProfile, items: availability, tone: 'accent' as const } : null,
    languages.length > 0 ? { title: strings.spokenLanguages, items: languages, tone: 'primary' as const } : null,
    ageGroups.length > 0 ? { title: strings.ageGroupsProfile, items: ageGroups, tone: 'success' as const } : null,
    certifications.length > 0 ? { title: strings.certificationsProfile, items: certifications, tone: 'muted' as const } : null,
    superpowers.length > 0 ? { title: strings.superpowersProfile, items: superpowers, tone: 'accent' as const } : null,
    personalityTags.length > 0 ? { title: strings.personalityProfile, items: personalityTags, tone: 'muted' as const } : null,
    extras.length > 0 ? { title: strings.extrasLabel, items: extras, tone: 'success' as const } : null,
  ].filter(Boolean) as Array<{ title: string; items: string[]; tone: 'primary' | 'accent' | 'success' | 'muted' }>;

  // Profile completion bar (own profile only)
  const completionCard = onEditProfile ? (() => {
    const checks = [
      bio.trim().length > 0,
      !!profilePhotoUrl,
      certifications.length > 0,
      availability.length > 0,
      languages.length > 0,
    ];
    const pct = Math.round((checks.filter(Boolean).length / checks.length) * 100);
    if (pct >= 100) return null;
    return (
      <AppCard role="parent" variant="panel" style={styles.completionCard}>
        <View style={styles.completionHeader}>
          <AppText variant="h2" weight="800" style={styles.completionPct}>{String(pct)}%</AppText>
          <AppText variant="body" tone="muted" style={styles.completionLabel}>{strings.profileCompletionLabel}</AppText>
        </View>
        <View style={styles.completionBarBg}>
          <View style={[styles.completionBarFill, { width: `${pct}%` as const }]} />
        </View>
      </AppCard>
    );
  })() : null;

  return (
    <>
      <ScrollView
        contentContainerStyle={[styles.content, { backgroundColor: theme.screenBackground }]}
        refreshControl={
          onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined
        }
      >
        {completionCard}

        {/* ── Banner ── */}
        <View style={styles.bannerWrap}>
          <Image
            source={{ uri: profilePhotoUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDv781fLEnnEarOnE3oh5Kl6eWiI5w3iHx2d_DiDX4AKVx-6LqVlAf-zNcM_28Ea-VDU39Xbdwo0_79BtpPG4kKzL29zgAawPq7Uvx-iLB0oYcY-BBI3misnHZGB-xUh4aAbHz0_i5hd7z2fPfTGLSJSqAR573nHD0OMCCiEYFPo2d8oaBWBr8zwGjQjrx8_UuHbAwi2tbT0cvwNi36T4C5pk9PbBUHRjuwa_W1Frlr1SUQRLrbQgOMzAH4VEQ1pS4bRlaucbk7LvgL' }}
            style={styles.bannerImage}
            resizeMode="cover"
          />
        </View>

        {/* ── Avatar overlapping banner ── */}
        <View style={styles.avatarContainer}>
          <AvatarCircle name={name} photoUrl={profilePhotoUrl} size={96} />
          {isVerified ? (
            <View style={styles.verifiedBadge}>
              <AppText variant="caption" weight="700" style={styles.verifiedBadgeText}>
                {strings.verifiedBadge}
              </AppText>
            </View>
          ) : null}
        </View>

        {/* ── Identity below avatar ── */}
        <View style={styles.identitySection}>
          <AppText variant="h1" weight="800" align="center" style={styles.heroName}>
            {age ? `${name}, ${age}` : name}
          </AppText>
          {city ? (
            <View style={styles.cityRow}>
              <Ionicons name="location-outline" size={14} color={BabyCityPalette.textSecondary} />
              <AppText variant="body" tone="muted" style={styles.heroCity}>{city}</AppText>
            </View>
          ) : null}
          {/* Trust badges + edit (own profile) */}
          {trustChips.length > 0 ? (
            <View style={styles.badgesRow}>
              {trustChips.map(chip => (
                <InfoChip key={chip.label} label={chip.label} tone={chip.tone} size="sm" />
              ))}
            </View>
          ) : null}
          {onEditProfile ? (
            <AppButton
              label={strings.settingsEditProfile}
              variant="secondary"
              fullWidth={false}
              style={styles.editAction}
              onPress={onEditProfile}
            />
          ) : null}
        </View>

        {/* ── Stats row — 3 tiles ── */}
        <View style={styles.statsRow}>
          {averageStars !== null ? (
            <View style={styles.statTile}>
              <AppText variant="h2" weight="800" style={styles.statValue}>
                {averageStars.toFixed(1)}
              </AppText>
              <AppText variant="caption" tone="muted" style={styles.statLabel}>
                {strings.ratingsTitle}
              </AppText>
            </View>
          ) : null}
          <View style={styles.statTile}>
            <AppText variant="h2" weight="800" style={styles.statValue}>
              {yearsExperience || '–'}
            </AppText>
            <AppText variant="caption" tone="muted" style={styles.statLabel}>
              {strings.yearsExpLabel}
            </AppText>
          </View>
          <View style={styles.statTile}>
            <AppText variant="h2" weight="800" style={styles.statValue}>
              {`₪${hourlyRate}`}
            </AppText>
            <AppText variant="caption" tone="muted" style={styles.statLabel}>
              {strings.perHour}
            </AppText>
          </View>
        </View>

        {/* ── Bio ── */}
        {bio ? (
          <AppCard role="parent" variant="panel" style={styles.sectionCard}>
            <SectionHeader title={strings.bioLabel} titleVariant="h2" />
            <AppText variant="bodyLarge" style={styles.bioText}>{bio}</AppText>
          </AppCard>
        ) : null}

        {/* ── Details (availability, languages, age groups, etc.) ── */}
        {detailSections.length > 0 ? (
          <AppCard role="parent" variant="panel" style={styles.sectionCard}>
            <SectionHeader title={strings.availabilityProfile} titleVariant="h2" />
            <View style={styles.groupStack}>
              {detailSections.map(section => (
                <View key={section.title} style={styles.groupBlock}>
                  {section.title !== strings.availabilityProfile ? (
                    <AppText variant="caption" weight="700" tone="muted" style={styles.groupTitle}>
                      {section.title}
                    </AppText>
                  ) : null}
                  <View style={styles.tagList}>
                    {section.items.map(item => (
                      <InfoChip key={`${section.title}-${item}`} label={item} tone={section.tone} size="sm" />
                    ))}
                  </View>
                </View>
              ))}

              {preferredLocation.trim().length > 0 ? (
                <View style={styles.groupBlock}>
                  <AppText variant="caption" weight="700" tone="muted" style={styles.groupTitle}>
                    {strings.preferredLocationLabel}
                  </AppText>
                  <AppText variant="body" style={styles.infoText}>{preferredLocation}</AppText>
                </View>
              ) : null}
            </View>
          </AppCard>
        ) : null}

        {/* ── Trust ── */}
        <AppCard role="parent" variant="panel" style={styles.sectionCard}>
          <SectionHeader title={strings.trustLabel} titleVariant="h2" />
          <View style={styles.tagList}>
            <InfoChip label={hasReferences ? strings.referencesAvailable : strings.referencesNone} tone={hasReferences ? 'success' : 'muted'} />
            <InfoChip label={isVerified ? strings.verifiedBadge : strings.notFilled} tone={isVerified ? 'success' : 'muted'} />
            <InfoChip label={hasFirstAid ? strings.firstAidBadge : strings.notFilled} tone={hasFirstAid ? 'accent' : 'muted'} />
          </View>
        </AppCard>

        {/* ── Ratings ── */}
        <AppCard role="parent" variant="panel" style={styles.sectionCard}>
          <View style={styles.ratingsHeader}>
            <SectionHeader
              title={strings.ratingsTitle}
              titleVariant="h2"
              subtitle={
                averageStars !== null
                  ? ratings.length === 1
                    ? strings.ratingsSummaryOne(averageStars)
                    : strings.ratingsSummary(averageStars, ratings.length)
                  : undefined
              }
            />
            {canRate && onRate ? (
              <AppButton
                label={strings.rateThisBabysitter}
                variant="secondary"
                fullWidth={false}
                style={styles.rateButton}
                onPress={onRate}
              />
            ) : null}
          </View>
          {ratings.length === 0 ? (
            <AppText variant="body" tone="muted" style={styles.ratingsEmpty}>
              {strings.ratingsEmpty}
            </AppText>
          ) : (
            ratings.map(r => (
              <View key={r.id} style={styles.ratingCard}>
                <View style={styles.ratingCardTop}>
                  {r.parentName ? (
                    <AppText variant="caption" tone="muted" style={styles.ratingParent}>
                      {r.parentName}
                    </AppText>
                  ) : null}
                  <AppText variant="bodyLarge" weight="700" style={styles.ratingStars}>
                    {'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}
                  </AppText>
                </View>
                {r.reviewText ? (
                  <AppText variant="body" style={styles.ratingText}>{r.reviewText}</AppText>
                ) : null}
              </View>
            ))
          )}
        </AppCard>

        {/* ── Report link ── */}
        {onSendRequest ? (
          <TouchableOpacity
            style={styles.reportLink}
            onPress={() => {
              const subject = encodeURIComponent(strings.reportEmailSubject);
              const body = encodeURIComponent(`Babysitter ID: ${babysitter.userId}`);
              Linking.openURL(`mailto:support@babysitconnect.app?subject=${subject}&body=${body}`);
            }}
          >
            <AppText variant="caption" tone="muted" style={styles.reportLinkText}>
              {strings.reportUser}
            </AppText>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      {/* ── Sticky CTA bar ── */}
      {onSendRequest ? (
        <View style={styles.ctaBar}>
          <View style={styles.ctaRateChip}>
            <AppText variant="bodyLarge" weight="800" style={styles.ctaRateText}>
              {`₪${hourlyRate}`}
            </AppText>
            <AppText variant="caption" tone="muted">{strings.perHour}</AppText>
          </View>
          <AppButton
            label={requestActionLabel ?? strings.sendMessage}
            size="lg"
            style={styles.ctaCta}
            onPress={onSendRequest}
          />
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: BabyCityGeometry.spacing.md,
  },
  completionCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: BabyCityGeometry.spacing.lg,
  },
  completionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: BabyCityGeometry.spacing.sm,
    marginBottom: BabyCityGeometry.spacing.sm,
  },
  completionPct: {
    color: BabyCityPalette.primary,
  },
  completionLabel: {
    flex: 1,
    textAlign: 'right',
  },
  completionBarBg: {
    height: 8,
    borderRadius: BabyCityGeometry.radius.chip,
    backgroundColor: BabyCityPalette.borderSoft,
    overflow: 'hidden',
  },
  completionBarFill: {
    height: '100%',
    borderRadius: BabyCityGeometry.radius.chip,
    backgroundColor: BabyCityPalette.primary,
  },
  // Banner
  bannerWrap: {
    width: '100%',
    height: 200,
  },
  bannerImage: {
    width: '100%',
    height: 200,
  },
  bannerPlaceholder: {
    backgroundColor: BabyCityPalette.surfaceLow,
  },
  // Avatar
  avatarContainer: {
    alignItems: 'center',
    marginTop: -48,
    marginBottom: 12,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: BabyCityPalette.primary,
    borderRadius: BabyCityGeometry.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  verifiedBadgeText: {
    color: '#ffffff',
  },
  // Identity
  identitySection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  heroName: {
    textAlign: 'center',
    lineHeight: 34,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  heroCity: {
    textAlign: 'center',
  },
  badgesRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: BabyCityGeometry.spacing.sm,
    marginTop: BabyCityGeometry.spacing.sm,
  },
  editAction: {
    alignSelf: 'center',
    marginTop: BabyCityGeometry.spacing.md,
  },
  // Stats row — 3 tiles side by side
  statsRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statTile: {
    flex: 1,
    backgroundColor: BabyCityPalette.surfaceContainer,
    borderRadius: BabyCityGeometry.radius.control,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    color: BabyCityPalette.primary,
    textAlign: 'center',
  },
  statLabel: {
    textAlign: 'center',
    lineHeight: 16,
  },
  // Section cards
  sectionCard: {
    marginHorizontal: 16,
    marginBottom: 14,
  },
  bioText: {
    lineHeight: 26,
    textAlign: 'right',
  },
  groupStack: {
    gap: BabyCityGeometry.spacing.lg,
  },
  groupBlock: {
    gap: BabyCityGeometry.spacing.sm,
  },
  groupTitle: {
    textAlign: 'right',
  },
  tagList: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: BabyCityGeometry.spacing.sm,
  },
  infoText: {
    textAlign: 'right',
    lineHeight: 24,
  },
  // Ratings
  ratingsHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: BabyCityGeometry.spacing.sm,
    marginBottom: BabyCityGeometry.spacing.sm,
  },
  rateButton: {
    flexShrink: 0,
  },
  ratingsEmpty: {
    textAlign: 'right',
  },
  ratingCard: {
    paddingTop: BabyCityGeometry.spacing.md,
    marginTop: BabyCityGeometry.spacing.md,
  },
  ratingCardTop: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: BabyCityGeometry.spacing.xs,
    gap: BabyCityGeometry.spacing.sm,
  },
  ratingStars: {
    color: BabyCityChipTones.warning.text,
  },
  ratingParent: {
    textAlign: 'right',
    flex: 1,
  },
  ratingText: {
    lineHeight: 22,
    textAlign: 'right',
  },
  // Report
  reportLink: {
    alignSelf: 'flex-end',
    paddingVertical: BabyCityGeometry.spacing.xs,
    paddingHorizontal: BabyCityGeometry.spacing.xs,
    marginTop: BabyCityGeometry.spacing.xs,
    marginBottom: BabyCityGeometry.spacing.sm,
  },
  reportLinkText: {
    textDecorationLine: 'underline',
  },
  // Sticky CTA
  ctaBar: {
    padding: 16,
    paddingBottom: 24,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: BabyCityPalette.borderSoft,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  ctaRateChip: {
    alignItems: 'flex-end',
    minWidth: 64,
  },
  ctaRateText: {
    color: BabyCityPalette.textPrimary,
  },
  ctaCta: {
    flex: 1,
  },
});
