import React, { forwardRef } from 'react';
import { StyleProp, StyleSheet, TextInput, TextInputProps, ViewStyle } from 'react-native';
import AppInput from '@/components/ui/AppInput';
import { BabyCityGeometry, BabyCityPalette, ParentDesignTokens } from '@/constants/theme';

type Props = Omit<TextInputProps, 'multiline'> & {
  label?: string;
  hint?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputWrapStyle?: StyleProp<ViewStyle>;
};

const AppTextArea = forwardRef<TextInput, Props>(function AppTextArea(
  {
    containerStyle,
    inputWrapStyle,
    style,
    ...rest
  },
  ref
) {
  return (
    <AppInput
      ref={ref}
      multiline
      textAlignVertical="top"
      containerStyle={containerStyle}
      inputWrapStyle={[styles.inputWrap, inputWrapStyle]}
      style={[styles.input, style]}
      {...rest}
    />
  );
});

export default AppTextArea;

const styles = StyleSheet.create({
  inputWrap: {
    minHeight: 116,
    alignItems: 'flex-start',
    paddingTop: BabyCityGeometry.spacing.md,
    backgroundColor: BabyCityPalette.inputRecessedBg,
    borderWidth: 0,
    borderRadius: BabyCityGeometry.radius.control,
  },
  input: {
    minHeight: 84,
  },
});
