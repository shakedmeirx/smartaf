import { useLocalSearchParams } from 'expo-router';
import AppCard from '@/components/ui/AppCard';
import AppText from '@/components/ui/AppText';
import LegalDocumentSections from '@/components/legal/LegalDocumentSections';
import LegalScreenLayout from '@/components/legal/LegalScreenLayout';
import { useAuth } from '@/context/AuthContext';
import { getAppLanguage } from '@/locales';
import { getLegalDocument, getLegalFallbackRoute } from '@/lib/legalDocuments';

export default function LegalTermsScreen() {
  const { session } = useAuth();
  const params = useLocalSearchParams<{ origin?: string }>();
  const language = getAppLanguage();
  const document = getLegalDocument('terms', language);
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
        <AppText variant="body" tone="muted">
          {language === 'he'
            ? 'אם משהו במסמך הזה לא ברור, אפשר לפנות אלינו דרך מסך "צור קשר" באפליקציה וננסה לעזור או להפנות לגורם המתאים.'
            : 'If anything in this document is unclear, you can contact us through the in-app contact page and we will try to help or direct you to the right point of contact.'}
        </AppText>
      </AppCard>
    </LegalScreenLayout>
  );
}
