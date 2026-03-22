import React from 'react';
import { Text, TextProps, StyleSheet, TextStyle } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { getRoleTheme, BabyCityPalette } from '@/constants/theme';

export type AppTextVariant = 
  | 'h1' 
  | 'h2' 
  | 'h3' 
  | 'bodyLarge' 
  | 'body' 
  | 'caption';

export interface AppTextProps extends TextProps {
  variant?: AppTextVariant;
  color?: string; // Optional override, defaults to role-based title/subtitle color
  align?: TextStyle['textAlign']; // Defaults to 'right' for RTL
  weight?: TextStyle['fontWeight']; // By default, driven by variant
  style?: TextProps['style'];
  /** 
   * If true, uses the primary accent or surface color depending on the context,
   * otherwise uses the standard theme text colors.
   */
  tone?: 'default' | 'muted' | 'accent' | 'error';
};

export default function AppText({
  variant = 'body',
  color,
  align = 'right',
  weight,
  style,
  tone = 'default',
  children,
  ...rest
}: AppTextProps) {
  const { activeRole } = useAuth();
  const roleTheme = activeRole ? getRoleTheme(activeRole) : null;

  // Determine base color based on tone and role
  let textColor = BabyCityPalette.textPrimary;
  
  if (color) {
    textColor = color;
  } else if (tone === 'error') {
    textColor = BabyCityPalette.error;
  } else if (tone === 'accent' && roleTheme) {
    textColor = roleTheme.filterAccent;
  } else if (tone === 'muted') {
    textColor = roleTheme?.subtitle ?? BabyCityPalette.textSecondary;
  } else if (roleTheme) {
    // Default tone: H1/H2 get title color, body gets title or subtitle depending on exact use case
    // For now, title gets primary, body gets primary
    textColor = roleTheme.title;
  }

  const combinedStyles: TextStyle[] = [
    styles.base,
    styles[variant],
    {
      color: textColor,
      textAlign: align,
      writingDirection: 'rtl',
    },
    weight ? { fontWeight: weight } : {},
    ...(Array.isArray(style) ? style : [style]).filter(Boolean),
  ] as TextStyle[];

  return (
    <Text style={combinedStyles} {...rest}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
  },
  h1: {
    fontSize: 30,
    lineHeight: 38,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 22,
    lineHeight: 30,
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: -0.4,
  },
  h3: {
    fontSize: 18,
    lineHeight: 26,
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: -0.3,
  },
  bodyLarge: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'BeVietnamPro_500Medium',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'BeVietnamPro_400Regular',
  },
  caption: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'BeVietnamPro_500Medium',
  },
});
