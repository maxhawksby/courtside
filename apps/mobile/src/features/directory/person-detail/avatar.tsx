import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import type { PersonRow } from '@courtside/shared';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { canRenderMedia } from '@/lib/data';

type PersonAvatarProps = {
  person: Pick<PersonRow, 'first_name' | 'last_name' | 'date_of_birth' | 'photo_path'>;
  /** Effective media consent (getEffectiveConsent). Ignored for non-minors. */
  consent: boolean | undefined;
  size?: number;
};

/**
 * THE avatar renderer for person-detail (docs/COMPLIANCE.md §5). Every place
 * this feature could show a person's photo goes through canRenderMedia here —
 * no other component in person-detail/ may read person.photo_path directly.
 * When the gate returns false (or there's no photo), renders initials instead.
 */
export function PersonAvatar({ person, consent, size = 64 }: PersonAvatarProps) {
  const theme = useTheme();
  const dimStyle = { width: size, height: size, borderRadius: size / 2 };
  const canShowPhoto = canRenderMedia(person, consent) && !!person.photo_path;

  if (canShowPhoto) {
    return (
      <Image
        source={{ uri: person.photo_path as string }}
        style={[styles.image, dimStyle]}
        contentFit="cover"
        accessibilityLabel={`${person.first_name} ${person.last_name}`}
      />
    );
  }

  const initials =
    `${person.first_name.charAt(0)}${person.last_name.charAt(0)}`.toUpperCase() || '?';

  return (
    <View style={[styles.initials, dimStyle, { backgroundColor: theme.backgroundSelected }]}>
      <ThemedText type="smallBold">{initials}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: '#00000010',
  },
  initials: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
