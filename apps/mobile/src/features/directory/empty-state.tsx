import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type EmptyStateProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  return (
    <ThemedView style={styles.wrap}>
      <ThemedText type="subtitle" style={styles.centerText}>
        {title}
      </ThemedText>
      {subtitle ? (
        <ThemedText themeColor="textSecondary" style={styles.centerText}>
          {subtitle}
        </ThemedText>
      ) : null}
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <ThemedText type="linkPrimary">{actionLabel}</ThemedText>
        </Pressable>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  centerText: {
    textAlign: 'center',
  },
});
