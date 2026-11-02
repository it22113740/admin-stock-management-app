import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { apiRequest } from '@/lib/api';

/** Current store brand, used until GET /content/theme returns. */
const FALLBACK = {
  color: '#B42318',
  onColor: '#FFFFFF',
};

type Brand = {
  color: string;
  onColor: string;
};

const BrandContext = createContext<Brand>(FALLBACK);

type ThemePayload = {
  primaryColor?: string;
  primaryContentColor?: string;
};

function isHex(value: string | undefined): value is string {
  return typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value);
}

export function BrandProvider({ children }: { children: ReactNode }) {
  const [brand, setBrand] = useState<Brand>(FALLBACK);

  useEffect(() => {
    let cancelled = false;

    apiRequest<ThemePayload>('/content/theme', { auth: false })
      .then((response) => {
        if (cancelled) {
          return;
        }
        const color = response.data.primaryColor;
        const onColor = response.data.primaryContentColor;
        if (!isHex(color)) {
          return;
        }
        setBrand({
          color: color.toUpperCase(),
          onColor: isHex(onColor) ? onColor.toUpperCase() : FALLBACK.onColor,
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>;
}

export function useBrand(): Brand {
  return useContext(BrandContext);
}
