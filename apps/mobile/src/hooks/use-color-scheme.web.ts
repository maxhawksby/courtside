import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

// Never fires: hydration status can't change after mount, so there is nothing
// to subscribe to — useSyncExternalStore only needs the snapshot split below.
const emptySubscribe = () => () => {};

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  const colorScheme = useRNColorScheme();
  // Server/static snapshot is false, client snapshot is true: the first
  // client render matches the static markup ('light'), then hydration
  // re-renders with the real scheme.
  const hasHydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
}
