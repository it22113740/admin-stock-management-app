/** Matches the backend default for low-stock lists. */
export const LOW_STOCK_AT = 10;

export const PAGE_SIZE = 20;

export type StockChangeReason =
  | 'PURCHASE'
  | 'SALE'
  | 'MANUAL_ADJUSTMENT'
  | 'RETURN'
  | 'CANCELLATION'
  | 'RESTOCK'
  | 'CORRECTION';

export const ADD_REASONS: StockChangeReason[] = [
  'RESTOCK',
  'RETURN',
  'CANCELLATION',
  'MANUAL_ADJUSTMENT',
];

export const REMOVE_REASONS: StockChangeReason[] = ['MANUAL_ADJUSTMENT', 'CORRECTION'];

export const SET_REASONS: StockChangeReason[] = ['CORRECTION', 'MANUAL_ADJUSTMENT'];

export type ProductStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export type OptionKind = 'TEXT' | 'COLOR';

export type ProductOptionValue = {
  id: string;
  label: string;
  hex: string | null;
};

export type ProductOptionType = {
  id: string;
  name: string;
  kind: OptionKind;
  values: ProductOptionValue[];
};

export type Variant = {
  id: string;
  sku: string;
  stock: number;
  isAvailable: boolean;
  options: Record<string, string>;
  swatchHex?: string | null;
  imageUrl: string | null;
};

export type Product = {
  id: string;
  name: string;
  mainImage: string | null;
  status: ProductStatus;
  optionTypes?: ProductOptionType[];
  variants: Variant[];
};

export type StockMutation = {
  productId: string;
  variantId: string;
  previousQty: number;
  changeAmount: number;
  newQty: number;
  reason: StockChangeReason;
  isAvailable: boolean;
};

export type StockHistoryItem = {
  id: string;
  variantId: string;
  previousQty: number;
  changeAmount: number;
  newQty: number;
  reason: StockChangeReason;
  orderId: string | null;
  actorId: string | null;
  createdAt: string;
};

export type LowStockVariant = {
  variantId: string;
  productId: string;
  productName: string;
  sku: string;
  options: Record<string, string>;
  stock: number;
  isAvailable: boolean;
  status: ProductStatus;
};

export type StockFilter = 'all' | 'low' | 'out';

export type StockLevel = 'healthy' | 'low' | 'out';

export type StockRow = {
  key: string;
  productId: string;
  variantId: string | null;
  name: string;
  sku: string;
  optionsLabel: string;
  swatchHex: string | null;
  colourLabel: string;
  stock: number;
  isAvailable: boolean;
  status: ProductStatus;
  imageUrl: string | null;
};

export type Notice = {
  text: string;
  tone: 'ok' | 'bad';
} | null;
