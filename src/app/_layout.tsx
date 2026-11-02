import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from '@/auth/auth-context';
import { BrandProvider } from '@/brand/brand-context';
import { Screen } from '@/components/screen';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  return (
    <BrandProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </BrandProvider>
  );
}

function RootNavigator() {
  const { status } = useAuth();
  const scheme = useColorScheme();
  const theme = useTheme();
  const signedIn = status === 'signedIn';

  useEffect(() => {
    if (status !== 'loading') {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [status]);

  if (status === 'loading') {
    return (
      <>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <Screen>
          <View style={styles.boot}>
            <Text style={[styles.word, { color: theme.text }]}>Stock</Text>
            <ActivityIndicator color={theme.ink} />
          </View>
        </Screen>
      </>
    );
  }

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: theme.background },
        }}>
        <Stack.Protected guard={signedIn} redirectTo="/login">
          <Stack.Screen name="index" />
          <Stack.Screen name="stock/[productId]" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn} redirectTo="/">
          <Stack.Screen name="login" options={{ animation: 'fade' }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 18,
  },
  word: {
    fontFamily: Fonts.rounded,
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '700',
  },
});
