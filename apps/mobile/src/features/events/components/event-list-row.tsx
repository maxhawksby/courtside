import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { EventRow } from '@courtside/shared';

import { EVENT_TYPE_LABELS, formatTime } from '../format';

type EventListRowProps = {
  event: EventRow;
  onPress: () => void;
};

export function EventListRow({ event, onPress }: EventListRowProps) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type="backgroundElement" style={[styles.row, { borderColor: theme.border }]}>
        <View style={styles.timeCol}>
          <ThemedText type="small" themeColor="textSecondary">
            {formatTime(event.starts_at)}
          </ThemedText>
        </View>
        <View style={styles.mainCol}>
          <ThemedText type="default">{event.title ?? EVENT_TYPE_LABELS[event.type]}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {EVENT_TYPE_LABELS[event.type]}
            {event.location ? ` · ${event.location}` : ''}
          </ThemedText>
        </View>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'center',
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    minHeight: TouchTarget.minimum,
  },
  timeCol: {
    width: 72,
  },
  mainCol: {
    flex: 1,
    gap: Spacing.half,
  },
  pressed: {
    opacity: 0.7,
  },
});
