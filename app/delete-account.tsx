import { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import AppCard from '@/components/ui/AppCard';
import AppInput from '@/components/ui/AppInput';
import AppPrimaryButton from '@/components/ui/AppPrimaryButton';
import AppText from '@/components/ui/AppText';
import AppTextArea from '@/components/ui/AppTextArea';
import LegalScreenLayout from '@/components/legal/LegalScreenLayout';
import { BabyCityPalette } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getAppLanguage } from '@/locales';
import { deleteCurrentAccount } from '@/lib/accountDeletion';

const CONFIRMATION_PHRASE = 'SMARTAF';

const COPY = {
  he: {
    badge: 'מחיקת חשבון',
    title: 'מחיקת החשבון שלך',
    subtitle:
      'אפשר למחוק את החשבון והנתונים המרכזיים שלך ישירות מתוך האפליקציה. הפעולה בלתי הפיכה ותסיים את הגישה שלך לחשבון.',
    warningTitle: 'מה יימחק',
    warningBody:
      'הפרופיל, הבקשות, הצ׳אטים, ההעדפות והתמונות המשויכות לחשבון יוסרו. ייתכן שנשמור מידע מצומצם שנדרש לצרכים משפטיים, מניעת הונאה או טיפול בדיווחים פתוחים.',
    confirmationLabel: `להמשך, כתבו ${CONFIRMATION_PHRASE}`,
    confirmationPlaceholder: CONFIRMATION_PHRASE,
    reasonLabel: 'הערה אופציונלית',
    reasonPlaceholder: 'אם תרצו, ספרו לנו למה אתם עוזבים או מה חסר לכם...',
    deleteAction: 'מחק/י את החשבון',
    deleteActionBusy: 'מוחקים את החשבון...',
    supportAction: 'מעבר לצור קשר במקום מחיקה',
    mismatchTitle: 'נדרש אישור נוסף',
    mismatchBody: `כדי למחוק את החשבון צריך להקליד בדיוק ${CONFIRMATION_PHRASE}.`,
    confirmTitle: 'למחוק את החשבון?',
    confirmBody: 'הפעולה בלתי הפיכה. לא תהיה אפשרות לשחזר את החשבון או את הנתונים לאחר האישור.',
    confirmAction: 'מחק/י לצמיתות',
    successTitle: 'החשבון נמחק',
    successBody: 'החשבון שלך נמחק והוחזרת למסך הפתיחה.',
    errorTitle: 'אי אפשר למחוק כרגע',
    errorBody: 'לא הצלחנו להשלים את מחיקת החשבון עכשיו. נסו שוב בעוד רגע או פנו אלינו דרך מסך צור קשר.',
  },
  en: {
    badge: 'Delete account',
    title: 'Delete your account',
    subtitle:
      'You can delete your account and core account data directly from the app. This action is irreversible and will end access to your account.',
    warningTitle: 'What will be deleted',
    warningBody:
      'Your profile, requests, chats, preferences, and associated photos will be removed. We may keep limited information where required for legal compliance, fraud prevention, or open safety reports.',
    confirmationLabel: `To continue, type ${CONFIRMATION_PHRASE}`,
    confirmationPlaceholder: CONFIRMATION_PHRASE,
    reasonLabel: 'Optional note',
    reasonPlaceholder: 'If you want, tell us why you are leaving or what was missing...',
    deleteAction: 'Delete account',
    deleteActionBusy: 'Deleting account...',
    supportAction: 'Contact support instead',
    mismatchTitle: 'Confirmation required',
    mismatchBody: `Please type ${CONFIRMATION_PHRASE} exactly to continue.`,
    confirmTitle: 'Delete this account?',
    confirmBody: 'This action is irreversible. You will not be able to recover the account or its data after confirming.',
    confirmAction: 'Delete permanently',
    successTitle: 'Account deleted',
    successBody: 'Your account has been deleted and you were returned to the welcome screen.',
    errorTitle: 'Unable to delete right now',
    errorBody: 'We could not complete account deletion right now. Please try again shortly or use the contact page.',
  },
} as const;

export default function DeleteAccountScreen() {
  const language = getAppLanguage();
  const copy = COPY[language];
  const { signOut } = useAuth();
  const [confirmationText, setConfirmationText] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isPhraseValid = useMemo(
    () => confirmationText.trim().toUpperCase() === CONFIRMATION_PHRASE,
    [confirmationText]
  );

  function handleOpenContact() {
    router.push('/contact?origin=settings&action=delete');
  }

  function handleDelete() {
    if (!isPhraseValid) {
      Alert.alert(copy.mismatchTitle, copy.mismatchBody);
      return;
    }

    Alert.alert(copy.confirmTitle, copy.confirmBody, [
      {
        text: language === 'he' ? 'ביטול' : 'Cancel',
        style: 'cancel',
      },
      {
        text: copy.confirmAction,
        style: 'destructive',
        onPress: () => {
          void performDelete();
        },
      },
    ]);
  }

  async function performDelete() {
    try {
      setSubmitting(true);
      await deleteCurrentAccount({ reason });
      await signOut();
      router.replace('/welcome');
      Alert.alert(copy.successTitle, copy.successBody);
    } catch {
      Alert.alert(copy.errorTitle, copy.errorBody);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <LegalScreenLayout
      title={copy.title}
      subtitle={copy.subtitle}
      badge={copy.badge}
      fallbackRoute="/settings"
    >
      <AppCard style={styles.warningCard}>
        <AppText variant="h3" weight="800" style={styles.sectionTitle}>
          {copy.warningTitle}
        </AppText>
        <AppText variant="body" style={styles.sectionBody}>
          {copy.warningBody}
        </AppText>
      </AppCard>

      <AppCard style={styles.formCard}>
        <View style={styles.fieldStack}>
          <View style={styles.fieldGroup}>
            <AppText variant="body" weight="700" style={styles.label}>
              {copy.confirmationLabel}
            </AppText>
            <AppInput
              value={confirmationText}
              onChangeText={setConfirmationText}
              placeholder={copy.confirmationPlaceholder}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>

          <View style={styles.fieldGroup}>
            <AppText variant="body" weight="700" style={styles.label}>
              {copy.reasonLabel}
            </AppText>
            <AppTextArea
              value={reason}
              onChangeText={setReason}
              placeholder={copy.reasonPlaceholder}
              inputWrapStyle={styles.reasonInputWrap}
              style={styles.reasonInput}
            />
          </View>
        </View>

        <View style={styles.actionStack}>
          <AppPrimaryButton
            label={submitting ? copy.deleteActionBusy : copy.deleteAction}
            onPress={handleDelete}
            disabled={submitting}
          />
          <AppPrimaryButton
            label={copy.supportAction}
            onPress={handleOpenContact}
            backgroundColor="#ffffff"
            borderColor={BabyCityPalette.primary}
            textColor={BabyCityPalette.primary}
            disabled={submitting}
          />
        </View>
      </AppCard>
    </LegalScreenLayout>
  );
}

const styles = StyleSheet.create({
  warningCard: {
    gap: 10,
  },
  formCard: {
    gap: 20,
  },
  fieldStack: {
    gap: 16,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    color: BabyCityPalette.textPrimary,
  },
  sectionTitle: {
    color: BabyCityPalette.textPrimary,
  },
  sectionBody: {
    color: BabyCityPalette.textSecondary,
    lineHeight: 24,
  },
  actionStack: {
    gap: 12,
  },
  reasonInputWrap: {
    minHeight: 124,
  },
  reasonInput: {
    minHeight: 92,
  },
});
