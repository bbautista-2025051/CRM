import { cn } from '@/lib/cn';

export const Spinner = ({
  className,
  label = 'Cargando',
}: {
  className?: string;
  label?: string;
}) => (
  <span
    className={cn(
      'inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent',
      className,
    )}
    role="status"
    aria-label={label}
  />
);
