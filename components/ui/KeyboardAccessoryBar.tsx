import { InputAccessoryView, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { strings } from '@/locales';
import { BabyCityGeometry, BabyCityPalette } from '@/constants/theme';
import AppText from '@/components/ui/AppText';

type Props = {
  nativeID: string;
  onPress: () => void;
  label?: string;
};

export default function KeyboardAccessoryBar({ nativeID, onPress, label }: Props) {
  if (Platform.OS !== 'ios') {
    return null;
  }

  return (
    <InputAccessoryView nativeID={nativeID}>
      <View style={styles.bar}>
        <View style={styles.spacer} />
        <TouchableOpacity style={styles.button} onPress={onPress}>
          <AppText variant="body" weight="800" tone="accent" align="center" style={styles.buttonText}>
            {label ?? strings.done}
          </AppText>
        </TouchableOpacity>
      </View>
    </InputAccessoryView>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: BabyCityPalette.surface,
  },
  spacer: {
    flex: 1,
  },
  button: {
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BabyCityGeometry.radius.control,
    backgroundColor: BabyCityPalette.primarySoft,
  },
  buttonText: {},
});
