import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '@/auth/auth-context';
import { Screen } from '@/components/screen';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { messageFrom } from '@/lib/api';

export default function LoginScreen() {
  const theme = useTheme();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  async function submit() {
    if (!canSubmit) {
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (caught) {
      setError(messageFrom(caught, 'Unable to sign in.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}>
            <Text style={[styles.word, { color: theme.text }]}>Stock</Text>
            <Text style={[styles.lead, { color: theme.textSecondary }]}>
              Sign in with your admin account.
            </Text>

            <View style={styles.fields}>
            <Text style={[styles.label, { color: theme.text }]}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              keyboardType="email-address"
              textContentType="username"
              inputMode="email"
              placeholder="you@company.com"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { backgroundColor: theme.surface, color: theme.text }]}
            />

            <Text style={[styles.label, styles.passwordLabel, { color: theme.text }]}>Password</Text>
            <View
              style={[styles.passwordRow, { backgroundColor: theme.surface }]}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
                textContentType="password"
                placeholder="Password"
                placeholderTextColor={theme.textSecondary}
                onSubmitEditing={() => void submit()}
                style={[styles.passwordInput, { color: theme.text }]}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                onPress={() => setShowPassword((current) => !current)}
                hitSlop={8}
                style={styles.show}>
                <SymbolView
                  name={{
                    ios: showPassword ? 'eye.slash' : 'eye',
                    android: showPassword ? 'visibility_off' : 'visibility',
                    web: showPassword ? 'visibility_off' : 'visibility',
                  }}
                  size={22}
                  tintColor={theme.text}
                />
              </Pressable>
            </View>
          </View>

          {error ? (
            <Text accessibilityRole="alert" style={[styles.error, { color: theme.out }]}>
              {error}
            </Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            disabled={!canSubmit}
            onPress={() => void submit()}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: theme.ink },
              pressed && styles.pressed,
              !canSubmit && styles.disabled,
            ]}>
            <Text style={[styles.buttonLabel, { color: theme.onInk }]}>
              {submitting ? 'Signing in' : 'Sign in'}
            </Text>
          </Pressable>
          </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  word: {
    fontFamily: Fonts.rounded,
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '700',
  },
  lead: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 22,
  },
  fields: {
    marginTop: 36,
  },
  label: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  passwordLabel: {
    marginTop: 18,
  },
  input: {
    height: 52,
    borderRadius: 2,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  passwordRow: {
    height: 52,
    borderRadius: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    height: 52,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  show: {
    width: 48,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    marginTop: 16,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
  },
  button: {
    marginTop: 22,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
});
