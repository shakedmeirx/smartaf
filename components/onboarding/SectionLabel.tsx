import { StyleSheet } from 'react-native';
import AppText from '@/components/ui/AppText';

type Props = {
  text: string;
};

export default function SectionLabel({ text }: Props) {
  return (
    <AppText variant="body" weight="700" tone="muted" style={styles.label}>
      {text}
    </AppText>
  );
}

const styles = StyleSheet.create({
  label: {
    marginTop: 12,
    marginBottom: 6,
    paddingHorizontal: 4,
    fontSize: 13,
    lineHeight: 18,
  },
});
