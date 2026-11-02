import type {
  ProductOptionType,
  StockChangeReason,
  StockLevel,
  StockRow,
} from '@/inventory/types';
import { LOW_STOCK_AT } from '@/inventory/types';

const COLOUR_KEY = /^colou?r$/i;
const HEX = /^#[0-9A-Fa-f]{6}$/;

/** Used only when a colour value has no hex from the catalog. */
const NAMED_COLOURS: Record<string, string> = {
  black: '#111111',
  white: '#FFFFFF',
  ivory: '#FFFFF0',
  cream: '#F5EBD7',
  beige: '#E8DCC4',
  sand: '#D8C6A3',
  tan: '#C8A37A',
  khaki: '#B9A67C',
  brown: '#6B4423',
  chocolate: '#4A2C1A',
  grey: '#8A8F98',
  gray: '#8A8F98',
  charcoal: '#36393F',
  silver: '#C0C4CA',
  navy: '#1F2A44',
  blue: '#2563EB',
  'light blue': '#9CC3E6',
  'sky blue': '#87BFE8',
  teal: '#0F766E',
  green: '#2F7D4A',
  olive: '#6B6B2E',
  'forest green': '#1F4D2B',
  mint: '#BFE6D3',
  red: '#C62828',
  maroon: '#7A1F2B',
  burgundy: '#6D1A2C',
  pink: '#F4A7B9',
  rose: '#E58A9E',
  purple: '#6D3FA0',
  lavender: '#C9B6E4',
  yellow: '#F2C230',
  mustard: '#C99A2E',
  orange: '#E8742A',
  gold: '#C9A227',
};

export function isHexColor(value: string | null | undefined): value is string {
  return typeof value === 'string' && HEX.test(value);
}

export function colourOptionName(
  optionSets: readonly Record<string, string>[],
  optionTypes?: readonly ProductOptionType[],
): string | null {
  const typed = optionTypes?.find((type) => type.kind === 'COLOR');
  if (typed) {
    return typed.name;
  }

  for (const options of optionSets) {
    const name = Object.keys(options).find((key) => COLOUR_KEY.test(key));
    if (name) {
      return name;
    }
  }

  return null;
}

export function swatchFor(
  options: Record<string, string> | undefined,
  swatchHex: string | null | undefined,
  colourName: string | null,
  optionTypes?: readonly ProductOptionType[],
): string | null {
  if (isHexColor(swatchHex)) {
    return swatchHex.toUpperCase();
  }
  if (!colourName || !options) {
    return null;
  }

  const label = options[colourName];
  if (!label) {
    return null;
  }

  const fromType = optionTypes
    ?.find((type) => type.name === colourName)
    ?.values.find((value) => value.label === label)?.hex;
  if (isHexColor(fromType)) {
    return fromType.toUpperCase();
  }

  return NAMED_COLOURS[label.trim().toLowerCase()] ?? null;
}

export function isLightSwatch(hex: string): boolean {
  const value = Number.parseInt(hex.slice(1), 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return 0.299 * red + 0.587 * green + 0.114 * blue > 200;
}

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

export function formatOptions(
  options: Record<string, string> | undefined,
  colourName?: string | null,
): string {
  if (!options) {
    return '';
  }

  return Object.entries(options)
    .filter(([key, value]) => key !== colourName && value.trim().length > 0)
    .map(([key, value]) => `${key} ${value}`)
    .join(', ');
}

export function colourLabel(
  options: Record<string, string> | undefined,
  colourName: string | null,
): string {
  if (!options || !colourName) {
    return '';
  }
  return options[colourName]?.trim() ?? '';
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
