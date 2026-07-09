import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { CreateOrganizationForm } from '@/features/org/create-organization-form';
import { useAuth } from '@/lib/auth';
import { useOrg } from '@/lib/org-context';

export default function HomeScreen() {
  const { signOut } = useAuth();
  const { activeOrg, loading } = useOrg();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {loading ? (
          <ThemedView style={styles.center}>
            <ActivityIndicator />
          </ThemedView>
        ) : !activeOrg ? (
          <CreateOrganizationForm />
        ) : (
          <ThemedView style={styles.welcome}>
            <ThemedText type="title" style={styles.title}>
              {activeOrg.name}
            </ThemedText>
            <ThemedText themeColor="textSecondary">Welcome back to Courtside.</ThemedText>

            <Pressable style={styles.button} onPress={signOut}>
              <ThemedText style={styles.buttonText}>Sign out</ThemedText>
            </Pressable>
          </ThemedView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcome: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: Spacing.three,
  },
  title: {
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#208AEF',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.three,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
