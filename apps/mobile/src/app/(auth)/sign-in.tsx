import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';

/**
 * Cosmetic for beta: everyone signs in with the same email/password and real
 * roles come from the database — the tabs only set expectations (and stick
 * across launches). Revisit when Google/Apple sign-in lands.
 */
type Audience = 'coaches' | 'players' | 'parents';

const AUDIENCE_KEY = 'courtside.sign-in-audience';

const AUDIENCE_OPTIONS: { value: Audience; label: string }[] = [
  { value: 'coaches', label: 'Coaches' },
  { value: 'players', label: 'Players' },
  { value: 'parents', label: 'Parents' },
];

const AUDIENCE_SUBTITLE: Record<Audience, string> = {
  coaches: 'Coach & admin sign in',
  players: 'Player sign in — ages 13 and up',
  parents: 'Parent & guardian sign in',
};

export default function SignInScreen() {
  const { signIn } = useAuth();
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audience, setAudience] = useState<Audience>('coaches');

  useEffect(() => {
    AsyncStorage.getItem(AUDIENCE_KEY)
      .then((stored) => {
        if (stored === 'coaches' || stored === 'players' || stored === 'parents') {
          setAudience(stored);
        }
      })
      .catch(() => {});
  }, []);

  const selectAudience = (value: Audience) => {
    setAudience(value);
    AsyncStorage.setItem(AUDIENCE_KEY, value).catch(() => {});
  };

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
        <ThemedText themeColor="textSecondary">{AUDIENCE_SUBTITLE[audience]}</ThemedText>

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

        <View style={styles.audienceTabs}>
          <SegmentedControl options={AUDIENCE_OPTIONS} value={audience} onChange={selectAudience} />
        </View>
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
  audienceTabs: {
    marginTop: Spacing.three,
  },
});
