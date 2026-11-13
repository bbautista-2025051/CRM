import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import type { PaginationMeta } from '@/types';
import { Button } from './Button';

export const Pagination = ({
  meta,
  onPageChange,
  className,
}: {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  className?: string;
}) => {
  if (meta.total === 0) return null;
  const from = (meta.page - 1) * meta.pageSize + 1;
  const to = Math.min(meta.page * meta.pageSize, meta.total);

  const pages: number[] = [];
  const start = Math.max(1, Math.min(meta.page - 2, meta.totalPages - 4));
  const end = Math.min(meta.totalPages, start + 4);
  for (let page = start; page <= end; page += 1) pages.push(page);

  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-t border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <p className="text-xs text-muted">
        Mostrando <span className="font-medium text-ink">{formatNumber(from)}</span>ÔÇô
        <span className="font-medium text-ink">{formatNumber(to)}</span> de{' '}
        <span className="font-medium text-ink">{formatNumber(meta.total)}</span> registros
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="secondary"
          size="icon"
          onClick={() => onPageChange(meta.page - 1)}
          disabled={meta.page <= 1}
          aria-label="P├ígina anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {pages.map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            aria-current={page === meta.page ? 'page' : undefined}
            className={cn(
              'focus-ring h-9 min-w-9 rounded-lg px-2 text-[13px] font-medium transition',
              page === meta.page
                ? 'bg-brand text-brand-ink'
                : 'text-muted hover:bg-elevated hover:text-ink',
            )}
          >
            {page}
          </button>
        ))}
        <Button
          variant="secondary"
          size="icon"
          onClick={() => onPageChange(meta.page + 1)}
          disabled={meta.page >= meta.totalPages}
          aria-label="P├ígina siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
