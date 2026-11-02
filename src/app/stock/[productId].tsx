import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Banner } from '@/components/banner';
import { Screen } from '@/components/screen';
import { Swatch } from '@/components/swatch';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  adjustStock,
  decreaseStock,
  fetchProduct,
  increaseStock,
  listStockHistory,
} from '@/inventory/api';
import {
  colourLabel,
  colourOptionName,
  formatChange,
  formatOptions,
  formatWhen,
  parseWhole,
  reasonLabel,
  stockLevel,
  swatchFor,
} from '@/inventory/format';
import type {
  Notice,
  Product,
  ProductOptionType,
  StockChangeReason,
  StockHistoryItem,
  Variant,
} from '@/inventory/types';
import { ADD_REASONS, REMOVE_REASONS, SET_REASONS } from '@/inventory/types';
import { messageFrom, type PaginationMeta } from '@/lib/api';
import { hapticError, hapticSelection, hapticSuccess } from '@/lib/haptics';

type Mode = 'add' | 'remove' | 'set';

const MODES: { id: Mode; label: string }[] = [
  { id: 'add', label: 'Add' },
  { id: 'remove', label: 'Remove' },
  { id: 'set', label: 'Set' },
];

function one(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

function reasonsFor(mode: Mode): StockChangeReason[] {
  if (mode === 'add') {
    return ADD_REASONS;
  }
  if (mode === 'remove') {
    return REMOVE_REASONS;
  }
  return SET_REASONS;
}

function defaultReason(mode: Mode): StockChangeReason {
  return reasonsFor(mode)[0];
}

function SelectedMeta({
  variant,
  colourName,
  optionTypes,
  color,
}: {
  variant: Variant;
  colourName: string | null;
  optionTypes?: readonly ProductOptionType[];
  color: string;
}) {
  const hex = swatchFor(variant.options, variant.swatchHex, colourName, optionTypes);
  const colour = colourLabel(variant.options, colourName);
  const text = [hex ? '' : colour, formatOptions(variant.options, colourName), variant.sku]
    .filter(Boolean)
    .join(', ');

  if (!hex && !text) {
    return null;
  }

  return (
    <View style={styles.meta}>
      {hex ? <Swatch hex={hex} label={colour} /> : null}
      {text ? <Text style={[styles.metaText, { color }]}>{text}</Text> : null}
    </View>
  );
}

export default function StockDetailScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ productId: string; variantId?: string }>();
  const productId = one(params.productId);
  const requestedVariant = one(params.variantId);

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(requestedVariant || null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('add');
  const [amount, setAmount] = useState('1');
  const [newQty, setNewQty] = useState('0');
  const [reason, setReason] = useState<StockChangeReason>('RESTOCK');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [history, setHistory] = useState<StockHistoryItem[]>([]);
  const [historyMeta, setHistoryMeta] = useState<PaginationMeta | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const colourName = product
    ? colourOptionName(
        product.variants.map((variant) => variant.options),
        product.optionTypes,
      )
    : null;
  const selected = product?.variants.find((item) => item.id === selectedId) ?? null;
  const level = stockLevel(selected?.stock ?? 0, selected?.isAvailable ?? false);
  const levelColor = level === 'out' ? theme.out : level === 'low' ? theme.low : theme.good;

  useEffect(() => {
    if (!notice) {
      return;
    }
    const timer = setTimeout(() => setNotice(null), 2200);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!productId) {
      setLoadError('Missing product.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    fetchProduct(productId)
      .then((item) => {
        if (cancelled) {
          return;
        }
        setProduct(item);
        setSelectedId((current) => {
          if (current && item.variants.some((variant) => variant.id === current)) {
            return current;
          }
          if (requestedVariant && item.variants.some((variant) => variant.id === requestedVariant)) {
            return requestedVariant;
          }
          return item.variants[0]?.id ?? null;
        });
      })
      .catch((caught) => {
        if (!cancelled) {
          setLoadError(messageFrom(caught, 'Unable to load stock'));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [productId, requestedVariant]);

  useEffect(() => {
    const variant = product?.variants.find((item) => item.id === selectedId);
    if (!variant) {
      return;
    }
    setNewQty(String(variant.stock));
    setAmount('1');
    setFormError(null);
  }, [product, selectedId]);

  useEffect(() => {
    if (!productId || !selectedId) {
      setHistory([]);
      return;
    }

    let cancelled = false;
    setHistoryLoading(true);
    listStockHistory(productId, selectedId, { page: 1, limit: 20 })
      .then((result) => {
        if (cancelled) {
          return;
        }
        setHistory(result.data);
        setHistoryMeta(result.meta);
        setHistoryPage(1);
      })
      .catch((caught) => {
        if (!cancelled) {
          setNotice({ text: messageFrom(caught, 'Unable to load history'), tone: 'bad' });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [productId, selectedId, reloadToken]);

  function goBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }

  function chooseMode(next: Mode) {
    if (next === mode) {
      return;
    }
    hapticSelection();
    setMode(next);
    setReason(defaultReason(next));
    setFormError(null);
  }

  function chooseVariant(variant: Variant) {
    if (variant.id === selectedId) {
      return;
    }
    hapticSelection();
    setSelectedId(variant.id);
    setMode('add');
    setReason('RESTOCK');
  }

  function changeAmount(delta: number) {
    const current = parseWhole(amount) ?? 0;
    const next = Math.max(1, current + delta);
    setAmount(String(next));
    setFormError(null);
  }

  const parsedAmount = parseWhole(amount);
  const parsedQty = parseWhole(newQty);
  const canSubmit = (() => {
    if (saving || !selected) {
      return false;
    }
    if (mode === 'set') {
      return parsedQty !== null && parsedQty !== selected.stock;
    }
    if (parsedAmount === null || parsedAmount < 1) {
      return false;
    }
    if (mode === 'remove' && parsedAmount > selected.stock) {
      return false;
    }
    return true;
  })();

  async function submit() {
    if (!selected || !canSubmit) {
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const result =
        mode === 'set'
          ? await adjustStock(productId, selected.id, parsedQty ?? 0, reason)
          : mode === 'add'
            ? await increaseStock(productId, selected.id, parsedAmount ?? 1, reason)
            : await decreaseStock(productId, selected.id, parsedAmount ?? 1, reason);

      setProduct((current) =>
        current
          ? {
              ...current,
              variants: current.variants.map((variant) =>
                variant.id === selected.id
                  ? { ...variant, stock: result.newQty, isAvailable: result.isAvailable }
                  : variant,
              ),
            }
          : current,
      );
      setNewQty(String(result.newQty));
      setReloadToken((value) => value + 1);
      setNotice({ text: `Now ${result.newQty} on hand`, tone: 'ok' });
      hapticSuccess();
    } catch (caught) {
      setFormError(messageFrom(caught, 'Unable to update stock'));
      hapticError();
    } finally {
      setSaving(false);
    }
  }

  async function showEarlier() {
    if (!selected || !historyMeta || historyPage >= historyMeta.totalPages || historyLoading) {
      return;
    }
    const nextPage = historyPage + 1;
    setHistoryLoading(true);
    try {
      const result = await listStockHistory(productId, selected.id, { page: nextPage, limit: 20 });
      setHistory((current) => [...current, ...result.data]);
      setHistoryMeta(result.meta);
      setHistoryPage(nextPage);
    } catch (caught) {
      setNotice({ text: messageFrom(caught, 'Unable to load history'), tone: 'bad' });
    } finally {
      setHistoryLoading(false);
    }
  }

  const buttonLabel = saving
    ? 'Saving'
    : mode === 'set'
      ? `Set to ${newQty || '…'}`
      : mode === 'add'
        ? `Add ${amount || '…'}`
        : `Remove ${amount || '…'}`;

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingTop: 8,
            paddingBottom: notice ? 88 : 28,
            paddingHorizontal: 20,
          }}>
          <Pressable
            accessibilityRole="button"
            onPress={goBack}
            hitSlop={8}
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
            <Text style={[styles.backLabel, { color: theme.text }]}>Back</Text>
          </Pressable>

          {loading ? (
            <View style={styles.loading} accessibilityLabel="Loading stock">
              <ActivityIndicator color={theme.ink} />
            </View>
          ) : loadError || !product ? (
            <Text accessibilityRole="alert" style={[styles.error, { color: theme.out }]}>
              {loadError ?? 'Unable to load stock'}
            </Text>
          ) : (
            <>
              <Text style={[styles.name, { color: theme.text }]}>{product.name}</Text>
              {selected ? (
                <SelectedMeta
                  colourName={colourName}
                  optionTypes={product.optionTypes}
                  variant={selected}
                  color={theme.textSecondary}
                />
              ) : (
                <Text style={[styles.sku, { color: theme.textSecondary }]}>
                  This product has no variants to count.
                </Text>
              )}

              {product.variants.length > 1 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chips}>
                  {product.variants.map((variant) => {
                    const active = variant.id === selectedId;
                    const colour = colourLabel(variant.options, colourName);
                    const hex = swatchFor(
                      variant.options,
                      variant.swatchHex,
                      colourName,
                      product.optionTypes,
                    );
                    const text = [
                      hex ? '' : colour,
                      formatOptions(variant.options, colourName),
                    ]
                      .filter(Boolean)
                      .join(', ');
                    const spoken = [
                      colour,
                      formatOptions(variant.options, colourName),
                      variant.sku,
                      `${variant.stock} on hand`,
                    ]
                      .filter(Boolean)
                      .join(', ');
                    return (
                      <Pressable
                        key={variant.id}
                        accessibilityRole="button"
                        accessibilityLabel={spoken}
                        accessibilityState={{ selected: active }}
                        onPress={() => chooseVariant(variant)}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: active ? theme.ink : theme.surface,
                            borderColor: active ? theme.ink : theme.line,
                          },
                        ]}>
                        {hex ? <Swatch hex={hex} label={colour} /> : null}
                        {text ? (
                          <Text
                            style={{ color: active ? theme.onInk : theme.text, fontWeight: '600' }}>
                            {text}
                          </Text>
                        ) : null}
                        <Text
                          style={[
                            styles.chipQty,
                            { color: active ? theme.onInk : theme.textSecondary },
                          ]}>
                          {variant.stock}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              ) : null}

              {selected ? (
                <>
                  <View style={styles.countRow}>
                    <Text style={[styles.count, { color: levelColor }]}>{selected.stock}</Text>
                    <Text style={[styles.onHand, { color: theme.textSecondary }]}>on hand</Text>
                  </View>
                  {!selected.isAvailable && selected.stock > 0 ? (
                    <Text style={[styles.hold, { color: theme.out }]}>Not for sale</Text>
                  ) : null}

                  <View style={[styles.modes, { borderColor: theme.line }]}>
                    {MODES.map((item) => {
                      const active = mode === item.id;
                      return (
                        <Pressable
                          key={item.id}
                          accessibilityRole="button"
                          accessibilityState={{ selected: active }}
                          onPress={() => chooseMode(item.id)}
                          style={[
                            styles.mode,
                            { backgroundColor: active ? theme.ink : 'transparent' },
                          ]}>
                          <Text style={{ color: active ? theme.onInk : theme.text, fontWeight: '600' }}>
                            {item.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {mode === 'set' ? (
                    <>
                      <Text style={[styles.fieldLabel, { color: theme.text }]}>New count</Text>
                      <TextInput
                        value={newQty}
                        onChangeText={(value) => {
                          setNewQty(value.replace(/[^\d]/g, ''));
                          setFormError(null);
                        }}
                        keyboardType="number-pad"
                        inputMode="numeric"
                        style={[styles.qtyInput, { backgroundColor: theme.surface, color: theme.text }]}
                      />
                    </>
                  ) : (
                    <>
                      <Text style={[styles.fieldLabel, { color: theme.text }]}>How many</Text>
                      <View style={styles.amountRow}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Decrease amount"
                          onPress={() => changeAmount(-1)}
                          style={({ pressed }) => [
                            styles.step,
                            { borderColor: theme.line, backgroundColor: theme.surface },
                            pressed && styles.pressed,
                          ]}>
                          <Text style={[styles.stepLabel, { color: theme.text }]}>−</Text>
                        </Pressable>
                        <TextInput
                          value={amount}
                          onChangeText={(value) => {
                            setAmount(value.replace(/[^\d]/g, ''));
                            setFormError(null);
                          }}
                          keyboardType="number-pad"
                          inputMode="numeric"
                          style={[styles.amountInput, { backgroundColor: theme.surface, color: theme.text }]}
                        />
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Increase amount"
                          onPress={() => changeAmount(1)}
                          style={({ pressed }) => [
                            styles.step,
                            { borderColor: theme.line, backgroundColor: theme.surface },
                            pressed && styles.pressed,
                          ]}>
                          <Text style={[styles.stepLabel, { color: theme.text }]}>+</Text>
                        </Pressable>
                      </View>
                      {mode === 'remove' && selected.stock === 0 ? (
                        <Text style={[styles.hint, { color: theme.textSecondary }]}>Nothing on hand.</Text>
                      ) : null}
                      {mode === 'remove' &&
                      parsedAmount !== null &&
                      parsedAmount > selected.stock &&
                      selected.stock > 0 ? (
                        <Text style={[styles.hint, { color: theme.out }]}>
                          Only {selected.stock} on hand.
                        </Text>
                      ) : null}
                    </>
                  )}

                  <Text style={[styles.fieldLabel, { color: theme.text }]}>Reason</Text>
                  <View style={styles.reasons}>
                    {reasonsFor(mode).map((item) => {
                      const active = reason === item;
                      return (
                        <Pressable
                          key={item}
                          accessibilityRole="button"
                          accessibilityState={{ selected: active }}
                          onPress={() => {
                            hapticSelection();
                            setReason(item);
                          }}
                          style={[
                            styles.reason,
                            {
                              backgroundColor: active ? theme.ink : theme.surface,
                              borderColor: active ? theme.ink : theme.line,
                            },
                          ]}>
                          <Text style={{ color: active ? theme.onInk : theme.text, fontWeight: '600' }}>
                            {reasonLabel(item)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {formError ? (
                    <Text accessibilityRole="alert" style={[styles.error, { color: theme.out }]}>
                      {formError}
                    </Text>
                  ) : null}

                  <Pressable
                    accessibilityRole="button"
                    disabled={!canSubmit}
                    onPress={() => void submit()}
                    style={({ pressed }) => [
                      styles.save,
                      { backgroundColor: theme.ink },
                      pressed && styles.pressed,
                      !canSubmit && styles.disabled,
                    ]}>
                    <Text style={[styles.saveLabel, { color: theme.onInk }]}>{buttonLabel}</Text>
                  </Pressable>

                  <Text style={[styles.historyTitle, { color: theme.text }]}>History</Text>
                  {history.length === 0 && !historyLoading ? (
                    <Text style={[styles.hint, { color: theme.textSecondary }]}>No movements yet.</Text>
                  ) : (
                    history.map((item) => (
                      <View key={item.id} style={[styles.historyRow, { borderBottomColor: theme.line }]}>
                        <View style={styles.historyCopy}>
                          <Text style={[styles.historyReason, { color: theme.text }]}>
                            {reasonLabel(item.reason)}
                          </Text>
                          <Text style={[styles.hint, { color: theme.textSecondary }]}>
                            {formatWhen(item.createdAt)}
                          </Text>
                          {item.orderId ? (
                            <Text style={[styles.hint, { color: theme.textSecondary }]}>From an order</Text>
                          ) : null}
                        </View>
                        <View style={styles.historyNums}>
                          <Text
                            style={[
                              styles.historyChange,
                              { color: item.changeAmount < 0 ? theme.out : theme.good },
                            ]}>
                            {formatChange(item.changeAmount)}
                          </Text>
                          <Text style={[styles.hint, { color: theme.textSecondary }]}>
                            {item.previousQty} to {item.newQty}
                          </Text>
                        </View>
                      </View>
                    ))
                  )}
                  {historyMeta && historyPage < historyMeta.totalPages ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => void showEarlier()}
                      disabled={historyLoading}
                      style={({ pressed }) => [styles.earlier, pressed && styles.pressed]}>
                      <Text style={[styles.retry, { color: theme.text }]}>
                        {historyLoading ? 'Loading' : 'Earlier movements'}
                      </Text>
                    </Pressable>
                  ) : null}
                  {historyLoading && history.length === 0 ? (
                    <ActivityIndicator color={theme.ink} style={styles.historySpinner} />
                  ) : null}
                </>
              ) : null}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      {notice ? <Banner text={notice.text} tone={notice.tone} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  back: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    marginBottom: 8,
  },
  backLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  loading: {
    paddingTop: 48,
  },
  name: {
    fontFamily: Fonts.rounded,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '700',
  },
  meta: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sku: {
    marginTop: 6,
    fontSize: 15,
    lineHeight: 20,
  },
  metaText: {
    flexShrink: 1,
    fontSize: 15,
    lineHeight: 20,
  },
  chips: {
    gap: 8,
    paddingTop: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chipQty: {
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  count: {
    fontFamily: Fonts.rounded,
    fontSize: 64,
    lineHeight: 68,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  onHand: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 10,
  },
  hold: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '600',
  },
  modes: {
    marginTop: 24,
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mode: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: {
    marginTop: 20,
    marginBottom: 8,
    fontSize: 15,
    fontWeight: '600',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  step: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 12,
  },
  stepLabel: {
    fontSize: 22,
    lineHeight: 24,
  },
  amountInput: {
    flex: 1,
    height: 48,
    borderRadius: 2,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  qtyInput: {
    height: 56,
    borderRadius: 2,
    paddingHorizontal: 14,
    fontSize: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  hint: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 19,
  },
  reasons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reason: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  error: {
    marginTop: 14,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
  },
  save: {
    marginTop: 18,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  historyTitle: {
    marginTop: 32,
    fontSize: 20,
    fontWeight: '700',
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  historyCopy: {
    flex: 1,
  },
  historyReason: {
    fontSize: 16,
    fontWeight: '600',
  },
  historyNums: {
    alignItems: 'flex-end',
  },
  historyChange: {
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  earlier: {
    alignSelf: 'flex-start',
    paddingVertical: 14,
  },
  retry: {
    fontSize: 15,
    fontWeight: '700',
  },
  historySpinner: {
    marginTop: 16,
  },
  pressed: {
    opacity: 0.55,
  },
  disabled: {
    opacity: 0.4,
  },
});
