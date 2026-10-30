import { z } from 'zod';

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(120).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export const buildPaginationMeta = (
  total: number,
  page: number,
  pageSize: number,
): PaginationMeta => ({
  page,
  pageSize,
  total,
  totalPages: Math.max(1, Math.ceil(total / pageSize)),
});

export const buildOrderBy = <T extends string>(
  sortBy: string | undefined,
  allowed: readonly T[],
  sortOrder: 'asc' | 'desc',
  fallback: T,
): Record<string, 'asc' | 'desc'> => {
  const field = allowed.includes(sortBy as T) ? (sortBy as T) : fallback;
  return { [field]: sortOrder };
};

export const skipTake = (page: number, pageSize: number) => ({
  skip: (page - 1) * pageSize,
  take: pageSize,
});
