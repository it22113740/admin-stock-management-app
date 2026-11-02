import type { StockChangeReason, StockLevel, StockRow } from '@/inventory/types';
import { LOW_STOCK_AT } from '@/inventory/types';

const REASON_LABEL: Record<StockChangeReason, string> = {
  PURCHASE: 'Purchase',
  SALE: 'Sale',
  MANUAL_ADJUSTMENT: 'Manual count',
  RETURN: 'Return',
  CANCELLATION: 'Cancellation',
  RESTOCK: 'Restock',
  CORRECTION: 'Correction',
};

export function reasonLabel(reason: StockChangeReason): string {
  return REASON_LABEL[reason];
}

export function formatOptions(options: Record<string, string> | undefined): string {
  if (!options) {
    return '';
  }

  return Object.entries(options)
    .filter(([, value]) => value.trim().length > 0)
    .map(([key, value]) => `${key} ${value}`)
    .join(', ');
}

export function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatChange(amount: number): string {
  if (amount > 0) {
    return `+${amount}`;
  }
  return String(amount);
}

export function parseWhole(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed)) {
    return null;
  }

  return parsed;
}

export function stockLevel(stock: number, isAvailable: boolean): StockLevel {
  if (stock <= 0 || !isAvailable) {
    return 'out';
  }
  if (stock <= LOW_STOCK_AT) {
    return 'low';
  }
  return 'healthy';
}

export function rowDetail(row: StockRow): string {
  const parts: string[] = [];
  if (row.status === 'ARCHIVED') {
    parts.push('Archived');
  } else if (row.status === 'INACTIVE') {
    parts.push('Inactive');
  }
  if (row.optionsLabel) {
    parts.push(row.optionsLabel);
  }
  if (row.sku) {
    parts.push(row.sku);
  }
  if (!row.variantId) {
    parts.push('No variant');
  }
  return parts.join(', ');
}
