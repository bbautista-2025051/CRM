import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, RefreshCw } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { activityApi, unwrap } from '@/lib/endpoints';
import { ENTITY_LABELS } from '@/lib/labels';
import { formatNumber } from '@/lib/format';
import { ActivityFeed } from '@/components/activity/ActivityFeed';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';

const ENTITY_TYPES = ['COMPANY', 'CLIENT', 'OPPORTUNITY', 'SALE', 'USER', 'SESSION'];

export const ActivityPage = () => {
  usePageTitle('Actividad');
  const [entityType, setEntityType] = useState('');
  const [limit, setLimit] = useState('50');

  const query = useQuery({
    queryKey: ['activity', 'list', { entityType, limit }],
    queryFn: async () =>
      unwrap(
        await activityApi.list({
          entityType: entityType || undefined,
          limit: Number(limit),
        }),
      ),
  });

  const items = query.data ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Actividad"
        description="Auditoría de las acciones realizadas por el equipo y el sistema."
      />

      <Card>
        <CardHeader
          title="Registro de actividad"
          description="Los eventos más recientes aparecen primero."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void query.refetch()}
              loading={query.isFetching}
              leftIcon={<RefreshCw className="h-4 w-4" />}
            >
              Actualizar
            </Button>
          }
        />
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center">
          <Select
            aria-label="Filtrar por tipo de entidad"
            value={entityType}
            onChange={(event) => setEntityType(event.target.value)}
            className="sm:w-56"
          >
            <option value="">Todas las entidades</option>
            {ENTITY_TYPES.map((type) => (
              <option key={type} value={type}>
                {ENTITY_LABELS[type] ?? type}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Cantidad de eventos"
            value={limit}
            onChange={(event) => setLimit(event.target.value)}
            className="sm:w-40"
          >
            <option value="20">Últimos 20</option>
            <option value="50">Últimos 50</option>
          </Select>
          <span className="ml-auto text-xs text-muted">
            {formatNumber(items.length)} eventos mostrados
          </span>
        </div>

        {query.isLoading ? (
          <div className="p-5">
            <TableSkeleton rows={6} columns={2} />
          </div>
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="Sin actividad registrada"
            description={
              entityType
                ? 'No hay eventos para la entidad seleccionada.'
                : 'Las acciones del equipo aparecerán aquí automáticamente.'
            }
            action={
              entityType ? (
                <Button variant="secondary" size="sm" onClick={() => setEntityType('')}>
                  Ver toda la actividad
                </Button>
              ) : undefined
            }
          />
        ) : (
          <CardBody className="py-1">
            <ActivityFeed items={items} />
          </CardBody>
        )}
      </Card>

      <p className="flex items-start gap-1.5 px-1 text-[11px] leading-5 text-muted">
        <Activity className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        La auditoría es de solo lectura. Cada evento incluye actor, entidad, acción y fecha;
        no puede editarse ni eliminarse desde la interfaz.
      </p>
    </div>
  );
};
