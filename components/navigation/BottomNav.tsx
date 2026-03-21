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
