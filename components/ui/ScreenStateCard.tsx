import { ActivityIndicator, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppButton from '@/components/ui/AppButton';
import AppCard from '@/components/ui/AppCard';
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
  actionLabel?: string;
  onActionPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export default function ScreenStateCard({
  role = 'parent',
  title,
  body,
  loading = false,
  icon,
  actionLabel,
  onActionPress,
  style,
}: ScreenStateCardProps) {
  const theme = getRoleTheme(role);

  return (
    <AppCard
      role={role}
      variant="panel"
      backgroundColor={theme.highlightedSurface}
      borderColor="transparent"
      style={[styles.card, style]}
    >
      <View style={[styles.iconWrap, { backgroundColor: theme.activeBackground }]}>
        {loading ? (
          <ActivityIndicator color={theme.activeColor} />
        ) : (
          <Ionicons
            name={icon ?? 'sparkles-outline'}
            size={20}
            color={theme.activeColor}
          />
        )}
      </View>
      {title ? <AppText variant="h3" align="center" style={styles.title}>{title}</AppText> : null}
      {body ? <AppText variant="body" tone="muted" align="center" style={styles.body}>{body}</AppText> : null}
      {actionLabel && onActionPress && !loading ? (
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
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    maxWidth: 320,
  },
  body: {
    marginTop: 8,
    maxWidth: 320,
    lineHeight: 22,
  },
  actionButton: {
    marginTop: ParentDesignTokens.spacing.clusterGap,
    minWidth: 168,
    paddingHorizontal: BabyCityGeometry.spacing.xl,
  },
});
