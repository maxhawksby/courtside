import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

const LINK_TYPES = new Set(['link', 'linkPrimary']);

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const color = theme[themeColor ?? (LINK_TYPES.has(type) ? 'tint' : 'text')];

  return (
    <Text
      style={[
        { color },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: 500,
  },
  smallBold: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: 700,
  },
  default: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: 400,
  },
  title: {
    fontSize: 48,
    lineHeight: 52,
    fontWeight: 800,
    fontFamily: Fonts.rounded,
  },
  subtitle: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: 700,
    fontFamily: Fonts.rounded,
  },
  link: {
    fontSize: 17,
    lineHeight: 24,
  },
  linkPrimary: {
    fontSize: 17,
    lineHeight: 24,
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
