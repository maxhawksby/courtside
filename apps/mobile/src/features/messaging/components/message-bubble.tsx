import { Pressable, StyleSheet, View } from 'react-native';
import type { MessageRow } from '@courtside/shared';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Badge } from './badge';

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

type MessageBubbleProps = {
  message: MessageRow;
  own: boolean;
  senderName: string;
  /** Long-press to soft-delete — only wired for the sender's own, non-deleted messages. */
  onLongPress?: () => void;
};

export function MessageBubble({ message, own, senderName, onLongPress }: MessageBubbleProps) {
  const theme = useTheme();
  const deleted = message.deleted_at != null;

  return (
    <View style={[styles.row, own ? styles.rowOwn : styles.rowOther]}>
      {!own && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.senderName}>
          {senderName}
        </ThemedText>
      )}
      <Pressable
        onLongPress={own && !deleted ? onLongPress : undefined}
        disabled={!own || deleted}>
        <ThemedView
          type={own ? 'backgroundSelected' : 'backgroundElement'}
          style={[
            styles.bubble,
            { borderColor: theme.border },
            own ? styles.bubbleOwn : styles.bubbleOther,
          ]}>
          {deleted ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.tombstone}>
              Message deleted
            </ThemedText>
          ) : (
            <ThemedText>{message.body}</ThemedText>
          )}
          {message.out_of_hours ? (
            <View style={styles.chipRow}>
              <Badge label="After hours" />
            </View>
          ) : null}
        </ThemedView>
      </Pressable>
      <ThemedText type="small" themeColor="textSecondary" style={styles.timestamp}>
        {formatTime(message.created_at)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: Spacing.three,
    maxWidth: '80%',
  },
  rowOwn: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  rowOther: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  senderName: {
    marginBottom: Spacing.half,
    marginHorizontal: Spacing.one,
  },
  bubble: {
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: TouchTarget.minimum,
  },
  bubbleOwn: {
    // Smaller corner reads as a speech-bubble "tail" pointing at the sender.
    // No dedicated micro-radius token exists yet — flagged in the handoff
    // (DESIGN.md §5); Radius.input is the closest existing value.
    borderBottomRightRadius: Radius.input,
  },
  bubbleOther: {
    borderBottomLeftRadius: Radius.input,
  },
  tombstone: {
    fontStyle: 'italic',
  },
  chipRow: {
    marginTop: Spacing.one,
    flexDirection: 'row',
  },
  timestamp: {
    marginTop: Spacing.half,
    marginHorizontal: Spacing.one,
  },
});
