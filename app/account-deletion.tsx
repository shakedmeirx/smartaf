import { Alert, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import AppCard from '@/components/ui/AppCard';
import AppPrimaryButton from '@/components/ui/AppPrimaryButton';
import AppText from '@/components/ui/AppText';
import LegalScreenLayout from '@/components/legal/LegalScreenLayout';
import { BabyCityPalette } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getAppLanguage } from '@/locales';
import { getLegalFallbackRoute, LEGAL_CONTACT_EMAIL } from '@/lib/legalDocuments';

const COPY = {
  he: {
    badge: 'מחיקת חשבון',
    title: 'מחיקת חשבון ונתונים',
    subtitle:
      'העמוד הזה מסביר איך אפשר למחוק חשבון ב-Smartaf ומה המשמעות של מחיקת הנתונים לפני שממשיכים.',
    processTitle: 'איך המחיקה עובדת',
    processBody:
      'אם אתם מחוברים לחשבון, אפשר למחוק אותו מתוך האפליקציה דרך מסך המחיקה הייעודי. המחיקה מיועדת להסיר את החשבון, הפרופיל, פניות, צ׳אטים ותמונות משויכות, בכפוף לשמירה של מידע מצומצם כשנדרש לפי דין, לצורכי אבטחה או לטיפול בדיווחים פתוחים.',
    loggedInAction: 'מעבר למסך מחיקת החשבון',
    contactAction: 'יצירת קשר לגבי מחיקה',
    guestHint: `אם אינכם מחוברים כרגע, אפשר לפתוח פנייה למחיקה מתוך מסך "צור קשר" או לפנות אל ${LEGAL_CONTACT_EMAIL}.`,
    emailFallbackTitle: 'פרטי יצירת קשר',
    emailFallbackBody: `אם אינכם יכולים להיכנס לחשבון, אפשר לפתוח פנייה בנושא מחיקה דרך מסך "צור קשר" או במייל ${LEGAL_CONTACT_EMAIL}.`,
  },
  en: {
    badge: 'Account deletion',
    title: 'Delete account and data',
    subtitle:
      'This page explains how Smartaf account deletion works and what it means for your data before you continue.',
    processTitle: 'How deletion works',
    processBody:
      'If you are signed in, you can delete the account directly from the dedicated in-app deletion screen. The process is intended to remove the account, profile, requests, chats, and associated photos, subject to limited retention where required for legal compliance, security, or open safety reports.',
    loggedInAction: 'Open the delete-account screen',
    contactAction: 'Contact us about deletion',
    guestHint: `If you are not signed in right now, you can still open a deletion request from the contact page or email ${LEGAL_CONTACT_EMAIL}.`,
    emailFallbackTitle: 'Contact option',
    emailFallbackBody: `If you cannot access the account, use the contact page or email ${LEGAL_CONTACT_EMAIL} for a deletion request.`,
  },
} as const;

export default function AccountDeletionInfoScreen() {
  const { session } = useAuth();
  const params = useLocalSearchParams<{ origin?: string }>();
  const language = getAppLanguage();
  const copy = COPY[language];
  const fallbackRoute = getLegalFallbackRoute(params.origin, !!session);

  function handleOpenDeleteFlow() {
    if (!session) {
      Alert.alert(copy.emailFallbackTitle, copy.emailFallbackBody);
      return;
    }

    router.push('/delete-account');
  }

  function handleOpenContactFlow() {
    router.push(`/contact?origin=account-deletion&action=delete`);
  }

  return (
    <LegalScreenLayout
      title={copy.title}
      subtitle={copy.subtitle}
      badge={copy.badge}
      fallbackRoute={fallbackRoute}
    >
      <AppCard style={styles.infoCard}>
        <AppText variant="h3" weight="800" style={styles.title}>
          {copy.processTitle}
        </AppText>
        <AppText variant="body" tone="muted" style={styles.body}>
          {copy.processBody}
        </AppText>
      </AppCard>

      <AppCard style={styles.actionsCard}>
        <View style={styles.actionStack}>
          <AppPrimaryButton
            label={copy.loggedInAction}
            onPress={handleOpenDeleteFlow}
          />
          <AppPrimaryButton
            label={copy.contactAction}
            onPress={handleOpenContactFlow}
            backgroundColor="#ffffff"
            borderColor={BabyCityPalette.primary}
            textColor={BabyCityPalette.primary}
          />
        </View>

        <AppText variant="caption" tone="muted" align="center" style={styles.hint}>
          {copy.guestHint}
        </AppText>
      </AppCard>
    </LegalScreenLayout>
  );
}

const styles = StyleSheet.create({
  infoCard: {
    gap: 10,
  },
  actionsCard: {
    gap: 18,
  },
  actionStack: {
    gap: 12,
  },
  title: {
    color: BabyCityPalette.textPrimary,
  },
  body: {
    lineHeight: 24,
  },
  hint: {
    lineHeight: 22,
  },
});
