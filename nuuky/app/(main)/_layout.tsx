import { Stack } from "expo-router";
import { useTheme } from "../../hooks/useTheme";

export default function MainLayout() {
  const { theme } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitleVisible: false,
        headerStyle: {
          backgroundColor: theme.colors.bg.secondary,
        },
        headerTintColor: theme.colors.text.primary,
        headerTitleStyle: {
          fontWeight: "600",
          fontSize: 20,
          color: theme.colors.text.primary,
        },
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: theme.colors.bg.primary,
        },
        animation: "slide_from_right",
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
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          headerShown: false,
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
        name="notifications"
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
      <Stack.Screen
        name="safety"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="qr-scanner"
        options={{
          headerShown: false,
          animation: "slide_from_bottom",
        }}
      />
    </Stack>
  );
}
