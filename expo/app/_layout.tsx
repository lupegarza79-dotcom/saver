import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppProvider } from "@/contexts/AppContext";
import { AnalyticsProvider } from "@/contexts/AnalyticsContext";
import { SaverProvider } from "@/contexts/SaverContext";
import { trpc, trpcClient } from "@/lib/trpc";
import { SafeAreaProvider } from "react-native-safe-area-context";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0A1120' },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="quote-form"
        options={{
          headerShown: true,
          headerTitle: 'Get a Quote',
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: '#0A1120' },
          headerTintColor: '#F0F4F8',
        }}
      />
      <Stack.Screen
        name="upload-document"
        options={{
          headerShown: true,
          headerTitle: 'Upload Policy',
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: '#0A1120' },
          headerTintColor: '#F0F4F8',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="upload-policy"
        options={{
          headerShown: true,
          headerTitle: 'Upload Policy',
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: '#0A1120' },
          headerTintColor: '#F0F4F8',
        }}
      />
      <Stack.Screen
        name="quote-submitted"
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="modal"
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="agents"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="referral"
        options={{
          headerShown: true,
          headerTitle: 'Refer a Friend',
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: '#0A1120' },
          headerTintColor: '#F0F4F8',
        }}
      />
      <Stack.Screen
        name="admin"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ops"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="retention"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <SafeAreaProvider>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1, width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
            <AppProvider>
              <SaverProvider>
                <AnalyticsProvider>
                  <RootLayoutNav />
                </AnalyticsProvider>
              </SaverProvider>
            </AppProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </trpc.Provider>
    </SafeAreaProvider>
  );
}
