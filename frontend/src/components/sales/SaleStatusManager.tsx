import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { useToast } from '@/providers/ToastProvider';
import { salesApi } from '@/lib/endpoints';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useAuth } from '@/providers/AuthProvider';
import { useConfirm } from '@/providers/ConfirmProvider';
import { isAdmin } from '@/lib/permissions';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/SearchInput';
import { EmptyState } from '@/components/ui/EmptyState';

const BUILT_IN_STATUSES = [
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'CONFIRMED', label: 'Confirmada' },
  { value: 'CANCELLED', label: 'Cancelada' },
];

export const SaleStatusManager = () => {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const { confirm } = useConfirm();
  const queryClient = useQueryClient();
  const admin = isAdmin(user?.role);

  const [newStatusName, setNewStatusName] = useState('');
  const [adding, setAdding] = useState(false);

  const query = useQuery({
    queryKey: ['sales', 'statuses'],
    queryFn: async () => {
      const response = await salesApi.listStatuses();
      return response.data;
    },
  });

  const statuses = query.data ?? [];
  const customStatuses = statuses.filter(
    (s: { id: string; name: string }) => !BUILT_IN_STATUSES.some((b) => b.value === s.id || b.label === s.name),
  );

  const createStatus = useMutation({
    mutationFn: () => salesApi.createStatus(newStatusName.trim()),
    onSuccess: (response) => {
      success('Estado creado', `${response.data.name} ya está disponible.`);
      setNewStatusName('');
      setAdding(false);
      void queryClient.invalidateQueries({ queryKey: ['sales', 'statuses'] });
    },
    onError: (error) => {
      toastError(
        'No se pudo crear el estado',
        error instanceof ApiError ? error.message : 'Inténtalo de nuevo.',
      );
    },
  });

  const deleteStatus = useMutation({
    mutationFn: (id: string) => salesApi.deleteStatus(id),
    onSuccess: (response) => {
      success('Estado eliminado', `${response.data.name} se eliminó correctamente.`);
      void queryClient.invalidateQueries({ queryKey: ['sales', 'statuses'] });
    },
    onError: (error) => {
      toastError(
        'No se pudo eliminar el estado',
        error instanceof ApiError ? error.message : 'Inténtalo de nuevo.',
      );
    },
  });

  const handleDelete = async (id: string, name: string) => {
    const accepted = await confirm({
      title: `Eliminar estado "${name}"`,
      description:
        'No se pueden eliminar estados que estén en uso por alguna venta. Los estados predeterminados no se pueden eliminar.',
      confirmLabel: 'Eliminar estado',
      variant: 'danger',
    });
    if (accepted) deleteStatus.mutate(id);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Estados de venta"
        description="Gestiona los estados disponibles para las ventas. Los estados predeterminados no se pueden eliminar."
      />

      {adding ? (
        <Card className="p-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (newStatusName.trim()) createStatus.mutate();
            }}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <label className="flex-1 space-y-1.5 text-sm font-medium text-ink">
              Nuevo estado
              <Input
                autoFocus
                maxLength={60}
                value={newStatusName}
                onChange={(event) => setNewStatusName(event.target.value)}
                placeholder="Ej. En revisión"
                required
              />
            </label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setAdding(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                loading={createStatus.isPending}
                disabled={!newStatusName.trim()}
              >
                Guardar estado
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-line p-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              Estados de venta
            </p>
            <p className="text-xs text-muted">
              Los estados en negrita son predeterminados y no se pueden eliminar.
            </p>
          </div>
          <div className="flex gap-2">
            {admin ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setAdding(true)}
                leftIcon={<Plus className="h-4 w-4" />}
              >
                Agregar estado
              </Button>
            ) : null}
          </div>
        </div>

        {query.isLoading ? (
          <div className="p-4 text-center text-sm text-muted">Cargando estados…</div>
        ) : statuses.length === 0 ? (
          <EmptyState
            icon={Plus}
            title="Sin estados de venta"
            description="No hay estados configurados."
          />
        ) : (
          <div className="divide-y divide-line">
            {statuses.map((status: { id: string; name: string }) => {
              const isBuiltIn = BUILT_IN_STATUSES.some(
                (b) => b.value === status.id || b.label === status.name,
              );
              return (
                <div
                  key={status.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-elevated/30 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 shrink-0">{status.id.charAt(0)}</span>
                    <div>
                      <p className={cn('text-sm font-medium text-ink', isBuiltIn ? 'font-bold' : '')}>
                        {status.name}
                      </p>
                      {isBuiltIn ? (
                        <p className="text-[10px] text-muted">Predeterminado</p>
                      ) : null}
                    </div>
                  </div>
                  {!isBuiltIn && admin ? (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(status.id, status.name)}
                      disabled={deleteStatus.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {customStatuses.length === 0 && admin ? (
        <div className="flex items-center justify-center py-8 text-sm text-muted">
          No hay estados personalizados de venta.
        </div>
      ) : null}
    </div>
  );
};
