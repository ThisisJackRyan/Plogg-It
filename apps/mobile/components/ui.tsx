import { forwardRef, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type PressableProps,
} from 'react-native';

export const BRAND = {
  primary: '#2e8b57',
  primaryPressed: '#256e45',
  border: '#00000014',
  error: '#dc2626',
  muted: '#00000099',
} as const;

type InputProps = TextInputProps & { error?: string | null };
export const Input = forwardRef<TextInput, InputProps>(function Input({ style, error, ...props }, ref) {
  return (
    <TextInput
      ref={ref}
      autoCapitalize="none"
      placeholderTextColor="#00000055"
      style={[styles.input, error ? styles.inputError : null, style]}
      {...props}
    />
  );
});

type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  variant?: 'primary' | 'ghost';
};
export function Button({ label, variant = 'primary', disabled, ...props }: ButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' ? styles.buttonPrimary : styles.buttonGhost,
        pressed ? styles.buttonPressed : null,
        disabled ? styles.buttonDisabled : null,
      ]}
      {...props}
    >
      <Text
        style={[
          styles.buttonLabel,
          variant === 'primary' ? styles.buttonLabelPrimary : styles.buttonLabelGhost,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function FieldError({ children }: { children?: string | null }) {
  if (!children) return null;
  return <Text style={styles.fieldError}>{children}</Text>;
}

export function FormShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.shell}>
      <View style={styles.shellInner}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, justifyContent: 'center', padding: 24 },
  shellInner: { gap: 12 },
  title: { fontSize: 24, fontWeight: '600', textAlign: 'center' },
  subtitle: { fontSize: 14, color: BRAND.muted, textAlign: 'center', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: BRAND.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: '#fff',
  },
  inputError: { borderColor: BRAND.error },
  fieldError: { color: BRAND.error, fontSize: 12, marginTop: 4 },
  button: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: { backgroundColor: BRAND.primary },
  buttonGhost: { backgroundColor: 'transparent' },
  buttonPressed: { opacity: 0.85 },
  buttonDisabled: { opacity: 0.5 },
  buttonLabel: { fontSize: 15, fontWeight: '500' },
  buttonLabelPrimary: { color: '#fff' },
  buttonLabelGhost: { color: BRAND.primary },
});
