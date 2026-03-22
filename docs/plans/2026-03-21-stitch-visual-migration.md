# Stitch Visual Migration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate all shared UI components to match the "Serene Sanctuary" Stitch design: editorial white cards, gradient primary buttons, refined bottom nav, and semi-transparent top bar.

**Architecture:** Token-first — add new palette tokens, then update shared primitives (SurfaceCard → AppCard → buttons → nav). No screen-level changes needed; shared components propagate visually everywhere.

**Tech Stack:** Expo React Native, TypeScript, expo-linear-gradient (~15.0.8 already installed), constants/theme.ts design tokens

---

### Task 1: Add surface hierarchy tokens + editorial shadow to theme.ts

**Files:**
- Modify: `constants/theme.ts`

**Step 1: Add tokens to BabyCityPalette**

In `constants/theme.ts`, add after `surfaceMuted: '#f4f6ff',`:
```ts
surfaceLowest: '#ffffff',
surfaceLow: '#ecf1ff',
```

**Step 2: Add editorial shadow to BabyCityShadows**

In `constants/theme.ts`, add after the `elevated` shadow:
```ts
editorial: {
  shadowColor: '#242f41',
  shadowOpacity: 0.06,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
},
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: no errors

**Step 4: Commit**

```bash
git add constants/theme.ts
git commit -m "feat: add surfaceLowest, surfaceLow, editorial shadow tokens"
```

---

### Task 2: SurfaceCard — white bg, no border, editorial shadow

**Files:**
- Modify: `components/ui/SurfaceCard.tsx`

**Current state:**
- `backgroundColor = BabyCityPalette.surface` (→ #f4f6ff, same as canvas — cards invisible)
- `borderColor = BabyCityPalette.borderSoft` (→ visible border)
- `elevation = 'soft'` uses `BabyCityShadows.soft`

**Step 1: Update defaults and shadow logic**

```tsx
// Change default backgroundColor:
backgroundColor = BabyCityPalette.surfaceLowest,
// Change default borderColor:
borderColor = 'transparent',

// Change shadow lookup to include editorial:
elevation === 'soft'
  ? BabyCityShadows.editorial
  : elevation === 'elevated'
    ? BabyCityShadows.elevated
    : null,
```

The `BabyCityShadows` import already exists. Add `BabyCityPalette` is already imported.

After edit, SurfaceCard.tsx should look like:
```tsx
export default function SurfaceCard({
  children,
  style,
  backgroundColor = BabyCityPalette.surfaceLowest,
  borderColor = 'transparent',
  variant = 'card',
  elevation = 'soft',
}: Props) {
  return (
    <View
      style={[
        styles.base,
        variant === 'hero' ? styles.hero : variant === 'panel' ? styles.panel : styles.card,
        elevation === 'soft'
          ? BabyCityShadows.editorial
          : elevation === 'elevated'
            ? BabyCityShadows.elevated
            : null,
        { backgroundColor, borderColor },
        style,
      ]}
    >
      {children}
    </View>
  );
}
```

Also add `borderWidth: 0` to base style so the transparent border has no width by default:
```tsx
base: {
  borderWidth: 0,
},
```

**Step 2: Verify TypeScript**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: no errors

**Step 3: Commit**

```bash
git add components/ui/SurfaceCard.tsx
git commit -m "feat: SurfaceCard white bg, no border, editorial shadow"
```

---

### Task 3: AppCard — variant-to-surface mapping, no borders

**Files:**
- Modify: `components/ui/AppCard.tsx`

**Current state:**
```tsx
backgroundColor={backgroundColor ?? (isHero ? theme.highlightedSurface : ParentDesignTokens.surfaces.card)}
borderColor={borderColor ?? (isHero ? theme.highlightedBorder : BabyCityPalette.borderSoft)}
```

Both `highlightedSurface` and `surfaces.card` resolve to `#f4f6ff` — same as canvas, so cards are invisible.

**Step 1: Update surface mapping**

```tsx
backgroundColor={
  backgroundColor ??
  (isHero || isPanel
    ? BabyCityPalette.surfaceLow
    : BabyCityPalette.surfaceLowest)
}
borderColor={borderColor ?? 'transparent'}
```

Also update the elevation mapping — hero/panel get `elevated`, list and default get `soft`:
```tsx
elevation={isHero ? 'elevated' : 'soft'}
```

Full updated AppCard.tsx:
```tsx
import React, { ReactNode } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import SurfaceCard from '@/components/ui/SurfaceCard';
import {
  AppRole,
  BabyCityPalette,
  getRoleTheme,
} from '@/constants/theme';

type AppCardVariant = 'default' | 'hero' | 'panel' | 'list';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  role?: AppRole;
  variant?: AppCardVariant;
  backgroundColor?: string;
  borderColor?: string;
};

export default function AppCard({
  children,
  style,
  role = 'parent',
  variant = 'default',
  backgroundColor,
  borderColor,
}: Props) {
  const isHero = variant === 'hero';
  const isPanel = variant === 'panel';

  return (
    <SurfaceCard
      variant={isHero ? 'hero' : isPanel ? 'panel' : 'card'}
      elevation={isHero ? 'elevated' : 'soft'}
      backgroundColor={
        backgroundColor ??
        (isHero || isPanel
          ? BabyCityPalette.surfaceLow
          : BabyCityPalette.surfaceLowest)
      }
      borderColor={borderColor ?? 'transparent'}
      style={style}
    >
      {children}
    </SurfaceCard>
  );
}
```

Note: `getRoleTheme` and `ParentDesignTokens` are no longer needed — remove those imports.

**Step 2: Verify TypeScript**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: no errors (the unused `role` param can be removed or kept — keep it for API compatibility with a `_role` rename or just leave unused; TypeScript won't error on unused params)

**Step 3: Commit**

```bash
git add components/ui/AppCard.tsx
git commit -m "feat: AppCard surface hierarchy — white default, tinted hero/panel"
```

---

### Task 4: AppButton — gradient primary variant

**Files:**
- Modify: `components/ui/AppButton.tsx`

**Goal:** When `variant === 'primary'`, render a `LinearGradient` wrapper instead of a plain `backgroundColor`. Gradient: left-to-right (or top-to-bottom) #702ae1 → #6411d5. Add a soft purple shadow.

**Step 1: Add LinearGradient import**

```tsx
import { LinearGradient } from 'expo-linear-gradient';
```

**Step 2: Restructure primary render**

The `TouchableOpacity` needs to be the outer pressable, with `LinearGradient` inside filling it (or wrapping it). The cleanest approach: wrap the `TouchableOpacity` children in a `LinearGradient` when primary, and set `backgroundColor: 'transparent'` on the `TouchableOpacity` itself.

Full updated component:
```tsx
import React from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  TextStyle,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BabyCityGeometry, BabyCityPalette } from '@/constants/theme';
import AppText from '@/components/ui/AppText';

type AppButtonVariant = 'primary' | 'secondary' | 'ghost';
type AppButtonSize = 'md' | 'lg';

type Props = Omit<TouchableOpacityProps, 'style'> & {
  label: string;
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  spinnerColor?: string;
};

export default function AppButton({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
  labelStyle,
  backgroundColor,
  borderColor,
  textColor,
  spinnerColor,
  activeOpacity = 0.9,
  ...rest
}: Props) {
  const isDisabled = disabled || loading;
  const isPrimary = variant === 'primary' && !backgroundColor;

  const palette = {
    primary: {
      backgroundColor: 'transparent',
      borderColor: borderColor ?? 'transparent',
      textColor: textColor ?? '#ffffff',
      spinnerColor: spinnerColor ?? '#ffffff',
    },
    secondary: {
      backgroundColor: backgroundColor ?? BabyCityPalette.primarySoft,
      borderColor: borderColor ?? 'transparent',
      textColor: textColor ?? '#564f61',
      spinnerColor: spinnerColor ?? BabyCityPalette.primary,
    },
    ghost: {
      backgroundColor: backgroundColor ?? 'transparent',
      borderColor: borderColor ?? 'transparent',
      textColor: textColor ?? BabyCityPalette.textSecondary,
      spinnerColor: spinnerColor ?? BabyCityPalette.primary,
    },
  }[variant];

  const sizeStyle = size === 'lg' ? styles.large : styles.medium;

  const inner = loading ? (
    <ActivityIndicator color={palette.spinnerColor} />
  ) : (
    <AppText
      variant={size === 'lg' ? 'h3' : 'bodyLarge'}
      weight="700"
      style={[styles.label, { color: palette.textColor }, labelStyle]}
    >
      {label}
    </AppText>
  );

  if (isPrimary) {
    return (
      <TouchableOpacity
        activeOpacity={activeOpacity}
        disabled={isDisabled}
        style={[
          styles.base,
          sizeStyle,
          fullWidth && styles.fullWidth,
          styles.primaryShadow,
          isDisabled && styles.disabled,
          style,
        ]}
        {...rest}
      >
        <LinearGradient
          colors={['#702ae1', '#6411d5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradient, sizeStyle]}
        >
          {inner}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={activeOpacity}
      disabled={isDisabled}
      style={[
        styles.base,
        sizeStyle,
        fullWidth && styles.fullWidth,
        variant === 'secondary' && styles.withBorder,
        {
          backgroundColor: backgroundColor ?? palette.backgroundColor,
          borderColor: palette.borderColor,
        },
        isDisabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {inner}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BabyCityGeometry.radius.pill,
    paddingHorizontal: 18,
    overflow: 'hidden',
  },
  gradient: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primaryShadow: {
    shadowColor: '#702ae1',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  medium: {
    minHeight: 52,
    paddingVertical: 12,
  },
  large: {
    minHeight: 58,
    paddingVertical: 14,
  },
  fullWidth: {
    width: '100%',
  },
  withBorder: {
    borderWidth: 1.5,
  },
  disabled: {
    opacity: 0.6,
  },
  label: {
    textAlign: 'center',
  },
});
```

**Step 3: Verify TypeScript**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: no errors

**Step 4: Commit**

```bash
git add components/ui/AppButton.tsx
git commit -m "feat: AppButton gradient primary with purple shadow"
```

---

### Task 5: AppPrimaryButton — gradient

**Files:**
- Modify: `components/ui/AppPrimaryButton.tsx`

**Goal:** Replace flat solid `backgroundColor` with the same gradient as AppButton primary.

**Step 1: Rewrite AppPrimaryButton.tsx**

```tsx
import React from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AppText from '@/components/ui/AppText';
import { BabyCityGeometry } from '@/constants/theme';

type AppButtonSize = 'md' | 'lg';

type Props = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  size?: AppButtonSize;
  style?: StyleProp<ViewStyle>;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
};

export default function AppPrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  size = 'lg',
  style,
  backgroundColor,
  borderColor,
  textColor,
}: Props) {
  const isDisabled = disabled || loading;
  const labelColor = textColor ?? '#ffffff';
  const useGradient = !backgroundColor;

  const sizeStyle = size === 'lg' ? styles.large : styles.medium;

  const inner = loading ? (
    <ActivityIndicator color={labelColor} />
  ) : (
    <AppText
      variant={size === 'lg' ? 'h3' : 'bodyLarge'}
      weight="700"
      align="center"
      style={{ color: labelColor }}
    >
      {label}
    </AppText>
  );

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      style={[
        styles.base,
        sizeStyle,
        !useGradient && { backgroundColor },
        borderColor ? { borderWidth: 1, borderColor } : null,
        useGradient && styles.primaryShadow,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {useGradient ? (
        <LinearGradient
          colors={['#702ae1', '#6411d5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradient, sizeStyle]}
        >
          {inner}
        </LinearGradient>
      ) : inner}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BabyCityGeometry.radius.pill,
    overflow: 'hidden',
  },
  gradient: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryShadow: {
    shadowColor: '#702ae1',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  medium: {
    minHeight: 52,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  large: {
    minHeight: 58,
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  disabled: {
    opacity: 0.55,
  },
});
```

**Step 2: Verify TypeScript**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: no errors

**Step 3: Commit**

```bash
git add components/ui/AppPrimaryButton.tsx
git commit -m "feat: AppPrimaryButton gradient"
```

---

### Task 6: BottomNav — Stitch style (white bg, pill active tab)

**Files:**
- Modify: `components/navigation/BottomNav.tsx`

**Current state:**
- Floating pill with `marginHorizontal: 18, borderRadius: 30` on whole container
- Active tab: `${activeColor}18` (very transparent tint, essentially invisible)
- Active tab grows `flex: 1.08`

**Target:**
- Container: white `#ffffff` bg, `borderTopLeftRadius: 32, borderTopRightRadius: 32`, no side margin, sits flush at bottom
- Active tab: solid `#e9def5` pill background (for parent), `#dee8ff` (for babysitter) — pass `activeBackground` prop from theme
- Remove the `borderWidth: 1` on items
- Keep the shadow

**Step 1: Add `activeBackground` prop**

```tsx
type Props = {
  items: BottomNavItem[];
  activeKey: string;
  activeColor: string;
  activeBackground?: string;  // NEW
  inactiveColor?: string;
  bottomInset: number;
};
```

**Step 2: Update BottomNav JSX and styles**

Full updated BottomNav.tsx:
```tsx
import React from 'react';
import { StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppText from '@/components/ui/AppText';
import { BabyCityPalette, BabyCityGeometry } from '@/constants/theme';

export type BottomNavItem = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  badgeCount?: number;
};

type Props = {
  items: BottomNavItem[];
  activeKey: string;
  activeColor: string;
  activeBackground?: string;
  inactiveColor?: string;
  bottomInset: number;
};

export default function BottomNav({
  items,
  activeKey,
  activeColor,
  activeBackground = BabyCityPalette.primarySoft,
  inactiveColor = BabyCityPalette.textSecondary,
  bottomInset,
}: Props) {
  return (
    <View
      style={[
        styles.bottomBar,
        {
          paddingBottom: Math.max(bottomInset, 16),
        },
      ]}
    >
      {items.map(item => {
        const active = item.key === activeKey;

        return (
          <TouchableOpacity
            key={item.key}
            style={[
              styles.bottomItem,
              active && [styles.bottomItemActive, { backgroundColor: activeBackground }],
            ]}
            onPress={item.onPress}
          >
            <View style={styles.bottomIconWrap}>
              <Ionicons
                name={active && item.activeIcon ? item.activeIcon : item.icon}
                size={24}
                color={active ? activeColor : inactiveColor}
              />
              {item.badgeCount ? (
                <View
                  style={[
                    styles.bottomBadge,
                    { backgroundColor: active ? activeColor : BabyCityPalette.primary },
                  ] as ViewStyle[]}
                >
                  <AppText variant="caption" style={styles.bottomBadgeText}>
                    {item.badgeCount > 9 ? '9+' : item.badgeCount}
                  </AppText>
                </View>
              ) : null}
            </View>
            <AppText
              variant="caption"
              weight={active ? '700' : '600'}
              style={{ color: active ? activeColor : inactiveColor }}
            >
              {item.label}
            </AppText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    flexDirection: 'row-reverse',
    alignItems: 'stretch',
    gap: 4,
    paddingHorizontal: 8,
    paddingTop: 8,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#ffffff',
    shadowColor: BabyCityPalette.shadow,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 16,
    elevation: 10,
  },
  bottomItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 68,
    borderRadius: BabyCityGeometry.radius.control,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  bottomItemActive: {
    flex: 1.05,
  },
  bottomIconWrap: {
    minWidth: 34,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bottomBadge: {
    position: 'absolute',
    top: -10,
    right: -14,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  bottomBadgeText: {
    color: '#ffffff',
    lineHeight: 12,
  },
});
```

**Step 3: Update AppShell.tsx to pass `activeBackground`**

In `components/navigation/AppShell.tsx`, find the `<BottomNav` usage and add:
```tsx
activeBackground={theme.activeBackground}
```

Then in `constants/theme.ts`, the `BabyCityRoleThemes` already has `activeBackground`:
- parent: `'#ede9f5'`
- babysitter: `'#dee8ff'`

Check if `activeBackground` key already exists in `BabyCityRoleThemes` type — it does (`activeBackground: '#ede9f5'`). So just pass it through.

**Step 4: Verify TypeScript**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: no errors

**Step 5: Commit**

```bash
git add components/navigation/BottomNav.tsx components/navigation/AppShell.tsx
git commit -m "feat: BottomNav Stitch style — white bg, pill active tab, flush bottom"
```

---

### Task 7: TopBar — semi-transparent background

**Files:**
- Modify: `constants/theme.ts`
- Modify: `components/navigation/AppShell.tsx`

**Current state:**
- `headerBackground: '#f4f6ff'` (solid, same as canvas — TopBar is invisible)
- SafeAreaView also uses `theme.headerBackground`

**Target:**
- TopBar gets `rgba(244, 246, 255, 0.92)` — slightly frosted feel without expo-blur
- The SafeAreaView behind it uses the same color (since it's above the content)

**Step 1: Update headerBackground in BabyCityRoleThemes**

In `constants/theme.ts`, change both parent and babysitter `headerBackground`:
```ts
headerBackground: 'rgba(244, 246, 255, 0.92)',
```

Note: The TypeScript type annotation `satisfies Record<AppRole, {...}>` requires `headerBackground: string` — `rgba(...)` is still a string, so this is fine.

**Step 2: Verify TypeScript**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: no errors

**Step 3: Commit**

```bash
git add constants/theme.ts
git commit -m "feat: TopBar semi-transparent header background"
```

---

### Task 8: AppInput — focus ring (white bg + primary border on focus)

**Files:**
- Modify: `components/ui/AppInput.tsx`

**Goal:** When the input is focused, change the `inputWrap` background to `#ffffff` and add a 2px `BabyCityPalette.primary` border. At rest, keep current styling. The `recessed` variant also gets this treatment.

**Step 1: Add focused state**

```tsx
// Add at top of component function:
const [focused, setFocused] = React.useState(false);
```

**Step 2: Wire up onFocus/onBlur on TextInput**

```tsx
<TextInput
  ref={ref}
  editable={editable}
  placeholderTextColor={placeholderTextColor}
  textAlign={textAlign}
  style={[styles.input, style]}
  onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
  onBlur={(e) => { setFocused(false); rest.onBlur?.(e); }}
  {...rest}
/>
```

**Step 3: Apply focused styles on the inputWrap**

```tsx
<View
  style={[
    styles.inputWrap,
    !editable && styles.inputWrapDisabled,
    error && styles.inputWrapError,
    inputWrapStyle,
    recessed && styles.inputRecessed,
    focused && styles.inputWrapFocused,
  ]}
>
```

**Step 4: Add focused style**

```tsx
inputWrapFocused: {
  backgroundColor: '#ffffff',
  borderWidth: 2,
  borderColor: BabyCityPalette.primary,
},
```

**Step 5: Verify TypeScript**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: no errors

**Step 6: Commit**

```bash
git add components/ui/AppInput.tsx
git commit -m "feat: AppInput focus ring — white bg + primary border on focus"
```

---

## Summary

| Task | File | Change |
|------|------|--------|
| 1 | constants/theme.ts | surfaceLowest, surfaceLow, editorial shadow |
| 2 | SurfaceCard.tsx | White bg default, no border, editorial shadow |
| 3 | AppCard.tsx | surfaceLow for hero/panel, surfaceLowest for default/list |
| 4 | AppButton.tsx | Gradient primary with purple shadow |
| 5 | AppPrimaryButton.tsx | Gradient |
| 6 | BottomNav.tsx + AppShell.tsx | White bg, pill active tab, flush bottom |
| 7 | constants/theme.ts | Semi-transparent headerBackground |
| 8 | AppInput.tsx | Focus ring |
