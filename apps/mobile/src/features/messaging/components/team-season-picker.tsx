import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type TeamSeasonOption = {
  teamSeasonId: string;
  teamName: string;
};

type TeamSeasonPickerProps = {
  options: TeamSeasonOption[];
  selectedTeamSeasonId: string | null;
  onSelect: (teamSeasonId: string) => void;
};

/** Single-select list of this org's teams for the current season. Read-only —
 * team/season setup happens on the Teams tab, not here. */
export function TeamSeasonPicker({ options, selectedTeamSeasonId, onSelect }: TeamSeasonPickerProps) {
  const theme = useTheme();
  if (options.length === 0) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        No teams set up for the current season yet. Add one from the Teams tab first.
      </ThemedText>
    );
  }

  return (
    <View style={styles.container}>
      {options.map((option) => (
        <Pressable key={option.teamSeasonId} onPress={() => onSelect(option.teamSeasonId)} hitSlop={4}>
          <ThemedView
            type={selectedTeamSeasonId === option.teamSeasonId ? 'backgroundSelected' : 'backgroundElement'}
            style={[styles.option, { borderColor: theme.border }]}>
            <ThemedText type="small">{option.teamName}</ThemedText>
          </ThemedView>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  option: {
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: TouchTarget.minimum,
    justifyContent: 'center',
  },
});
