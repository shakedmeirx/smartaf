import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AppText from '@/components/ui/AppText';
import { BabyCityGeometry, BabyCityPalette } from '@/constants/theme';
import { strings } from '@/locales';

type Props = {
  title: string;
  subtitle?: string | null;
  titleContent?: React.ReactNode;
  titleColor: string;
  subtitleColor: string;
  borderColor: string;
  backgroundColor: string;
  menuBackground: string;
  showBackButton?: boolean;
  onBack?: () => void;
  onShare?: () => void;
  onOpenMenu: () => void;
};

export default function TopBar({
  title,
  subtitle,
  titleContent,
  titleColor,
  subtitleColor,
  borderColor,
  backgroundColor,
  menuBackground,
  showBackButton = false,
  onBack,
  onShare,
  onOpenMenu,
}: Props) {
  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor,
          borderBottomColor: borderColor,
        },
      ]}
    >
      {showBackButton && onBack ? (
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={onBack}
        >
          <MaterialIcons name="arrow-forward-ios" size={18} color={BabyCityPalette.primary} />
          <AppText variant="caption" weight="700" style={{ color: BabyCityPalette.primary }}>
            {strings.back}
          </AppText>
        </TouchableOpacity>
      ) : null}

      <View style={styles.headerTextWrap}>
        {titleContent ? (
          titleContent
        ) : (
          <>
            <AppText variant="h2" style={{ color: titleColor }}>
              {title}
            </AppText>
            {subtitle ? (
              <AppText variant="caption" style={{ color: subtitleColor }}>
                {subtitle}
              </AppText>
            ) : null}
          </>
        )}
      </View>

      <View style={styles.headerActions}>
        {onShare ? (
          <TouchableOpacity
            style={[styles.headerMenuButton, { backgroundColor: menuBackground }]}
            onPress={onShare}
          >
            <MaterialIcons name="share" size={22} color={titleColor} />
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={[styles.headerMenuButton, { backgroundColor: menuBackground }]}
          onPress={onOpenMenu}
        >
          <MaterialIcons name="menu" size={24} color={titleColor} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 10,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerMenuButton: {
    width: 42,
    height: 42,
    borderRadius: BabyCityGeometry.radius.control - 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  headerBackButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BabyCityGeometry.radius.pill,
    backgroundColor: BabyCityPalette.primarySoft,
  },
  headerTextWrap: {
    alignItems: 'flex-end',
    flex: 1,
  },
});
