import { apiRequest, type PaginationMeta } from '@/lib/api';
import { colourLabel, colourOptionName, formatOptions, swatchFor } from '@/inventory/format';
import type {
  Product,
  StockChangeReason,
  StockFilter,
  StockHistoryItem,
  StockMutation,
  StockRow,
} from '@/inventory/types';
import { LOW_STOCK_AT, PAGE_SIZE } from '@/inventory/types';

function stockPath(productId: string, variantId: string, suffix: string): string {
  return `/products/${productId}/variants/${variantId}/stock/${suffix}`;
}

function fallbackMeta(
  page: number | undefined,
  limit: number | undefined,
  total: number,
): PaginationMeta {
  return {
    page: page ?? 1,
    limit: limit ?? PAGE_SIZE,
    total,
    totalPages: 1,
  };
}

export function rowsFromProduct(product: Product): StockRow[] {
  const colourName = colourOptionName(
    product.variants.map((variant) => variant.options),
    product.optionTypes,
  );

  if (product.variants.length === 0) {
    return [
      {
        key: `${product.id}-none`,
        productId: product.id,
        variantId: null,
        name: product.name,
        sku: '',
        optionsLabel: '',
        swatchHex: null,
        colourLabel: '',
        stock: 0,
        isAvailable: false,
        status: product.status,
        imageUrl: product.mainImage,
      },
    ];
  }

  return product.variants.map((variant) => ({
    key: variant.id,
    productId: product.id,
    variantId: variant.id,
    name: product.name,
    sku: variant.sku,
    optionsLabel: formatOptions(variant.options, colourName),
    swatchHex: swatchFor(variant.options, variant.swatchHex, colourName, product.optionTypes),
    colourLabel: colourLabel(variant.options, colourName),
    stock: variant.stock,
    isAvailable: variant.isAvailable,
    status: product.status,
    imageUrl: variant.imageUrl ?? product.mainImage,
  }));
}

export async function listProducts(query: {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'name' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}): Promise<{ data: Product[]; meta: PaginationMeta }> {
  const response = await apiRequest<Product[]>('/products', { query });
  return {
    data: response.data,
    meta: response.meta ?? fallbackMeta(query.page, query.limit, response.data.length),
  };
}

export async function fetchProduct(id: string): Promise<Product> {
  const response = await apiRequest<Product>(`/products/${id}`);
  return response.data;
}

/**
 * The live API registers GET /products/:id before GET /products/low-stock,
 * so "low-stock" is rejected as a product id. Low and out lists are built
 * from the catalog instead.
 */
let catalogRequest: Promise<StockRow[]> | null = null;

function catalogRows(): Promise<StockRow[]> {
  if (!catalogRequest) {
    catalogRequest = scanCatalog().finally(() => {
      catalogRequest = null;
    });
  }
  return catalogRequest;
}

async function scanCatalog(): Promise<StockRow[]> {
  const rows: StockRow[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const result = await listProducts({
      page,
      limit: 100,
      sortBy: 'name',
      sortOrder: 'asc',
    });
    rows.push(...result.data.flatMap(rowsFromProduct));
    totalPages = result.meta.totalPages;
    page += 1;
  } while (page <= totalPages && page <= 50);

  return rows;
}

function rowsAtOrBelow(rows: StockRow[], threshold: number): StockRow[] {
  return rows
    .filter((row) => row.variantId !== null && row.stock <= threshold)
    .sort((left, right) => left.stock - right.stock || left.sku.localeCompare(right.sku));
}

export async function countNeedingAttention(): Promise<number> {
  const rows = rowsAtOrBelow(await catalogRows(), LOW_STOCK_AT);
  return rows.length;
}

export async function loadStockPage(input: {
  filter: StockFilter;
  search: string;
  page: number;
}): Promise<{ rows: StockRow[]; meta: PaginationMeta }> {
  const search = input.search.trim();

  if (!search && input.filter !== 'all') {
    const threshold = input.filter === 'out' ? 0 : LOW_STOCK_AT;
    const matches = rowsAtOrBelow(await catalogRows(), threshold);
    const start = (input.page - 1) * PAGE_SIZE;
    const total = matches.length;
    return {
      rows: matches.slice(start, start + PAGE_SIZE),
      meta: {
        page: input.page,
        limit: PAGE_SIZE,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / PAGE_SIZE),
      },
    };
  }

  const result = await listProducts({
    page: input.page,
    limit: PAGE_SIZE,
    search: search || undefined,
    sortBy: 'name',
    sortOrder: 'asc',
  });

  let rows = result.data.flatMap(rowsFromProduct);
  if (input.filter === 'low') {
    rows = rows.filter((row) => row.variantId !== null && row.stock <= LOW_STOCK_AT);
  } else if (input.filter === 'out') {
    rows = rows.filter((row) => row.variantId !== null && row.stock <= 0);
  }

  return { rows, meta: result.meta };
}

export async function increaseStock(
  productId: string,
  variantId: string,
  amount: number,
  reason: StockChangeReason,
): Promise<StockMutation> {
  const response = await apiRequest<StockMutation>(stockPath(productId, variantId, 'increase'), {
    method: 'PATCH',
    body: { amount, reason },
  });
  return response.data;
}

export async function decreaseStock(
  productId: string,
  variantId: string,
  amount: number,
  reason: StockChangeReason,
): Promise<StockMutation> {
  const response = await apiRequest<StockMutation>(stockPath(productId, variantId, 'decrease'), {
    method: 'PATCH',
    body: { amount, reason },
  });
  return response.data;
}

export async function adjustStock(
  productId: string,
  variantId: string,
  newQty: number,
  reason: StockChangeReason,
): Promise<StockMutation> {
  const response = await apiRequest<StockMutation>(stockPath(productId, variantId, 'adjust'), {
    method: 'PATCH',
    body: { newQty, reason },
  });
  return response.data;
}

export async function listStockHistory(
  productId: string,
  variantId: string,
  query: { page?: number; limit?: number } = {},
): Promise<{ data: StockHistoryItem[]; meta: PaginationMeta }> {
  const response = await apiRequest<StockHistoryItem[]>(
    stockPath(productId, variantId, 'history'),
    { query },
  );
  return {
    data: response.data,
    meta: response.meta ?? fallbackMeta(query.page, query.limit, response.data.length),
  };
}
