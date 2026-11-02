import { StyleSheet, View } from 'react-native';

import { isLightSwatch } from '@/inventory/format';

export function Swatch({ hex, label }: { hex: string; label?: string }) {
  return (
    <View
      accessibilityLabel={label}
      style={[styles.swatch, { backgroundColor: hex }, isLightSwatch(hex) && styles.edge]}
    />
  );
}

const styles = StyleSheet.create({
  swatch: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  edge: {
    borderWidth: 1,
    borderColor: 'rgba(31, 35, 40, 0.28)',
  },
});
