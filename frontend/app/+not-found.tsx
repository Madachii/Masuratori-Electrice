import { Link, Stack } from 'expo-router';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Pagină inexistentă' }} />
      <View>
        <Text>Pagina nu există.</Text>

        <Link href="/">
          <Text>Înapoi la pagina principală</Text>
        </Link>
      </View>
    </>
  );
}
