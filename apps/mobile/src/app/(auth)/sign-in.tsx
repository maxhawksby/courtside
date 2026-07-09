import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';

export default function SignInScreen() {
  const { signIn } = useAuth();
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    const { error: signInError } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (signInError) {
      setError(signInError);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          Courtside
        </ThemedText>
        <ThemedText themeColor="textSecondary">Sign in to continue</ThemedText>

        <ThemedView type="backgroundElement" style={styles.form}>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Email"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Password"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            secureTextEntry
            textContentType="password"
            value={password}
            onChangeText={setPassword}
          />

          {error ? (
            <ThemedText themeColor="text" style={styles.error}>
              {error}
            </ThemedText>
          ) : null}

          <Pressable
            style={[styles.button, submitting && styles.buttonDisabled]}
            disabled={submitting || !email || !password}
            onPress={handleSubmit}>
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <ThemedText style={styles.buttonText}>Sign in</ThemedText>
            )}
          </Pressable>
        </ThemedView>

        <Link href="/sign-up">
          <ThemedText type="linkPrimary">Need an account? Sign up</ThemedText>
        </Link>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    textAlign: 'center',
  },
  form: {
    alignSelf: 'stretch',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.four,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.light.textSecondary,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  error: {
    color: '#d92c2c',
  },
  button: {
    backgroundColor: '#208AEF',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
