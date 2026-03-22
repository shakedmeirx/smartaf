import React from 'react';
import AppText, { AppTextProps } from './AppText';
import { View, StyleSheet, ViewStyle } from 'react-native';

export interface AppHeadingProps extends Omit<AppTextProps, 'variant'> {
  title: string;
  subtitle?: string;
  containerStyle?: ViewStyle;
}

/**
 * AppHeading
 * 
 * A standardized component for rendering page titles or section headers.
 * Combines an h1/h2 title with an optional muted body subtitle.
 * Follows the centralized typography scale and color system automatically.
 */
export default function AppHeading({
  title,
  subtitle,
  containerStyle,
  ...textProps
}: AppHeadingProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      <AppText variant="h1" {...textProps}>
        {title}
      </AppText>
      {subtitle ? (
        <AppText variant="body" tone="muted" style={styles.subtitle}>
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    flexDirection: 'column',
    alignItems: 'flex-end', // RTL alignment
  },
  subtitle: {
    marginTop: 4,
  },
});
