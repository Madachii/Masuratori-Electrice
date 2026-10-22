import { DarkTheme, DefaultTheme, type Theme } from 'expo-router/react-navigation';

// Mirrors the CSS variables in global.css, for places that need a plain color string (navigation, SVG).
export const THEME = {
  light: {
    background: 'hsl(37 27% 95%)',
    foreground: 'hsl(240 7% 11%)',
    card: 'hsl(0 0% 100%)',
    cardForeground: 'hsl(240 7% 11%)',
    primary: 'hsl(240 7% 11%)',
    primaryForeground: 'hsl(37 27% 95%)',
    muted: 'hsl(37 18% 90%)',
    mutedForeground: 'hsl(240 4% 40%)',
    accent: 'hsl(18 90% 48%)',
    destructive: 'hsl(0 72% 48%)',
    border: 'hsl(37 15% 85%)',
    ok: 'hsl(152 45% 32%)',
  },
  dark: {
    background: 'hsl(240 8% 8%)',
    foreground: 'hsl(37 20% 93%)',
    card: 'hsl(240 7% 12%)',
    cardForeground: 'hsl(37 20% 93%)',
    primary: 'hsl(37 20% 93%)',
    primaryForeground: 'hsl(240 8% 8%)',
    muted: 'hsl(240 6% 17%)',
    mutedForeground: 'hsl(240 5% 62%)',
    accent: 'hsl(18 90% 56%)',
    destructive: 'hsl(0 62% 55%)',
    border: 'hsl(240 6% 20%)',
    ok: 'hsl(152 40% 50%)',
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