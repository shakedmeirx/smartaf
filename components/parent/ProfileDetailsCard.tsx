import React, { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import AppCard from '@/components/ui/AppCard';
import AppText from '@/components/ui/AppText';
import SectionHeader from '@/components/ui/SectionHeader';
import {
  BabyCityGeometry,
  ParentDesignTokens,
} from '@/constants/theme';

export type ProfileDetailsRow = {
  key: string;
  label: string;
  value: ReactNode;
};

type Props = {
  title: string;
  subtitle?: string;
  rows?: ProfileDetailsRow[];
  children?: ReactNode;
};

export default function ProfileDetailsCard({
  title,
  subtitle,
  rows = [],
  children,
}: Props) {
  return (
    <AppCard variant="default" style={styles.card}>
      <SectionHeader title={title} subtitle={subtitle} />

      {rows.length ? (
        <View style={styles.rowsWrap}>
          {rows.map((row, index) => (
            <View key={row.key} style={[styles.row, index === rows.length - 1 && styles.rowLast]}>
              <AppText variant="bodyLarge" weight="700" style={styles.label}>
                {row.label}
              </AppText>
              <View style={styles.valueWrap}>
                {typeof row.value === 'string' ? (
                  <AppText variant="body" tone="muted" style={styles.valueText}>
                    {row.value}
                  </AppText>
                ) : (
                  row.value
                )}
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {children ? <View style={styles.childrenWrap}>{children}</View> : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: ParentDesignTokens.spacing.clusterGap,
  },
  rowsWrap: {
    gap: BabyCityGeometry.spacing.sm,
  },
  row: {
    alignItems: 'flex-end',
    gap: BabyCityGeometry.spacing.xs,
    paddingBottom: BabyCityGeometry.spacing.sm,
  },
  rowLast: {
    paddingBottom: 0,
  },
  valueWrap: {
    width: '100%',
    alignItems: 'flex-end',
  },
  valueText: {
    width: '100%',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  label: {
    width: '100%',
    textAlign: 'right',
    writingDirection: 'rtl',
    color: ParentDesignTokens.text.primary,
  },
  childrenWrap: {
    marginTop: BabyCityGeometry.spacing.xs,
  },
});
