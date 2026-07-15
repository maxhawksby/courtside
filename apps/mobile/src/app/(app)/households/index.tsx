import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { EmptyState } from '@/components/ui/empty-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createHousehold, listHouseholds, type HouseholdWithMembers } from '@/lib/data';
import { useOrg } from '@/lib/org-context';

import { HouseholdCard } from '@/features/households/household-card';

// Entrance cascade (DESIGN.md §4: one orchestrated entrance per screen).
// No motion tokens exist yet — flagged in DESIGN.md §5.
const ENTRANCE_STAGGER_MS = 40;
const ENTRANCE_DURATION_MS = 250;
const ENTRANCE_STAGGER_CAP = 12;

export default function HouseholdsIndexScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { activeOrg, loading: orgLoading } = useOrg();

  const [households, setHouseholds] = useState<HouseholdWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activeOrg) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await listHouseholds(activeOrg.id);
      setHouseholds(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load households');
    } finally {
      setLoading(false);
    }
  }, [activeOrg]);

  // Focus-based reload: households/members changed on the detail screen
  // appear here when the user navigates back.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const handleCreate = async () => {
    if (!activeOrg || !name.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      await createHousehold(activeOrg.id, name.trim());
      setName('');
      setShowCreateForm(false);
      await load();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Could not create household');
    } finally {
      setCreating(false);
    }
  };

  if (orgLoading) {
    return (
      <ThemedView style={styles.centered}>
        <Stack.Screen options={{ title: 'Households' }} />
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (!activeOrg) {
    return (
      <ThemedView style={styles.centered}>
        <Stack.Screen options={{ title: 'Households' }} />
        <ThemedText type="small" themeColor="textSecondary">
          Select or create an organization first.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Households' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <ThemedText type="subtitle">Households</ThemedText>
          {!showCreateForm && (
            <PrimaryButton label="New household" onPress={() => setShowCreateForm(true)} />
          )}
        </View>

        {showCreateForm && (
          <ThemedView type="backgroundElement" style={[styles.createForm, { borderColor: theme.border }]}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Household name, e.g. The Smith Family"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              autoCapitalize="words"
            />
            {createError ? (
              <ThemedText type="small" style={{ color: theme.danger }}>
                {createError}
              </ThemedText>
            ) : null}
            <View style={styles.createActions}>
              <Pressable
                onPress={() => {
                  setShowCreateForm(false);
                  setName('');
                  setCreateError(null);
                }}
                hitSlop={12}
                style={styles.cancelTapTarget}>
                <ThemedText type="link" themeColor="textSecondary">
                  Cancel
                </ThemedText>
              </Pressable>
              <PrimaryButton
                label={creating ? 'Creating…' : 'Create'}
                onPress={handleCreate}
                disabled={creating || !name.trim()}
              />
            </View>
          </ThemedView>
        )}

        {loading && (
          <View style={styles.centered}>
            <ActivityIndicator />
          </View>
        )}

        {!loading && error && (
          <ThemedView
            type="backgroundElement"
            style={[styles.errorCard, { borderColor: theme.border }]}>
            <ThemedText type="smallBold" style={{ color: theme.danger }}>
              Couldn&apos;t load households
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {error}
            </ThemedText>
            <PrimaryButton label="Try again" onPress={() => void load()} />
          </ThemedView>
        )}

        {!loading && !error && households.length === 0 && !showCreateForm && (
          <EmptyState
            title="No households yet"
            body="Group families together so guardians and players in the same home are easy to find."
          />
        )}

        {!loading && !error && households.length > 0 && (
          <View style={styles.list}>
            {households.map((household, index) => (
              <Animated.View
                key={household.id}
                entering={FadeInDown.delay(
                  Math.min(index, ENTRANCE_STAGGER_CAP) * ENTRANCE_STAGGER_MS,
                ).duration(ENTRANCE_DURATION_MS)}>
                <HouseholdCard
                  household={household}
                  onPress={() => router.push(`/households/${household.id}`)}
                />
              </Animated.View>
            ))}
          </View>
        )}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.five,
  },
  createForm: {
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.input,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    minHeight: TouchTarget.minimum,
    fontSize: 16,
  },
  cancelTapTarget: {
    minHeight: TouchTarget.minimum,
    justifyContent: 'center',
  },
  createActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.three,
  },
  errorCard: {
    gap: Spacing.two,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.four,
    alignItems: 'flex-start',
  },
  list: {
    gap: Spacing.two,
  },
});
