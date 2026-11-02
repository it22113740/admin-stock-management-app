import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { decreaseStock, increaseStock, loadStockPage, countNeedingAttention } from '@/inventory/api';
import { hapticError, hapticSuccess } from '@/lib/haptics';
import { messageFrom, type PaginationMeta } from '@/lib/api';
import type { Notice, StockFilter, StockRow } from '@/inventory/types';

const emptyMeta: PaginationMeta = { page: 1, limit: 20, total: 0, totalPages: 0 };

export function useStockList() {
  const [filter, setFilter] = useState<StockFilter>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<StockRow[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(emptyMeta);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attention, setAttention] = useState<number | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const requestId = useRef(0);
  const pageRef = useRef(0);
  const metaRef = useRef(emptyMeta);
  const rowsRef = useRef(rows);
  const loadingMoreRef = useRef(false);
  const listKey = useRef<string | null>(null);
  const busyRef = useRef<string | null>(null);

  rowsRef.current = rows;
  metaRef.current = meta;

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!notice) {
      return;
    }
    const timer = setTimeout(() => setNotice(null), 2200);
    return () => clearTimeout(timer);
  }, [notice]);

  const refreshAttention = useCallback(async () => {
    try {
      const total = await countNeedingAttention();
      setAttention(total);
    } catch {
      setAttention(null);
    }
  }, []);

  const loadFirst = useCallback(
    async (kind: 'load' | 'refresh') => {
      const id = ++requestId.current;
      if (kind === 'refresh') {
        setRefreshing(true);
      } else {
        setRows([]);
        setLoading(true);
      }
      setError(null);

      try {
        let page = 1;
        let result = await loadStockPage({ filter, search, page });
        let skips = 0;
        while (result.rows.length === 0 && page < result.meta.totalPages && skips < 5) {
          page += 1;
          skips += 1;
          result = await loadStockPage({ filter, search, page });
        }
        if (id !== requestId.current) {
          return;
        }
        setRows(result.rows);
        setMeta(result.meta);
        metaRef.current = result.meta;
        pageRef.current = page;
        void refreshAttention();
      } catch (caught) {
        if (id !== requestId.current) {
          return;
        }
        setError(messageFrom(caught, 'Unable to load stock'));
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [filter, refreshAttention, search],
  );

  useFocusEffect(
    useCallback(() => {
      const key = `${filter}|${search}`;
      const kind = listKey.current === key ? 'refresh' : 'load';
      listKey.current = key;
      void loadFirst(kind);
    }, [filter, loadFirst, search]),
  );

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || loading || refreshing) {
      return;
    }
    if (pageRef.current < 1 || pageRef.current >= metaRef.current.totalPages) {
      return;
    }

    const id = requestId.current;
    loadingMoreRef.current = true;
    setLoadingMore(true);

    try {
      let page = pageRef.current;
      let collected: StockRow[] = [];
      let nextMeta = metaRef.current;
      let skips = 0;
      do {
        page += 1;
        const result = await loadStockPage({ filter, search, page });
        if (id !== requestId.current) {
          return;
        }
        collected = result.rows;
        nextMeta = result.meta;
        skips += 1;
      } while (collected.length === 0 && page < nextMeta.totalPages && skips < 5);

      if (id !== requestId.current) {
        return;
      }
      setRows((current) => [...current, ...collected]);
      setMeta(nextMeta);
      metaRef.current = nextMeta;
      pageRef.current = page;
    } catch (caught) {
      if (id === requestId.current) {
        setNotice({ text: messageFrom(caught, 'Unable to load more'), tone: 'bad' });
      }
    } finally {
      loadingMoreRef.current = false;
      if (id === requestId.current) {
        setLoadingMore(false);
      }
    }
  }, [filter, loading, refreshing, search]);

  const adjustByOne = useCallback(async (row: StockRow, delta: 1 | -1) => {
    if (!row.variantId || busyRef.current) {
      return;
    }
    if (delta < 0 && row.stock <= 0) {
      return;
    }

    const variantId = row.variantId;
    const previous = row.stock;
    busyRef.current = variantId;
    setBusyId(variantId);
    setRows((current) =>
      current.map((item) =>
        item.key === row.key ? { ...item, stock: item.stock + delta } : item,
      ),
    );

    try {
      const result =
        delta > 0
          ? await increaseStock(row.productId, variantId, 1, 'RESTOCK')
          : await decreaseStock(row.productId, variantId, 1, 'MANUAL_ADJUSTMENT');
      setRows((current) =>
        current.map((item) =>
          item.key === row.key
            ? { ...item, stock: result.newQty, isAvailable: result.isAvailable }
            : item,
        ),
      );
      setNotice({ text: `${row.name} now ${result.newQty}`, tone: 'ok' });
      hapticSuccess();
      void refreshAttention();
    } catch (caught) {
      setRows((current) =>
        current.map((item) => (item.key === row.key ? { ...item, stock: previous } : item)),
      );
      setNotice({ text: messageFrom(caught, 'Unable to update stock'), tone: 'bad' });
      hapticError();
    } finally {
      busyRef.current = null;
      setBusyId(null);
    }
  }, [refreshAttention]);

  return {
    filter,
    setFilter,
    searchInput,
    setSearchInput,
    search,
    rows,
    loading,
    refreshing,
    loadingMore,
    error,
    attention,
    notice,
    busyId,
    reload: () => loadFirst(rowsRef.current.length === 0 ? 'load' : 'refresh'),
    loadMore,
    adjustByOne,
  };
}
