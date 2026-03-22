import React, { ReactNode, RefObject } from 'react';
import {
  ScrollView,
  ScrollViewProps,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { BabyCityGeometry, ParentDesignTokens } from '@/constants/theme';

type Props = {
  children: ReactNode;
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  backgroundColor?: string;
  scrollProps?: Omit<ScrollViewProps, 'contentContainerStyle'>;
  scrollViewRef?: RefObject<ScrollView | null>;
};

export default function AppScreen({
  children,
  scrollable = false,
  style,
  contentContainerStyle,
  backgroundColor = ParentDesignTokens.surfaces.screen,
  scrollProps,
  scrollViewRef,
}: Props) {
  if (scrollable) {
    return (
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { backgroundColor },
          contentContainerStyle,
        ]}
        {...scrollProps}
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <View style={[styles.base, { backgroundColor }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
    paddingHorizontal: ParentDesignTokens.spacing.pageHorizontal,
    paddingTop: ParentDesignTokens.spacing.pageVertical,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: ParentDesignTokens.spacing.pageHorizontal,
    paddingTop: ParentDesignTokens.spacing.pageVertical,
    paddingBottom: BabyCityGeometry.spacing.xxl,
  },
});
