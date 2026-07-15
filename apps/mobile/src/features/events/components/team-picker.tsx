import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type TeamOption = { teamSeasonId: string; teamName: string };

type TeamPickerProps = {
  options: TeamOption[];
  selectedTeamSeasonId: string | null;
  onSelect: (teamSeasonId: string | null) => void;
};

/** Optional team assignment for an event — "No team" plus this season's teams. */
export function TeamPicker({ options, selectedTeamSeasonId, onSelect }: TeamPickerProps) {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <Pressable onPress={() => onSelect(null)} hitSlop={4}>
        <ThemedView
          type={selectedTeamSeasonId === null ? 'backgroundSelected' : 'backgroundElement'}
          style={[styles.option, { borderColor: theme.border }]}>
          <ThemedText type="small">No team</ThemedText>
        </ThemedView>
      </Pressable>

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
