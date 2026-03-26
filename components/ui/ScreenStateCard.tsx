import { ActivityIndicator, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AppButton from '@/components/ui/AppButton';
import AppCard from '@/components/ui/AppCard';
import AppPrimaryButton from '@/components/ui/AppPrimaryButton';
import AppText from '@/components/ui/AppText';
import {
  AppRole,
  BabyCityGeometry,
  BabyCityPalette,
  ParentDesignTokens,
  getRoleTheme,
} from '@/constants/theme';

type ScreenStateCardProps = {
  role?: AppRole;
  title?: string;
  body?: string;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  materialIcon?: keyof typeof MaterialIcons.glyphMap;
  actionLabel?: string;
  onActionPress?: () => void;
  style?: StyleProp<ViewStyle>;
  size?: 'default' | 'large';
};

export default function ScreenStateCard({
  role = 'parent',
  title,
  body,
  loading = false,
  icon,
  materialIcon,
  actionLabel,
  onActionPress,
  style,
  size = 'default',
}: ScreenStateCardProps) {
  const theme = getRoleTheme(role);
  const isLarge = size === 'large';

  return (
    <AppCard
      role={role}
      variant="panel"
      backgroundColor={theme.highlightedSurface}
      borderColor="transparent"
      style={[styles.card, isLarge && styles.cardLarge, style]}
    >
      <View
        style={[
          styles.iconWrap,
          isLarge ? styles.iconWrapLarge : styles.iconWrapDefault,
          { backgroundColor: isLarge ? `${theme.activeColor}1a` : theme.activeBackground },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={theme.activeColor} size={isLarge ? 'large' : 'small'} />
        ) : materialIcon ? (
          <MaterialIcons name={materialIcon} size={isLarge ? 64 : 20} color={isLarge ? `${theme.activeColor}99` : theme.activeColor} />
        ) : (
          <Ionicons
            name={icon ?? 'sparkles-outline'}
            size={isLarge ? 64 : 20}
            color={isLarge ? `${theme.activeColor}99` : theme.activeColor}
          />
        )}
      </View>
      {title ? (
        <AppText variant="h3" weight="800" align="center" style={[styles.title, isLarge && styles.titleLarge]}>
          {title}
        </AppText>
      ) : null}
      {body ? (
        <AppText variant="body" tone="muted" align="center" style={[styles.body, isLarge && styles.bodyLarge]}>
          {body}
        </AppText>
      ) : null}
      {actionLabel && onActionPress && !loading ? (
        isLarge ? (
          <AppPrimaryButton
            label={actionLabel}
            onPress={onActionPress}
            style={styles.actionButtonLarge}
          />
        ) : (
          <AppButton
            label={actionLabel}
            variant="primary"
            fullWidth={false}
            backgroundColor={theme.filterAccent}
            borderColor={theme.filterAccent}
            textColor={BabyCityPalette.surface}
            style={styles.actionButton}
            onPress={onActionPress}
          />
        )
      ) : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 196,
  },
  cardLarge: {
    minHeight: 320,
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapDefault: {
    width: 54,
    height: 54,
    borderRadius: 18,
    marginBottom: 14,
  },
  iconWrapLarge: {
    width: 136,
    height: 136,
    borderRadius: 68,
    marginBottom: 24,
  },
  title: {
    maxWidth: 320,
  },
  titleLarge: {
    fontSize: 18,
    lineHeight: 26,
    maxWidth: 260,
  },
  body: {
    marginTop: 8,
    maxWidth: 320,
    lineHeight: 22,
  },
  bodyLarge: {
    marginTop: 10,
    maxWidth: 260,
  },
  actionButton: {
    marginTop: ParentDesignTokens.spacing.clusterGap,
    minWidth: 168,
    paddingHorizontal: BabyCityGeometry.spacing.xl,
  },
  actionButtonLarge: {
    marginTop: 28,
    minWidth: 200,
  },
});
