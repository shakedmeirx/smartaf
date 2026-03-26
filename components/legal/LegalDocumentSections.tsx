import { StyleSheet, View } from 'react-native';
import AppCard from '@/components/ui/AppCard';
import AppText from '@/components/ui/AppText';
import { BabyCityPalette } from '@/constants/theme';
import { LegalSection } from '@/lib/legalDocuments';

type Props = {
  sections: LegalSection[];
};

export default function LegalDocumentSections({ sections }: Props) {
  return (
    <View style={styles.stack}>
      {sections.map((section) => (
        <AppCard key={section.title} style={styles.card}>
          <View style={styles.section}>
            <AppText variant="h3" weight="700" style={styles.title}>
              {section.title}
            </AppText>

            {section.paragraphs?.map((paragraph) => (
              <AppText key={paragraph} variant="body" tone="muted" style={styles.paragraph}>
                {paragraph}
              </AppText>
            ))}

            {section.bullets?.length ? (
              <View style={styles.bulletList}>
                {section.bullets.map((bullet) => (
                  <View key={bullet} style={styles.bulletRow}>
                    <View style={styles.bulletDot} />
                    <AppText variant="body" tone="muted" style={styles.bulletText}>
                      {bullet}
                    </AppText>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </AppCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 14,
  },
  card: {
    padding: 20,
    borderRadius: 28,
  },
  section: {
    gap: 12,
  },
  title: {
    color: BabyCityPalette.textPrimary,
  },
  paragraph: {
    color: BabyCityPalette.textSecondary,
  },
  bulletList: {
    gap: 10,
  },
  bulletRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 10,
  },
  bulletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 8,
    backgroundColor: BabyCityPalette.primary,
  },
  bulletText: {
    flex: 1,
    color: BabyCityPalette.textSecondary,
  },
});
