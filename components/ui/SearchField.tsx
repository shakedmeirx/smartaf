import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppText from '@/components/ui/AppText';
import {
  BabyCityGeometry,
  BabyCityPalette,
} from '@/constants/theme';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  filterLabel: string;
  onFilterPress: () => void;
  filterActive?: boolean;
  filterCount?: number;
  roleAccentColor?: string;
};

export default function SearchField({
  value,
  onChangeText,
  placeholder,
  filterLabel,
  onFilterPress,
  filterActive = false,
  filterCount = 0,
  roleAccentColor = BabyCityPalette.primary,
}: Props) {
  return (
    <View style={styles.row}>
      <TouchableOpacity
        activeOpacity={0.88}
        style={[
          styles.filterButton,
          filterActive && {
            backgroundColor: BabyCityPalette.primarySoft,
            borderColor: roleAccentColor,
          },
        ]}
        onPress={onFilterPress}
      >
        {filterCount > 0 ? (
          <View style={[styles.filterBadge, { backgroundColor: roleAccentColor }]}>
            <AppText variant="caption" weight="700" style={styles.filterBadgeText}>
              {filterCount > 9 ? '9+' : String(filterCount)}
            </AppText>
          </View>
        ) : null}
        <AppText
          variant="body"
          weight="700"
          style={{ color: filterActive ? roleAccentColor : BabyCityPalette.textSecondary }}
        >
          {filterLabel}
        </AppText>
        <Ionicons
          name="options-outline"
          size={18}
          color={filterActive ? roleAccentColor : BabyCityPalette.textSecondary}
        />
      </TouchableOpacity>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={BabyCityPalette.textTertiary}
          textAlign="right"
          returnKeyType="search"
          autoCorrect={false}
        />
        <View style={styles.searchIconWrap}>
          <Ionicons name="search-outline" size={18} color={BabyCityPalette.textSecondary} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: BabyCityGeometry.spacing.sm,
    marginBottom: BabyCityGeometry.spacing.md,
  },
  searchWrap: {
    flex: 1,
    minHeight: BabyCityGeometry.controlHeights.search,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderRadius: 9999,
    backgroundColor: BabyCityPalette.surfaceContainer,
    paddingHorizontal: BabyCityGeometry.spacing.md,
  },
  input: {
    flex: 1,
    minHeight: 24,
    fontSize: 15,
    color: BabyCityPalette.textPrimary,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  searchIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: BabyCityPalette.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  filterButton: {
    minHeight: BabyCityGeometry.controlHeights.search,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: BabyCityGeometry.spacing.xs,
    borderRadius: 9999,
    backgroundColor: BabyCityPalette.surfaceContainer,
    paddingHorizontal: BabyCityGeometry.spacing.md,
  },
  filterBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: BabyCityPalette.surface,
  },
});
