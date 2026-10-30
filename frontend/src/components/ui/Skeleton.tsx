import { cn } from '@/lib/cn';

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn('skeleton h-4 w-full', className)} aria-hidden />
);

export const TableSkeleton = ({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) => (
  <div className="divide-y divide-line" aria-label="Cargando datos" role="status">
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="flex items-center gap-6 px-4 py-4">
        {Array.from({ length: columns }).map((__, columnIndex) => (
          <Skeleton
            key={columnIndex}
            className={cn('h-4', columnIndex === 0 ? 'w-1/3' : 'w-1/6')}
          />
        ))}
      </div>
    ))}
  </div>
);

export const CardsSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="card p-5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-4 h-7 w-32" />
        <Skeleton className="mt-3 h-3 w-20" />
      </div>
    ))}
  </div>
);
