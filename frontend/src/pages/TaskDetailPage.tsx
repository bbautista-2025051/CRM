import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ListChecks } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useAuth } from '@/providers/AuthProvider';
import { teamApi, unwrap } from '@/lib/endpoints';
import { canManageTeamTasks } from '@/lib/permissions';
import { formatDate, formatDateTime } from '@/lib/format';
import { ROLE_LABELS } from '@/lib/labels';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import type { BadgeTone } from '@/components/ui/Badge';
import type { TaskStatus } from '@/types';

const STATUS_LABELS: Record<TaskStatus, string> = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En proceso',
  COMPLETED: 'Completada',
};

const STATUS_TONES: Record<TaskStatus, BadgeTone> = {
  PENDING: 'brand',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
};

export const TaskDetailPage = () => {
  usePageTitle('Detalle de tarea');
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [task, setTask] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigneeId: '',
    status: 'PENDING' as TaskStatus,
    dueDate: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const canEdit = canManageTeamTasks(user?.role);
  const isAssignee = task ? task.assigneeId === user?.id : false;
  const canChangeStatus = isAssignee || canEdit;

  const loadTask = async () => {
    if (!taskId) return;
    try {
      setIsLoading(true);
      const data = unwrap(await teamApi.getTask(taskId));
      setTask(data);

      setFormData({
        title: data.title ?? '',
        description: data.description ?? '',
        assigneeId: data.assigneeId ?? '',
        status: data.status,
        dueDate: data.dueDate?.slice(0, 10) ?? '',
      });
    } catch (error: any) {
      setFormError(error?.message ?? 'No se pudo cargar la tarea.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTask();
  }, [taskId]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!taskId) return;

    try {
      const payload: Record<string, unknown> = {};
      if (formData.title.trim()) payload['title'] = formData.title.trim();
      if (formData.description !== undefined)
        payload['description'] = formData.description.trim() || null;
      if (formData.assigneeId) payload['assigneeId'] = formData.assigneeId;
      if (formData.status) payload['status'] = formData.status;
      if (formData.dueDate !== undefined) payload['dueDate'] = formData.dueDate || null;

      const data = unwrap(
        await teamApi.updateTask(task.task.project.id, taskId, payload),
      );
      setTask(data);
      setFormData({
        title: data.title ?? '',
        description: data.description ?? '',
        assigneeId: data.assigneeId ?? '',
        status: data.status,
        dueDate: data.dueDate?.slice(0, 10) ?? '',
      });
      setEditing(false);
      setFormError(null);
    } catch (error: any) {
      setFormError(error?.message ?? 'No se pudo actualizar la tarea.');
    }
  };

  const handleStatusChange = async (nextStatus: TaskStatus) => {
    if (!taskId) return;
    try {
      const data = unwrap(
        await teamApi.updateTask(task.task.project.id, taskId, {
          status: nextStatus,
        }),
      );
      setTask(data);
      setFormData((prev) => ({ ...prev, status: data.status }));
      setFormError(null);
    } catch (error: any) {
      setFormError(error?.message ?? 'No se pudo cambiar el estado.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-brand" />
      </div>
    );
  }

  if (formError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <ErrorState error={new Error(formError)} onRetry={() => loadTask()} />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <EmptyState
          icon={ListChecks}
          title="Tarea no encontrada"
          description="No se pudo encontrar la tarea solicitada."
          action={
            <Button variant="secondary" onClick={() => navigate('/team')}>
              Volver al equipo
            </Button>
          }
        />
      </div>
    );
  }

  const roleLabel =
    ROLE_LABELS[task.assignee.role as keyof typeof ROLE_LABELS] ??
    task.assignee.role;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Detalle de la tarea"
        description={`Tarea de ${task.project.name}`}
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/team')}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Volver al equipo
          </Button>
        }
      />

      <Card>
        <CardHeader
          title={task.title}
          description={task.description ?? 'Sin descripci├│n.'}
          action={
            <Badge tone={STATUS_TONES[task.status as TaskStatus]}>
              {STATUS_LABELS[task.status as TaskStatus]}
            </Badge>
          }
        />

        <CardBody className="pt-3">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="col-span-2 sm:col-span-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                Responsable
              </p>
              <div className="mt-1 flex items-center gap-2">
                <Avatar
                  name={task.assignee.name}
                  src={task.assignee.avatarUrl}
                  size="sm"
                />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-ink">
                    {task.assignee.name}
                  </p>
                  <p className="truncate text-[11px] text-muted">
                    {task.assignee.email}
                  </p>
                  <Badge tone="neutral">{roleLabel}</Badge>
                </div>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                Proyecto
              </p>
              <p className="mt-1 text-[13px] font-medium text-ink">
                {task.project.name}
              </p>
              <Badge tone="neutral">
                {task.project.status === 'ACTIVE' ? 'Activo' : 'Terminado'}
              </Badge>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                Fecha l├¡mite
              </p>
              <p className="mt-1 text-[13px] font-medium text-ink">
                {task.dueDate ? formatDate(task.dueDate) : 'Sin fecha'}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-line">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
              Historial de actividad
            </p>
            <p className="text-xs text-muted">
              La tarea se cre├│ en{' '}
              {formatDateTime(task.createdAt)} y se actualiz├│ por ├║ltima vez en{' '}
              {formatDateTime(task.updatedAt)}.
            </p>
          </div>
        </CardBody>
      </Card>

      {canEdit && (
        <Card>
          <CardHeader
            title="Editar tarea"
            description="Modifica los datos de la tarea. Los cambios se guardan al enviar."
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setEditing(!editing)}
              >
                {editing ? 'Cancelar' : 'Editar'}
              </Button>
            }
          />
          {editing && (
            <CardBody className="pt-3">
              {formError ? (
                <Alert variant="error" onClose={() => setFormError(null)}>
                  {formError}
                </Alert>
              ) : null}
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="label">T├¡tulo de la tarea</label>
                    <input
                      className="input-base w-full"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, title: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="label">Estado</label>
                    <select
                      className="input-base w-full"
                      value={formData.status}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          status: e.target.value as TaskStatus,
                        }))
                      }
                    >
                      <option value="PENDING">Pendiente</option>
                      <option value="IN_PROGRESS">En proceso</option>
                      <option value="COMPLETED">Completada</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Responsable</label>
                    <select
                      className="input-base w-full"
                      value={formData.assigneeId}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          assigneeId: e.target.value,
                        }))
                      }
                    >
                      <option value={task.assigneeId}>
                        {task.assignee.name} (actual)
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Fecha l├¡mite</label>
                    <input
                      type="date"
                      className="input-base w-full"
                      value={formData.dueDate}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, dueDate: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Descripci├│n</label>
                  <textarea
                    className="input-base w-full resize-y"
                    rows={3}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                  />
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  leftIcon={<ListChecks className="h-4 w-4" />}
                >
                  Guardar cambios
                </Button>
              </form>
            </CardBody>
          )}
        </Card>
      )}

      {canChangeStatus && !canEdit && (
        <Card>
          <CardHeader
            title="Estado de tu tarea"
            description="Actualiza el estado de tu tarea asignada."
          />
          <CardBody className="pt-3">
            <div className="flex flex-wrap gap-2">
              {(['PENDING', 'IN_PROGRESS', 'COMPLETED'] as TaskStatus[]).map(
                (status) => (
                  <Button
                    key={status}
                    variant="secondary"
                    size="sm"
                    disabled={task.status === status}
                    onClick={() => handleStatusChange(status)}
                  >
                    {STATUS_LABELS[status]}
                  </Button>
                ),
              )}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
};
