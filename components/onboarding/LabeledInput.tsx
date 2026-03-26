import { forwardRef, useRef, useState } from 'react';
import { Platform, View, TextInput, StyleSheet } from 'react-native';
import {
  BabyCityPalette,
} from '@/constants/theme';
import { strings } from '@/locales';
import KeyboardAccessoryBar from '@/components/ui/KeyboardAccessoryBar';
import AppText from '@/components/ui/AppText';

type Props = {
  label: string;
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric';
  returnKeyType?: 'next' | 'done' | 'default';
  onSubmitEditing?: () => void;
  autoFocus?: boolean;
  maxLength?: number;
  errorText?: string;
};

// forwardRef lets the parent pass a ref directly to the inner TextInput.
// This is needed so Step1 can move focus from one field to the next.
const LabeledInput = forwardRef<TextInput, Props>(function LabeledInput(
  {
    label,
    value,
    onChange,
    placeholder,
    multiline,
    keyboardType = 'default',
    returnKeyType = 'default',
    onSubmitEditing,
    autoFocus,
    maxLength,
    errorText,
  },
  ref
) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput | null>(null);
  const accessoryId = useRef(`keyboard-accessory-${Math.random().toString(36).slice(2)}`).current;

  function setInputNode(node: TextInput | null) {
    inputRef.current = node;

    if (typeof ref === 'function') {
      ref(node);
      return;
    }

    if (ref) {
      ref.current = node;
    }
  }

  function handleAccessoryPress() {
    if (returnKeyType === 'next' && onSubmitEditing) {
      onSubmitEditing();
      return;
    }

    inputRef.current?.blur();
    onSubmitEditing?.();
  }

  return (
    <View style={styles.container}>
      <AppText 
        variant="body" 
        weight="700"
        tone={isFocused ? 'accent' : 'muted'} 
        style={styles.label}
      >
        {label}
      </AppText>
      <TextInput
        ref={setInputNode}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          isFocused && styles.inputFocused,
          !!errorText && styles.inputError,
        ]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        multiline={multiline}
        keyboardType={keyboardType}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        // 'submit' keeps the keyboard open so focus can move to the next field.
        // 'newline' inserts a line break in multiline inputs.
        // 'blurAndSubmit' closes the keyboard on the last field.
        submitBehavior={
          returnKeyType === 'next' ? 'submit'
          : multiline ? 'newline'
          : 'blurAndSubmit'
        }
        autoFocus={autoFocus}
        maxLength={maxLength}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        textAlign="right"
        placeholderTextColor={BabyCityPalette.textTertiary}
        autoCorrect={false}
        inputAccessoryViewID={Platform.OS === 'ios' ? accessoryId : undefined}
      />
      {errorText ? (
        <AppText variant="caption" tone="error" style={styles.errorText}>
          {errorText}
        </AppText>
      ) : null}
      <KeyboardAccessoryBar
        nativeID={accessoryId}
        onPress={handleAccessoryPress}
        label={returnKeyType === 'next' ? strings.next : strings.done}
      />
    </View>
  );
});

export default LabeledInput;

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  label: {
    marginBottom: 8,
    paddingHorizontal: 4,
    fontSize: 13,
    lineHeight: 18,
  },
  input: {
    minHeight: 58,
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 22,
    fontSize: 16,
    lineHeight: 22,
    color: BabyCityPalette.textPrimary,
    backgroundColor: BabyCityPalette.inputRecessedBg,
  },
  inputFocused: {
    borderColor: BabyCityPalette.primary,
    backgroundColor: BabyCityPalette.surfaceLowest,
    shadowColor: BabyCityPalette.primary,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  inputError: {
    borderColor: BabyCityPalette.error,
    backgroundColor: BabyCityPalette.errorSoft,
  },
  inputMultiline: {
    minHeight: 136,
    textAlignVertical: 'top',
  },
  errorText: {
    marginTop: 8,
    paddingHorizontal: 4,
  },
});
