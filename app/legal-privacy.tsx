import { useLocalSearchParams } from 'expo-router';
import AppCard from '@/components/ui/AppCard';
import AppText from '@/components/ui/AppText';
import LegalDocumentSections from '@/components/legal/LegalDocumentSections';
import LegalScreenLayout from '@/components/legal/LegalScreenLayout';
import { useAuth } from '@/context/AuthContext';
import { getAppLanguage } from '@/locales';
import { getLegalDocument, getLegalFallbackRoute, LEGAL_CONTACT_EMAIL } from '@/lib/legalDocuments';

export default function LegalPrivacyScreen() {
  const { session } = useAuth();
  const params = useLocalSearchParams<{ origin?: string }>();
  const language = getAppLanguage();
  const document = getLegalDocument('privacy', language);
  const fallbackRoute = getLegalFallbackRoute(params.origin, !!session);

  return (
    <LegalScreenLayout
      title={document.title}
      subtitle={document.subtitle}
      badge={document.badge}
      fallbackRoute={fallbackRoute}
    >
      <LegalDocumentSections sections={document.sections} />

      <AppCard style={{ padding: 20, borderRadius: 28 }}>
        <AppText variant="h3" weight="700" style={{ marginBottom: 10 }}>
          {language === 'he' ? 'נקודת קשר לפרטיות' : 'Privacy point of contact'}
        </AppText>
        <AppText variant="body" tone="muted">
          {language === 'he'
            ? `לשאלות על פרטיות, לעיון, לתיקון מידע או לבקשת מחיקה אפשר לפנות ל-${LEGAL_CONTACT_EMAIL}.`
            : `For privacy questions, access, correction, or deletion requests, contact ${LEGAL_CONTACT_EMAIL}.`}
        </AppText>
      </AppCard>
    </LegalScreenLayout>
  );
}
