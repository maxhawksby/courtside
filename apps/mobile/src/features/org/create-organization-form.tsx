import { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createOrganization } from '@/lib/data';
import { useOrg } from '@/lib/org-context';

/** Matches Home's staggered-entrance cadence (DESIGN.md §4) — this form is
 * Home's sole section when no organization exists yet. */
const entering = FadeInDown.duration(280).easing(Easing.out(Easing.cubic));

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
    <Animated.View entering={entering} style={styles.wrap}>
      <ThemedView type="backgroundElement" style={styles.form}>
        <ThemedText type="subtitle">Create your organization</ThemedText>
        <ThemedText themeColor="textSecondary">
          You are not part of an organization yet. Create one to get started.
        </ThemedText>

        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          placeholder="Organization name"
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="words"
          value={name}
          onChangeText={setName}
        />

        {error ? (
          <ThemedText type="small" themeColor="danger">
            {error}
          </ThemedText>
        ) : null}

        <PrimaryButton
          label={submitting ? 'Creating…' : 'Create organization'}
          onPress={() => void handleSubmit()}
          disabled={submitting || !name.trim()}
        />
      </ThemedView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'stretch',
  },
  form: {
    alignSelf: 'stretch',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radius.card,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.input,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 17,
  },
});
