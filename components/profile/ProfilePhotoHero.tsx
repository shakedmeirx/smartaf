import { useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleProp,
  StyleSheet,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  BabyCityChipTones,
  BabyCityGeometry,
  BabyCityPalette,
} from '@/constants/theme';
import AppText from '@/components/ui/AppText';

type Props = {
  name: string;
  profilePhotoUrl?: string;
  galleryPhotoUrls?: string[];
  variant?: 'warm' | 'fresh';
  layout?: 'hero' | 'avatar';
  style?: StyleProp<ViewStyle>;
};

function buildPhotoUrls(profilePhotoUrl?: string, galleryPhotoUrls: string[] = []) {
  const uniqueUrls: string[] = [];
  const seen = new Set<string>();

  [profilePhotoUrl, ...galleryPhotoUrls].forEach(url => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    uniqueUrls.push(url);
  });

  return uniqueUrls;
}

export default function ProfilePhotoHero({
  name,
  profilePhotoUrl,
  galleryPhotoUrls = [],
  variant = 'fresh',
  layout = 'hero',
  style,
}: Props) {
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<string>>(null);
  const [visible, setVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const photoUrls = useMemo(
    () => buildPhotoUrls(profilePhotoUrl, galleryPhotoUrls),
    [profilePhotoUrl, galleryPhotoUrls]
  );
  const mainPhotoUrl = photoUrls[0];
  const theme = variant === 'warm'
    ? {
        frameBackground: BabyCityPalette.surface,
        frameBorder: BabyCityPalette.borderSoft,
        fallbackBackground: BabyCityChipTones.primary.background,
        fallbackBorder: BabyCityChipTones.primary.border,
        fallbackText: BabyCityChipTones.primary.text,
        countBackground: BabyCityPalette.surfaceMuted,
        countText: BabyCityPalette.textPrimary,
      }
    : {
        frameBackground: BabyCityPalette.surface,
        frameBorder: BabyCityPalette.borderSoft,
        fallbackBackground: BabyCityChipTones.accent.background,
        fallbackBorder: BabyCityChipTones.accent.border,
        fallbackText: BabyCityChipTones.accent.text,
        countBackground: BabyCityPalette.surfaceMuted,
        countText: BabyCityPalette.textPrimary,
      };

  function openCarousel() {
    if (!mainPhotoUrl) return;
    setCurrentIndex(0);
    setVisible(true);
  }

  function closeCarousel() {
    setVisible(false);
    setCurrentIndex(0);
  }

  return (
    <>
      <Pressable
        style={[
          styles.frame,
          layout === 'avatar' ? styles.avatarFrame : styles.heroFrame,
          { backgroundColor: theme.frameBackground, borderColor: theme.frameBorder },
          style,
        ]}
        onPress={openCarousel}
        disabled={!mainPhotoUrl}
      >
        {mainPhotoUrl ? (
          <Image source={{ uri: mainPhotoUrl }} style={styles.heroImage} resizeMode="cover" />
        ) : (
          <View
            style={[
              styles.fallback,
              {
                backgroundColor: theme.fallbackBackground,
                borderColor: theme.fallbackBorder,
              },
            ]}
          >
            <AppText variant={layout === 'avatar' ? 'h1' : 'h1'} weight="800" style={[styles.fallbackText, { color: theme.fallbackText }]}>
              {name.charAt(0)}
            </AppText>
          </View>
        )}

        {photoUrls.length > 1 ? (
          <View style={[styles.countBadge, { backgroundColor: theme.countBackground }]}>
            <Ionicons name="images-outline" size={14} color={theme.countText} />
            <AppText variant="caption" weight="800" style={[styles.countText, { color: theme.countText }]}>
              {String(photoUrls.length)}
            </AppText>
          </View>
        ) : null}
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeCarousel}
      >
        <View style={styles.modalRoot}>
          <View style={styles.modalTopBar}>
            <Pressable style={styles.closeButton} onPress={closeCarousel}>
              <Ionicons name="close" size={26} color={BabyCityPalette.surface} />
            </Pressable>
            <AppText variant="body" weight="700" style={styles.counterText}>
              {currentIndex + 1} / {photoUrls.length}
            </AppText>
          </View>

          <FlatList
            ref={listRef}
            data={photoUrls}
            horizontal
            pagingEnabled
            initialScrollIndex={0}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) => `${item}-${index}`}
            getItemLayout={(_, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            renderItem={({ item }) => (
              <View style={[styles.slide, { width }]}>
                <Image source={{ uri: item }} style={styles.modalImage} resizeMode="contain" />
              </View>
            )}
            onMomentumScrollEnd={event => {
              const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
              setCurrentIndex(nextIndex);
            }}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    borderWidth: 1,
  },
  heroFrame: {
    width: '100%',
    height: 260,
    borderRadius: 28,
    marginBottom: 16,
  },
  avatarFrame: {
    width: 116,
    height: 116,
    borderRadius: BabyCityGeometry.radius.hero,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  fallbackText: {
    fontSize: 56,
    lineHeight: 64,
  },
  countBadge: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countText: {
    // configured through AppText
  },
  modalRoot: {
    flex: 1,
    backgroundColor: 'rgba(8, 12, 11, 0.96)',
  },
  modalTopBar: {
    position: 'absolute',
    top: 56,
    left: 18,
    right: 18,
    zIndex: 2,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterText: {
    color: BabyCityPalette.surface,
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 110,
    paddingBottom: 56,
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
});
