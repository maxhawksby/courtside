import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Colors, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createOrganization } from '@/lib/data';
import { useOrg } from '@/lib/org-context';

export function CreateOrganizationForm() {
  const { refreshOrgs } = useOrg();
  const theme = useTheme();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await createOrganization(name.trim());
      await refreshOrgs();
      setName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create organization');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ThemedView type="backgroundElement" style={styles.form}>
      <ThemedText type="subtitle">Create your organization</ThemedText>
      <ThemedText themeColor="textSecondary">
        You are not part of an organization yet. Create one to get started.
      </ThemedText>

      <TextInput
        style={[styles.input, { color: theme.text }]}
        placeholder="Organization name"
        placeholderTextColor={theme.textSecondary}
        autoCapitalize="words"
        value={name}
        onChangeText={setName}
      />

      {error ? (
        <ThemedText themeColor="text" style={styles.error}>
          {error}
        </ThemedText>
      ) : null}

      <Pressable
        style={[styles.button, submitting && styles.buttonDisabled]}
        disabled={submitting || !name.trim()}
        onPress={handleSubmit}>
        {submitting ? (
          <ActivityIndicator color={Brand.onPrimary} />
        ) : (
          <ThemedText style={styles.buttonText}>Create organization</ThemedText>
        )}
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
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
    color: Brand.danger,
  },
  button: {
    backgroundColor: Brand.primary,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Brand.onPrimary,
    fontWeight: '600',
  },
});
