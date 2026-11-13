import { Search, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Input } from './Input';

export const SearchInput = ({
  value,
  onChange,
  placeholder = 'BuscarÔÇª',
  className,
  ariaLabel = 'Buscar',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}) => (
  <Input
    value={value}
    onChange={(event) => onChange(event.target.value)}
    placeholder={placeholder}
    aria-label={ariaLabel}
    className={cn('sm:min-w-[240px]', className)}
    leadingIcon={<Search className="h-4 w-4" />}
    trailing={
      value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          className="rounded-md p-1.5 text-muted transition hover:bg-elevated hover:text-ink"
          aria-label="Limpiar b├║squeda"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null
    }
  />
);
