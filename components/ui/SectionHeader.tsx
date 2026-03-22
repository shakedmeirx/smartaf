import React from 'react';
import { StyleProp, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import AppText, { type AppTextVariant } from '@/components/ui/AppText';
import { BabyCityGeometry, ParentDesignTokens } from '@/constants/theme';

type Props = {
  title: string;
  subtitle?: string;
  titleVariant?: AppTextVariant;
  actionLabel?: string;
  onActionPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export default function SectionHeader({
  title,
  subtitle,
  titleVariant = 'h3',
  actionLabel,
  onActionPress,
  style,
}: Props) {
  return (
    <View style={[styles.row, style]}>
      {actionLabel && onActionPress ? (
        <TouchableOpacity onPress={onActionPress} activeOpacity={0.86}>
          <AppText variant="body" weight="700" tone="accent">
            {actionLabel}
          </AppText>
        </TouchableOpacity>
      ) : (
        <View />
      )}

      <View style={styles.textWrap}>
        <AppText variant={titleVariant} weight="800" style={styles.title}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" tone="muted" style={styles.subtitle}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: BabyCityGeometry.spacing.md,
  },
  textWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },
  title: {
    color: ParentDesignTokens.text.primary,
  },
  subtitle: {
    marginTop: BabyCityGeometry.spacing.xs,
  },
});
