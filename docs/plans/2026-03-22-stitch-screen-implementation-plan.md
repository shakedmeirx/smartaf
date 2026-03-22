# Stitch Screen Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Update all 9 key app screens to exactly match the Stitch "Serene Sanctuary" design, preserving all existing logic, navigation, and data.

**Architecture:** Sequential screen updates — exact visual match of Stitch HTML/CSS, translated to React Native StyleSheet using existing shared components (`AppText`, `AppCard`, `AppButton`, `AppChip`, `AvatarCircle`) and design tokens from `constants/theme.ts`. No new dependencies needed.

**Tech Stack:** Expo React Native, TypeScript, expo-linear-gradient (already installed), constants/theme.ts tokens

---

## Task 1: Babysitter Profile View — Full-width banner hero layout

**Files:**
- Modify: `components/profile/BabysitterProfileView.tsx`

The biggest structural change. Stitch shows: full-width image/colored banner → circular avatar overlapping its bottom edge → name + city + stats below → sections as white cards.

**Step 1: Replace the AppCard hero wrapper with a banner + floating avatar**

Remove the existing `<AppCard role="parent" variant="hero" style={styles.heroCard}>` block (lines 123–176) and replace with this structure:

```tsx
{/* ── Banner ── */}
<View style={styles.bannerWrap}>
  {profilePhotoUrl ? (
    <Image source={{ uri: profilePhotoUrl }} style={styles.bannerImage} resizeMode="cover" />
  ) : (
    <View style={[styles.bannerImage, styles.bannerPlaceholder]} />
  )}
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
</View>
```

Add `Image` to RN imports. Add `Ionicons` import from `@expo/vector-icons` (already used in file).

**Step 2: Add 3-stat row below identity**

Replace the existing `styles.statsRow` section (lines 178–203) with:

```tsx
{/* ── Stats row ── */}
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
```

**Step 3: Update the styles object**

Replace the `heroCard`, `photoWrap`, `heroName`, `heroCity`, `metaRow`, `badgesRow`, `editAction`, and `statsRow` styles with:

```tsx
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
  right: -4, // visually top-right in RTL is bottom-right here
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
```

Also update `content` padding to start at 0 (banner is edge-to-edge):
```tsx
content: {
  paddingBottom: BabyCityGeometry.spacing.md,
  backgroundColor: BabyCityPalette.canvas,
},
sectionCard: {
  marginHorizontal: 16,
  marginBottom: 14,
},
```

**Step 4: Update sticky CTA bar**

Update the ctaBar style:
```tsx
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
```

Add a rate chip before the CTA button:
```tsx
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
```

Add new styles:
```tsx
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
```

**Step 5: TypeScript check**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: no errors

**Step 6: Commit**

```bash
git add components/profile/BabysitterProfileView.tsx
git commit -m "feat: BabysitterProfileView — Stitch banner hero, floating avatar, 3-stat row, rate CTA"
```

---

## Task 2: Family Profile — Banner hero + children/pets sections

**Files:**
- Modify: `app/family-profile.tsx`

Read the full file first to understand current structure, then apply these changes.

**Step 1: Read the full file**

```bash
# Read the full file to understand current JSX structure
```

Run: `cat app/family-profile.tsx | wc -l` to see length, then read relevant sections.

**Step 2: Replace profile hero with banner + floating avatar**

Find the current `<ProfilePhotoHero ...>` or `<AppCard variant="hero">` block. Replace with:

```tsx
{/* ── Full-width banner ── */}
<View style={styles.bannerWrap}>
  {family.profilePhotoUrl ? (
    <Image source={{ uri: family.profilePhotoUrl }} style={styles.bannerImg} resizeMode="cover" />
  ) : (
    <View style={[styles.bannerImg, { backgroundColor: BabyCityPalette.surfaceLow }]} />
  )}
</View>

{/* ── Avatar overlapping banner ── */}
<View style={styles.avatarWrap}>
  <AvatarCircle
    name={`${family.firstName} ${family.lastName}`}
    photoUrl={family.profilePhotoUrl}
    size={88}
  />
</View>

{/* ── Identity ── */}
<View style={styles.identitySection}>
  <AppText variant="h1" weight="800" align="center">
    {`משפחת ${family.lastName || family.firstName}`}
  </AppText>
  {family.city ? (
    <View style={styles.cityRow}>
      <Ionicons name="location-outline" size={14} color={BabyCityPalette.textSecondary} />
      <AppText variant="body" tone="muted">{family.city}</AppText>
    </View>
  ) : null}
</View>
```

Add `Image` import from react-native. Add `Ionicons` import from `@expo/vector-icons`.
Add `AvatarCircle` import from `@/components/ui/AvatarCircle`.

**Step 3: Add "About" section card**

After the identity section, add:
```tsx
{family.familyNote ? (
  <AppCard style={styles.sectionCard}>
    <AppText variant="bodyLarge" weight="700" style={styles.sectionTitle}>
      {strings.familyAboutLabel ?? 'על המשפחה'}
    </AppText>
    <AppText variant="body" style={styles.bioText}>{family.familyNote}</AppText>
  </AppCard>
) : null}
```

**Step 4: Add children cards section**

```tsx
{family.children && family.children.length > 0 ? (
  <AppCard style={styles.sectionCard}>
    <AppText variant="bodyLarge" weight="700" style={styles.sectionTitle}>
      {strings.familyChildrenLabel ?? 'הילדים שלנו'}
    </AppText>
    <View style={styles.childrenRow}>
      {family.children.map((child, i) => (
        <View key={i} style={styles.childChip}>
          <AvatarCircle name={child.name || String(i + 1)} size={40} tone="accent" />
          <AppText variant="meta" weight="700" style={styles.childName}>{child.name}</AppText>
          {child.age ? (
            <AppText variant="caption" tone="muted">{child.age}</AppText>
          ) : null}
        </View>
      ))}
    </View>
  </AppCard>
) : null}
```

**Step 5: Add styles**

```tsx
bannerWrap: { width: '100%', height: 200 },
bannerImg: { width: '100%', height: 200 },
avatarWrap: { alignItems: 'center', marginTop: -44, marginBottom: 12 },
identitySection: { alignItems: 'center', paddingHorizontal: 20, marginBottom: 8 },
cityRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
sectionCard: { marginHorizontal: 16, marginBottom: 14 },
sectionTitle: { textAlign: 'right', marginBottom: 10 },
bioText: { textAlign: 'right', lineHeight: 24 },
childrenRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 12 },
childChip: { alignItems: 'center', gap: 4, minWidth: 64 },
childName: { textAlign: 'center' },
```

**Step 6: TypeScript check + commit**

Run: `npx tsc --noEmit 2>&1 | head -20`

```bash
git add app/family-profile.tsx
git commit -m "feat: family-profile — Stitch banner hero, floating avatar, children section"
```

---

## Task 3: ParentPostCard — Stitch exact card layout

**Files:**
- Modify: `components/babysitter/ParentPostCard.tsx`

**Current state:** Has avatar, name, city, status chip, note text, meta pills grid, age chips, action buttons. Already close to Stitch. Main changes: icon buttons need `#dee8ff` bg (already using `cardMuted` which is `#dee8ff` ✅), status chip placement, note text truncation.

**Step 1: Remove status chip from identity area, add as inline badge on note**

In the current card, the `statusRow` is placed inside the identity. Move it to sit inline with the meta items (or remove if redundant with note).

Actually the current structure is already close to Stitch. The main visual difference is the status chip sits below city text. Keep it there.

**Step 2: Ensure meta pill grid matches Stitch**

The MetaPill uses `width: '48%'` (2-column grid) with `#dee8ff` bg, icon + label + value. This matches Stitch exactly. No change needed.

**Step 3: Update card border color to transparent**

```tsx
// In card style:
card: {
  paddingVertical: 14,
  // Remove borderColor: BabyCityPalette.borderSoft — already transparent from AppCard default
},
```

Remove `borderColor: BabyCityPalette.borderSoft` from the `card` StyleSheet entry (line 263).

**Step 4: Commit**

```bash
git add components/babysitter/ParentPostCard.tsx
git commit -m "refine: ParentPostCard — remove explicit border color, matches Stitch"
```

---

## Task 4: Babysitter Jobs Feed — Section header with count

**Files:**
- Modify: `app/babysitter.tsx`

**Current state:** AppShell title is the greeting, no section count header on feed. Stitch shows "עבודות מחכות לך" as a section title + "{count} משפחות" subtitle.

**Step 1: The feed already has a `SectionHeader` in the render**

Looking at the screen, the SectionHeader is already present (`strings.babysittersCountLabel(filtered.length)` in parent.tsx). For babysitter.tsx, there's a `feedSubtitle` computed above.

The current babysitter.tsx does NOT have a section header — it goes directly from SearchField to the filtered posts. Add a `SectionHeader` after the search:

Find in `babysitter.tsx` where `SearchField` is rendered (around line 322), add after it (but before `showFilters` block):

```tsx
{!postsLoading && (
  <SectionHeader
    title={strings.postFeedTitle ?? 'עבודות מחכות לך'}
    subtitle={filteredPosts.length > 0 ? `${filteredPosts.length} ${strings.babysitterStatsOpenPosts}` : undefined}
    style={styles.feedHeader}
  />
)}
```

Add `SectionHeader` to the imports (already imported in `parent.tsx`, check if in `babysitter.tsx` — it is not, add it).

Add style:
```tsx
feedHeader: {
  marginBottom: 8,
},
```

**Step 2: Import SectionHeader**

Add to imports:
```tsx
import SectionHeader from '@/components/ui/SectionHeader';
```

**Step 3: Commit**

```bash
git add app/babysitter.tsx
git commit -m "feat: babysitter feed — Stitch section header with post count"
```

---

## Task 5: Chat Preview Card — Stitch exact layout + search

**Files:**
- Modify: `components/requests/ChatPreviewCard.tsx`
- Modify: `app/babysitter-inbox.tsx`

**Current state of ChatPreviewCard:**
- RTL row: avatar (54px) right, name + preview middle, meta (timestamp + dot) left
- Already quite close to Stitch. Main differences:
  - Avatar should be 44px (Stitch uses smaller)
  - Pending badge replaces unread dot — Stitch shows unread dot always when unread
  - Card background: white with editorial shadow (already done via AppCard list variant)

**Step 1: Update ChatPreviewCard avatar size and unread dot logic**

In `components/requests/ChatPreviewCard.tsx`, change:

```tsx
// Line 79: size={54} → size={44}
<AvatarCircle
  name={thread.counterpartName}
  photoUrl={thread.counterpartPhotoUrl}
  size={44}
/>
```

Move the unread dot to always show for any unread state (not just pending). Currently `isPending` drives the dot — keep as is since that's the data model. No change needed there.

**Step 2: Update card padding**

```tsx
card: {
  marginBottom: 10,
  paddingVertical: 12,
  paddingHorizontal: 16,
},
```

**Step 3: Add search field to inbox screen**

In `app/babysitter-inbox.tsx`, add a search state and SearchField above the segment tabs:

```tsx
const [searchQuery, setSearchQuery] = useState('');
```

In JSX, before `<SegmentTabs`:
```tsx
<SearchField
  value={searchQuery}
  onChangeText={setSearchQuery}
  placeholder={strings.chatSearchPlaceholder ?? 'חיפוש שיחות'}
  style={styles.searchField}
/>
```

Add `SearchField` import:
```tsx
import SearchField from '@/components/ui/SearchField';
```

Filter `chatThreads` by search query:
```tsx
const filteredThreads = useMemo(
  () => searchQuery.trim()
    ? chatThreads.filter(t =>
        t.counterpartName.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : chatThreads,
  [chatThreads, searchQuery]
);
```

Use `filteredThreads` instead of `chatThreads` in the FlatList `data` prop.

Add style:
```tsx
searchField: {
  marginBottom: 12,
},
```

**Step 4: TypeScript check + commit**

Run: `npx tsc --noEmit 2>&1 | head -20`

```bash
git add components/requests/ChatPreviewCard.tsx app/babysitter-inbox.tsx
git commit -m "feat: chat inbox — Stitch layout, smaller avatar, search field"
```

---

## Task 6: Shift History — Stitch summary tiles + card layout

**Files:**
- Modify: `app/babysitter-shifts.tsx`
- Modify: `components/babysitter/BabysitterShiftEntryCard.tsx`

**Step 1: Read the full babysitter-shifts.tsx to find the summary/stat area**

The file imports `BabysitterStatCard`. Find where summary stats are rendered and update to Stitch 2-tile row.

Look for `BabysitterStatCard` usage in `babysitter-shifts.tsx`. The Stitch design shows two large tiles side by side: "42 שעות עבודה" + "₪2,730 הכנסה". Update to match:

Find the summary stat cards section and replace with:
```tsx
<View style={styles.summaryRow}>
  <View style={styles.summaryTile}>
    <AppText variant="screenTitle" weight="800" style={styles.summaryValue}>
      {formatShiftHours(totalHours)}
    </AppText>
    <AppText variant="caption" tone="muted" style={styles.summaryLabel}>
      {strings.babysitterShiftManagerSummaryHours}
    </AppText>
  </View>
  <View style={styles.summaryTile}>
    <AppText variant="screenTitle" weight="800" style={[styles.summaryValue, { color: BabyCityPalette.success }]}>
      {formatShiftCurrency(totalEarnings)}
    </AppText>
    <AppText variant="caption" tone="muted" style={styles.summaryLabel}>
      {strings.babysitterShiftManagerSummaryEarnings}
    </AppText>
  </View>
</View>
```

Add styles:
```tsx
summaryRow: {
  flexDirection: 'row-reverse',
  gap: 12,
  marginBottom: 20,
  paddingHorizontal: 20,
},
summaryTile: {
  flex: 1,
  backgroundColor: BabyCityPalette.surfaceContainer,
  borderRadius: BabyCityGeometry.radius.control,
  paddingVertical: 16,
  paddingHorizontal: 14,
  alignItems: 'center',
  gap: 4,
},
summaryValue: {
  textAlign: 'center',
  color: BabyCityPalette.textPrimary,
},
summaryLabel: {
  textAlign: 'center',
},
```

**Step 2: Add month group headers to shift list**

The current list renders `BabysitterShiftEntryCard` items flat. Add month grouping:

Find the `renderItem` or map of shifts. Add a helper:
```tsx
function groupShiftsByMonth(shifts: BabysitterShift[]) {
  const groups: { month: string; shifts: BabysitterShift[] }[] = [];
  for (const shift of shifts) {
    const month = new Date(`${shift.shiftDate}T12:00:00`).toLocaleDateString('he-IL', {
      month: 'long',
      year: 'numeric',
    });
    const existing = groups.find(g => g.month === month);
    if (existing) {
      existing.shifts.push(shift);
    } else {
      groups.push({ month, shifts: [shift] });
    }
  }
  return groups;
}
```

Render grouped:
```tsx
{groupShiftsByMonth(filteredShifts).map(({ month, shifts: monthShifts }) => (
  <View key={month}>
    <AppText variant="bodyLarge" weight="800" style={styles.monthHeader}>{month}</AppText>
    {monthShifts.map(shift => (
      <BabysitterShiftEntryCard key={shift.id} shift={shift} ... />
    ))}
  </View>
))}
```

Add style:
```tsx
monthHeader: {
  textAlign: 'right',
  marginBottom: 10,
  marginTop: 4,
  color: BabyCityPalette.textSecondary,
},
```

**Step 3: Update BabysitterShiftEntryCard — add avatar**

In `components/babysitter/BabysitterShiftEntryCard.tsx`, update `headerRow` to include an `AvatarCircle`:

```tsx
// Add import
import AvatarCircle from '@/components/ui/AvatarCircle';

// Update headerRow JSX:
<View style={styles.headerRow}>
  <AvatarCircle name={shift.parentName} size={44} />
  <View style={styles.identity}>
    <AppText variant="h3" weight="800" numberOfLines={1}>
      {shift.parentName}
    </AppText>
    <AppText variant="body" tone="muted">
      {formatShiftDate(shift.shiftDate)}
    </AppText>
  </View>
  <View style={styles.amountWrap}>
    <AppText variant="caption" tone="muted" style={styles.amountLabel}>
      {strings.babysitterShiftTotalLabel}
    </AppText>
    <AppText variant="h3" weight="800" style={styles.amount}>
      {formatShiftCurrency(shift.totalAmount)}
    </AppText>
  </View>
</View>
```

Update headerRow style:
```tsx
headerRow: {
  flexDirection: 'row-reverse',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: BabyCityGeometry.spacing.md,
},
```

**Step 4: TypeScript check + commit**

Run: `npx tsc --noEmit 2>&1 | head -20`

```bash
git add app/babysitter-shifts.tsx components/babysitter/BabysitterShiftEntryCard.tsx
git commit -m "feat: shift history — Stitch summary tiles, month grouping, avatar on card"
```

---

## Task 7: Babysitter Onboarding — Completion screen

**Files:**
- Modify: `app/babysitter-onboarding.tsx`

**Step 1: Read the full onboarding file to understand current step/save flow**

Read `app/babysitter-onboarding.tsx` lines 60–200 to find where `step` state is managed and where save is triggered.

**Step 2: Add 'complete' step type**

Find the `step` state (likely `useState<number>(1)` or similar). Add a completion state:

```tsx
const [showComplete, setShowComplete] = useState(false);
const [savedProfile, setSavedProfile] = useState<{ name: string; city: string; hourlyRate: number; photoUrl?: string } | null>(null);
```

**Step 3: Trigger completion after successful save**

Find the save function (likely `handleFinish` or `handleSave`). After successful save, instead of `router.replace`, set:
```tsx
setSavedProfile({
  name: onboardingData.name,
  city: onboardingData.city,
  hourlyRate: onboardingData.hourlyRate,
  photoUrl: onboardingData.profilePhotoUrl,
});
setShowComplete(true);
```

**Step 4: Add completion screen JSX**

Before the main return, add a conditional:
```tsx
if (showComplete && savedProfile) {
  return (
    <SafeAreaView style={styles.completeSafe}>
      <ScrollView contentContainerStyle={styles.completeScroll}>
        {/* Success icon */}
        <View style={styles.completeIconWrap}>
          <LinearGradient
            colors={['#702ae1', '#6411d5']}
            style={styles.completeIconGradient}
          >
            <Ionicons name="checkmark" size={40} color="#ffffff" />
          </LinearGradient>
        </View>

        <AppText variant="h1" weight="800" align="center" style={styles.completeHeading}>
          {'ברוכה הבאה לקהילת Smartaf! 🎉'}
        </AppText>
        <AppText variant="body" tone="muted" align="center" style={styles.completeSubtitle}>
          {'הפרופיל שלך נוצר בהצלחה'}
        </AppText>

        {/* Profile preview card */}
        <AppCard style={styles.completeCard}>
          <View style={styles.completeCardRow}>
            <AvatarCircle name={savedProfile.name} photoUrl={savedProfile.photoUrl} size={64} />
            <View style={styles.completeCardInfo}>
              <AppText variant="h3" weight="800" style={styles.completeCardName}>
                {savedProfile.name}
              </AppText>
              <View style={styles.completeNewBadge}>
                <Ionicons name="star" size={12} color={BabyCityPalette.primary} />
                <AppText variant="caption" weight="700" style={styles.completeNewBadgeText}>
                  {'חדשה בקהילת Smartaf'}
                </AppText>
              </View>
              {savedProfile.city ? (
                <View style={styles.completeCityRow}>
                  <Ionicons name="location-outline" size={12} color={BabyCityPalette.textSecondary} />
                  <AppText variant="caption" tone="muted">{savedProfile.city}</AppText>
                </View>
              ) : null}
              <AppText variant="caption" tone="muted">
                {`₪${savedProfile.hourlyRate} ${strings.perHour}`}
              </AppText>
            </View>
          </View>
        </AppCard>

        {/* Actions */}
        <AppPrimaryButton
          label={'עבור ללוח הבקרה'}
          onPress={() => router.replace('/babysitter')}
          style={styles.completeBtn}
        />
        <AppButton
          label={'הצג פרופיל ציבורי'}
          variant="secondary"
          onPress={() => router.push('/my-profile')}
          style={styles.completeBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
```

Add `LinearGradient` import: `import { LinearGradient } from 'expo-linear-gradient';`
Add `AvatarCircle` import.

**Step 5: Add completion styles**

```tsx
completeSafe: { flex: 1, backgroundColor: BabyCityPalette.canvas },
completeScroll: { paddingHorizontal: 24, paddingTop: 48, paddingBottom: 40, alignItems: 'center' },
completeIconWrap: { marginBottom: 24 },
completeIconGradient: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
completeHeading: { marginBottom: 8 },
completeSubtitle: { marginBottom: 24 },
completeCard: { width: '100%', marginBottom: 24 },
completeCardRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 14 },
completeCardInfo: { flex: 1, alignItems: 'flex-end', gap: 4 },
completeCardName: { textAlign: 'right' },
completeNewBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, backgroundColor: BabyCityPalette.primarySoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
completeNewBadgeText: { color: BabyCityPalette.primary },
completeCityRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 3 },
completeBtn: { marginBottom: 12 },
```

**Step 6: TypeScript check + commit**

Run: `npx tsc --noEmit 2>&1 | head -20`

```bash
git add app/babysitter-onboarding.tsx
git commit -m "feat: babysitter-onboarding — Stitch completion screen with profile preview"
```

---

## Task 8: Parent Onboarding — Welcome intro screen

**Files:**
- Modify: `app/parent-onboarding.tsx`

**Step 1: Read the full parent-onboarding.tsx step state**

Read lines 60–150 to understand how steps work.

**Step 2: Add welcome step**

Add state:
```tsx
const [step, setStep] = useState<'welcome' | 1 | 2 | 3 | 4 | 'review'>('welcome');
```
(Adjust based on what the current step type is — may already be a number enum.)

Add a check at the top of the render:
```tsx
if (step === 'welcome') {
  return (
    <SafeAreaView style={styles.welcomeSafe}>
      <ScrollView contentContainerStyle={styles.welcomeScroll} showsVerticalScrollIndicator={false}>
        {/* Brand */}
        <View style={styles.welcomeBrand}>
          <View style={styles.welcomeBrandMark}>
            <AppText variant="bodyLarge" weight="800" style={{ color: BabyCityPalette.primary }}>S</AppText>
          </View>
          <AppText variant="bodyLarge" weight="800">{strings.appName}</AppText>
        </View>

        {/* Hero image placeholder */}
        <View style={styles.welcomeHero}>
          <View style={styles.welcomeHeroPlaceholder}>
            <Ionicons name="people" size={64} color={BabyCityPalette.surfaceContainer} />
          </View>
        </View>

        {/* Headline */}
        <AppText variant="h1" weight="800" align="center" style={styles.welcomeHeadline}>
          {'ברוכים הבאים לסמארטאף'}
        </AppText>
        <AppText variant="body" tone="muted" align="center" style={styles.welcomeSubtitle}>
          {'מצאו את הבייביסיטר המושלם עבור המשפחה שלכם'}
        </AppText>

        {/* Feature cards */}
        <View style={styles.welcomeFeatureRow}>
          {[
            { icon: 'shield-checkmark-outline' as const, title: 'בטיחות', body: 'כל בייביסיטר עובר בדיקה ואימות' },
            { icon: 'search-outline' as const, title: 'התאמה חכמה', body: 'מציאת הבייביסיטר הקרוב אליכם' },
            { icon: 'heart-outline' as const, title: 'תמיכה אישית', body: 'אנחנו כאן לכל שאלה' },
          ].map(f => (
            <View key={f.title} style={styles.welcomeFeatureCard}>
              <Ionicons name={f.icon} size={24} color={BabyCityPalette.primary} />
              <AppText variant="meta" weight="700" align="center" style={{ marginTop: 8 }}>{f.title}</AppText>
              <AppText variant="caption" tone="muted" align="center" style={{ lineHeight: 18 }}>{f.body}</AppText>
            </View>
          ))}
        </View>

        {/* Social proof */}
        <View style={styles.welcomeSocialProof}>
          <View style={styles.welcomeAvatarStack}>
            {['#dee8ff', '#ede9f5', '#e8f8ff'].map((bg, i) => (
              <View key={i} style={[styles.welcomeAvatar, { backgroundColor: bg, right: i * 22 }]}>
                <Ionicons name="person" size={12} color={BabyCityPalette.textSecondary} />
              </View>
            ))}
          </View>
          <AppText variant="caption" weight="600" tone="muted" style={{ flex: 1, textAlign: 'right' }}>
            {'הצטרפו ל-2,400+ משפחות'}
          </AppText>
        </View>

        {/* CTA */}
        <AppPrimaryButton
          label={'בואו נתחיל'}
          onPress={() => setStep(1)}
          style={styles.welcomeCta}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
```

**Step 3: Add welcome styles**

```tsx
welcomeSafe: { flex: 1, backgroundColor: '#ffffff' },
welcomeScroll: { paddingHorizontal: 24, paddingBottom: 40 },
welcomeBrand: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingTop: 16, paddingBottom: 8 },
welcomeBrandMark: { width: 36, height: 36, borderRadius: 12, backgroundColor: BabyCityPalette.primarySoft, alignItems: 'center', justifyContent: 'center' },
welcomeHero: { alignItems: 'center', marginVertical: 24 },
welcomeHeroPlaceholder: { width: '100%', height: 180, borderRadius: 24, backgroundColor: BabyCityPalette.surfaceLow, alignItems: 'center', justifyContent: 'center' },
welcomeHeadline: { marginBottom: 10 },
welcomeSubtitle: { marginBottom: 24, lineHeight: 22 },
welcomeFeatureRow: { flexDirection: 'row-reverse', gap: 10, marginBottom: 24 },
welcomeFeatureCard: { flex: 1, backgroundColor: BabyCityPalette.surfaceLow, borderRadius: 20, padding: 14, alignItems: 'center', gap: 4 },
welcomeSocialProof: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 24 },
welcomeAvatarStack: { flexDirection: 'row-reverse', width: 70, height: 36, position: 'relative' },
welcomeAvatar: { position: 'absolute', width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#ffffff', top: 3 },
welcomeCta: { marginBottom: 12 },
```

**Step 4: TypeScript check + commit**

Run: `npx tsc --noEmit 2>&1 | head -20`

```bash
git add app/parent-onboarding.tsx
git commit -m "feat: parent-onboarding — Stitch welcome intro screen"
```

---

## Task 9: Parent Onboarding — Review screen

**Files:**
- Modify: `app/parent-onboarding.tsx`

**Step 1: Read the last step of the current flow**

Find how many steps exist and where the final `handleSave()` is called.

**Step 2: Add review step before save**

The last step currently calls `handleSave()` directly. Change to:
1. Last step "Next" button → navigate to `step === 'review'` instead of saving
2. Review screen has "סיים" button → calls `handleSave()`

```tsx
if (step === 'review') {
  return (
    <SafeAreaView style={styles.reviewSafe}>
      <ScrollView contentContainerStyle={styles.reviewScroll}>
        {/* Header */}
        <View style={styles.reviewHeader}>
          <AppText variant="h1" weight="800" style={styles.reviewTitle}>{'סקירה'}</AppText>
          <AppText variant="body" tone="muted" style={styles.reviewSubtitle}>
            {'בדקו שהפרטים נכונים לפני השמירה'}
          </AppText>
        </View>

        {/* Location */}
        {onboardingData.city ? (
          <AppCard style={styles.reviewCard}>
            <View style={styles.reviewRow}>
              <Ionicons name="location-outline" size={18} color={BabyCityPalette.primary} />
              <AppText variant="bodyLarge" weight="700" style={styles.reviewRowText}>{onboardingData.city}</AppText>
            </View>
          </AppCard>
        ) : null}

        {/* Availability */}
        {onboardingData.availability && onboardingData.availability.length > 0 ? (
          <AppCard style={styles.reviewCard}>
            <AppText variant="meta" weight="700" tone="muted" style={styles.reviewCardLabel}>{'זמינות'}</AppText>
            <View style={styles.reviewChipsRow}>
              {onboardingData.availability.map((day: string) => (
                <AppChip key={day} label={day} tone="primary" size="sm" />
              ))}
            </View>
          </AppCard>
        ) : null}

        {/* Children */}
        {onboardingData.childrenCount > 0 ? (
          <AppCard style={styles.reviewCard}>
            <AppText variant="meta" weight="700" tone="muted" style={styles.reviewCardLabel}>{'ילדים'}</AppText>
            <View style={styles.reviewChildrenRow}>
              {Array.from({ length: Math.min(onboardingData.childrenCount, 4) }).map((_, i) => {
                const birthDate = onboardingData.childBirthDates?.[i];
                const age = birthDate ? calculateAgeFromBirthDate(birthDate) : null;
                return (
                  <View key={i} style={styles.reviewChildChip}>
                    <AvatarCircle name={String(i + 1)} size={44} tone="accent" />
                    {age ? <AppText variant="caption" tone="muted" align="center">{age}</AppText> : null}
                  </View>
                );
              })}
            </View>
          </AppCard>
        ) : null}

        {/* Actions */}
        <AppPrimaryButton
          label={'סיים'}
          loading={saving}
          onPress={handleSave}
          style={styles.reviewSaveBtn}
        />
        <AppButton
          label={'ערוך'}
          variant="secondary"
          onPress={() => setStep(1)}
          style={styles.reviewEditBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
```

Add `calculateAgeFromBirthDate` import (already imported in the file).
Add `AvatarCircle` import.
Add `AppChip` import if missing.

**Step 3: Add review styles**

```tsx
reviewSafe: { flex: 1, backgroundColor: BabyCityPalette.canvas },
reviewScroll: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
reviewHeader: { alignItems: 'flex-end', marginBottom: 20 },
reviewTitle: { textAlign: 'right' },
reviewSubtitle: { textAlign: 'right', marginTop: 4 },
reviewCard: { marginBottom: 12 },
reviewRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
reviewRowText: { flex: 1, textAlign: 'right' },
reviewCardLabel: { textAlign: 'right', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.4 },
reviewChipsRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
reviewChildrenRow: { flexDirection: 'row-reverse', gap: 12 },
reviewChildChip: { alignItems: 'center', gap: 4 },
reviewSaveBtn: { marginBottom: 12 },
reviewEditBtn: {},
```

**Step 4: Wire up step → review at end of last form step**

Find the last step's "next" handler:
```tsx
// Before:
if (step === lastStep) { handleSave(); }
// After:
if (step === lastStep) { setStep('review'); }
```

**Step 5: TypeScript check + commit**

Run: `npx tsc --noEmit 2>&1 | head -20`

```bash
git add app/parent-onboarding.tsx
git commit -m "feat: parent-onboarding — Stitch review screen before save"
```

---

## Task 10: Auth / Welcome — Stitch layout polish

**Files:**
- Modify: `app/auth.tsx`

**Current state:** Already very close to Stitch. Phone form on white bg, brand mark, hero text, social proof avatars, feature tiles. Minor changes:

**Step 1: Update feature tiles to 2+1 layout**

Stitch shows 3 feature items (verified_user, distance, 3rd item). Current has 2 tiles. Add a 3rd:

```tsx
{/* Add 3rd tile */}
<View style={styles.tile}>
  <Ionicons name="heart-outline" size={24} color={BabyCityPalette.success} />
  <AppText variant="meta" weight="700" style={styles.tileTitle}>{'חוויה אישית'}</AppText>
  <AppText variant="caption" tone="muted" style={styles.tileBody}>
    {'בייביסיטרים מדורגים ע"י הורים שכבר השתמשו בשירות'}
  </AppText>
</View>
```

The tiles are in a `flexDirection: 'row-reverse'` so add the 3rd view in the `tilesRow`.

**Step 2: Update hero eyebrow to match Stitch style**

Current: `'– ' + strings.appName`
Stitch: Shows a colored pill eyebrow. Update:

```tsx
<View style={styles.heroEyebrowPill}>
  <AppText variant="caption" weight="700" style={styles.heroEyebrow}>
    {strings.appName}
  </AppText>
</View>
```

Add style:
```tsx
heroEyebrowPill: {
  backgroundColor: BabyCityPalette.primarySoft,
  borderRadius: BabyCityGeometry.radius.pill,
  paddingHorizontal: 12,
  paddingVertical: 4,
  alignSelf: 'flex-end',
},
heroEyebrow: {
  color: BabyCityPalette.primary,
},
```

**Step 3: Commit**

```bash
git add app/auth.tsx
git commit -m "feat: auth — Stitch 3rd feature tile, eyebrow pill style"
```

---

## Summary

| Task | Screen | Files Changed |
|------|--------|--------------|
| 1 | Babysitter Profile View | `components/profile/BabysitterProfileView.tsx` |
| 2 | Family Profile | `app/family-profile.tsx` |
| 3 | ParentPostCard | `components/babysitter/ParentPostCard.tsx` |
| 4 | Babysitter Feed | `app/babysitter.tsx` |
| 5 | Chat Inbox | `components/requests/ChatPreviewCard.tsx`, `app/babysitter-inbox.tsx` |
| 6 | Shift History | `app/babysitter-shifts.tsx`, `components/babysitter/BabysitterShiftEntryCard.tsx` |
| 7 | Babysitter Onboarding | `app/babysitter-onboarding.tsx` |
| 8 | Parent Onboarding Welcome | `app/parent-onboarding.tsx` |
| 9 | Parent Onboarding Review | `app/parent-onboarding.tsx` |
| 10 | Auth | `app/auth.tsx` |
