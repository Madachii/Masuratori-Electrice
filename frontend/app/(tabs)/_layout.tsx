import { useMeterContext } from '@/hooks/meter-context';
import { THEME } from '@/lib/theme';
import { Tabs } from 'expo-router/tabs';
import { GaugeIcon, HouseIcon, ListIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { Platform } from 'react-native';

export default function TabsLayout() {
  const { colorScheme } = useColorScheme();
  const t = THEME[colorScheme ?? 'light'];
  const { errors } = useMeterContext();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.primary,
        tabBarInactiveTintColor: t.mutedForeground,
        tabBarStyle: {
          backgroundColor: t.card,
          borderTopColor: t.border,
          // On web the bar has no safe-area inset and is otherwise too short for icon and label.
          ...(Platform.OS === 'web' ? { height: 68, paddingTop: 4, paddingBottom: 4 } : null),
        },
        tabBarLabelStyle: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
        tabBarBadgeStyle: {
          backgroundColor: t.destructive,
          color: t.destructiveForeground,
          fontSize: 11,
          fontWeight: '700',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Acasă',
          tabBarIcon: ({ color, size }) => <HouseIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="marimi"
        options={{
          title: 'Mărimi',
          tabBarIcon: ({ color, size }) => <ListIcon color={color} size={size} />,
          tabBarBadge: errors.length > 0 ? errors.length : undefined,
        }}
      />
      <Tabs.Screen
        name="contoare"
        options={{
          title: 'Contoare',
          tabBarIcon: ({ color, size }) => <GaugeIcon color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
