import { ReactNode } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AppText from '@/components/ui/AppText';
import SmartafWordmark from '@/components/ui/SmartafWordmark';
import { BabyCityPalette, BabyCityShadows } from '@/constants/theme';

type Props = {
  title: string;
  subtitle: string;
  badge: string;
  fallbackRoute: '/welcome' | '/about' | '/settings';
  children: ReactNode;
};

export default function LegalScreenLayout({
  title,
  subtitle,
  badge,
  fallbackRoute,
  children,
}: Props) {
  function handleBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace(fallbackRoute);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.backgroundLayer} pointerEvents="none">
        <View style={styles.backgroundOrbTop} />
        <View style={styles.backgroundOrbBottom} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <SmartafWordmark size="sm" textColor={BabyCityPalette.textPrimary} />
          </View>

          <TouchableOpacity activeOpacity={0.84} onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-forward" size={20} color={BabyCityPalette.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.header}>
          <View style={styles.badge}>
            <AppText variant="caption" weight="700" align="center" style={styles.badgeText}>
              {badge}
            </AppText>
          </View>

          <AppText variant="h1" weight="800" style={styles.title}>
            {title}
          </AppText>
          <AppText variant="bodyLarge" tone="muted" style={styles.subtitle}>
            {subtitle}
          </AppText>
        </View>

        <View style={styles.content}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f8faff',
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundOrbTop: {
    position: 'absolute',
    top: 112,
    left: -76,
    width: 212,
    height: 212,
    borderRadius: 106,
    backgroundColor: 'rgba(178, 140, 255, 0.10)',
  },
  backgroundOrbBottom: {
    position: 'absolute',
    right: -70,
    bottom: 90,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(233, 222, 245, 0.18)',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 40,
    gap: 22,
  },
  topBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BabyCityPalette.surfaceLowest,
    ...BabyCityShadows.soft,
  },
  header: {
    gap: 12,
    alignItems: 'flex-end',
  },
  badge: {
    backgroundColor: `${BabyCityPalette.primary}12`,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  badgeText: {
    color: BabyCityPalette.primary,
  },
  title: {
    width: '100%',
  },
  subtitle: {
    width: '100%',
    maxWidth: 620,
  },
  content: {
    gap: 16,
  },
});
