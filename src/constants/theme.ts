/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1F2328',
    background: '#F7F4F2',
    backgroundElement: '#E8E0DC',
    backgroundSelected: '#DDD4CF',
    textSecondary: '#5E564F',
    surface: '#FFFFFF',
    line: '#E6DDD8',
    ink: '#B42318',
    onInk: '#FFFFFF',
    good: '#1A6B43',
    low: '#8F5A12',
    out: '#9E3B34',
    onOut: '#FFF7F5',
  },
  dark: {
    text: '#F6F1EE',
    background: '#141110',
    backgroundElement: '#2C2624',
    backgroundSelected: '#3A322F',
    textSecondary: '#B3A8A2',
    surface: '#211C1A',
    line: '#3A322F',
    ink: '#B42318',
    onInk: '#FFFFFF',
    good: '#8FCBB0',
    low: '#E2B15A',
    out: '#E08B84',
    onOut: '#2A1210',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
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

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
