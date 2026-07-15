import { Pressable, StyleSheet, View } from 'react-native';
import type { ChannelRow } from '@courtside/shared';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Badge } from './badge';

type ChannelListRowProps = {
  channel: ChannelRow;
  onPress: () => void;
};

export function ChannelListRow({ channel, onPress }: ChannelListRowProps) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={4}>
      {({ pressed }) => (
        <ThemedView
          type="backgroundElement"
          style={[styles.row, { borderColor: theme.border }, pressed && styles.pressed]}>
          <ThemedText style={styles.name}>{channel.name}</ThemedText>
          <View style={styles.badges}>
            {channel.team_season_id ? <Badge label="Team" /> : null}
            {channel.is_read_only ? <Badge label="Read only" /> : null}
          </View>
        </ThemedView>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    minHeight: TouchTarget.minimum,
    gap: Spacing.two,
  },
  name: {
    flex: 1,
  },
  badges: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
});
