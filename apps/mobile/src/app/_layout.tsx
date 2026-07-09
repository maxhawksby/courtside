import { DarkTheme, DefaultTheme, Slot, ThemeProvider } from 'expo-router';
import { ActivityIndicator, useColorScheme } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { AuthProvider, useAuth } from '@/lib/auth';
import { OrgProvider } from '@/lib/org-context';

/**
 * The root layout must ALWAYS render an outlet (<Slot/>) once auth state is
 * known — expo-router's <Redirect> renders null and only swaps the route, so
 * redirect decisions live in the (auth)/(app) group layouts, which the root
 * Slot then mounts. A Redirect-only return here would blank the app.
 */
function Gate() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <OrgProvider>
          <Gate />
        </OrgProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
