import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Line, RadialGradient, Rect, Stop } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/ui/primary-button';
import { BottomTabInset, MaxContentWidth, Spacing, TouchTarget } from '@/constants/theme';
import { CreateOrganizationForm } from '@/features/org/create-organization-form';
import { useAuth } from '@/lib/auth';
import { useOrg } from '@/lib/org-context';
import { useTheme } from '@/hooks/use-theme';

/**
 * Staggered entrance for Home's sections — a timing-based fade+rise, never a
 * spring, so nothing overshoots. ~40ms cascades per item, per DESIGN.md §4.
 */
const STAGGER_STEP_MS = 40;
const ENTRANCE_DURATION_MS = 280;

function enter(index: number) {
  return FadeInDown.duration(ENTRANCE_DURATION_MS)
    .delay(index * STAGGER_STEP_MS)
    .easing(Easing.out(Easing.cubic));
}

/**
 * The app's one signature moment (DESIGN.md §4b): a soft gold sunrise arc
 * behind the Home greeting — the logo's sunburst, "Rise and Grind" made
 * literal. Low-saturation, sits behind content, tuned to read in both
 * schemes via the per-scheme `gold` token.
 */
const SUNRISE_VIEWBOX_WIDTH = 400;
const SUNRISE_VIEWBOX_HEIGHT = 200;
const SUNRISE_CENTER_X = SUNRISE_VIEWBOX_WIDTH / 2;
const SUNRISE_CENTER_Y = SUNRISE_VIEWBOX_HEIGHT + 15;
const SUNRISE_RAY_ANGLES = [200, 214, 228, 242, 256, 270, 284, 298, 312, 326, 340];
const SUNRISE_RAY_LENGTHS = [92, 108, 96, 112, 100, 118, 100, 112, 96, 108, 92];
const SUNRISE_RAYS = SUNRISE_RAY_ANGLES.map((degrees, index) => {
  const radians = (degrees * Math.PI) / 180;
  const length = SUNRISE_RAY_LENGTHS[index];
  return {
    x1: SUNRISE_CENTER_X + 42 * Math.cos(radians),
    y1: SUNRISE_CENTER_Y + 42 * Math.sin(radians),
    x2: SUNRISE_CENTER_X + length * Math.cos(radians),
    y2: SUNRISE_CENTER_Y + length * Math.sin(radians),
  };
});

function HomeSunrise() {
  const theme = useTheme();

  return (
    <Svg
      pointerEvents="none"
      width="100%"
      height={SUNRISE_VIEWBOX_HEIGHT}
      viewBox={`0 0 ${SUNRISE_VIEWBOX_WIDTH} ${SUNRISE_VIEWBOX_HEIGHT}`}
      style={styles.sunrise}>
      <Defs>
        <RadialGradient id="sunriseGlow" cx="50%" cy="107%" r="70%">
          <Stop offset="0%" stopColor={theme.gold} stopOpacity={0.3} />
          <Stop offset="100%" stopColor={theme.gold} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={SUNRISE_VIEWBOX_WIDTH} height={SUNRISE_VIEWBOX_HEIGHT} fill="url(#sunriseGlow)" />
      {SUNRISE_RAYS.map((ray, index) => (
        <Line
          key={index}
          x1={ray.x1}
          y1={ray.y1}
          x2={ray.x2}
          y2={ray.y2}
          stroke={theme.gold}
          strokeWidth={2}
          strokeLinecap="round"
          strokeOpacity={0.14}
        />
      ))}
    </Svg>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const { activeOrg, loading } = useOrg();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <HomeSunrise />

        {/* Absolute position ignores the safe-area padding, so offset by the inset. */}
        <Pressable
          style={[styles.settingsButton, { top: insets.top + Spacing.two }]}
          accessibilityLabel="Settings"
          onPress={() => router.push('/settings')}>
          <Ionicons name="settings-outline" size={24} color={theme.text} />
        </Pressable>
        {loading ? (
          <ThemedView style={styles.center}>
            <ActivityIndicator color={theme.tint} />
          </ThemedView>
        ) : !activeOrg ? (
          <CreateOrganizationForm />
        ) : (
          <ThemedView style={styles.welcome}>
            <Animated.View entering={enter(0)}>
              <ThemedText type="title" style={styles.title}>
                {activeOrg.name}
              </ThemedText>
            </Animated.View>
            <Animated.View entering={enter(1)}>
              <ThemedText themeColor="textSecondary">Welcome back to Courtside.</ThemedText>
            </Animated.View>
            <Animated.View style={styles.buttonWrap} entering={enter(2)}>
              <PrimaryButton variant="secondary" label="Sign out" onPress={signOut} />
            </Animated.View>
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
  sunrise: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsButton: {
    position: 'absolute',
    right: Spacing.three,
    zIndex: 1,
    minWidth: TouchTarget.minimum,
    minHeight: TouchTarget.minimum,
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
  buttonWrap: {
    marginTop: Spacing.three,
    alignSelf: 'center',
  },
});
