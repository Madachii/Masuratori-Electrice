import { DarkTheme, DefaultTheme, type Theme } from 'expo-router/react-navigation';

// Mirrors the CSS variables in global.css, for places that need a plain color string (navigation, SVG).
export const THEME = {
  light: {
    background: 'hsl(220 14% 96%)',
    foreground: 'hsl(222 18% 11%)',
    card: 'hsl(0 0% 100%)',
    primary: 'hsl(224 76% 53%)',
    primarySoft: 'hsl(224 90% 95%)',
    muted: 'hsl(220 13% 93%)',
    mutedForeground: 'hsl(220 9% 42%)',
    destructive: 'hsl(0 70% 46%)',
    destructiveForeground: 'hsl(0 0% 100%)',
    border: 'hsl(220 13% 89%)',
    ok: 'hsl(142 64% 30%)',
  },
  dark: {
    background: 'hsl(225 14% 6%)',
    foreground: 'hsl(220 15% 94%)',
    card: 'hsl(222 13% 11%)',
    primary: 'hsl(226 88% 70%)',
    primarySoft: 'hsl(226 45% 19%)',
    muted: 'hsl(222 11% 17%)',
    mutedForeground: 'hsl(220 8% 62%)',
    destructive: 'hsl(0 85% 68%)',
    destructiveForeground: 'hsl(225 14% 8%)',
    border: 'hsl(222 10% 19%)',
    ok: 'hsl(142 60% 55%)',
  },
};

export const NAV_THEME: Record<'light' | 'dark', Theme> = {
  light: {
    ...DefaultTheme,
    colors: {
      background: THEME.light.background,
      border: THEME.light.border,
      card: THEME.light.card,
      notification: THEME.light.destructive,
      primary: THEME.light.primary,
      text: THEME.light.foreground,
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      background: THEME.dark.background,
      border: THEME.dark.border,
      card: THEME.dark.card,
      notification: THEME.dark.destructive,
      primary: THEME.dark.primary,
      text: THEME.dark.foreground,
    },
  },
};
