/**
 * R&G Hoops design tokens — the single source of truth for color, spacing,
 * radius, and touch sizing. Read docs/DESIGN.md for usage rules before
 * consuming (or adding) anything here. Inline hex outside this file is banned.
 */

import '@/global.css';

import { Platform } from 'react-native';

/**
 * Scheme-independent brand palette, sampled from the R&G Hoops logo.
 * Prefer the semantic `Colors` tokens below; reach for `Brand` only when a
 * color genuinely must not change between light and dark mode (e.g. the
 * blue hero gradient, overlays on photos).
 */
export const Brand = {
  /** Royal blue — the logo outline. The app's one interactive color. */
  primary: '#2148C8',
  primaryGradientStart: '#2E5AE0',
  primaryGradientEnd: '#18337F',
  /** Text/spinner rendered on a `primary` background. */
  onPrimary: '#ffffff',
  link: '#2148C8',
  /** Basketball orange — energy accent. */
  orange: '#F08019',
  /** Sunburst gold — celebration only. Never text on a light background. */
  gold: '#FDB515',
  danger: '#d92c2c',
  imagePlaceholder: '#00000010',
} as const;

export const Colors = {
  light: {
    text: '#1A1C20',
    textSecondary: '#5C6470',
    /** Warm off-white page; cards sit pure white on top of it. */
    background: '#F7F6F2',
    backgroundElement: '#FFFFFF',
    /** Soft brand-blue wash for selected rows/segments. */
    backgroundSelected: '#E9EEFB',
    border: '#E5E2DA',
    /** The ONE interactive color: primary buttons, links, active tab. */
    tint: Brand.primary,
    onTint: Brand.onPrimary,
    /** Energy accent: live/now indicators, unread badges, highlights. */
    accent: Brand.orange,
    /** Celebration only (records, achievements, Home sunrise). */
    gold: Brand.gold,
    danger: Brand.danger,
    success: '#1E8A4C',
  },
  dark: {
    text: '#F4F5F7',
    textSecondary: '#A8B0BF',
    /** Navy-black, not pure black, so the brand blue still reads. */
    background: '#0C1120',
    backgroundElement: '#171F33',
    backgroundSelected: '#22304F',
    border: '#2A3450',
    tint: '#8BA5FF',
    onTint: '#0C1120',
    accent: '#FF9A3D',
    gold: '#FFC94A',
    danger: '#FF6B5E',
    success: '#4CC38A',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` — titles and button labels. */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** Deliberate radius scale — not one radius everywhere. */
export const Radius = {
  /** Inputs and small chips. */
  input: 10,
  /** Cards and list rows. */
  card: 14,
  /** Modal sheets and large surfaces. */
  sheet: 20,
  /** Buttons and segmented controls. */
  pill: 999,
} as const;

/** Hit-area floors — this app's audience is older coaches. */
export const TouchTarget = {
  minimum: 44,
  comfortable: 50,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
