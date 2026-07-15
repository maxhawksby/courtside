import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** Additive — defaults to 'primary'. Existing call sites are unaffected. */
  variant?: 'primary' | 'secondary' | 'destructive';
};

export function PrimaryButton({ label, onPress, disabled, variant = 'primary' }: PrimaryButtonProps) {
  const theme = useTheme();

  const backgroundColor =
    variant === 'secondary'
      ? theme.backgroundElement
      : variant === 'destructive'
        ? theme.danger
        : theme.tint;
  const labelColor = variant === 'secondary' ? theme.tint : theme.onTint;
  const borderColor = variant === 'secondary' ? theme.border : 'transparent';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor,
          borderColor,
          borderWidth: variant === 'secondary' ? StyleSheet.hairlineWidth : 0,
          opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
        },
      ]}>
      <ThemedText style={[styles.label, { color: labelColor }]}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.four,
    minHeight: TouchTarget.comfortable,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: Fonts.rounded,
    fontWeight: 700,
    fontSize: 17,
    lineHeight: 20,
  },
});
