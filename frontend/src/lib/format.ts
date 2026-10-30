import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const currencySymbolCache = new Map<string, string>();

const currencySymbol = (currency: string): string => {
  const key = currency.toUpperCase();
  const cached = currencySymbolCache.get(key);
  if (cached) return cached;

  let symbol = `${key} `;
  try {
    const parts = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: key,
      currencyDisplay: 'symbol',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).formatToParts(0);
    const value = parts.find((part) => part.type === 'currency')?.value;
    if (value) symbol = value;
  } catch {
    symbol = `${key} `;
  }

  if (key === 'GTQ') symbol = 'Q';
  currencySymbolCache.set(key, symbol);
  return symbol;
};

const NUMBER_LOCALE = 'es-GT';

const formatCurrencyNumber = (numeric: number, currency: string): string => {
  const key = currency.toUpperCase();
  const symbol = currencySymbol(key);
  const formatted = new Intl.NumberFormat(NUMBER_LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(numeric));
  return `${numeric < 0 ? '-' : ''}${symbol} ${formatted}`;
};

export const formatMoney = (
  value: string | number | null | undefined,
  currency = 'GTQ',
): string => {
  if (value === null || value === undefined || value === '') return '—';

  const parsed = Number(String(value).trim());
  if (!Number.isFinite(parsed)) return '—';

  const standardized = Number.isInteger(parsed) ? parsed.toFixed(2) : parsed.toFixed(2);
  return formatCurrencyNumber(Number(standardized), currency);
};

export const formatNumber = (value: number, maximumFractionDigits = 0): string =>
  new Intl.NumberFormat(NUMBER_LOCALE, { maximumFractionDigits }).format(value);

export const formatCompactMoney = (value: string | number, currency = 'GTQ'): string => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return '—';
  try {
    const compact = new Intl.NumberFormat(NUMBER_LOCALE, {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
      currencyDisplay: currency.toUpperCase() === 'GTQ' ? 'narrowSymbol' : 'symbol',
    }).format(numeric);
    return compact.replace(/^([A-Za-z$€£¥Q]+)/, '$1 ');
  } catch {
    return `${currencySymbol(currency)} ${formatNumber(numeric)}`;
  }
};

export const toDateOnly = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const slice = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(slice)) return null;
  const date = parseISO(slice);
  return Number.isNaN(date.getTime()) ? null : date;
};

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}(?:T00:00:00(?:\.000)?Z)?$/;

export const formatDate = (
  value: string | Date | null | undefined,
  pattern = 'd MMM yyyy',
): string => {
  if (!value) return '—';
  const date =
    value instanceof Date
      ? value
      : DATE_ONLY_PATTERN.test(value)
        ? toDateOnly(value)
        : parseISO(value);
  if (!date || Number.isNaN(date.getTime())) return '—';
  return format(date, pattern, { locale: es });
};

export const formatDateTime = (value: string | Date | null | undefined): string => {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return format(date, "d MMM yyyy, HH:mm", { locale: es });
};

export const formatRelative = (value: string | Date | null | undefined): string => {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return formatDistanceToNow(date, { addSuffix: true, locale: es });
};

export const initials = (name: string): string => {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) return '?';
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('');
};

export const fullName = (
  person: { firstName: string; lastName: string } | null | undefined,
): string => (person ? `${person.firstName} ${person.lastName}`.trim() : '—');

export const todayISO = (): string => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
};

export const formatPercent = (value: number | null | undefined): string =>
  value === null || value === undefined ? '—' : `${formatNumber(value, 1)}%`;

export const truncate = (value: string, max = 48): string =>
  value.length > max ? `${value.slice(0, max - 1)}…` : value;
