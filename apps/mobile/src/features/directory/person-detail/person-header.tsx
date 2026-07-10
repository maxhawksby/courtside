import { StyleSheet, View } from 'react-native';
import { ageFromDateOfBirth, isMinor, PLAYER_LOGIN_MIN_AGE } from '@courtside/shared';
import type { PersonRow } from '@courtside/shared';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { PersonAvatar } from './avatar';

type PersonHeaderProps = {
  person: PersonRow;
  /** Effective media consent (getEffectiveConsent) — ignored for adults. */
  consent: boolean | undefined;
};

export function PersonHeader({ person, consent }: PersonHeaderProps) {
  const theme = useTheme();
  const minor = isMinor(person.date_of_birth);
  const age = ageFromDateOfBirth(person.date_of_birth);

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.row}>
        <PersonAvatar person={person} consent={consent} />
        <View style={styles.nameBlock}>
          <ThemedText type="subtitle">
            {person.first_name} {person.last_name}
          </ThemedText>
          {age != null || minor ? (
            <View style={styles.metaRow}>
              {age != null ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {age} yrs
                </ThemedText>
              ) : null}
              {minor ? (
                <View style={[styles.chip, { backgroundColor: theme.backgroundSelected }]}>
                  <ThemedText type="small">minor</ThemedText>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>

      {!minor && (person.email || person.phone) ? (
        <View style={styles.contactBlock}>
          {person.email ? <ThemedText themeColor="textSecondary">{person.email}</ThemedText> : null}
          {person.phone ? <ThemedText themeColor="textSecondary">{person.phone}</ThemedText> : null}
        </View>
      ) : null}

      {minor ? (
        <ThemedText type="small" themeColor="textSecondary">
          {(ageFromDateOfBirth(person.date_of_birth) ?? 0) < PLAYER_LOGIN_MIN_AGE
            ? 'Managed by guardians — players under 13 never have app logins.'
            : 'Managed with guardian oversight.'}
        </ThemedText>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  nameBlock: {
    flex: 1,
    gap: Spacing.half,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  chip: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  contactBlock: {
    gap: Spacing.half,
  },
});
