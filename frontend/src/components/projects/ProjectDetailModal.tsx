import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  CheckCircle2,
  ListChecks,
  Pencil,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Select } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ProjectStatusBadge, TaskStatusBadge } from '@/components/ui/StatusBadges';
import { useAuth } from '@/providers/AuthProvider';
import { useConfirm } from '@/providers/ConfirmProvider';
import { useToast } from '@/providers/ToastProvider';
import { projectsApi, unwrap } from '@/lib/endpoints';
import { ApiError } from '@/lib/api';
import { isAdmin } from '@/lib/permissions';
import { formatDate, formatNumber } from '@/lib/format';
import { TASK_STATUS_LABELS } from '@/lib/labels';
import { TaskFormModal } from './TaskFormModal';
import type { ProjectTask, TaskStatus } from '@/types';

export const ProjectDetailModal = ({
  open,
  onClose,
  projectId,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string | null;
}) => {
  const { user } = useAuth();
  const { confirm } = useConfirm();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();
  const admin = isAdmin(user?.role);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);

  const query = useQuery({
    queryKey: ['projects', 'detail', projectId],
    queryFn: async () => unwrap(await projectsApi.get(projectId as string)),
    enabled: open && Boolean(projectId),
  });

  const updateTask = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
      projectsApi.updateTask(projectId as string, taskId, { status }),
    onSuccess: () => {
      success('Estado actualizado', 'El avance de la tarea se actualizó.');
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      void queryClient.invalidateQueries({ queryKey: ['team'] });
    },
    onError: (error) => {
      toastError(
        'No se pudo actualizar',
        error instanceof ApiError ? error.message : 'Inténtalo de nuevo.',
      );
    },
  });

  const removeTask = useMutation({
    mutationFn: (taskId: string) =>
      projectsApi.removeTask(projectId as string, taskId),
    onSuccess: () => {
      success('Tarea eliminada', 'La tarea se quitó del proyecto.');
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      void queryClient.invalidateQueries({ queryKey: ['team'] });
    },
  });

  const project = query.data;
  const memberIds = new Set(project?.tasks.map((task) => task.assigneeId) ?? []);

  const onDeleteTask = async (task: ProjectTask) => {
    const accepted = await confirm({
      title: `Eliminar ${task.title}`,
      description: 'La tarea se eliminará del proyecto. Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar tarea',
      variant: 'danger',
    });
    if (accepted) removeTask.mutate(task.id);
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        size="xl"
        title={project?.name ?? 'Detalle del proyecto'}
        description="Consulta el equipo, las tareas asignadas y el avance del proyecto."
        footer={
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        }
      >
        {query.isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner className="h-6 w-6 text-brand" label="Cargando proyecto" />
          </div>
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : project ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <ProjectStatusBadge status={project.status} />
              {project.company ? (
                <span className="text-xs text-muted">{project.company.name}</span>
              ) : (
                <span className="text-xs text-muted">Sin empresa</span>
              )}
              <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted">
                <Users className="h-3.5 w-3.5" />
                {formatNumber(memberIds.size)} integrantes
              </span>
            </div>

            {project.description ? (
              <p className="whitespace-pre-line text-sm leading-6 text-muted">
                {project.description}
              </p>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-line bg-elevated/50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted">Responsable</p>
                <div className="mt-1.5 flex items-center gap-2">
                  {project.manager ? (
                    <>
                      <Avatar name={project.manager.name} src={project.manager.avatarUrl} size="xs" />
                      <span className="truncate text-sm font-medium text-ink">
                        {project.manager.name}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-muted">Sin asignar</span>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-line bg-elevated/50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted">Inicio</p>
                <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ink">
                  <CalendarDays className="h-3.5 w-3.5 text-muted" />
                  {formatDate(project.startDate)}
                </p>
              </div>
              <div className="rounded-xl border border-line bg-elevated/50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted">Entrega</p>
                <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ink">
                  <CalendarDays className="h-3.5 w-3.5 text-muted" />
                  {formatDate(project.dueDate)}
                </p>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-ink">Progreso general</span>
                <span className="font-semibold text-ink">{project.taskCounts.progress}%</span>
              </div>
              <ProgressBar
                value={project.taskCounts.progress}
                tone={project.taskCounts.progress === 100 ? 'success' : 'brand'}
                label="Progreso del proyecto"
              />
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
                <span>{project.taskCounts.total} tareas</span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  {project.taskCounts.completed} completadas
                </span>
                <span className="text-sky-600 dark:text-sky-400">
                  {project.taskCounts.inProgress} en proceso
                </span>
                <span className="text-amber-600 dark:text-amber-400">
                  {project.taskCounts.pending} pendientes
                </span>
              </div>
            </div>

            {memberIds.size > 0 ? (
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
                  <Users className="h-4 w-4 text-muted" /> Equipo del proyecto
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {Array.from(
                    new Map(
                      project.tasks.map((task) => [task.assigneeId, task.assignee]),
                    ).values(),
                  ).map((member) => {
                    const tasks = project.tasks.filter(
                      (task) => task.assigneeId === member.id,
                    );
                    const done = tasks.filter((task) => task.status === 'COMPLETED').length;
                    const progress = tasks.length
                      ? Math.round((done / tasks.length) * 100)
                      : 0;
                    return (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 rounded-xl border border-line p-3"
                      >
                        <Avatar name={member.name} src={member.avatarUrl} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-[13px] font-medium text-ink">
                              {member.name}
                            </p>
                            <span className="text-[11px] text-muted">{progress}%</span>
                          </div>
                          <ProgressBar
                            value={progress}
                            tone={progress === 100 ? 'success' : 'brand'}
                            className="mt-1.5"
                            label={`Progreso de ${member.name}`}
                          />
                          <p className="mt-1 text-[11px] text-muted">
                            {done} de {tasks.length} tareas completadas
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <Card>
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <ListChecks className="h-4 w-4 text-muted" /> Tareas asignadas
                </h3>
                {admin ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    leftIcon={<Plus className="h-3.5 w-3.5" />}
                    onClick={() => {
                      setEditingTask(null);
                      setTaskFormOpen(true);
                    }}
                  >
                    Nueva tarea
                  </Button>
                ) : null}
              </div>

              {project.tasks.length === 0 ? (
                <EmptyState
                  icon={ListChecks}
                  title="Sin tareas todavía"
                  description="Asigna tareas al equipo para empezar a medir el avance."
                  compact
                />
              ) : (
                <ul className="divide-y divide-line">
                  {project.tasks.map((task) => (
                    <li key={task.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <Avatar
                        name={task.assignee.name}
                        src={task.assignee.avatarUrl}
                        size="xs"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-ink">
                          {task.title}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-muted">
                          {task.assignee.name}
                          {task.dueDate ? ` · vence ${formatDate(task.dueDate)}` : ''}
                        </p>
                      </div>
                      {admin ? (
                        <Select
                          aria-label={`Estado de ${task.title}`}
                          value={task.status}
                          onChange={(event) =>
                            updateTask.mutate({
                              taskId: task.id,
                              status: event.target.value as TaskStatus,
                            })
                          }
                          className="h-8 w-auto min-w-[130px] text-xs"
                        >
                          {(Object.keys(TASK_STATUS_LABELS) as TaskStatus[]).map((status) => (
                            <option key={status} value={status}>
                              {TASK_STATUS_LABELS[status]}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <TaskStatusBadge status={task.status} />
                      )}
                      {admin ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTask(task);
                              setTaskFormOpen(true);
                            }}
                            className="focus-ring rounded-lg p-1.5 text-muted transition hover:bg-elevated hover:text-ink"
                            aria-label={`Editar ${task.title}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void onDeleteTask(task)}
                            className="focus-ring rounded-lg p-1.5 text-muted transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                            aria-label={`Eliminar ${task.title}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-muted/50" />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        ) : null}
      </Modal>

      {projectId ? (
        <TaskFormModal
          open={taskFormOpen}
          onClose={() => setTaskFormOpen(false)}
          projectId={projectId}
          task={editingTask}
        />
      ) : null}
    </>
  );
};
