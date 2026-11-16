import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { opportunitiesApi } from '@/lib/endpoints';
import { ApiError } from '@/lib/api';
import { isAdmin } from '@/lib/permissions';
import { useOpportunityStages } from '@/hooks/queries';
import { useAuth } from '@/providers/AuthProvider';
import { useConfirm } from '@/providers/ConfirmProvider';
import { useToast } from '@/providers/ToastProvider';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';

export const OpportunityStageManager = () => {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const { confirm } = useConfirm();
  const queryClient = useQueryClient();
  const admin = isAdmin(user?.role);
  const [adding, setAdding] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const stagesQuery = useOpportunityStages();
  const stages = stagesQuery.data ?? [];

  const createStage = useMutation({
    mutationFn: () => opportunitiesApi.createStage(newStageName.trim()),
    onSuccess: (response) => {
      success('Etapa creada', `${response.data.label} ya está disponible.`);
      setNewStageName('');
      setAdding(false);
      void queryClient.invalidateQueries({ queryKey: ['opportunities', 'stages'] });
    },
    onError: (error) => {
      toastError(
        'No se pudo crear la etapa',
        error instanceof ApiError ? error.message : 'Inténtalo de nuevo.',
      );
    },
  });

  const deleteStage = useMutation({
    mutationFn: (id: string) => opportunitiesApi.deleteStage(id),
    onSuccess: (response) => {
      success('Etapa eliminada', `${response.data.name} se eliminó correctamente.`);
      void queryClient.invalidateQueries({ queryKey: ['opportunities', 'stages'] });
    },
    onError: (error) => {
      toastError(
        'No se pudo eliminar la etapa',
        error instanceof ApiError ? error.message : 'Inténtalo de nuevo.',
      );
    },
  });

  const handleDelete = async (id: string, name: string) => {
    const accepted = await confirm({
      title: `Eliminar etapa "${name}"`,
      description:
        'No se pueden eliminar etapas que estén en uso por alguna oportunidad. Las etapas predeterminadas no se pueden eliminar.',
      confirmLabel: 'Eliminar etapa',
      variant: 'danger',
    });
    if (accepted) deleteStage.mutate(id);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Etapas de oportunidad"
        description="Consulta las etapas del proceso comercial y administra las etapas personalizadas."
      />

      {adding ? (
        <Card className="p-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (newStageName.trim()) createStage.mutate();
            }}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <label className="flex-1 space-y-1.5 text-sm font-medium text-ink">
              Nueva etapa
              <Input
                autoFocus
                maxLength={60}
                value={newStageName}
                onChange={(event) => setNewStageName(event.target.value)}
                placeholder="Ej. Revisión legal"
                required
              />
            </label>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setAdding(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                loading={createStage.isPending}
                disabled={!newStageName.trim()}
              >
                Guardar etapa
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              Etapas disponibles
            </p>
            <p className="text-xs text-muted">
              Las etapas predeterminadas no se pueden eliminar.
            </p>
          </div>
          {admin ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setAdding(true)}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Agregar etapa
            </Button>
          ) : null}
        </div>

        {stagesQuery.isLoading ? (
          <div className="p-4 text-center text-sm text-muted">Cargando etapas…</div>
        ) : stagesQuery.isError ? (
          <div className="p-4">
            <ErrorState error={stagesQuery.error} onRetry={() => void stagesQuery.refetch()} />
          </div>
        ) : stages.length === 0 ? (
          <EmptyState
            icon={Plus}
            title="Sin etapas"
            description="No hay etapas configuradas."
          />
        ) : (
          <div className="divide-y divide-line">
            {stages.map((stage) => (
              <div
                key={stage.value}
                className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-elevated/30"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 shrink-0">{stage.label.charAt(0)}</span>
                  <div>
                    <p className="text-sm font-medium text-ink">{stage.label}</p>
                    {!stage.isCustom ? (
                      <p className="text-[10px] text-muted">Predeterminada</p>
                    ) : null}
                  </div>
                </div>
                {stage.isCustom && admin ? (
                  <Button
                    variant="danger"
                    size="sm"
                    aria-label={`Eliminar etapa ${stage.label}`}
                    onClick={() => void handleDelete(stage.value, stage.label)}
                    disabled={deleteStage.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
