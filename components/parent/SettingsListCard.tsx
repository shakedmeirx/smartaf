import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppCard from '@/components/ui/AppCard';
import AppText from '@/components/ui/AppText';
import {
  AppRole,
  BabyCityGeometry,
  BabysitterDesignTokens,
  BabyCityPalette,
  ParentDesignTokens,
} from '@/constants/theme';

export type SettingsListItem = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  value?: string;
  danger?: boolean;
  showChevron?: boolean;
};

type Props = {
  items: SettingsListItem[];
  role?: AppRole;
};

export default function SettingsListCard({ items, role = 'parent' }: Props) {
  const design = role === 'babysitter' ? BabysitterDesignTokens : ParentDesignTokens;

  return (
    <AppCard role={role} variant="list" style={styles.card}>
      {items.map((item, index) => {
        const row = (
          <View style={[styles.row, index === items.length - 1 && styles.rowLast]}>
            <View style={styles.labelWrap}>
              {item.value ? (
                <AppText variant="body" tone="muted">
                  {item.value}
                </AppText>
              ) : null}
              <AppText
                variant="bodyLarge"
                weight="700"
                tone={item.danger ? 'error' : 'default'}
              >
                {item.label}
              </AppText>
            </View>

            <View style={styles.leadingWrap}>
              {item.showChevron !== false ? (
                <Ionicons
                  name="chevron-back"
                  size={16}
                  color={item.danger ? BabyCityPalette.error : BabyCityPalette.textTertiary}
                />
              ) : null}
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: design.surfaces.cardMuted },
                  item.danger && styles.iconWrapDanger,
                ]}
              >
                <Ionicons
                  name={item.icon}
                  size={18}
                  color={item.danger ? BabyCityPalette.error : BabyCityPalette.textSecondary}
                />
              </View>
            </View>
          </View>
        );

        if (!item.onPress) {
          return <View key={item.key}>{row}</View>;
        }

        return (
          <TouchableOpacity key={item.key} activeOpacity={0.86} onPress={item.onPress}>
            {row}
          </TouchableOpacity>
        );
      })}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 0,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: BabyCityGeometry.spacing.md,
    paddingHorizontal: ParentDesignTokens.spacing.cardInset,
    paddingVertical: 14,
  },
  rowLast: {
  },
  labelWrap: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 4,
  },
  leadingWrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: BabyCityGeometry.spacing.sm,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapDanger: {
    backgroundColor: BabyCityPalette.errorSoft,
  },
});
