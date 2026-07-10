import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { DivisionPicker } from '@/features/teams/components/division-picker';
import { PrimaryButton } from '@/components/ui/primary-button';
import { createDivision, createTeam, listDivisions } from '@/lib/data';
import { useOrg } from '@/lib/org-context';
import { useTheme } from '@/hooks/use-theme';
import type { DivisionRow } from '@courtside/shared';

export default function NewTeamScreen() {
  const { activeOrg } = useOrg();
  const theme = useTheme();
  const [name, setName] = useState('');
  const [divisions, setDivisions] = useState<DivisionRow[]>([]);
  const [selectedDivisionId, setSelectedDivisionId] = useState<string | null>(null);
  const [loadingDivisions, setLoadingDivisions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDivisions = useCallback(async () => {
    if (!activeOrg) return;
    setLoadingDivisions(true);
    try {
      const rows = await listDivisions(activeOrg.id);
      setDivisions(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load divisions');
    } finally {
      setLoadingDivisions(false);
    }
  }, [activeOrg]);

  useEffect(() => {
    void loadDivisions();
  }, [loadDivisions]);

  const handleCreateDivision = async (divisionName: string) => {
    if (!activeOrg) return;
    try {
      const division = await createDivision(activeOrg.id, divisionName);
      setDivisions((prev) => [...prev, division]);
      setSelectedDivisionId(division.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create division');
    }
  };

  const handleSubmit = async () => {
    if (!activeOrg || !name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await createTeam(activeOrg.id, name.trim(), selectedDivisionId ?? undefined);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create team');
      setSubmitting(false);
    }
  };

  if (!activeOrg) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="small" themeColor="textSecondary">
          Select or create an organization first.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <ThemedText type="small" themeColor="textSecondary">
            Team name
          </ThemedText>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Varsity Boys"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
          />
        </View>

        <View style={styles.section}>
          <ThemedText type="small" themeColor="textSecondary">
            Division
          </ThemedText>
          {loadingDivisions ? (
            <ActivityIndicator />
          ) : (
            <DivisionPicker
              divisions={divisions}
              selectedDivisionId={selectedDivisionId}
              onSelect={setSelectedDivisionId}
              onCreateDivision={handleCreateDivision}
            />
          )}
        </View>

        {error && (
          <ThemedText type="small" themeColor="text">
            {error}
          </ThemedText>
        )}

        <PrimaryButton
          label={submitting ? 'Creating…' : 'Create team'}
          onPress={handleSubmit}
          disabled={submitting || !name.trim()}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  section: {
    gap: Spacing.two,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
