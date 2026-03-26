import { Alert, Linking, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AppCard from '@/components/ui/AppCard';
import AppText from '@/components/ui/AppText';
import LegalScreenLayout from '@/components/legal/LegalScreenLayout';
import { BabyCityPalette, BabyCityShadows } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getAppLanguage } from '@/locales';
import {
  buildLegalMailto,
  getContactContent,
  getLegalFallbackRoute,
  LEGAL_CONTACT_EMAIL,
} from '@/lib/legalDocuments';

export default function LegalContactScreen() {
  const { session, dbUser } = useAuth();
  const params = useLocalSearchParams<{ origin?: string }>();
  const language = getAppLanguage();
  const content = getContactContent(language);
  const fallbackRoute = getLegalFallbackRoute(params.origin, !!session);

  async function handleOpenEmail(actionKey: 'support' | 'privacy' | 'delete' | 'safety') {
    const action = content.actions.find((item) => item.key === actionKey);
    if (!action) {
      return;
    }

    const userLines = [
      dbUser?.name ? `${language === 'he' ? 'שם מלא' : 'Full name'}: ${dbUser.name}` : null,
      dbUser?.phone ? `${language === 'he' ? 'טלפון' : 'Phone'}: ${dbUser.phone}` : null,
      dbUser?.email ? `${language === 'he' ? 'אימייל' : 'Email'}: ${dbUser.email}` : null,
      dbUser?.id ? `${language === 'he' ? 'מזהה משתמש' : 'User ID'}: ${dbUser.id}` : null,
    ].filter(Boolean) as string[];

    const url = buildLegalMailto(action.subject, [...action.templateLines, ...userLines]);

    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert(content.noMailTitle, content.noMailBody);
        return;
      }

      await Linking.openURL(url);
    } catch {
      Alert.alert(content.noMailTitle, content.noMailBody);
    }
  }

  return (
    <LegalScreenLayout
      title={content.title}
      subtitle={content.subtitle}
      badge={content.badge}
      fallbackRoute={fallbackRoute}
    >
      <AppCard style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <View style={styles.infoIcon}>
            <MaterialIcons name="support-agent" size={22} color={BabyCityPalette.primary} />
          </View>
          <View style={styles.infoText}>
            <AppText variant="h3" weight="700">
              {content.directEmail}
            </AppText>
            <AppText variant="body" tone="muted">
              {LEGAL_CONTACT_EMAIL}
            </AppText>
          </View>
        </View>
      </AppCard>

      <View style={styles.actionStack}>
        {content.actions.map((action) => (
          <TouchableOpacity
            key={action.key}
            activeOpacity={0.86}
            onPress={() => void handleOpenEmail(action.key)}
          >
            <AppCard style={styles.actionCard}>
              <MaterialIcons name="chevron-left" size={22} color={BabyCityPalette.outline} />

              <View style={styles.actionContent}>
                <View style={styles.actionText}>
                  <AppText variant="h3" weight="700">
                    {action.title}
                  </AppText>
                  <AppText variant="body" tone="muted">
                    {action.body}
                  </AppText>
                  <AppText variant="caption" weight="700" style={styles.actionLabel}>
                    {content.openEmail}
                  </AppText>
                </View>

                <View style={styles.actionIcon}>
                  <Ionicons name={action.icon} size={22} color={BabyCityPalette.primary} />
                </View>
              </View>
            </AppCard>
          </TouchableOpacity>
        ))}
      </View>

      <AppCard style={styles.helperCard}>
        <AppText variant="h3" weight="700" style={styles.helperTitle}>
          {content.helperTitle}
        </AppText>
        <AppText variant="body" tone="muted">
          {content.helperBody}
        </AppText>
      </AppCard>
    </LegalScreenLayout>
  );
}

const styles = StyleSheet.create({
  infoCard: {
    padding: 20,
    borderRadius: 28,
  },
  infoHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 14,
  },
  infoIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${BabyCityPalette.primary}12`,
  },
  infoText: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 2,
  },
  actionStack: {
    gap: 12,
  },
  actionCard: {
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...BabyCityShadows.soft,
  },
  actionContent: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 14,
  },
  actionText: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 6,
  },
  actionLabel: {
    color: BabyCityPalette.primary,
  },
  actionIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${BabyCityPalette.primary}10`,
  },
  helperCard: {
    padding: 20,
    borderRadius: 28,
    gap: 10,
  },
  helperTitle: {
    marginBottom: 8,
  },
});
