# Stitch Screen Implementation — Design Doc
> Approach A: Sequential screen-by-screen, exact visual copy of Stitch, existing logic preserved.

**Date:** 2026-03-22
**Stitch Project:** `13871230181787804912`
**Screens:** 9 key screens from DESIGN.md

---

## Constraints

- Keep **all existing logic, data-fetching, navigation, and auth flows intact**
- Match Stitch HTML/CSS **exactly** in layout, colors, typography, spacing
- All screens are **Hebrew-first, full RTL**
- Use existing shared components (`AppText`, `AppCard`, `AppButton`, `AppChip`, `AppInput`, `AvatarCircle`, etc.) where possible
- Use design tokens from `constants/theme.ts` (`BabyCityPalette`, `BabyCityGeometry`, `BabyCityTypography`, etc.)

---

## Screen 1 — Auth / Welcome (`app/auth.tsx`)

**Stitch ID:** `c5ede3b94b6e4cf1ba75a958dd977b68`

**Current state:** White bg, brand mark, hero text, phone form, social proof (avatars + count), 2 feature tiles.

**Stitch shows:**
- Logo "Smartaf" + language toggle + nav
- Asymmetric hero (clip-path polygon, gradient bg) with headline + subheading
- CTA buttons: "מתחילים עכשיו" (gradient primary, pill) + "התחברות" (secondary)
- Social login row ("או באמצעות" + Google/Apple icons)
- Stats block: "+15K" metric + verification badge
- 3-column features section: verified_user, distance, description
- Footer: links + copyright

**Plan:**
1. Keep phone OTP form (existing logic) but restructure the page layout to match Stitch
2. Replace plain hero section with asymmetric gradient hero card (clip-path effect using View + gradient)
3. Replace feature tile row with 3-column feature cards
4. Keep social proof avatars + count
5. Keep existing `AppPrimaryButton` for CTA, secondary button for "כבר יש לי חשבון"

**Files:** `app/auth.tsx`

---

## Screen 2 — Babysitter Jobs Feed (`app/babysitter.tsx`)

**Stitch ID:** `a23e3e7cdb3a49a7b01ce346635ba73e`

**Current state:** AppShell + pending banner + SearchField + filter panel + ParentPostCard list.

**Stitch shows:**
- Header: "חיפוש בייביסיטר" title + filter icon (tune)
- Section title: "עבודות מחכות לך" + "12 משפחות" count
- Job cards: parent image (56px circle), family name (h2), location badge (location_on icon + city), job details (calendar icon + date, child_care icon + child info), description text (2 lines), CTA button (gradient primary)
- Map preview strip: "צפי במפה" + "4 משרות נוספות"
- Bottom nav + FAB (add icon)

**Plan:**
1. Keep all existing filter/sort logic
2. Update section header to match Stitch (title + count subtitle)
3. Update `components/babysitter/ParentPostCard.tsx` to match Stitch card exactly:
   - AvatarCircle 56px on right
   - Family name h2 + location badge (icon + city) + date details row (calendar + child icon)
   - Note text (2 lines truncated)
   - Gradient CTA button
4. Remove the full expandable filter panel from visual; keep logic, surface via top filter icon only

**Files:** `app/babysitter.tsx`, `components/babysitter/ParentPostCard.tsx`

---

## Screen 3 — Parent Profile / Family Profile (`app/family-profile.tsx`)

**Stitch ID:** `974aedfdb7dc44c5b4832487216a0093`

**Current state:** ProfilePhotoHero + stats + bio sections.

**Stitch shows:**
- Hero section: full-width family photo at top
- Profile card: parent avatar (56px circle), "משפחת כהן" h1, location "תל אביב", about section (title + paragraph)
- Children section: "הילדים שלנו" header + child cards (name + age, colored background)
- Pets section: "חיות המחמד" header + pet card (name + breed)
- Posts section: "הצג הכל" link + post card with title/description/metrics
- Bottom nav (5 items)

**Plan:**
1. Replace current hero with full-width image banner (or colored placeholder if no photo)
2. Add avatar overlapping bottom of banner
3. Family name (h1) + city caption below
4. "על המשפחה" card with bio text
5. Children section: chip-style cards per child with name + age
6. Pets section: if pets exist, show pet card
7. Posts section: show family posts with "הצג הכל" link
8. Sticky bottom CTA "שלח בקשה"

**Files:** `app/family-profile.tsx`

---

## Screen 4 — Babysitter Profile View (`components/profile/BabysitterProfileView.tsx`)

**Stitch ID:** `04de9044171c4ff6a7bc9da70f83a6a3`

**Current state:** AppCard hero with photo inside, stats row, bio card, details card.

**Stitch shows:**
- Top bar: back (arrow_forward RTL) + heart + share icons on `#dee8ff` bg
- Full-width profile image (or colored placeholder) as hero banner
- Verification badge (absolute top-right of avatar)
- Profile card below banner: name "נועה לוי" (h1, 800), location (location_on icon + city)
- Rating row: stars (4.9/5) + review count
- Info row: experience years, response time, reliability %
- About section (AppCard white)
- Specialties chips row (accent tone pills)
- Weekly schedule grid (Sun-Sat × Morning/Evening)
- Reviews section: reviewer cards (avatar + name + stars + text)
- Sticky footer: rate chip + "שלח בקשה" gradient button

**Plan:**
1. Remove current AppCard hero wrapper — use full-width banner with avatar overlapping bottom
2. Profile info (name, city, verified badge) below banner
3. 3-stat row: ★ rating, years experience, response
4. AppCard white for bio/about
5. `InfoChip` row for specialties
6. Weekly availability grid (`View` with day columns × time rows, `#dee8ff` active cells)
7. Review cards (keep existing rating logic)
8. Sticky bottom bar with rate + CTA button

**Files:** `components/profile/BabysitterProfileView.tsx`, possibly `components/profile/ProfilePhotoHero.tsx`

---

## Screen 5 — Chats List / Inbox (`app/babysitter-inbox.tsx`, parent equivalent)

**Stitch ID:** `bcf43916841e48efb8b190f3307ae214`

**Current state:** Segment tabs (requests/chats) + FlatList with ChatThreadCard.

**Stitch shows:**
- Header: menu icon + "הודעות" title + profile avatar (top bar)
- Search bar: pill shape, `#dee8ff` bg, magnifying glass on right
- Chat list rows:
  - Avatar (40px circle, colored bg) on right
  - Name (h3 weight 700) + preview text (caption, muted, 1 line)
  - Timestamp (caption, tertiary) on left
  - Unread dot (8px, primary color) on left when unread
- FAB: bottom-left, purple, message icon

**Plan:**
1. Add search `SearchField` (pill style) at top of chats tab
2. Update `ChatThreadCard` in `components/requests/RequestSurface.tsx`:
   - RTL layout: avatar right, text middle, timestamp+dot left
   - Avatar 40px, colored initials bg
   - Name bold, preview muted 1-line
   - Timestamp caption tertiary
   - Unread dot when `unreadCount > 0`
3. Keep segment tabs for requests vs chats
4. Add FAB (purple, chat bubble icon) at bottom-left (RTL)

**Files:** `app/babysitter-inbox.tsx`, `components/requests/RequestSurface.tsx`

---

## Screen 6 — Babysitter Shift History (`app/babysitter-shifts.tsx`)

**Stitch ID:** `72be1b4744df48cf9904b9780404dfab`

**Current state:** Complex shift management with filters, add/edit forms, stat cards.

**Stitch shows:**
- Header: "היסטוריית משמרות" + back button
- Summary card: "42 שעות" + "₪2,730" income — two large stat tiles side by side on `#dee8ff`
- Shift cards grouped by month:
  - Month header (e.g. "מרץ 2024")
  - Each card: family name (h3) + date/day + time range + duration + payment amount + status badge (paid/pending)
  - Profile image circle on right
- Bottom nav: Dashboard, Shifts, Messages, Profile

**Plan:**
1. Keep all existing shift logic (create/edit/delete/filter)
2. Update summary stat display to match Stitch (2-tile row, `#dee8ff` bg, large numbers)
3. Update `BabysitterShiftEntryCard` to match Stitch card exactly:
   - RTL: avatar right, info left
   - Family name + date + time range + duration
   - Payment amount + status badge (success/warning tone chips)
4. Group shift list by month with month section headers

**Files:** `app/babysitter-shifts.tsx`, `components/babysitter/BabysitterShiftEntryCard.tsx`

---

## Screen 7 — Babysitter Onboarding - Complete (`app/babysitter-onboarding.tsx`)

**Stitch ID:** `afcf322e32904269bcd41c4ad5432ead`

**Current state:** 7-step form, no completion screen.

**Stitch shows:**
- Full-screen success state (after save):
  - Large `check_circle` icon in gradient circle
  - "ברוכה הבאה לקהילת Smartaf!" heading
  - Profile summary card: avatar + name + "חדשה בקהילת Smartaf" badge + location + hourly rate + verified/certified status chips
  - Two CTA links: "עבור ללוח הבקרה" + "הצג פרופיל ציבורי"

**Plan:**
1. Add a `step === 'complete'` state at the end of the babysitter onboarding flow
2. When user finishes step 7 and save succeeds → transition to completion screen
3. Completion screen: check icon in gradient circle, welcome heading, profile preview card with saved data, two action buttons (navigate to babysitter dashboard / view public profile)

**Files:** `app/babysitter-onboarding.tsx`

---

## Screen 8 — Parent Onboarding - Welcome (`app/parent-onboarding.tsx`)

**Stitch ID:** `3daa5b6edaa14a3cbc96364c02e263fc`

**Current state:** Multi-step form, starts at step 1 (basic info) immediately.

**Stitch shows:**
- Welcome/intro screen before the form:
  - Logo + "Smartaf" brand
  - Hero image (Mother & baby illustration / photo)
  - Headline "ברוכים הבאים לסמארטאף"
  - Subheading + description about the service
  - 3 feature cards: security, smart matching, personal support
  - Social proof: 3 avatars + "הצטרפו ל-2,400+ משפחות"
  - Two CTAs: "מתחילים עכשיו" (primary) + "התחברות" (secondary link)

**Plan:**
1. Add a `step === 'welcome'` intro step before step 1 of parent onboarding
2. Intro screen: brand mark, hero image placeholder, headline, 3 feature cards, social proof, "בואו נתחיל" primary CTA
3. CTA advances to step 1 (existing form)

**Files:** `app/parent-onboarding.tsx`

---

## Screen 9 — Parent Onboarding - Review (`app/parent-onboarding.tsx`)

**Stitch ID:** `cabfdb622bd04254a9ebec5ed68f9c3b`

**Current state:** No review/summary step — saves directly after last form step.

**Stitch shows:**
- Review screen before final save:
  - "סקירה" / summary heading
  - Location: "תל אביב - יפו"
  - Availability chips: Sun / Wed / Fri
  - Child profile cards: name + age (colored avatar)
  - Two action buttons: "סיים" (gradient primary, full width) + "ערוך" (secondary)

**Plan:**
1. Add a `step === 'review'` step as second-to-last step in parent onboarding
2. Display summary of filled data: family name, city, availability days, children list
3. "סיים" button triggers existing save logic
4. "ערוך" navigates back to step 1

**Files:** `app/parent-onboarding.tsx`

---

## Implementation Order

1. Screen 4 — Babysitter Profile View (biggest structural change, shared component)
2. Screen 3 — Parent Profile / Family Profile (reuses profile hero pattern)
3. Screen 2 — Babysitter Jobs Feed + ParentPostCard
4. Screen 5 — Chats List / Inbox
5. Screen 6 — Shift History
6. Screen 7 — Babysitter Onboarding Complete
7. Screen 8 — Parent Onboarding Welcome
8. Screen 9 — Parent Onboarding Review
9. Screen 1 — Auth / Welcome (last — already close, minor polish)

---

## Files Affected

| Screen | Primary Files |
|--------|--------------|
| Auth | `app/auth.tsx` |
| Babysitter Feed | `app/babysitter.tsx`, `components/babysitter/ParentPostCard.tsx` |
| Parent Profile | `app/family-profile.tsx` |
| Babysitter Profile | `components/profile/BabysitterProfileView.tsx` |
| Chats | `app/babysitter-inbox.tsx`, `components/requests/RequestSurface.tsx` |
| Shifts | `app/babysitter-shifts.tsx`, `components/babysitter/BabysitterShiftEntryCard.tsx` |
| Babysitter Onboarding | `app/babysitter-onboarding.tsx` |
| Parent Onboarding | `app/parent-onboarding.tsx` |
