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
            ? 'המסמך הזה נועד לתת בסיס ברור ושקוף לשימוש ב-Smartaf, אך אינו מהווה ייעוץ משפטי פרטני. לפני פרסום ציבורי או העלאה לחנויות, מומלץ להשלים גם בדיקה מול עו״ד המכיר את דיני הפרטיות, הצרכנות והתעסוקה הרלוונטיים.'
            : 'This document is intended to provide a clear baseline for using Smartaf, but it is not individualized legal advice. Before public launch or store submission, you should still have it reviewed by counsel familiar with privacy, consumer, and employment-related law.'}
        </AppText>
      </AppCard>
    </LegalScreenLayout>
  );
}
