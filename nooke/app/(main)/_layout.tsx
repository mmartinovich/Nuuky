import { Stack } from 'expo-router';

export default function MainLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitleVisible: false,
        headerStyle: {
          backgroundColor: '#0a0a20',
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 20,
          color: '#ffffff',
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="profile"
        options={{
          title: 'Profile',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          title: 'Settings',
        }}
      />
      <Stack.Screen
        name="friends"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="rooms"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="room/[id]"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
