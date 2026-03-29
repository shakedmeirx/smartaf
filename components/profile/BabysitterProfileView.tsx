import { strings } from '@/locales';
import { Babysitter } from '@/types/babysitter';
import { BabysitterRating } from '@/types/rating';
import AvatarCircle from '@/components/ui/AvatarCircle';
import {
  BabyCityGeometry,
  BabyCityPalette,
  getRoleTheme,
} from '@/constants/theme';
import AppText from '@/components/ui/AppText';
import AppButton from '@/components/ui/AppButton';
import InfoChip from '@/components/ui/InfoChip';
import {
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type Props = {
  babysitter: Babysitter;
  galleryPhotoUrls: string[];
  ratings?: BabysitterRating[];
  averageStars?: number | null;
  canRate?: boolean;
  onRate?: () => void;
  onSendRequest?: () => void;
  onReportUser?: () => void;
  onBlockUser?: () => void;
  requestActionLabel?: string;
  onEditProfile?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
};

const SPECIFIC_DAY_LABEL = /^[א-ש][׳']\s+\d{1,2}\.\d{1,2}$/;
const RECURRING_AVAILABILITY_ORDER = ['בוקר', 'צהריים', 'ערב', 'לינה', 'סופי שבוע'];

const SPECIALTY_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  'תינוקות': 'child-care',
  'פעוטות': 'toys',
  'בישול': 'restaurant',
  'שיעורי בית': 'school',
  'ילדים בוגרים': 'school',
  'צרכים מיוחדים': 'accessible',
};

const CARD_SHADOW = {
  shadowColor: '#242f41',
  shadowOpacity: 0.06,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 10 },
  elevation: 3,
};

function getSpecialtyIcon(label: string): keyof typeof MaterialIcons.glyphMap {
  for (const key of Object.keys(SPECIALTY_ICONS)) {
    if (label.includes(key)) return SPECIALTY_ICONS[key];
  }
  return 'star';
}

function isSpecificDayAvailability(slot: string) {
  return SPECIFIC_DAY_LABEL.test(slot.trim());
}

function compareRecurringAvailability(a: string, b: string) {
  const aIndex = RECURRING_AVAILABILITY_ORDER.indexOf(a);
  const bIndex = RECURRING_AVAILABILITY_ORDER.indexOf(b);
  const normalizedAIndex = aIndex === -1 ? RECURRING_AVAILABILITY_ORDER.length : aIndex;
  const normalizedBIndex = bIndex === -1 ? RECURRING_AVAILABILITY_ORDER.length : bIndex;

  if (normalizedAIndex !== normalizedBIndex) {
    return normalizedAIndex - normalizedBIndex;
  }

  return a.localeCompare(b, 'he');
}

function formatCountLabel(count: number, singular: string, plural: string) {
  return count === 1 ? singular : `${count} ${plural}`;
}

export default function BabysitterProfileView({
  babysitter,
  galleryPhotoUrls,
  ratings = [],
  averageStars = null,
  canRate = false,
  onRate,
  onSendRequest,
  onReportUser,
  onBlockUser,
  requestActionLabel,
  onEditProfile,
  refreshing = false,
  onRefresh,
}: Props) {
  const theme = getRoleTheme('parent');
  const galleryToShow = galleryPhotoUrls.filter(Boolean);

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
    hasReferences,
    availability,
    extras,
    preferredLocation,
    profilePhotoUrl,
  } = babysitter;

  const specialties = [
    ...ageGroups,
    ...superpowers.slice(0, Math.max(0, 4 - ageGroups.length)),
  ].slice(0, 4);

  const recurringAvailability = availability
    .filter(slot => !isSpecificDayAvailability(slot))
    .sort(compareRecurringAvailability);
  const specificDayAvailability = availability.filter(isSpecificDayAvailability);
  const detailRows = [
    preferredLocation
      ? {
          key: 'location',
          icon: 'place' as const,
          label: strings.preferredLocationLabel,
          value: preferredLocation,
        }
      : null,
    yearsExperience
      ? {
          key: 'experience',
          icon: 'work' as const,
          label: strings.yearsExpLabel,
          value: yearsExperience,
        }
      : null,
    ageGroups.length > 0
      ? {
          key: 'ageGroups',
          icon: 'child-care' as const,
          label: strings.ageGroupsProfile,
          value: ageGroups.join(' • '),
        }
      : null,
    languages.length > 0
      ? {
          key: 'languages',
          icon: 'translate' as const,
          label: strings.spokenLanguages,
          value: languages.join(' • '),
        }
      : null,
    certifications.length > 0
      ? {
          key: 'certifications',
          icon: 'school' as const,
          label: strings.certificationsProfile,
          value: certifications.join(' • '),
        }
      : null,
    superpowers.length > 0
      ? {
          key: 'superpowers',
          icon: 'auto-awesome' as const,
          label: strings.superpowersProfile,
          value: superpowers.join(' • '),
        }
      : null,
    extras.length > 0
      ? {
          key: 'extras',
          icon: 'check-circle' as const,
          label: strings.extrasLabel,
          value: extras.join(' • '),
        }
      : null,
  ].filter(Boolean) as {
    key: string;
    icon: keyof typeof MaterialIcons.glyphMap;
    label: string;
    value: string;
  }[];

  const trustChips = [
    hasReferences ? { key: 'references', label: strings.referencesBadge, tone: 'accent' as const } : null,
    hasFirstAid ? { key: 'firstAid', label: strings.firstAidBadge, tone: 'accent' as const } : null,
    hasCar ? { key: 'car', label: strings.hasCarBadge, tone: 'primary' as const } : null,
    specialNeeds ? { key: 'specialNeeds', label: strings.specialNeedsBadge, tone: 'warning' as const } : null,
    ...personalityTags.slice(0, 3).map(tag => ({ key: `tag-${tag}`, label: tag, tone: 'muted' as const })),
  ].filter(Boolean) as { key: string; label: string; tone: 'accent' | 'primary' | 'warning' | 'muted' }[];

  const statItems = [
    {
      key: 'rating',
      value: averageStars !== null && ratings.length > 0 ? averageStars.toFixed(1) : '—',
      label: ratings.length > 0 ? formatCountLabel(ratings.length, 'דירוג אחד', 'דירוגים') : 'דירוגים',
      icon: 'star' as const,
    },
    {
      key: 'experience',
      value: yearsExperience || 'חדש/ה',
      label: strings.yearsExpLabel,
      icon: 'work' as const,
    },
    {
      key: 'availability',
      value: availability.length > 0 ? String(availability.length) : 'גמיש/ה',
      label: strings.availabilityProfile,
      icon: 'schedule' as const,
    },
    {
      key: 'rate',
      value: `₪${hourlyRate}`,
      label: strings.perHour,
      icon: 'sell' as const,
    },
  ];

  const completionCard = onEditProfile
    ? (() => {
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
          <View style={styles.completionCard}>
            <View style={styles.completionHeader}>
              <AppText variant="h2" weight="800" style={styles.completionPct}>
                {String(pct)}%
              </AppText>
              <AppText variant="body" tone="muted" style={styles.completionLabel}>
                {strings.profileCompletionLabel}
              </AppText>
            </View>
            <View style={styles.completionBarBg}>
              <View style={[styles.completionBarFill, { width: `${pct}%` as const }]} />
            </View>
          </View>
        );
      })()
    : null;

  return (
    <>
      <ScrollView
        contentContainerStyle={[styles.content, { backgroundColor: theme.screenBackground }]}
        refreshControl={
          onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined
        }
      >
        {completionCard}

        {/* Hero — rebuilt into a cleaner editorial profile header */}
        <View style={styles.heroSection}>
          <View style={styles.heroWrap}>
            {profilePhotoUrl ? (
              <Image source={{ uri: profilePhotoUrl }} style={styles.heroImage} resizeMode="cover" />
            ) : (
              <LinearGradient
                colors={['#efe6ff', BabyCityPalette.primary + '30', BabyCityPalette.surfaceContainer]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroImage}
              />
            )}
            <LinearGradient
              colors={['rgba(12,18,31,0.05)', 'rgba(12,18,31,0.18)', 'rgba(12,18,31,0.82)']}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.4, y: 1 }}
              style={styles.heroOverlay}
            />
            <View style={styles.heroScrimOrb} />

            <View style={styles.heroContent}>
              <View style={styles.heroBadgeRow}>
                {hasReferences ? (
                  <View style={styles.heroSubBadge}>
                    <MaterialIcons name="fact-check" size={14} color="#ffffff" />
                    <AppText style={styles.heroSubBadgeText}>{strings.referencesBadge}</AppText>
                  </View>
                ) : null}
              </View>

              <View style={styles.heroIdentityRow}>
                <View style={styles.heroIdentityContent}>
                  <AppText variant="h1" weight="800" style={styles.heroName}>
                    {age ? `${name}, ${age}` : name}
                  </AppText>

                  {city ? (
                    <View style={styles.heroCityRow}>
                      <MaterialIcons name="location-on" size={18} color="#ffffff" />
                      <AppText style={styles.heroCityText}>{city}</AppText>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          </View>

          <View style={[styles.heroStatsPanel, CARD_SHADOW]}>
            <View style={styles.statsGrid}>
              {statItems.map(item => (
                <View key={item.key} style={styles.statTile}>
                  <View style={styles.statIconBubble}>
                    <MaterialIcons name={item.icon} size={20} color={BabyCityPalette.primary} />
                  </View>
                  <AppText variant="h2" weight="800" style={styles.statValue}>
                    {item.value}
                  </AppText>
                  <AppText variant="caption" tone="muted" style={styles.statLabel}>
                    {item.label}
                  </AppText>
                </View>
              ))}
            </View>
          </View>
        </View>

        {onEditProfile ? (
          <View style={styles.editRow}>
            <AppButton
              label={strings.settingsEditProfile}
              variant="secondary"
              fullWidth={false}
              style={styles.editAction}
              onPress={onEditProfile}
            />
          </View>
        ) : null}

        {bio ? (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionTitleBorder} />
              <AppText variant="h2" weight="700" style={styles.sectionTitle}>
                כמה מילים עליי
              </AppText>
            </View>
            <View style={[styles.copyCard, CARD_SHADOW]}>
              <AppText variant="body" style={styles.copyText}>
                {bio}
              </AppText>
            </View>
          </View>
        ) : null}

        {specialties.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionTitleBorder} />
              <AppText variant="h2" weight="700" style={styles.sectionTitle}>
                ההתמחויות שלי
              </AppText>
            </View>
            <View style={styles.specialtiesGrid}>
              {specialties.map((item, index) => (
                <View key={`specialty-${item}-${index}`} style={styles.specialtyTile}>
                  <MaterialIcons
                    name={getSpecialtyIcon(item)}
                    size={20}
                    color={BabyCityPalette.primary}
                  />
                  <AppText variant="body" weight="700" style={styles.specialtyLabel}>
                    {item}
                  </AppText>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={[styles.sectionTitleRow, styles.sectionTitleRowSpread]}>
            <View style={styles.sectionTitleLeft}>
              <View style={styles.sectionTitleBorder} />
              <AppText variant="h2" weight="700" style={styles.sectionTitle}>
                לוח זמנים שבועי
              </AppText>
            </View>
            {availability.length > 0 ? (
              <AppText variant="caption" weight="700" style={styles.sectionMeta}>
                {strings.babysitterAvailabilitySlotsSummary(availability.length)}
              </AppText>
            ) : null}
          </View>

          <View style={[styles.scheduleCard, CARD_SHADOW]}>
            {availability.length > 0 ? (
              <>
                {recurringAvailability.length > 0 ? (
                  <View style={styles.scheduleBlock}>
                    <View style={styles.scheduleBlockHeader}>
                      <View style={styles.scheduleBlockIcon}>
                        <MaterialIcons name="schedule" size={18} color={BabyCityPalette.primary} />
                      </View>
                      <View style={styles.scheduleBlockCopy}>
                        <AppText variant="body" weight="700" style={styles.scheduleBlockTitle}>
                          {strings.babysitterAvailabilityTimeWindowsTitle}
                        </AppText>
                        <AppText variant="caption" tone="muted" style={styles.scheduleBlockSubtitle}>
                          {strings.babysitterAvailabilityTimeWindowsSubtitle}
                        </AppText>
                      </View>
                    </View>

                    <View style={styles.scheduleChipWrap}>
                      {recurringAvailability.map(slot => (
                        <InfoChip key={`recurring-${slot}`} label={slot} tone="primary" size="sm" />
                      ))}
                    </View>
                  </View>
                ) : null}

                {specificDayAvailability.length > 0 ? (
                  <View
                    style={[
                      styles.scheduleBlock,
                      recurringAvailability.length > 0 && styles.scheduleBlockBorder,
                    ]}
                  >
                    <View style={styles.scheduleBlockHeader}>
                      <View style={styles.scheduleBlockIcon}>
                        <MaterialIcons name="calendar-month" size={18} color={BabyCityPalette.primary} />
                      </View>
                      <View style={styles.scheduleBlockCopy}>
                        <AppText variant="body" weight="700" style={styles.scheduleBlockTitle}>
                          {strings.babysitterAvailabilityWeekdaysTitle}
                        </AppText>
                        <AppText variant="caption" tone="muted" style={styles.scheduleBlockSubtitle}>
                          {strings.babysitterAvailabilityWeekdaysSubtitle}
                        </AppText>
                      </View>
                    </View>

                    <View style={styles.scheduleChipWrap}>
                      {specificDayAvailability.map(slot => (
                        <InfoChip key={`specific-${slot}`} label={slot} tone="accent" size="sm" />
                      ))}
                    </View>
                  </View>
                ) : null}
              </>
            ) : (
              <AppText variant="body" tone="muted" style={styles.scheduleEmpty}>
                אין עדיין זמינות מוצגת בפרופיל.
              </AppText>
            )}
          </View>
        </View>

        {(detailRows.length > 0 || trustChips.length > 0) ? (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionTitleBorder} />
              <AppText variant="h2" weight="700" style={styles.sectionTitle}>
                עוד כמה דברים שחשוב לדעת
              </AppText>
            </View>

            <View style={[styles.detailsCard, CARD_SHADOW]}>
              {detailRows.map((row, index) => (
                <View
                  key={row.key}
                  style={[
                    styles.detailRow,
                    index < detailRows.length - 1 && styles.detailRowBorder,
                  ]}
                >
                  <View style={styles.detailTextWrap}>
                    <AppText variant="caption" tone="muted" style={styles.detailLabel}>
                      {row.label}
                    </AppText>
                    <AppText variant="body" weight="700" style={styles.detailValue}>
                      {row.value}
                    </AppText>
                  </View>
                  <View style={styles.detailIconWrap}>
                    <MaterialIcons name={row.icon} size={18} color={BabyCityPalette.primary} />
                  </View>
                </View>
              ))}

              {trustChips.length > 0 ? (
                <View style={styles.detailChipsWrap}>
                  {trustChips.map(chip => (
                    <InfoChip
                      key={chip.key}
                      label={chip.label}
                      tone={chip.tone}
                      size="sm"
                    />
                  ))}
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {galleryToShow.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionTitleBorder} />
              <AppText variant="h2" weight="700" style={styles.sectionTitle}>
                {strings.galleryLabel}
              </AppText>
            </View>
            <View style={styles.galleryGrid}>
              {galleryToShow.map((uri, index) => (
                <Image
                  key={`gallery-${index}`}
                  source={{ uri }}
                  style={styles.galleryImage}
                  resizeMode="cover"
                />
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={[styles.sectionTitleRow, styles.sectionTitleRowSpread]}>
            <View style={styles.sectionTitleLeft}>
              <View style={styles.sectionTitleBorder} />
              <AppText variant="h2" weight="700" style={styles.sectionTitle}>
                מה הורים אומרים
              </AppText>
            </View>
            {canRate && onRate ? (
              <TouchableOpacity onPress={onRate}>
                <AppText variant="caption" weight="700" style={styles.showAllLink}>
                  {strings.rateThisBabysitter}
                </AppText>
              </TouchableOpacity>
            ) : null}
          </View>

          {ratings.length === 0 ? (
            <AppText variant="body" tone="muted" style={styles.ratingsEmpty}>
              {strings.ratingsEmpty}
            </AppText>
          ) : (
            <View style={styles.reviewsWrap}>
              {ratings.map(rating => (
                <View key={rating.id} style={[styles.reviewCard, CARD_SHADOW]}>
                  <View style={styles.reviewTopRow}>
                    <View style={styles.reviewIdentity}>
                      <AppText variant="body" weight="700" style={styles.reviewerName}>
                        {rating.parentName || '?'}
                      </AppText>
                      <View style={styles.reviewStars}>
                        {Array.from({ length: 5 }).map((_, index) => (
                          <MaterialIcons
                            key={`${rating.id}-star-${index}`}
                            name={index < rating.stars ? 'star' : 'star-border'}
                            size={14}
                            color="#facc15"
                          />
                        ))}
                      </View>
                    </View>
                    <AvatarCircle name={rating.parentName || '?'} size={42} tone="accent" />
                  </View>

                  {rating.reviewText ? (
                    <AppText variant="body" style={styles.reviewText}>
                      {`"${rating.reviewText}"`}
                    </AppText>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </View>

        {onReportUser || onBlockUser ? (
          <View style={styles.actionLinksRow}>
            {onReportUser ? (
              <TouchableOpacity style={styles.reportLink} onPress={onReportUser}>
                <AppText variant="caption" tone="muted" style={styles.reportLinkText}>
                  {strings.reportUser}
                </AppText>
              </TouchableOpacity>
            ) : null}
            {onBlockUser ? (
              <TouchableOpacity style={styles.reportLink} onPress={onBlockUser}>
                <AppText variant="caption" style={[styles.reportLinkText, styles.blockLinkText]}>
                  {strings.blockUser}
                </AppText>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        <View style={styles.bottomPad} />
      </ScrollView>

      {onSendRequest ? (
        <View style={styles.ctaBar}>
          <View style={styles.ctaPriceWrap}>
            <AppText variant="caption" weight="700" style={styles.ctaPriceLabel}>
              מחיר לשעה
            </AppText>
            <View style={styles.ctaPriceRow}>
              <AppText variant="h1" weight="800" style={styles.ctaPrice}>
                {`₪${hourlyRate}`}
              </AppText>
              <AppText variant="caption" tone="muted" style={styles.ctaPriceUnit}>
                {`/ ${strings.perHour}`}
              </AppText>
            </View>
          </View>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={onSendRequest}
            style={styles.ctaButtonShadow}
          >
            <LinearGradient
              colors={['#702ae1', '#6411d5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaButton}
            >
              <AppText variant="bodyLarge" weight="700" style={styles.ctaButtonText}>
                {requestActionLabel ?? strings.sendMessage}
              </AppText>
              <MaterialIcons name="send" size={20} color="#ffffff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 0,
  },
  completionCard: {
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 18,
    backgroundColor: BabyCityPalette.surfaceLowest,
    borderRadius: 22,
    padding: 18,
  },
  completionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: BabyCityGeometry.spacing.sm,
    marginBottom: 10,
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
  heroSection: {
    marginTop: 12,
    marginBottom: 8,
  },
  heroWrap: {
    marginHorizontal: 20,
    borderRadius: 32,
    overflow: 'hidden',
    aspectRatio: 0.82,
    backgroundColor: BabyCityPalette.surfaceContainer,
    shadowColor: '#171d30',
    shadowOpacity: 0.18,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 },
    elevation: 6,
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  heroScrimOrb: {
    position: 'absolute',
    left: -28,
    bottom: 56,
    width: 168,
    height: 168,
    borderRadius: 84,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  heroContent: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 22,
  },
  heroBadgeRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 8,
  },
  heroVerifiedBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: BabyCityPalette.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  heroSubBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  heroSubBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  heroIdentityRow: {
    width: '100%',
    alignItems: 'flex-end',
  },
  heroIdentityContent: {
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    gap: 10,
    maxWidth: '82%',
  },
  heroVerifiedText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  heroName: {
    color: '#ffffff',
    textAlign: 'right',
    fontSize: 34,
    lineHeight: 40,
    maxWidth: '100%',
  },
  heroCityRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    maxWidth: '100%',
  },
  heroCityText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'right',
  },
  heroStatsPanel: {
    marginHorizontal: 20,
    marginTop: 18,
    paddingTop: 18,
    paddingBottom: 10,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderWidth: 1,
    borderColor: 'rgba(205,221,254,0.72)',
  },
  statsGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
  },
  statTile: {
    width: '48%',
    backgroundColor: BabyCityPalette.surfaceLowest,
    borderRadius: 24,
    minHeight: 108,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(205,221,254,0.74)',
  },
  statIconBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(112,42,225,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  statValue: {
    color: BabyCityPalette.primary,
    textAlign: 'right',
    width: '100%',
    marginTop: 10,
  },
  statLabel: {
    textAlign: 'right',
    width: '100%',
    marginTop: 4,
    lineHeight: 16,
  },
  editRow: {
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 4,
  },
  editAction: {
    alignSelf: 'center',
  },
  section: {
    marginHorizontal: 20,
    marginTop: 26,
  },
  sectionTitleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitleRowSpread: {
    justifyContent: 'space-between',
  },
  sectionTitleLeft: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitleBorder: {
    width: 4,
    height: 20,
    borderRadius: 99,
    backgroundColor: BabyCityPalette.primary,
  },
  sectionTitle: {
    textAlign: 'right',
    color: BabyCityPalette.textPrimary,
  },
  sectionMeta: {
    color: BabyCityPalette.primary,
  },
  copyCard: {
    backgroundColor: BabyCityPalette.surfaceLowest,
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 20,
  },
  copyText: {
    textAlign: 'right',
    lineHeight: 26,
    color: BabyCityPalette.textSecondary,
  },
  specialtiesGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 10,
  },
  specialtyTile: {
    width: '48%',
    minHeight: 70,
    borderRadius: 20,
    backgroundColor: '#eef2ff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  specialtyLabel: {
    flex: 1,
    textAlign: 'right',
    color: BabyCityPalette.textPrimary,
  },
  scheduleCard: {
    backgroundColor: BabyCityPalette.surfaceLowest,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  scheduleBlock: {
    gap: 12,
  },
  scheduleBlockBorder: {
    marginTop: 18,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: 'rgba(108,119,140,0.18)',
  },
  scheduleBlockHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 12,
  },
  scheduleBlockIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(112,42,225,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleBlockCopy: {
    flex: 1,
    alignItems: 'flex-end',
  },
  scheduleBlockTitle: {
    textAlign: 'right',
    color: BabyCityPalette.textPrimary,
  },
  scheduleBlockSubtitle: {
    textAlign: 'right',
    lineHeight: 18,
    marginTop: 2,
  },
  scheduleChipWrap: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
  scheduleEmpty: {
    textAlign: 'right',
    lineHeight: 24,
  },
  detailsCard: {
    backgroundColor: BabyCityPalette.surfaceLowest,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  detailRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  detailRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(108,119,140,0.18)',
  },
  detailIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(112,42,225,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTextWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },
  detailLabel: {
    textAlign: 'right',
    marginBottom: 4,
  },
  detailValue: {
    textAlign: 'right',
    color: BabyCityPalette.textPrimary,
    lineHeight: 22,
  },
  detailChipsWrap: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 14,
    paddingBottom: 8,
  },
  galleryGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 10,
  },
  galleryImage: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 20,
  },
  showAllLink: {
    color: BabyCityPalette.primary,
  },
  reviewsWrap: {
    gap: 12,
  },
  reviewCard: {
    backgroundColor: BabyCityPalette.surfaceLowest,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  reviewTopRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  reviewIdentity: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 4,
  },
  reviewerName: {
    textAlign: 'right',
    color: BabyCityPalette.textPrimary,
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 1,
  },
  reviewText: {
    textAlign: 'right',
    lineHeight: 24,
    color: BabyCityPalette.textSecondary,
    fontStyle: 'italic',
  },
  ratingsEmpty: {
    textAlign: 'right',
  },
  reportLink: {
    paddingHorizontal: 4,
    paddingVertical: 10,
  },
  reportLinkText: {
    textDecorationLine: 'underline',
  },
  blockLinkText: {
    color: BabyCityPalette.error,
  },
  actionLinksRow: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
    gap: 16,
    marginTop: 10,
    paddingHorizontal: 20,
  },
  bottomPad: {
    height: 130,
  },
  ctaBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: -10 },
    elevation: 10,
  },
  ctaPriceWrap: {
    minWidth: 92,
    alignItems: 'flex-end',
  },
  ctaPriceLabel: {
    color: BabyCityPalette.textSecondary,
    textAlign: 'right',
  },
  ctaPriceRow: {
    flexDirection: 'row-reverse',
    alignItems: 'baseline',
    gap: 3,
  },
  ctaPrice: {
    color: BabyCityPalette.textPrimary,
    fontSize: 26,
    lineHeight: 32,
  },
  ctaPriceUnit: {
    color: BabyCityPalette.textSecondary,
  },
  ctaButtonShadow: {
    flex: 1,
    shadowColor: '#702ae1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
    borderRadius: 24,
  },
  ctaButton: {
    flex: 1,
    minHeight: 58,
    borderRadius: 24,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  ctaButtonText: {
    color: '#ffffff',
  },
});
