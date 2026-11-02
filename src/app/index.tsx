import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/auth-context';
import { Banner } from '@/components/banner';
import { Screen } from '@/components/screen';
import { StockTicket } from '@/components/stock-ticket';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hapticSelection } from '@/lib/haptics';
import { LOW_STOCK_AT, type StockFilter, type StockRow } from '@/inventory/types';
import { useStockList } from '@/inventory/use-stock-list';

const FILTERS: { id: StockFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'low', label: 'Low' },
  { id: 'out', label: 'Out' },
];

export default function StockScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const list = useStockList();
  const attention = list.attention;
  const [signOutOpen, setSignOutOpen] = useState(false);

  function openRow(row: StockRow) {
    router.push({
      pathname: '/stock/[productId]',
      params: {
        productId: row.productId,
        variantId: row.variantId ?? '',
      },
    });
  }

  function confirmSignOut() {
    setSignOutOpen(true);
  }

  const emptyMessage = emptyCopy(list.filter, list.search);

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: theme.text }]}>Stock</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            onPress={confirmSignOut}
            hitSlop={8}
            style={({ pressed }) => [
              styles.signOut,
              {
                borderColor: theme.line,
                backgroundColor: theme.surface,
              },
              pressed && styles.pressed,
            ]}>
            <SymbolView
              name={{
                ios: 'rectangle.portrait.and.arrow.right',
                android: 'logout',
                web: 'logout',
              }}
              size={16}
              tintColor={theme.text}
            />
            <Text style={[styles.signOutLabel, { color: theme.text }]}>Sign out</Text>
          </Pressable>
        </View>

        {list.filter === 'all' && attention !== null ? (
          <Pressable
            accessibilityRole="button"
            disabled={attention === 0}
            onPress={() => {
              hapticSelection();
              list.setFilter('low');
            }}
            style={({ pressed }) => [pressed && attention > 0 && styles.pressed]}>
            <Text style={[styles.attention, { color: attention > 0 ? theme.low : theme.textSecondary }]}>
              {attention > 0
                ? `${attention} with ${LOW_STOCK_AT} or fewer`
                : `None at ${LOW_STOCK_AT} or below`}
            </Text>
          </Pressable>
        ) : null}
        {list.filter === 'low' ? (
          <Text style={[styles.attention, { color: theme.textSecondary }]}>
            {LOW_STOCK_AT} or fewer on hand
          </Text>
        ) : null}
        {list.filter === 'out' ? (
          <Text style={[styles.attention, { color: theme.textSecondary }]}>Nothing left to sell</Text>
        ) : null}

        <View style={styles.filters}>
          {FILTERS.map((item) => {
            const selected = list.filter === item.id;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => {
                  if (list.filter !== item.id) {
                    hapticSelection();
                    list.setFilter(item.id);
                  }
                }}
                style={[
                  styles.filter,
                  { borderBottomColor: selected ? theme.ink : 'transparent' },
                ]}>
                <Text
                  style={[
                    styles.filterLabel,
                    { color: selected ? theme.ink : theme.textSecondary },
                    selected && styles.filterSelected,
                  ]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.search, { backgroundColor: theme.surface }]}>
          <TextInput
            value={list.searchInput}
            onChangeText={list.setSearchInput}
            placeholder="Search products"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Search products"
            style={[styles.searchInput, { color: theme.text }]}
          />
          {list.searchInput.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => list.setSearchInput('')}
              hitSlop={8}
              style={styles.clear}>
              <Text style={[styles.clearLabel, { color: theme.text }]}>Clear</Text>
            </Pressable>
          ) : null}
        </View>

        {list.error ? (
          <View style={styles.errorRow}>
            <Text accessibilityRole="alert" style={[styles.error, { color: theme.out }]}>
              {list.error}
            </Text>
            <Pressable accessibilityRole="button" onPress={list.reload} hitSlop={8}>
              <Text style={[styles.retry, { color: theme.text }]}>Try again</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {list.loading ? (
        <LoadingRows />
      ) : (
        <FlatList
          style={styles.list}
          data={list.rows}
          keyExtractor={(item) => item.key}
          extraData={list.busyId}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={
            <RefreshControl
              refreshing={list.refreshing}
              onRefresh={list.reload}
              tintColor={theme.ink}
            />
          }
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: list.notice ? 80 : 24,
          }}
          onEndReachedThreshold={0.4}
          onEndReached={() => void list.loadMore()}
          ListEmptyComponent={
            list.error ? undefined : (
              <Text style={[styles.empty, { color: theme.textSecondary }]}>{emptyMessage}</Text>
            )
          }
          ListFooterComponent={
            list.loadingMore ? <ActivityIndicator color={theme.ink} style={styles.footer} /> : undefined
          }
          renderItem={({ item }) => (
            <StockTicket
              row={item}
              busy={list.busyId !== null}
              onOpen={openRow}
              onAdd={(row) => void list.adjustByOne(row, 1)}
              onRemove={(row) => void list.adjustByOne(row, -1)}
            />
          )}
        />
      )}
      {list.notice ? <Banner text={list.notice.text} tone={list.notice.tone} /> : null}
      <Modal
        visible={signOutOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSignOutOpen(false)}
        statusBarTranslucent>
        <View
          style={[
            styles.modalRoot,
            {
              paddingTop: insets.top + 24,
              paddingBottom: insets.bottom + 24,
            },
          ]}>
          <Pressable
            accessibilityLabel="Cancel sign out"
            style={styles.modalBackdrop}
            onPress={() => setSignOutOpen(false)}
          />
          <View
            accessibilityRole="alert"
            style={[styles.dialog, { backgroundColor: theme.surface }]}>
            <Text style={[styles.dialogTitle, { color: theme.text }]}>Sign out?</Text>
            <Text style={[styles.dialogBody, { color: theme.textSecondary }]}>
              You can sign in again with your admin account.
            </Text>
            <View style={styles.dialogActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setSignOutOpen(false)}
                style={({ pressed }) => [
                  styles.dialogButton,
                  { borderColor: theme.line, backgroundColor: theme.background },
                  pressed && styles.pressed,
                ]}>
                <Text style={[styles.dialogButtonLabel, { color: theme.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setSignOutOpen(false);
                  void signOut();
                }}
                style={({ pressed }) => [
                  styles.dialogButton,
                  { borderColor: theme.out, backgroundColor: theme.out },
                  pressed && styles.pressed,
                ]}>
                <Text style={[styles.dialogButtonLabel, { color: theme.onOut }]}>Sign out</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function LoadingRows() {
  const theme = useTheme();
  return (
    <View accessibilityLabel="Loading stock">
      {Array.from({ length: 7 }, (_, index) => (
        <View key={index} style={[styles.skelRow, { borderBottomColor: theme.line }]}>
          <View style={[styles.skelThumb, { backgroundColor: theme.backgroundElement }]} />
          <View style={styles.skelCopy}>
            <View style={[styles.skelLine, { width: '72%', backgroundColor: theme.backgroundElement }]} />
            <View style={[styles.skelLine, { width: '42%', backgroundColor: theme.backgroundElement }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

function emptyCopy(filter: StockFilter, search: string): string {
  if (search) {
    return 'No products match that search.';
  }
  if (filter === 'low') {
    return `Nothing is at ${LOW_STOCK_AT} or below.`;
  }
  if (filter === 'out') {
    return 'Nothing is out.';
  }
  return 'No products yet.';
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: Fonts.rounded,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '700',
  },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  signOutLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  attention: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  filters: {
    flexDirection: 'row',
    gap: 18,
  },
  filter: {
    paddingBottom: 6,
    borderBottomWidth: 2,
  },
  filterLabel: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '500',
  },
  filterSelected: {
    fontWeight: '700',
  },
  search: {
    height: 48,
    borderRadius: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: 48,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  clear: {
    paddingHorizontal: 14,
    height: 48,
    justifyContent: 'center',
  },
  clearLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  errorRow: {
    gap: 6,
  },
  error: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  retry: {
    fontSize: 15,
    fontWeight: '700',
  },
  empty: {
    paddingHorizontal: 20,
    paddingTop: 28,
    fontSize: 16,
    lineHeight: 22,
  },
  footer: {
    paddingVertical: 16,
  },
  pressed: {
    opacity: 0.55,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(20, 17, 16, 0.45)',
  },
  dialog: {
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
  },
  dialogTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
  },
  dialogBody: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 22,
  },
  dialogActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  dialogButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogButtonLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  list: {
    flex: 1,
  },
  skelRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  skelThumb: {
    width: 48,
    height: 48,
    borderRadius: 2,
  },
  skelCopy: {
    flex: 1,
    gap: 8,
  },
  skelLine: {
    height: 12,
    borderRadius: 2,
  },
});
