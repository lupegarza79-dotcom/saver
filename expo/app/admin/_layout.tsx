import { Stack } from 'expo-router';
import Colors from '@/constants/colors';

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.text,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Saver Admin',
        }}
      />
      <Stack.Screen
        name="inbox"
        options={{
          title: 'Inbox',
        }}
      />
      <Stack.Screen
        name="search"
        options={{
          title: 'Search',
        }}
      />
    </Stack>
  );
}
