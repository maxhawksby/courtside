import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import type { ChannelRow, MessageRow } from '@courtside/shared';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { MembersSheet } from '@/features/messaging/components/members-sheet';
import { MessageBubble } from '@/features/messaging/components/message-bubble';
import {
  listChannelMembers,
  listChannels,
  listMessages,
  markChannelRead,
  sendMessage,
  setChannelMuted,
  softDeleteMessage,
  type ChannelMemberWithPerson,
} from '@/lib/data';
import { useAuth } from '@/lib/auth';
import { useOrg } from '@/lib/org-context';
import { useTheme } from '@/hooks/use-theme';

const PAGE_SIZE = 50;

export default function ChannelDetailScreen() {
  const params = useLocalSearchParams<{ channelId: string }>();
  const channelId = Array.isArray(params.channelId) ? params.channelId[0] : params.channelId;
  const theme = useTheme();
  const { activeOrg } = useOrg();
  const { user } = useAuth();

  const [channel, setChannel] = useState<ChannelRow | null>(null);
  const [members, setMembers] = useState<ChannelMemberWithPerson[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const [membersVisible, setMembersVisible] = useState(false);
  const [muted, setMuted] = useState(false);

  // Loading is derived: the screen is loading until the fetch for the current
  // org/channel/user combination settles, so the effect never sets state
  // synchronously. If the guard below keeps us from fetching, this stays true
  // forever — same as the previous behavior.
  const userId = user?.id;
  const loadKey = `${activeOrg?.id ?? ''}|${channelId ?? ''}|${userId ?? ''}`;
  const [settledLoadKey, setSettledLoadKey] = useState<string | null>(null);
  const loading = settledLoadKey !== loadKey;

  useEffect(() => {
    if (!activeOrg || !channelId) return;
    let cancelled = false;
    Promise.all([
      listChannels(activeOrg.id),
      listChannelMembers(channelId),
      listMessages(channelId, { limit: PAGE_SIZE }),
    ])
      .then(([channels, memberRows, messageRows]) => {
        if (cancelled) return;
        const found = channels.find((c) => c.id === channelId) ?? null;
        setChannel(found);
        setMembers(memberRows);
        setMessages(messageRows);
        setHasMore(messageRows.length === PAGE_SIZE);
        const mine = memberRows.find((m) => m.user_id === userId);
        setMuted(mine?.muted ?? false);
        setError(found ? null : 'Channel not found');
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load channel');
      })
      .finally(() => {
        if (!cancelled) setSettledLoadKey(loadKey);
      });
    return () => {
      cancelled = true;
    };
  }, [activeOrg, channelId, userId, loadKey]);

  // Mark read once per channel visit.
  useEffect(() => {
    if (!channelId) return;
    markChannelRead(channelId).catch(() => {});
  }, [channelId]);

  const memberNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of members) {
      const person = m.user_profiles?.persons;
      map.set(m.user_id, person ? `${person.first_name} ${person.last_name}` : 'Unnamed member');
    }
    return map;
  }, [members]);

  const loadOlder = useCallback(async () => {
    if (!channelId || loadingOlder || !hasMore || messages.length === 0) return;
    setLoadingOlder(true);
    try {
      const oldest = messages[messages.length - 1];
      const older = await listMessages(channelId, { before: oldest.created_at, limit: PAGE_SIZE });
      setHasMore(older.length === PAGE_SIZE);
      if (older.length > 0) setMessages((prev) => [...prev, ...older]);
    } catch {
      // Silent — pull-to-refresh / reopening the channel will retry.
    } finally {
      setLoadingOlder(false);
    }
  }, [channelId, hasMore, loadingOlder, messages]);

  const reloadLatest = useCallback(async () => {
    if (!channelId) return;
    const fresh = await listMessages(channelId, { limit: PAGE_SIZE });
    setMessages((prev) => {
      const oldestFresh = fresh[fresh.length - 1]?.created_at;
      const older = oldestFresh ? prev.filter((m) => m.created_at < oldestFresh) : [];
      return [...fresh, ...older];
    });
  }, [channelId]);

  const handleSend = async () => {
    if (!activeOrg || !channelId || !draft.trim()) return;
    setSending(true);
    setSendError(null);
    try {
      await sendMessage(activeOrg.id, channelId, draft.trim());
      setDraft('');
      await reloadLatest();
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Could not send message');
    } finally {
      setSending(false);
    }
  };

  const confirmDelete = (message: MessageRow) => {
    Alert.alert('Delete message?', 'This removes the message for everyone. It cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => void handleDelete(message.id),
      },
    ]);
  };

  const handleDelete = async (messageId: string) => {
    try {
      const updated = await softDeleteMessage(messageId);
      setMessages((prev) => prev.map((m) => (m.id === messageId ? updated : m)));
    } catch (e) {
      Alert.alert('Could not delete message', e instanceof Error ? e.message : 'Please try again.');
    }
  };

  const handleToggleMute = async () => {
    if (!channelId) return;
    const next = !muted;
    setMuted(next);
    try {
      await setChannelMuted(channelId, next);
    } catch (e) {
      setMuted(!next);
      Alert.alert('Could not update mute setting', e instanceof Error ? e.message : 'Please try again.');
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <Stack.Screen options={{ title: 'Channel' }} />
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (error || !channel) {
    return (
      <ThemedView style={styles.centered}>
        <Stack.Screen options={{ title: 'Channel' }} />
        <ThemedText themeColor="textSecondary">{error ?? 'Channel not found'}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <ThemedView style={styles.flex}>
        <Stack.Screen
          options={{
            title: channel.name,
            headerRight: () => (
              <View style={styles.headerActions}>
                <Pressable onPress={() => setMembersVisible(true)} hitSlop={8}>
                  <ThemedText type="linkPrimary">Members</ThemedText>
                </Pressable>
                <Pressable onPress={() => void handleToggleMute()} hitSlop={8}>
                  <ThemedText type="linkPrimary">{muted ? 'Unmute' : 'Mute'}</ThemedText>
                </Pressable>
              </View>
            ),
          }}
        />

        <FlatList
          data={messages}
          inverted
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          onEndReached={() => void loadOlder()}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingOlder ? <ActivityIndicator style={styles.olderSpinner} /> : null}
          renderItem={({ item }) => {
            const own = item.sender_user_id === user?.id;
            return (
              <MessageBubble
                message={item}
                own={own}
                senderName={memberNameById.get(item.sender_user_id) ?? 'Member'}
                onLongPress={() => confirmDelete(item)}
              />
            );
          }}
        />

        <View style={styles.composerRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Message"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            multiline
          />
          <Pressable onPress={() => void handleSend()} disabled={sending || !draft.trim()} hitSlop={8}>
            <ThemedText type="linkPrimary" style={(sending || !draft.trim()) && styles.sendDisabled}>
              {sending ? 'Sending…' : 'Send'}
            </ThemedText>
          </Pressable>
        </View>
        {sendError ? (
          <ThemedText type="small" style={styles.sendError}>
            {sendError}
          </ThemedText>
        ) : null}

        <MembersSheet
          visible={membersVisible}
          onClose={() => setMembersVisible(false)}
          members={members}
          myUserId={user?.id ?? null}
        />
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  listContent: {
    padding: Spacing.four,
  },
  olderSpinner: {
    marginVertical: Spacing.three,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  input: {
    flex: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    maxHeight: 120,
  },
  sendDisabled: {
    opacity: 0.4,
  },
  sendError: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
});
