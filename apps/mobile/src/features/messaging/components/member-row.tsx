import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { UserProfileWithPerson } from '@/lib/data';

function displayName(profile: UserProfileWithPerson): string {
  const person = profile.persons;
  if (!person) return 'Unnamed member';
  return `${person.first_name} ${person.last_name}`;
}

type MemberRowProps = {
  profile: UserProfileWithPerson;
  onPress: () => void;
  /** Multi-select highlight (team-channel mode). Omit for a plain tappable row. */
  selected?: boolean;
  /** Row-level busy state, e.g. while opening a DM. */
  busy?: boolean;
  /** Inline guidance rendered under the row — MinorRequiresGuardianError.message, etc. */
  errorText?: string | null;
};

export function MemberRow({ profile, onPress, selected, busy, errorText }: MemberRowProps) {
  const theme = useTheme();
  return (
    <View>
      <Pressable onPress={onPress} disabled={busy} hitSlop={4}>
        {({ pressed }) => (
          <ThemedView
            type={selected ? 'backgroundSelected' : 'backgroundElement'}
            style={[styles.row, { borderColor: theme.border }, pressed && styles.pressed]}>
            <ThemedText>{displayName(profile)}</ThemedText>
            {busy ? <ActivityIndicator /> : null}
          </ThemedView>
        )}
      </Pressable>
      {errorText ? (
        <ThemedText type="small" style={[styles.error, { color: theme.danger }]}>
          {errorText}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    minHeight: TouchTarget.minimum,
    marginBottom: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  error: {
    marginTop: -Spacing.one,
    marginBottom: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
});
