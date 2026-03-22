/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export type AppRole = 'parent' | 'babysitter';

export const BabyCityPalette = {
  textPrimary: '#242f41',
  textSecondary: '#515c70',
  textTertiary: '#9ca7b8',
  canvas: '#f4f6ff',
  surface: '#f4f6ff',
  surfaceMuted: '#f4f6ff',
  surfaceLowest: '#ffffff',
  surfaceLow: '#ecf1ff',
  surfaceContainer: '#dee8ff',
  inputRecessedBg: '#d5e3ff',
  border: '#dbe6f5',
  borderSoft: '#e8eef8',
  shadow: '#242f41',
  primary: '#702ae1',
  primaryPressed: '#6411d5',
  primarySoft: '#ede9f5',
  accent: '#58c3ef',
  accentSoft: '#e8f8ff',
  success: '#31b5a2',
  successSoft: '#e8f9f5',
  error: '#db5f7e',
  errorSoft: '#fdecf1',
  secondaryContainer: '#e9def5',
  onSecondaryContainer: '#564f61',
};

export const BabyCityGeometry = {
  radius: {
    hero: 32,
    card: 20,
    control: 16,
    chip: 999,
    pill: 999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  controlHeights: {
    input: 52,
    chip: 38,
    search: 56,
  },
} as const;

export const BabyCityTypography = {
  screenTitle: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '800',
  },
  topBarTitle: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '800',
  },
  cardTitle: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
  meta: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  caption: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
} as const;

export const BabyCityShadows = {
  soft: {
    shadowColor: BabyCityPalette.shadow,
    shadowOpacity: 0.07,
    shadowRadius: 44,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  elevated: {
    shadowColor: BabyCityPalette.shadow,
    shadowOpacity: 0.10,
    shadowRadius: 56,
    shadowOffset: { width: 0, height: 20 },
    elevation: 8,
  },
  editorial: {
    shadowColor: '#242f41',
    shadowOpacity: 0.06,
    shadowRadius: 44,
    shadowOffset: { width: 0, height: 12 },
    elevation: 3,
  },
} as const;

export const BabyCityChipTones = {
  primary: {
    background: BabyCityPalette.primarySoft,
    border: '#d8cfee',
    text: BabyCityPalette.primary,
  },
  accent: {
    background: BabyCityPalette.accentSoft,
    border: '#d6eef9',
    text: BabyCityPalette.accent,
  },
  success: {
    background: BabyCityPalette.successSoft,
    border: '#cfeee7',
    text: BabyCityPalette.success,
  },
  error: {
    background: BabyCityPalette.errorSoft,
    border: '#f5cfd9',
    text: BabyCityPalette.error,
  },
  muted: {
    background: BabyCityPalette.surfaceMuted,
    border: BabyCityPalette.borderSoft,
    text: BabyCityPalette.textSecondary,
  },
  warning: {
    background: '#fff3e0',
    border: '#ffcc80',
    text: '#bb7a15',
  },
} as const;

export const BabyCityRoleThemes = {
  parent: {
    screenBackground: '#f4f6ff',
    headerBackground: 'rgba(244, 246, 255, 0.95)',
    headerBorder: '#dde5f5',
    menuBackground: '#dee8ff',
    title: '#242f41',
    subtitle: '#515c70',
    activeBackground: '#ede9f5',
    activeColor: '#702ae1',
    inactiveColor: '#8392a8',
    drawerFutureBackground: '#f4f6ff',
    highlightedSurface: '#ecf1ff',
    highlightedBorder: 'transparent',
    filterAccent: '#702ae1',
  },
  babysitter: {
    screenBackground: '#f4f6ff',
    headerBackground: 'rgba(244, 246, 255, 0.95)',
    headerBorder: '#dde5f5',
    menuBackground: '#dee8ff',
    title: '#242f41',
    subtitle: '#515c70',
    activeBackground: '#dee8ff',
    activeColor: '#2ea2cf',
    inactiveColor: '#7e8ea2',
    drawerFutureBackground: '#f4f6ff',
    highlightedSurface: '#dee8ff',
    highlightedBorder: 'transparent',
    filterAccent: '#2ea2cf',
  },
} as const satisfies Record<AppRole, {
  screenBackground: string;
  headerBackground: string;
  headerBorder: string;
  menuBackground: string;
  title: string;
  subtitle: string;
  activeBackground: string;
  activeColor: string;
  inactiveColor: string;
  drawerFutureBackground: string;
  highlightedSurface: string;
  highlightedBorder: string;
  filterAccent: string;
}>;

export const ParentDesignTokens = {
  surfaces: {
    screen: '#f4f6ff',
    hero: '#f4f6ff',
    card: BabyCityPalette.surface,
    cardMuted: '#dee8ff',
    control: '#dee8ff',
    controlMuted: '#dee8ff',
  },
  text: {
    primary: '#17233f',
    secondary: '#70809a',
    tertiary: '#99a8bb',
    accent: BabyCityPalette.primary,
  },
  spacing: {
    pageHorizontal: 20,
    pageVertical: 16,
    sectionGap: 24,
    cardGap: 14,
    cardInset: 16,
    clusterGap: 12,
  },
  radius: {
    hero: BabyCityGeometry.radius.hero,
    card: BabyCityGeometry.radius.card,
    control: BabyCityGeometry.radius.control,
    chip: BabyCityGeometry.radius.chip,
    avatar: 24,
  },
  shadows: {
    card: BabyCityShadows.soft,
    elevated: BabyCityShadows.elevated,
  },
  typography: BabyCityTypography,
  chips: BabyCityChipTones,
} as const;

export const BabysitterDesignTokens = {
  surfaces: {
    screen: '#f4f6ff',
    hero: '#f4f6ff',
    card: BabyCityPalette.surface,
    cardMuted: '#dee8ff',
    control: '#dee8ff',
    controlMuted: '#dee8ff',
    dashboard: '#f4f6ff',
    stat: '#dee8ff',
  },
  text: {
    primary: '#17233f',
    secondary: '#6d849a',
    tertiary: '#9aaec1',
    accent: BabyCityPalette.primary,
  },
  spacing: {
    pageHorizontal: 20,
    pageVertical: 16,
    sectionGap: 24,
    cardGap: 14,
    cardInset: 16,
    clusterGap: 12,
  },
  radius: {
    hero: BabyCityGeometry.radius.hero,
    card: BabyCityGeometry.radius.card,
    control: BabyCityGeometry.radius.control,
    chip: BabyCityGeometry.radius.chip,
    avatar: 24,
  },
  shadows: {
    card: BabyCityShadows.soft,
    elevated: BabyCityShadows.elevated,
  },
  typography: BabyCityTypography,
  chips: BabyCityChipTones,
} as const;

export function getRoleTheme(role: AppRole) {
  return BabyCityRoleThemes[role];
}
