import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { BabyCityGeometry } from '@/constants/theme';

type Props = {
  children: ReactNode;
  style?: object;
};

export default function FilterChipRow({ children, style }: Props) {
  return <View style={[styles.row, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: BabyCityGeometry.spacing.sm,
  },
});
