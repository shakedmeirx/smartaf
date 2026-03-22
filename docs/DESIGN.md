# BabysitConnect Design System
> Based on Stitch project "The Serene Sanctuary" — extracted from all Stitch screens

---

## Design Philosophy

Soft, caring, and modern. The app feels like a trusted community — not a cold marketplace.

- Airy, light surfaces with a blue-lavender tint
- Rounded shapes everywhere (no sharp corners)
- Purple as the primary action color (trustworthy, premium)
- Illustrations and avatars instead of stock photos
- Hebrew-first, full RTL layout

---

## Color Palette

All hex values confirmed from Stitch CSS tokens.

### Surface Colors (Background → Cards)
```
canvas / surface:             #f4f6ff  ← screen backgrounds, primary surface
surface-container-low:        #ecf1ff  ← hero cards, feature tiles, highlighted sections
surface-container:            #dee8ff  ← meta pills, stat tiles, control backgrounds, search
surface-container-high:       #d5e3ff  ← input backgrounds (recessed)
surface-container-highest:    #cdddfe  ← chips, badges, surface-variant
surface-dim:                  #c3d5f8  ← pressed/active surface states
surface-bright / surface-lowest: #ffffff ← white cards, overlapping content
```

### Primary (Purple)
```
primary:                #702ae1  ← CTA buttons, active nav, badges, FAB, icons
primary-dim:            #6411d5  ← gradient end for primary buttons
primary-container:      #b28cff  ← large primary accent surfaces
primary-fixed-dim:      #a67aff  ← decorative purple accents
inverse-primary:        #a476ff  ← text on dark surfaces
on-primary:             #f8f0ff  ← text/icons on primary buttons
on-primary-container:   #2e006c  ← text on primary-container
primary-soft (alias):   #ede9f5  ← chip backgrounds, brand mark
```

### Secondary (Muted Purple)
```
secondary:                  #60586b
secondary-container:        #e9def5  ← secondary buttons
secondary-fixed-dim:        #dbd0e7
on-secondary:               #f8efff
on-secondary-container:     #564f61  ← secondary button text
```

### Accent (Cyan/Teal)
```
accent:       #58c3ef  ← babysitter mode accent, accent chips, some icons
accent-soft:  #e8f8ff  ← accent chip backgrounds
```

### Semantic
```
success:       #31b5a2
success-soft:  #e8f9f5
error:         #b41340
error-dim:     #a70138
error-container: #f74b6d
error-soft:    #fdecf1
on-error:      #ffefef
tertiary:      #9e3657  ← pink-red (third accent)
tertiary-container: #ff8eac
```

### Text
```
on-background / on-surface:   #242f41  ← primary text (dark navy)
on-surface-variant:           #515c70  ← secondary text
outline:                      #6c778c  ← tertiary/muted text
outline-variant:              #a2adc4  ← borders, dividers
inverse-surface:              #040e1f  ← dark mode / dark cards
inverse-on-surface:           #929db4  ← text on dark surfaces
```

---

## Typography

### Fonts
- **Headlines / Display**: `Plus Jakarta Sans` — heavy weights (700–800)
- **Body / Labels**: `Be Vietnam Pro` — all text except headlines

### Scale
| Token         | Size | Line Height | Weight | Usage                        |
|---------------|------|-------------|--------|------------------------------|
| screenTitle   | 30px | 38px        | 800    | Screen hero titles           |
| topBarTitle   | 22px | 30px        | 800    | Top bar / navigation title   |
| cardTitle     | 18px | 26px        | 700    | Card headings, names         |
| sectionTitle  | 17px | 24px        | 700    | Section headers              |
| bodyLarge     | 16px | 24px        | 400–600| Prominent body text          |
| body          | 15px | 22px        | 400    | Default body text            |
| meta          | 14px | 20px        | 500    | Metadata, timestamps         |
| caption       | 12px | 18px        | 500    | Labels, hints, captions      |

### RTL Text Rules
- `textAlign: 'right'` on all text
- `writingDirection: 'rtl'` where needed
- Uppercase labels: use `textTransform: 'uppercase'` + `letterSpacing: 0.4`

---

## Spacing

```
xs:  4px   ← icon-text gap, tight insets
sm:  8px   ← chip gap, small component gap
md:  12px  ← panel padding, compact spacing
lg:  16px  ← card inset, standard gap
xl:  24px  ← section gap, card horizontal padding
xxl: 32px  ← hero padding, large sections
```

### Page Layout
```
pageHorizontal:  20px  ← screen edge margin
pageVertical:    16px  ← scroll top/bottom padding
sectionGap:      24px  ← gap between major sections
cardGap:         14px  ← gap between cards in a list
cardInset:       16px  ← internal card padding
```

---

## Border Radius

```
hero:    32px   ← hero cards, large containers
card:    20px   ← default cards, panels (1rem = 16px in Stitch CSS, 20px in app)
control: 16px   ← inputs, form controls, meta pills
chip:    9999px ← chips, badges, status indicators (full pill)
pill:    9999px ← buttons, tags (full pill)
avatar:  9999px ← circular avatars (full circle)
```

> Stitch CSS defines: DEFAULT=1rem, lg=2rem, xl=3rem, full=9999px

---

## Shadows / Elevation

### editorial (default cards)
```
shadowColor:    #242f41
shadowOpacity:  0.06
shadowRadius:   44
shadowOffset:   { width: 0, height: 12 }
elevation:      3
```
CSS equivalent: `box-shadow: 0 44px 44px -20px rgba(36, 47, 65, 0.06)`

### soft (bottom nav, overlapping cards)
```
shadowColor:    #242f41
shadowOpacity:  0.07
shadowRadius:   44
shadowOffset:   { width: 0, height: 12 }
elevation:      4
```

### elevated (hero cards, modals)
```
shadowColor:    #242f41
shadowOpacity:  0.10
shadowRadius:   56
shadowOffset:   { width: 0, height: 20 }
elevation:      8
```

### Primary shadow (buttons with gradient)
```
shadowColor:    #702ae1
shadowOpacity:  0.35
shadowRadius:   12
shadowOffset:   { width: 0, height: 4 }
elevation:      6
```

---

## Components

### Cards

#### Default / List Card
- Background: `#ffffff` (white)
- Radius: 20px
- Shadow: editorial
- Padding: 16px

#### Hero Card
- Background: `#ecf1ff` (surface-container-low)
- Radius: 32px
- Shadow: elevated
- Padding: 24px

#### Stat Tile
- Background: `#dee8ff` (surface-container)
- Radius: 16px
- No shadow
- Padding: 12px
- Used for: profile stats (sessions, rating, reviews)

#### Meta Pill (inline data row)
- Background: `#dee8ff`
- Radius: 16px
- Width: ~48% (2-column grid)
- Padding: 8–12px
- Contains: icon + label + value

---

### Buttons

#### Primary (Gradient)
```
background:  linear-gradient(→) #702ae1 → #6411d5
borderRadius: 9999px (pill)
minHeight:   52–58px
paddingVertical: 12–15px
paddingHorizontal: 18–20px
textColor:   #ffffff
weight:      700
shadow:      primary shadow
```

#### Secondary
```
background:  #e9def5
borderRadius: 9999px
textColor:   #564f61
weight:      700
```

#### Ghost
```
background:  transparent
textColor:   #515c70
weight:      600
```

#### Icon Button (square)
```
size:        48×48
borderRadius: 16px
background:  #dee8ff
iconColor:   #702ae1
```

---

### Inputs

```
background:   #f4f6ff (default) or #dee8ff (recessed/emphasized)
borderWidth:  0 (borderless)
borderRadius: 14px
minHeight:    52–56px
paddingHorizontal: 16px
textAlign:    right (RTL)
fontSize:     15–18px
```

Label above input:
- `caption` size, weight 700, muted, uppercase, letterSpacing 0.4
- Aligned right (RTL)

---

### Chips

Full pill (borderRadius: 9999px). Tones:

| Tone    | Background | Border    | Text       |
|---------|------------|-----------|------------|
| primary | #ede9f5    | #d8cfee   | #702ae1    |
| accent  | #e8f8ff    | #d6eef9   | #58c3ef    |
| success | #e8f9f5    | #cfeee7   | #31b5a2    |
| error   | #fdecf1    | #f5cfd9   | #db5f7e    |
| muted   | #f4f6ff    | #e8eef8   | #515c70    |
| warning | #fff3e0    | #ffcc80   | #bb7a15    |

Sizes: sm (height 28, px 10), md (height 34, px 14), lg (height 38, px 16)

---

### Avatars

- Shape: full circle (borderRadius: 9999px)
- Size in feed cards: 56px
- Size in profile hero: 80–100px
- Style: illustrated character or initials with palette-tinted background
- For initials: background from role-tinted surface, text in primary/accent
- Stack (social proof): overlapping circles with 2px white border, offset by 22px

---

### Status Badges

- Shape: pill (9999px)
- "מאומת" (Verified): `#702ae1` bg, white text, 12px font
- Pending: muted tone chip
- Active: success tone chip
- Soon (within 3 days): warning tone chip

---

### Bottom Navigation

```
background:        #ffffff
borderTopLeftRadius:  28px
borderTopRightRadius: 28px
paddingHorizontal: 8px
paddingTop:        8px
paddingBottom:     max(inset, 16px)
shadow:            upward (shadowOffset: {0, -4}, shadowRadius: 16)

activeItem:
  iconPill: 64×32 pill, backgroundColor: role active bg
  labelColor: role active color
  labelWeight: 700

inactiveItem:
  iconPill: no background
  labelColor: #8392a8 (parent) / #7e8ea2 (babysitter)
  labelWeight: 600

layout: row-reverse (RTL)
```

Role themes:
| | Parent | Babysitter |
|---|---|---|
| activeBackground | `#ede9f5` | `#dee8ff` |
| activeColor | `#702ae1` (purple) | `#2ea2cf` (blue) |

---

### Top Bar

```
background:        rgba(244, 246, 255, 0.95) — semi-transparent
borderBottomWidth: hairline
borderBottomColor: #dde5f5
paddingHorizontal: 14px
paddingVertical:   4–10px
flexDirection:     row-reverse (RTL)

title:    AppText h2, weight 800, color #242f41, textAlign right
subtitle: AppText caption, muted, textAlign right

menuButton: 42×42, radius 14, bg = role menuBackground (#dee8ff)
backButton: pill, bg = primarySoft, chevron-forward icon (RTL)
```

---

### FAB (Floating Action Button)

```
width/height:  56px
borderRadius:  9999px (circle)
background:    #702ae1 (purple) or gradient
position:      absolute bottom-right (RTL: bottom-left visually)
shadow:        primary shadow
iconColor:     #ffffff
iconName:      pencil / add
```

---

### Search Field

```
background:        #dee8ff (surface-container)
borderRadius:      9999px (pill)
height:            52–56px
paddingHorizontal: 16–20px
placeholder:       right-aligned, muted
searchIcon:        right side (RTL)
filterButton:      left side pill with accent color when active
```

---

## Screen-Level Patterns

### Auth / Welcome
```
background: #ffffff (white — different from app canvas)

structure (top → bottom):
1. Brand mark (36×36 rounded square, primarySoft bg) + app name
2. Hero: eyebrow (caption, primary color) → headline (30px, bold) → body text
3. Form: inline on white, no card wrapper
4. Primary CTA button (full width, gradient)
5. Social proof: 3 overlapping avatars + "15,000+" count
6. 2-column feature tiles (#ecf1ff bg, radius 20)
7. Footer: copyright caption
```

### Feed (Discovery / Jobs)
```
background: #f4f6ff (canvas)

structure:
1. Top bar (title = greeting)
2. [Optional pending banner — full-width, role accent color, pill]
3. Search field (#dee8ff, pill)
4. [Filter panel if open — AppCard with controls]
5. Section header (title + count subtitle)
6. Card list (gap 14px):
   - White cards, radius 20, editorial shadow
   - Avatar (56px) + name + city + status chip
   - Note text (2 lines, truncated)
   - 2-column meta pill grid (#dee8ff)
   - Age chips row (accent tone)
   - Actions row: gradient CTA + icon buttons
```

### Profile (Parent / Babysitter)
```
background: #f4f6ff (canvas)

structure:
1. Top bar with back button
2. Hero header: illustrated/colored full-width area
   - Circular avatar (80–100px) overlapping bottom edge
   - Name (h1, 800) + location caption
3. Verified badge (purple pill, absolute top-right of avatar)
4. Stats row: 3 tiles (#dee8ff bg, radius 16)
5. Bio section (AppCard, white)
6. Info sections (children / pet / specialties / certs)
   - Each: icon + section title + content
7. Sticky bottom: gradient CTA "שלח בקשה" (Send Request)
```

### Chats / Messages List
```
background: #f4f6ff (canvas)

structure:
1. Top bar: "הודעות" + menu + avatar
2. Search field (pill, #dee8ff)
3. Chat rows (white cards/rows, radius 16–20):
   - RTL: avatar right, name+preview left
   - Name: bold, cardTitle size
   - Preview: caption, muted, 1 line
   - Timestamp: caption, tertiary, far left (RTL far right)
   - Unread dot: small colored circle (primary or error)
4. Compose FAB (bottom-right, purple)
```

---

## RTL Implementation Rules

All layouts must feel native in Hebrew RTL.

```
All rows:        flexDirection: 'row-reverse'
All text:        textAlign: 'right'
Column layouts:  alignItems: 'flex-end'
Chevron back:    icon "chevron-forward" (points left in LTR = points right in RTL)
Padding order:   paddingStart/End → use paddingHorizontal symmetrically
FAB position:    bottom: 24, left: 20 (visually bottom-left in RTL = LTR bottom-right)
```

---

## Role Visual Differentiation

The app has two modes. Both use the same design system — only accents differ.

| Token              | Parent Mode  | Babysitter Mode |
|--------------------|--------------|-----------------|
| screenBackground   | `#f4f6ff`    | `#f4f6ff`       |
| activeNavBg        | `#ede9f5`    | `#dee8ff`       |
| activeNavColor     | `#702ae1` 🟣 | `#2ea2cf` 🔵    |
| filterAccent       | `#702ae1`    | `#2ea2cf`       |
| highlightedSurface | `#ecf1ff`    | `#dee8ff`       |
| headerBorder       | `#dde5f5`    | `#dde5f5`       |

---

## Stitch Screen Inventory

Screens confirmed in Stitch project `13871230181787804912`:

| Screen | ID |
|--------|----|
| Auth - Welcome | `c5ede3b94b6e4cf1ba75a958dd977b68` |
| Babysitter Jobs Feed | `a23e3e7cdb3a49a7b01ce346635ba73e` |
| Parent Profile | `974aedfdb7dc44c5b4832487216a0093` |
| Babysitter Profile View | `04de9044171c4ff6a7bc9da70f83a6a3` |
| Chats List (Messages) | `bcf43916841e48efb8b190f3307ae214` |
| Babysitter Shift History | `72be1b4744df48cf9904b9780404dfab` |
| Babysitter Onboarding - Complete | `afcf322e32904269bcd41c4ad5432ead` |
| Parent Onboarding - Welcome | `3daa5b6edaa14a3cbc96364c02e263fc` |
| Parent Onboarding - Review | `cabfdb622bd04254a9ebec5ed68f9c3b` |

---

## Code Mapping

Design tokens are implemented in `constants/theme.ts`:

| Design Doc | Code |
|------------|------|
| Color palette | `BabyCityPalette` |
| Spacing | `BabyCityGeometry.spacing` |
| Border radius | `BabyCityGeometry.radius` |
| Typography | `BabyCityTypography` |
| Shadows | `BabyCityShadows` |
| Chip tones | `BabyCityChipTones` |
| Role themes | `BabyCityRoleThemes` |
| Parent tokens | `ParentDesignTokens` |
| Babysitter tokens | `BabysitterDesignTokens` |
