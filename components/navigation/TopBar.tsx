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
  customActions?: React.ReactNode;
  titleColor: string;
  subtitleColor: string;
  borderColor: string;
  backgroundColor: string;
  menuBackground: string;
  showBackButton?: boolean;
  hideMenuButton?: boolean;
  backButtonVariant?: 'pill' | 'icon';
  swapEdgeControls?: boolean;
  onBack?: () => void;
  onShare?: () => void;
  onOpenMenu: () => void;
};

export default function TopBar({
  title,
  subtitle,
  titleContent,
  customActions,
  titleColor,
  subtitleColor,
  borderColor,
  backgroundColor,
  menuBackground,
  showBackButton = false,
  hideMenuButton = false,
  backButtonVariant = 'pill',
  swapEdgeControls = false,
  onBack,
  onShare,
  onOpenMenu,
}: Props) {
  const tapInsets = { top: 10, bottom: 10, left: 10, right: 10 } as const;

  const backControl =
    showBackButton && onBack ? (
      <TouchableOpacity
        style={backButtonVariant === 'icon' ? styles.headerBackIconButton : styles.headerBackButton}
        onPress={onBack}
        hitSlop={tapInsets}
      >
        <MaterialIcons name="arrow-forward-ios" size={18} color={BabyCityPalette.primary} />
        {backButtonVariant === 'pill' ? (
          <AppText variant="caption" weight="700" style={{ color: BabyCityPalette.primary }}>
            {strings.back}
          </AppText>
        ) : null}
      </TouchableOpacity>
    ) : null;

  const actionsControl = (
    <View style={styles.headerActions}>
      {customActions}
      {onShare ? (
        <TouchableOpacity
          style={[styles.headerMenuButton, { backgroundColor: menuBackground }]}
          onPress={onShare}
          hitSlop={tapInsets}
        >
          <MaterialIcons name="share" size={22} color={titleColor} />
        </TouchableOpacity>
      ) : null}

      {!hideMenuButton ? (
        <TouchableOpacity
          style={[styles.headerMenuButton, { backgroundColor: menuBackground }]}
          onPress={onOpenMenu}
          hitSlop={tapInsets}
        >
          <MaterialIcons name="menu" size={24} color={titleColor} />
        </TouchableOpacity>
      ) : null}
    </View>
  );

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
      {swapEdgeControls ? actionsControl : backControl}

      <View style={styles.headerTextWrap}>
        {titleContent ? (
          titleContent
        ) : (
          <>
            <AppText variant="h2" style={[styles.headerTitle, { color: titleColor }]}>
              {title}
            </AppText>
            {subtitle ? (
              <AppText variant="caption" style={[styles.headerSubtitle, { color: subtitleColor }]}>
                {subtitle}
              </AppText>
            ) : null}
          </>
        )}
      </View>

      {swapEdgeControls ? backControl : actionsControl}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'relative',
    zIndex: 40,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 10,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    elevation: 12,
  },
  headerMenuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  headerBackIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  headerTextWrap: {
    alignItems: 'stretch',
    flex: 1,
  },
  headerTitle: {
    width: '100%',
    textAlign: 'right',
  },
  headerSubtitle: {
    width: '100%',
    textAlign: 'right',
  },
});
