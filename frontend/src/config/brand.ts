const clean = (value: string | undefined, fallback: string): string => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
};

export const brand = {
  company: clean(import.meta.env.VITE_COMPANY_NAME, 'Nexo'),
  product: clean(import.meta.env.VITE_CRM_NAME, 'Nexo CRM'),
  logoUrl: import.meta.env.VITE_LOGO_URL?.trim() ?? '',
  tagline: 'Gestión comercial sin fricción',
} as const;
