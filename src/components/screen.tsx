import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';

export function Screen({ children }: { children: ReactNode }) {
  const theme = useTheme();

  return (
    <View style={[styles.outer, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.inner} edges={['top', 'bottom', 'left', 'right']}>
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    alignItems: 'center',
  },
  inner: {
    flex: 1,
    width: '100%',
    maxWidth: 520,
  },
});
