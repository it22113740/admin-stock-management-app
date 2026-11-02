import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export function Banner({ text, tone }: { text: string; tone: 'ok' | 'bad' }) {
  const theme = useTheme();
  const background = tone === 'ok' ? theme.ink : theme.out;
  const color = tone === 'ok' ? theme.onInk : theme.onOut;

  return (
    <View pointerEvents="none" style={[styles.banner, { backgroundColor: background }]}>
      <Text style={[styles.text, { color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 16,
    borderRadius: 2,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  text: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
});
