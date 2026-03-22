import React from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
// Import existing typography component
import AppText from '@/components/ui/AppText';

const { width } = Dimensions.get('window');

// Data decoupling
const WelcomeContent = {
  appName: 'Smartaf',
  title: 'ברוכים הבאים\nלסמארטף',
  subtitle: 'הדרך החכמה והבטוחה למצוא בייביסיטר או עבודה.',
  primaryAction: 'בואו נתחיל',
  secondaryAction: 'כבר יש לי חשבון'
};

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Ambient Background Blobs */}
      <View style={[styles.blob, styles.blobTopLeft]} />
      <View style={[styles.blob, styles.blobBottomRight]} />

      <View style={styles.content}>
        {/* Premium Illustration/Logo Area */}
        <View style={styles.logoArea}>
          {/* Soft Glow behind illustration */}
          <View style={styles.logoGlow} />

          <View style={styles.sereneCard}>
            <View style={styles.iconContainer}>
              <MaterialIcons name="child-care" size={80} color="#5c2df1" />
              <LinearGradient
                colors={['#8E2DE2', '#4A00E1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.verifiedBadge}
              >
                <MaterialIcons name="verified" size={16} color="#ffffff" />
              </LinearGradient>
            </View>

            <View style={styles.appNameContainer}>
              <AppText variant="h1" weight="800" style={styles.appNameSolid}>
                {WelcomeContent.appName}
              </AppText>
            </View>
          </View>
        </View>

        {/* Typography Cluster */}
        <View style={styles.textCluster}>
          <AppText variant="h1" weight="800" align="center" style={styles.mainTitle}>
            {WelcomeContent.title}
          </AppText>
          <AppText variant="bodyLarge" weight="500" align="center" style={styles.subtitle}>
            {WelcomeContent.subtitle}
          </AppText>
        </View>

        {/* Action Cluster */}
        <View style={styles.actionCluster}>
          {/* Primary CTA: Aligned Gradient */}
          <View style={styles.primaryButtonShadowContainer}>
            <TouchableOpacity 
              activeOpacity={0.8} 
              onPress={() => router.push('/auth')}
            >
              <LinearGradient
                colors={['#8E2DE2', '#4A00E1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryButtonGradient}
              >
                <AppText variant="bodyLarge" weight="700" style={styles.primaryButtonText}>
                  {WelcomeContent.primaryAction}
                </AppText>
                <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Secondary Link */}
          <TouchableOpacity 
            activeOpacity={0.6} 
            onPress={() => router.push('/auth')} 
            style={styles.secondaryLinkContainer}
          >
            <AppText variant="bodyLarge" weight="700" style={styles.secondaryLinkText}>
              {WelcomeContent.secondaryAction}
            </AppText>
            <View style={styles.underline} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f5ff',
  },
  blob: {
    position: 'absolute',
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: width * 0.45,
    backgroundColor: 'rgba(163, 145, 255, 0.2)', // primary-container with opacity to simulate the blur
  },
  blobTopLeft: {
    top: -width * 0.15,
    left: -width * 0.15,
  },
  blobBottomRight: {
    bottom: -width * 0.15,
    right: -width * 0.15,
    backgroundColor: 'rgba(163, 145, 255, 0.1)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  logoArea: {
    width: '100%',
    alignItems: 'center',
    marginTop: 64,
    marginBottom: 48,
  },
  logoGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(163, 145, 255, 0.25)',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -70 }, { translateY: -70 }],
  },
  sereneCard: {
    backgroundColor: '#ffffff',
    borderRadius: 48, // 3rem
    paddingVertical: 32,
    paddingHorizontal: 40,
    alignItems: 'center',
    shadowColor: '#282D45',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 32,
    elevation: 4,
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedBadge: {
    position: 'absolute',
    top: -4,
    right: -12,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appNameContainer: {
    marginTop: 20,
  },
  appNameSolid: {
    fontSize: 32,
    color: '#5c2df1', // Fallback for gradient text
    letterSpacing: -0.5,
  },
  textCluster: {
    marginBottom: 48,
    width: '100%',
  },
  mainTitle: {
    fontSize: 42,
    lineHeight: 48,
    color: '#1A1F36',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 18,
    color: '#555a74',
    paddingHorizontal: 8,
    lineHeight: 28,
  },
  actionCluster: {
    width: '100%',
    marginTop: 'auto',
    marginBottom: 48,
    alignItems: 'center',
  },
  primaryButtonShadowContainer: {
    width: '100%',
    shadowColor: '#4a00e1',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 8,
    marginBottom: 16,
  },
  primaryButtonGradient: {
    width: '100%',
    height: 64, 
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
  },
  secondaryLinkContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  secondaryLinkText: {
    color: '#5c2df1',
    fontSize: 16,
  },
  underline: {
    marginTop: 2,
    height: 2,
    width: '100%',
    backgroundColor: '#5c2df1',
    borderRadius: 1,
  }
});
