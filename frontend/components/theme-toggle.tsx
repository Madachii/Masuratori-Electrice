import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { MoonStarIcon, SunIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

// Shows the theme a press switches to.
const THEME_ICONS = {
  light: MoonStarIcon,
  dark: SunIcon,
};

export function ThemeToggle() {
  const { colorScheme, toggleColorScheme } = useColorScheme();

  return (
    <Button
      onPressIn={toggleColorScheme}
      size="icon"
      variant="outline"
      className="rounded-full bg-card dark:bg-card"
      accessibilityLabel={colorScheme === 'dark' ? 'Temă luminoasă' : 'Temă întunecată'}>
      <Icon as={THEME_ICONS[colorScheme ?? 'light']} className="size-5" />
    </Button>
  );
}
