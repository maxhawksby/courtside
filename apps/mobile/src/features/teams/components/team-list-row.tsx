import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { TeamWithDivision } from '@/lib/data';

type TeamListRowProps = {
  team: TeamWithDivision;
  onPress: () => void;
};

export function TeamListRow({ team, onPress }: TeamListRowProps) {
  const theme = useTheme();
  const archived = team.archived_at !== null;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type="backgroundElement" style={[styles.row, { borderColor: theme.border }]}>
        <ThemedText type="default" themeColor={archived ? 'textSecondary' : undefined}>
          {team.name}
        </ThemedText>
        {archived && (
          <ThemedText type="small" themeColor="textSecondary">
            Archived
          </ThemedText>
        )}
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    minHeight: TouchTarget.minimum,
  },
  pressed: {
    opacity: 0.7,
  },
});
