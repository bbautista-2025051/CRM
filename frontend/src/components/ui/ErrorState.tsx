import { RefreshCw, ServerCrash } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { Button } from './Button';
import { EmptyState } from './EmptyState';

export const ErrorState = ({
  error,
  onRetry,
  compact = false,
}: {
  error: unknown;
  onRetry?: () => void;
  compact?: boolean;
}) => {
  const message =
    error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : 'No se pudo cargar la informaci├│n.';
  return (
    <EmptyState
      icon={ServerCrash}
      title="Algo sali├│ mal"
      description={message}
      compact={compact}
      action={
        onRetry ? (
          <Button variant="secondary" size="sm" onClick={onRetry} leftIcon={<RefreshCw className="h-4 w-4" />}>
            Reintentar
          </Button>
        ) : undefined
      }
    />
  );
};
