import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput } from 'react-native';
import { Stack, useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createPerson } from '@/lib/data';
import { useOrg } from '@/lib/org-context';

const DOB_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidDob(value: string): boolean {
  if (!DOB_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime());
}

export default function NewPersonScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { activeOrg } = useOrg();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dobError = dob.trim() && !isValidDob(dob.trim()) ? 'Use YYYY-MM-DD format' : null;
  const canSubmit = Boolean(firstName.trim() && lastName.trim() && !dobError && !submitting);

  const handleSubmit = async () => {
    if (!activeOrg || !canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const person = await createPerson(activeOrg.id, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        date_of_birth: dob.trim() ? dob.trim() : undefined,
        email: email.trim() ? email.trim() : undefined,
        phone: phone.trim() ? phone.trim() : undefined,
      });
      router.replace(`/directory/${person.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create person');
      setSubmitting(false);
    }
  };

  if (!activeOrg) {
    return (
      <ThemedView style={styles.centered}>
        <Stack.Screen options={{ title: 'Add person' }} />
        <ThemedText themeColor="textSecondary">Choose an organization first.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Add person' }} />
      <ScrollView contentContainerStyle={styles.form}>
        <ThemedView style={styles.field}>
          <ThemedText type="small">First name *</ThemedText>
          <TextInput
            value={firstName}
            onChangeText={setFirstName}
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
            autoCapitalize="words"
          />
        </ThemedView>

        <ThemedView style={styles.field}>
          <ThemedText type="small">Last name *</ThemedText>
          <TextInput
            value={lastName}
            onChangeText={setLastName}
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
            autoCapitalize="words"
          />
        </ThemedView>

        <ThemedView style={styles.field}>
          <ThemedText type="small">Date of birth</ThemedText>
          <TextInput
            value={dob}
            onChangeText={setDob}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
            keyboardType="numbers-and-punctuation"
          />
          {dobError ? (
            <ThemedText type="small" themeColor="textSecondary">
              {dobError}
            </ThemedText>
          ) : null}
        </ThemedView>

        <ThemedView style={styles.field}>
          <ThemedText type="small">Email</ThemedText>
          <TextInput
            value={email}
            onChangeText={setEmail}
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </ThemedView>

        <ThemedView style={styles.field}>
          <ThemedText type="small">Phone</ThemedText>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
            keyboardType="phone-pad"
          />
        </ThemedView>

        {error ? (
          <ThemedText type="small" themeColor="textSecondary">
            {error}
          </ThemedText>
        ) : null}

        <PrimaryButton
          label={submitting ? 'Saving…' : 'Add person'}
          onPress={handleSubmit}
          disabled={!canSubmit}
        />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  form: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  field: {
    gap: Spacing.one,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.input,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    minHeight: TouchTarget.minimum,
    fontSize: 16,
  },
});
