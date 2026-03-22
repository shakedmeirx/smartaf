import React, { ReactNode, forwardRef } from 'react';
import {
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import AppText from '@/components/ui/AppText';
import {
  BabyCityGeometry,
  BabyCityPalette,
  ParentDesignTokens,
} from '@/constants/theme';

type Props = TextInputProps & {
  label?: string;
  hint?: string;
  error?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  inputWrapStyle?: StyleProp<ViewStyle>;
  /** Applies the Stitch recessed-input style: blue-tinted bg, no border, r:14, h:56. */
  recessed?: boolean;
};

const AppInput = forwardRef<TextInput, Props>(function AppInput(
  {
    label,
    hint,
    error,
    leading,
    trailing,
    containerStyle,
    inputWrapStyle,
    recessed = false,
    style,
    editable = true,
    placeholderTextColor = ParentDesignTokens.text.tertiary,
    textAlign = 'right',
    ...rest
  },
  ref
) {
  const [focused, setFocused] = React.useState(false);

  return (
    <View style={containerStyle}>
      {label ? (
        <AppText variant="caption" weight="700" style={styles.label}>
          {label}
        </AppText>
      ) : null}

      <View
        style={[
          styles.inputWrap,
          !editable && styles.inputWrapDisabled,
          error && styles.inputWrapError,
          inputWrapStyle,
          recessed && styles.inputRecessed,
          focused && styles.inputWrapFocused,
        ]}
      >
        {trailing ? <View style={styles.accessoryWrap}>{trailing}</View> : null}
        <TextInput
          ref={ref}
          editable={editable}
          placeholderTextColor={placeholderTextColor}
          textAlign={textAlign}
          style={[styles.input, style]}
          onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); rest.onBlur?.(e); }}
          {...rest}
        />
        {leading ? <View style={styles.accessoryWrap}>{leading}</View> : null}
      </View>

      {error ? (
        <AppText variant="caption" tone="error" style={styles.feedback}>
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" tone="muted" style={styles.feedback}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
});

export default AppInput;

const styles = StyleSheet.create({
  label: {
    marginBottom: BabyCityGeometry.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  inputWrap: {
    minHeight: BabyCityGeometry.controlHeights.input,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: BabyCityGeometry.spacing.sm,
    borderRadius: ParentDesignTokens.radius.control,
    borderWidth: 1,
    borderColor: BabyCityPalette.border,
    backgroundColor: ParentDesignTokens.surfaces.control,
    paddingHorizontal: BabyCityGeometry.spacing.md,
  },
  inputWrapDisabled: {
    opacity: 0.7,
    backgroundColor: ParentDesignTokens.surfaces.controlMuted,
  },
  inputRecessed: {
    backgroundColor: BabyCityPalette.inputRecessedBg,
    borderWidth: 0,
    borderRadius: BabyCityGeometry.radius.control,
    minHeight: 56,
  },
  inputWrapError: {
    borderColor: BabyCityPalette.error,
  },
  inputWrapFocused: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: BabyCityPalette.primary,
  },
  input: {
    flex: 1,
    minHeight: 24,
    fontSize: 15,
    color: ParentDesignTokens.text.primary,
    writingDirection: 'rtl',
  },
  accessoryWrap: {
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedback: {
    marginTop: BabyCityGeometry.spacing.xs,
  },
});
