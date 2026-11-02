import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts } from '@/constants/theme';
import { rowDetail, stockLevel } from '@/inventory/format';
import type { StockLevel, StockRow } from '@/inventory/types';
import { useTheme } from '@/hooks/use-theme';

type StockTicketProps = {
  row: StockRow;
  busy: boolean;
  onOpen: (row: StockRow) => void;
  onAdd: (row: StockRow) => void;
  onRemove: (row: StockRow) => void;
};

export function StockTicket({ row, busy, onOpen, onAdd, onRemove }: StockTicketProps) {
  const theme = useTheme();
  const level = stockLevel(row.stock, row.isAvailable);
  const levelColor = colorForLevel(level, theme);
  const canChange = row.variantId !== null && !busy;
  const letter = row.name.trim().charAt(0).toUpperCase() || '?';

  return (
    <View style={[styles.row, { borderBottomColor: theme.line }]}>
      <View style={[styles.bar, { backgroundColor: levelColor }]} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${row.name}, ${row.stock} on hand`}
        onPress={() => onOpen(row)}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}>
        {row.imageUrl ? (
          <Image
            source={{ uri: row.imageUrl }}
            style={[styles.thumb, { backgroundColor: theme.backgroundElement }]}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.thumb, styles.monogram, { backgroundColor: theme.backgroundElement }]}>
            <Text style={[styles.letter, { color: theme.text }]}>{letter}</Text>
          </View>
        )}
        <View style={styles.copy}>
          <Text numberOfLines={1} style={[styles.name, { color: theme.text }]}>
            {row.name}
          </Text>
          <Text numberOfLines={1} style={[styles.detail, { color: theme.textSecondary }]}>
            {rowDetail(row)}
          </Text>
          {!row.isAvailable && row.stock > 0 ? (
            <Text style={[styles.hold, { color: theme.out }]}>Not for sale</Text>
          ) : null}
        </View>
      </Pressable>
      <View style={styles.stepper}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove one ${row.name}`}
          disabled={!canChange || row.stock <= 0}
          onPress={() => onRemove(row)}
          style={({ pressed }) => [
            styles.step,
            { borderColor: theme.line, backgroundColor: theme.surface },
            pressed && styles.pressed,
            (!canChange || row.stock <= 0) && styles.disabled,
          ]}>
          <Text style={[styles.stepLabel, { color: theme.text }]}>−</Text>
        </Pressable>
        <Text
          accessibilityLabel={`${row.stock} on hand`}
          style={[styles.qty, { color: levelColor }]}>
          {row.stock}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Add one ${row.name}`}
          disabled={!canChange}
          onPress={() => onAdd(row)}
          style={({ pressed }) => [
            styles.step,
            { borderColor: theme.line, backgroundColor: theme.surface },
            pressed && styles.pressed,
            !canChange && styles.disabled,
          ]}>
          <Text style={[styles.stepLabel, { color: theme.text }]}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

function colorForLevel(
  level: StockLevel,
  theme: { good: string; low: string; out: string },
): string {
  if (level === 'out') {
    return theme.out;
  }
  if (level === 'low') {
    return theme.low;
  }
  return theme.good;
}

const styles = StyleSheet.create({
  row: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bar: {
    width: 3,
    alignSelf: 'stretch',
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 8,
  },
  pressed: {
    opacity: 0.55,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 2,
  },
  monogram: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    fontFamily: Fonts.rounded,
    fontSize: 18,
    fontWeight: '700',
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600',
  },
  detail: {
    fontSize: 13,
    lineHeight: 18,
  },
  hold: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
    gap: 2,
  },
  step: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 12,
  },
  stepLabel: {
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '500',
  },
  qty: {
    minWidth: 36,
    textAlign: 'center',
    fontFamily: Fonts.rounded,
    fontSize: 22,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  disabled: {
    opacity: 0.35,
  },
});
