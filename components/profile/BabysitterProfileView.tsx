import { Image, Linking, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const BABYSITTER_GALLERY_IMAGES = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAQIvSUdjirWkyRInjQ8K8c145qlQPRo9wvbaWVc7Z_sNxx-LQwDfc5eCloGLLbxPnI-E7VJ_maA9xcSqAbaZf74EAvHDvDNTeUjqKTJ1E3kF36Dw1KnyBV8dd18wR0xxLkpcGW1W7NyHqyY8KGPDfba-VwCATgxoMRIHZMrPz_7xNfB0cgbhyxHrG8Og1FeDkM6sZUHPrn-s5PEDDNAtKYPPr68qr4vXkGHelG9ox3P1bU7cYIoPKFPY8MZbFPAqiB6rAGTKJiuD0c',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAR_4EcCMJq0MX8kHKmc1tOuVYHGxCIdKSmt7TXyzleyt7940F0iFHS9nztugRdmS8okyxWMDk4orHoG-MxqfHMDoNvGOsi4R6Wgk9eHgUhslcY8bCkcNBwpqT5erC49DKbqzPPIoGh3wf8ysEZcwIN-7NrxfnW-KJFehYm1VM8Dn2izll9ovzkYAghXBCT_NKUI-w23BhXhGNb9aim_zKooWcqqv742THN2TJJ9ID1Ndrmz5T5mjQEROCE2aWp5oppYL7sn5TdLTy0',
];
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

// Specialty icon mapping
const SPECIALTY_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  'תינוקות': 'child-care',
  'פעוטות': 'toys',
  'בישול': 'restaurant',
  'שיעורי בית': 'school',
  'ילדים בוגרים': 'school',
  'צרכים מיוחדים': 'accessible',
};

function getSpecialtyIcon(label: string): keyof typeof MaterialIcons.glyphMap {
  for (const key of Object.keys(SPECIALTY_ICONS)) {
    if (label.includes(key)) return SPECIALTY_ICONS[key];
  }
  return 'star';
}

const STAT_TILE_SHADOW = {
  shadowColor: '#242f41',
  shadowOpacity: 0.04,
  shadowRadius: 30,
  shadowOffset: { width: 0, height: 8 },
  elevation: 2,
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
  const galleryToShow = galleryPhotoUrls.length > 0 ? galleryPhotoUrls : BABYSITTER_GALLERY_IMAGES;

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

  // Build specialties from ageGroups + superpowers
  const specialties = [
    ...ageGroups.map(g => g),
    ...superpowers.slice(0, Math.max(0, 4 - ageGroups.length)),
  ].slice(0, 4);

  // Profile completion card (own profile only)
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
      <View style={styles.completionCard}>
        <View style={styles.completionHeader}>
          <AppText variant="h2" weight="800" style={styles.completionPct}>{String(pct)}%</AppText>
          <AppText variant="body" tone="muted" style={styles.completionLabel}>{strings.profileCompletionLabel}</AppText>
        </View>
        <View style={styles.completionBarBg}>
          <View style={[styles.completionBarFill, { width: `${pct}%` as const }]} />
        </View>
      </View>
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

        {/* ── Hero banner with gradient overlay ── */}
        <View style={styles.heroWrap}>
          <Image
            source={{
              uri: profilePhotoUrl ||
                'https://lh3.googleusercontent.com/aida-public/AB6AXuDv781fLEnnEarOnE3oh5Kl6eWiI5w3iHx2d_DiDX4AKVx-6LqVlAf-zNcM_28Ea-VDU39Xbdwo0_79BtpPG4kKzL29zgAawPq7Uvx-iLB0oYcY-BBI3misnHZGB-xUh4aAbHz0_i5hd7z2fPfTGLSJSqAR573nHD0OMCCiEYFPo2d8oaBWBr8zwGjQjrx8_UuHbAwi2tbT0cvwNi36T4C5pk9PbBUHRjuwa_W1Frlr1SUQRLrbQgOMzAH4VEQ1pS4bRlaucbk7LvgL',
            }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          {/* Gradient overlay at bottom */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.6)']}
            style={styles.heroGradient}
          />
          {/* Overlaid name / location / verified badge */}
          <View style={styles.heroOverlay}>
            {isVerified ? (
              <View style={styles.verifiedPill}>
                <MaterialIcons name="verified" size={14} color="#f8f0ff" />
                <AppText variant="caption" weight="700" style={styles.verifiedPillText}>מאומת</AppText>
              </View>
            ) : null}
            <AppText variant="h1" weight="800" style={styles.heroName}>
              {age ? `${name}, ${age}` : name}
            </AppText>
            {city ? (
              <View style={styles.heroCityRow}>
                <MaterialIcons name="location-on" size={18} color="rgba(255,255,255,0.9)" />
                <AppText variant="body" style={styles.heroCityText}>{city}</AppText>
              </View>
            ) : null}
          </View>
        </View>

        {/* ── Stats row — 4 tiles, pulled up ── */}
        <View style={styles.statsRow}>
          {averageStars !== null ? (
            <View style={[styles.statTile, STAT_TILE_SHADOW]}>
              <AppText variant="h2" weight="700" style={styles.statValue}>
                {averageStars.toFixed(1)}
              </AppText>
              <AppText variant="caption" tone="muted" style={styles.statLabel}>
                {`${ratings.length} ביקורות`}
              </AppText>
            </View>
          ) : null}
          <View style={[styles.statTile, STAT_TILE_SHADOW]}>
            <AppText variant="h2" weight="700" style={styles.statValue}>
              {yearsExperience ? `+${yearsExperience}` : '–'}
            </AppText>
            <AppText variant="caption" tone="muted" style={styles.statLabel}>
              {strings.yearsExpLabel}
            </AppText>
          </View>
          <View style={[styles.statTile, STAT_TILE_SHADOW]}>
            <AppText variant="h2" weight="700" style={styles.statValue}>
              {'15 דק׳'}
            </AppText>
            <AppText variant="caption" tone="muted" style={styles.statLabel}>
              {'זמן תגובה'}
            </AppText>
          </View>
          <View style={[styles.statTile, STAT_TILE_SHADOW]}>
            <AppText variant="h2" weight="700" style={styles.statValue}>
              {`₪${hourlyRate}`}
            </AppText>
            <AppText variant="caption" tone="muted" style={styles.statLabel}>
              {strings.perHour}
            </AppText>
          </View>
        </View>

        {/* ── Edit button (own profile) ── */}
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

        {/* ── Bio ── */}
        {bio ? (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionTitleBorder} />
              <AppText variant="h2" weight="700" style={styles.sectionTitle}>כמה מילים עליי</AppText>
            </View>
            <View style={styles.bioCard}>
              <AppText variant="body" style={styles.bioText}>{bio}</AppText>
            </View>
          </View>
        ) : null}

        {/* ── Specialties (2-col grid) ── */}
        {specialties.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionTitleBorder} />
              <AppText variant="h2" weight="700" style={styles.sectionTitle}>ההתמחויות שלי</AppText>
            </View>
            <View style={styles.specialtiesGrid}>
              {specialties.map((item, i) => (
                <View key={`specialty-${i}`} style={styles.specialtyTile}>
                  <MaterialIcons name={getSpecialtyIcon(item)} size={22} color={BabyCityPalette.primary} />
                  <AppText variant="body" weight="600" style={styles.specialtyLabel}>{item}</AppText>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* ── Additional info chips ── */}
        {(availability.length > 0 || languages.length > 0 || ageGroups.length > 0 || certifications.length > 0) ? (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionTitleBorder} />
              <AppText variant="h2" weight="700" style={styles.sectionTitle}>{strings.availabilityProfile}</AppText>
            </View>
            <View style={styles.chipsWrap}>
              {[...availability, ...languages, ...certifications].map((item, i) => (
                <InfoChip key={`info-${i}`} label={item} tone="primary" size="sm" />
              ))}
              {hasCar ? <InfoChip label={strings.hasCarBadge} tone="accent" size="sm" /> : null}
              {hasFirstAid ? <InfoChip label={strings.firstAidBadge} tone="accent" size="sm" /> : null}
              {hasReferences ? <InfoChip label={strings.referencesBadge} tone="success" size="sm" /> : null}
              {specialNeeds ? <InfoChip label={strings.specialNeedsBadge} tone="warning" size="sm" /> : null}
              {extras.map((e, i) => (
                <InfoChip key={`extra-${i}`} label={e} tone="muted" size="sm" />
              ))}
            </View>
          </View>
        ) : null}

        {/* ── Gallery ── */}
        {galleryToShow.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionTitleBorder} />
              <AppText variant="h2" weight="700" style={styles.sectionTitle}>{strings.galleryLabel ?? 'גלריה'}</AppText>
            </View>
            <View style={styles.galleryGrid}>
              {galleryToShow.map((uri, i) => (
                <Image
                  key={`gallery-${i}`}
                  source={{ uri }}
                  style={styles.galleryImage}
                  resizeMode="cover"
                />
              ))}
            </View>
          </View>
        ) : null}

        {/* ── Reviews ── */}
        <View style={styles.section}>
          <View style={[styles.sectionTitleRow, styles.sectionTitleRowSpread]}>
            <View style={styles.sectionTitleLeft}>
              <View style={styles.sectionTitleBorder} />
              <AppText variant="h2" weight="700" style={styles.sectionTitle}>מה הורים אומרים</AppText>
            </View>
            {canRate && onRate ? (
              <TouchableOpacity onPress={onRate}>
                <AppText variant="caption" weight="700" style={styles.showAllLink}>{strings.rateThisBabysitter}</AppText>
              </TouchableOpacity>
            ) : null}
          </View>
          {ratings.length === 0 ? (
            <AppText variant="body" tone="muted" style={styles.ratingsEmpty}>
              {strings.ratingsEmpty}
            </AppText>
          ) : (
            <View style={styles.reviewsWrap}>
              {ratings.map(r => (
                <View key={r.id} style={[styles.reviewCard, STAT_TILE_SHADOW]}>
                  <View style={styles.reviewTop}>
                    <AvatarCircle name={r.parentName || '?'} size={40} />
                    <View style={styles.reviewMeta}>
                      {r.parentName ? (
                        <AppText variant="body" weight="700" style={styles.reviewerName}>{r.parentName}</AppText>
                      ) : null}
                      <View style={styles.starsRow}>
                        {Array.from({ length: 5 }).map((_, si) => (
                          <MaterialIcons
                            key={si}
                            name={si < r.stars ? 'star' : 'star-border'}
                            size={14}
                            color="#facc15"
                          />
                        ))}
                      </View>
                    </View>
                  </View>
                  {r.reviewText ? (
                    <AppText variant="body" style={styles.reviewText}>{`"${r.reviewText}"`}</AppText>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </View>

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

        {/* Bottom padding for CTA bar */}
        <View style={styles.bottomPad} />
      </ScrollView>

      {/* ── Sticky CTA bar ── */}
      {onSendRequest ? (
        <View style={styles.ctaBar}>
          <View style={styles.ctaPriceWrap}>
            <AppText variant="caption" weight="700" style={styles.ctaPriceLabel}>{'מחיר לשעה'}</AppText>
            <View style={styles.ctaPriceRow}>
              <AppText variant="h1" weight="800" style={styles.ctaPrice}>{`₪${hourlyRate}`}</AppText>
              <AppText variant="caption" tone="muted" style={styles.ctaPriceUnit}>{`/ ${strings.perHour}`}</AppText>
            </View>
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
    paddingBottom: 0,
  },
  completionCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    backgroundColor: BabyCityPalette.surfaceLowest,
    borderRadius: BabyCityGeometry.radius.control,
    padding: 16,
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
  // Hero banner
  heroWrap: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
    aspectRatio: 4 / 5,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    // gradient runs from top-transparent to bottom-dark
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
    backgroundColor: BabyCityPalette.primary,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 8,
  },
  verifiedPillText: {
    color: '#f8f0ff',
    letterSpacing: 0.5,
  },
  heroName: {
    color: '#ffffff',
    textAlign: 'right',
    fontSize: 28,
    lineHeight: 36,
  },
  heroCityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    justifyContent: 'flex-end',
  },
  heroCityText: {
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'right',
  },
  // Stats row
  statsRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: -20,
    marginBottom: 16,
    zIndex: 10,
  },
  statTile: {
    flex: 1,
    backgroundColor: BabyCityPalette.surfaceLowest,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    color: BabyCityPalette.primary,
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 22,
  },
  statLabel: {
    textAlign: 'center',
    lineHeight: 14,
    fontSize: 11,
  },
  // Edit button (own profile)
  editRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  editAction: {
    alignSelf: 'center',
  },
  // Section layout
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
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
    borderRadius: 2,
    backgroundColor: BabyCityPalette.primary,
  },
  sectionTitle: {
    color: BabyCityPalette.textPrimary,
    textAlign: 'right',
  },
  showAllLink: {
    color: BabyCityPalette.primary,
  },
  // Bio
  bioCard: {
    backgroundColor: BabyCityPalette.surfaceLowest,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#242f41',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  bioText: {
    lineHeight: 26,
    textAlign: 'right',
    color: BabyCityPalette.textSecondary,
  },
  // Specialties 2-col grid
  specialtiesGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 12,
  },
  specialtyTile: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    backgroundColor: BabyCityPalette.surfaceLow,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    width: '47%',
  },
  specialtyLabel: {
    color: BabyCityPalette.textPrimary,
    textAlign: 'right',
    flex: 1,
    fontSize: 14,
  },
  // Chips (availability etc.)
  chipsWrap: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
  // Gallery 2-col grid
  galleryGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 10,
  },
  galleryImage: {
    width: '47.5%',
    aspectRatio: 1,
    borderRadius: 12,
  },
  // Reviews
  reviewsWrap: {
    gap: 12,
  },
  reviewCard: {
    backgroundColor: BabyCityPalette.surfaceLowest,
    borderRadius: 12,
    padding: 20,
  },
  reviewTop: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  reviewMeta: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 4,
  },
  reviewerName: {
    color: BabyCityPalette.textPrimary,
    textAlign: 'right',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 1,
  },
  reviewText: {
    color: BabyCityPalette.textSecondary,
    fontStyle: 'italic',
    lineHeight: 22,
    textAlign: 'right',
  },
  ratingsEmpty: {
    textAlign: 'right',
  },
  // Report
  reportLink: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
  },
  reportLinkText: {
    textDecorationLine: 'underline',
  },
  bottomPad: {
    height: 120,
  },
  // Sticky CTA
  ctaBar: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: 28,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -10 },
    elevation: 8,
  },
  ctaPriceWrap: {
    alignItems: 'flex-end',
    minWidth: 72,
  },
  ctaPriceLabel: {
    color: BabyCityPalette.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 10,
  },
  ctaPriceRow: {
    flexDirection: 'row-reverse',
    alignItems: 'baseline',
    gap: 3,
  },
  ctaPrice: {
    color: BabyCityPalette.textPrimary,
    fontSize: 24,
    lineHeight: 30,
  },
  ctaPriceUnit: {
    color: BabyCityPalette.textSecondary,
  },
  ctaCta: {
    flex: 1,
  },
});
