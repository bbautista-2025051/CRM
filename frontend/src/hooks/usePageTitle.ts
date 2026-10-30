import { useEffect } from 'react';
import { brand } from '@/config/brand';

export const usePageTitle = (title?: string): void => {
  useEffect(() => {
    document.title = title ? `${title} · ${brand.product}` : brand.product;
  }, [title]);
};
