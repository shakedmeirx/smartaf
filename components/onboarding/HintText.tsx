import { StyleSheet } from 'react-native';
import AppText from '@/components/ui/AppText';

type Props = {
  text: string;
};

// A small grey description shown beneath a SectionLabel or ToggleRow.
export default function HintText({ text }: Props) {
  return <AppText variant="body" tone="muted" style={styles.hint}>{text}</AppText>;
}

const styles = StyleSheet.create({
  hint: {
    marginTop: 0,
    marginBottom: 14,
    paddingHorizontal: 4,
    fontSize: 13,
    lineHeight: 20,
  },
});
