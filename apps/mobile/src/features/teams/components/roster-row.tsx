import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { RosterEntry } from '@/lib/data';

const ROLE_LABELS: Record<RosterEntry['role'], string> = {
  player: 'Player',
  coach: 'Coach',
  scorekeeper: 'Scorekeeper',
};

export function RosterRow({ entry }: { entry: RosterEntry }) {
  const theme = useTheme();
  const name = entry.persons ? `${entry.persons.first_name} ${entry.persons.last_name}` : 'Unknown person';

  return (
    <ThemedView type="backgroundElement" style={[styles.row, { borderColor: theme.border }]}>
      <View style={styles.jerseyBadge}>
        <ThemedText type="smallBold">{entry.jersey_number ?? '—'}</ThemedText>
      </View>
      <View style={styles.info}>
        <ThemedText type="default">{name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {ROLE_LABELS[entry.role]}
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: TouchTarget.minimum,
  },
  jerseyBadge: {
    minWidth: 32,
    alignItems: 'center',
  },
  info: {
    gap: Spacing.half,
  },
});
