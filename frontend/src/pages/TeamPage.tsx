import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  FolderKanban,
  ListChecks,
  Plus,
  TrendingUp,
  Users,
} from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useUserOptions } from '@/hooks/queries';
import { useAuth } from '@/providers/AuthProvider';
import { teamApi, unwrap } from '@/lib/endpoints';
import { canManageTeamTasks } from '@/lib/permissions';
import { formatDate, formatNumber } from '@/lib/format';
import { ROLE_LABELS } from '@/lib/labels';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StatCard } from '@/components/ui/StatCard';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProjectStatusBadge, TaskStatusBadge } from '@/components/ui/StatusBadges';
import { Button } from '@/components/ui/Button';
import type { ProjectStatus } from '@/types';

export const TeamPage = () => {
  usePageTitle('Equipo');
  const navigate = useNavigate();
  const { user } = useAuth();
  const usersQuery = useUserOptions(true);

  const [search, setSearch] = useState('');
  const [projectId, setProjectId] = useState('');
  const [status, setStatus] = useState('');
  const [creatingTask, setCreatingTask] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);

  const query = useQuery({
    queryKey: ['team', 'overview'],
    queryFn: async () => unwrap(await teamApi.overview()),
  });

  const overview = query.data;

  const projects = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    return (overview?.projects ?? [])
      .filter((project) => !projectId || project.id === projectId)
      .filter((project) => !status || project.status === status)
      .map((project) => {
        if (!term) return project;
        const members = project.members.filter(
          (member) =>
            member.user.name.toLowerCase().includes(term) ||
            member.user.email.toLowerCase().includes(term) ||
            member.tasks.some((task) => task.title.toLowerCase().includes(term)),
        );
        return { ...project, members };
      })
      .filter(
        (project) =>
          !term ||
          project.name.toLowerCase().includes(term) ||
          (project.description ?? '').toLowerCase().includes(term) ||
          project.members.length > 0,
      );
  }, [overview?.projects, debouncedSearch, projectId, status]);

  const summary = overview?.summary;

  const navigateToTask = (taskId: string) => {
    navigate(`/team/task/${taskId}`);
  };

  const handleCreateTask = async (
    projectId: string,
    values: Record<string, unknown>,
  ) => {
    try {
      await teamApi.createTask(projectId, {
        title: String(values.title ?? '').trim(),
        description:
          values.description ? String(values.description).trim() || null : null,
        assigneeId: String(values.assigneeId ?? ''),
        status: values.status ?? 'PENDING',
        dueDate: values.dueDate ? String(values.dueDate) || null : null,
      });
      setCreatingTask(null);
      void query.refetch();
    } catch {
      void query.refetch();
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Equipo"
        description="Consulta quién trabaja en cada proyecto, sus tareas asignadas y el avance individual."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Integrantes"
          value={summary ? formatNumber(summary.members) : '—'}
          hint="Con tareas asignadas"
          icon={Users}
          tone="brand"
          loading={query.isLoading}
        />
        <StatCard
          label="Proyectos activos"
          value={summary ? formatNumber(summary.activeProjects) : '—'}
          hint={summary ? `${summary.projects} proyectos en total` : undefined}
          icon={FolderKanban}
          tone="sky"
          loading={query.isLoading}
        />
        <StatCard
          label="Tareas completadas"
          value={summary ? formatNumber(summary.completedTasks) : '—'}
          hint={summary ? `de ${summary.totalTasks} tareas` : undefined}
          icon={CheckCircle2}
          tone="emerald"
          loading={query.isLoading}
        />
        <StatCard
          label="Progreso general"
          value={summary ? `${summary.overallProgress}%` : '—'}
          hint={summary ? `${summary.inProgressTasks} en proceso` : undefined}
          icon={TrendingUp}
          tone="amber"
          loading={query.isLoading}
        />
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar integrante, tarea o proyecto…"
            className="sm:w-80"
          />
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <Select
              aria-label="Filtrar por proyecto"
              value={projectId}
              onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setProjectId(event.target.value)}
              className="w-auto min-w-[200px]"
            >
              <option value="">Todos los proyectos</option>
              {overview?.projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Filtrar por estado"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="w-auto min-w-[140px]"
            >
              <option value="">Todos los estados</option>
              <option value="ACTIVE">Activos</option>
              <option value="COMPLETED">Terminados</option>
            </Select>
            <span className="ml-auto text-xs text-muted">
              {projects.length} proyectos visibles
            </span>
          </div>
        </div>

        {query.isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-44 animate-pulse rounded-xl bg-elevated" />
            ))}
          </div>
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : projects.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Sin trabajo en equipo todavía"
            description={
              search || projectId || status
                ? 'No hay coincidencias con los filtros seleccionados.'
                : 'Crea proyectos y asigna tareas para visualizar el avance de cada integrante.'
            }
          />
        ) : (
          <div className="space-y-4 p-4">
            {projects.map((project) => {
              const isCreating = creatingTask === project.id;
              const users = usersQuery.data?.data ?? [];

              return (
                <section key={project.id} className="rounded-xl border border-line">
                  <div className="flex flex-wrap items-start gap-3 border-b border-line p-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-strong dark:text-brand">
                      <FolderKanban className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-sm font-semibold text-ink">
                          {project.name}
                        </h2>
                        <ProjectStatusBadge
                          status={project.status as ProjectStatus}
                        />
                      </div>
                      <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                        <span>{project.members.length} integrantes</span>
                        <span>·</span>
                        <span>{project.taskCounts.total} tareas</span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {formatDate(project.dueDate)}
                        </span>
                      </p>
                    </div>
                    <div className="w-full sm:w-56">
                      <div className="mb-1 flex items-center justify-between text-[11px]">
                        <span className="text-muted">Avance del proyecto</span>
                        <span className="font-semibold text-ink">
                          {project.progress}%
                        </span>
                      </div>
                      <ProgressBar
                        value={project.progress}
                        tone={
                          project.progress === 100 ? 'success' : 'brand'
                        }
                        label={`Progreso de ${project.name}`}
                      />
                      <div className="mt-1.5 flex gap-2 text-[10px] text-muted">
                        <span>{project.taskCounts.pending} pend.</span>
                        <span>{project.taskCounts.inProgress} proceso</span>
                        <span>{project.taskCounts.completed} hechas</span>
                      </div>
                    </div>
                    {canManageTeamTasks(user?.role) && (
                      <button
                        type="button"
                        onClick={() =>
                          setCreatingTask(isCreating ? null : project.id)
                        }
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-elevated hover:text-ink"
                        aria-label={
                          isCreating
                            ? 'Cancelar nueva tarea'
                            : 'Asignar nueva tarea'
                        }
                      >
                        {isCreating ? (
                          <ArrowRight className="h-4 w-4 rotate-180" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>

                  {isCreating && canManageTeamTasks(user?.role) && (
                    <div className="p-4 bg-elevated/30 border-t border-line">
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                        }}
                        className="space-y-3"
                      >
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="col-span-2 sm:col-span-1">
                            <label className="label">Título de la tarea</label>
                            <input
                              className="input-base w-full"
                              name="title"
                              defaultValue=""
                            />
                          </div>
                          <div>
                            <label className="label">Responsable</label>
                            <select
                              className="input-base w-full"
                              name="assigneeId"
                              defaultValue=""
                            >
                              <option value="">Selecciona un integrante</option>
                              {users.map((member) => (
                                <option key={member.id} value={member.id}>
                                  {member.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="label">Estado</label>
                            <select
                              className="input-base w-full"
                              name="status"
                              defaultValue="PENDING"
                            >
                              <option value="PENDING">Pendiente</option>
                              <option value="IN_PROGRESS">En proceso</option>
                              <option value="COMPLETED">Completada</option>
                            </select>
                          </div>
                          <div>
                            <label className="label">Fecha límite</label>
                            <input
                              type="date"
                              className="input-base w-full"
                              name="dueDate"
                              defaultValue=""
                            />
                          </div>
                        </div>
                        <label className="label">Descripción</label>
                        <textarea
                          className="input-base w-full resize-y"
                          rows={2}
                          name="description"
                          defaultValue=""
                        />
                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="secondary"
                            onClick={() => setCreatingTask(null)}
                            fullWidth
                          >
                            Cancelar
                          </Button>
                          <Button
                            variant="primary"
                            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                              event.preventDefault();
                              const form = event.currentTarget
                                .closest('form') as HTMLFormElement | null;
                              if (!form) return;
                              const formData = new FormData(form);
                              const values: Record<string, unknown> = {};
                              for (const [key, value] of formData) {
                                values[key] = value;
                              }
                              void handleCreateTask(project.id, values);
                            }}
                            fullWidth
                          >
                            Asignar tarea
                          </Button>
                        </div>
                      </form>
                    </div>
                  )}

                  {project.members.length === 0 ? (
                    <EmptyState
                      icon={ListChecks}
                      title="Sin tareas asignadas"
                      description="Asigna tareas a los integrantes para ver su avance aquí."
                      compact
                    />
                  ) : (
                    <div className="divide-y divide-line">
                      {project.members.map((member) => (
                        <div key={member.user.id} className="p-4">
                          <div className="flex flex-wrap items-center gap-3">
                            <Avatar
                              name={member.user.name}
                              src={member.user.avatarUrl}
                              size="sm"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-[13px] font-medium text-ink">
                                  {member.user.name}
                                </p>
                                <Badge tone="neutral">
                                  {ROLE_LABELS[member.user.role]}
                                </Badge>
                              </div>
                              <p className="truncate text-[11px] text-muted">
                                {member.user.email}
                              </p>
                            </div>
                            <div className="w-full sm:w-48">
                              <div className="mb-1 flex items-center justify-between text-[11px]">
                                <span className="text-muted">
                                  Progreso individual
                                </span>
                                <span className="font-semibold text-ink">
                                  {member.progress}%
                                </span>
                              </div>
                              <ProgressBar
                                value={member.progress}
                                tone={
                                  member.progress === 100 ? 'success' : 'brand'
                                }
                                label={`Progreso de ${member.user.name}`}
                              />
                              <p className="mt-1 text-[10px] text-muted">
                                {member.taskCounts.completed}/{member.taskCounts.total}{' '}
                                tareas completadas
                              </p>
                            </div>
                          </div>

                          <ul className="mt-3 space-y-1.5 sm:pl-11">
                            {member.tasks.map((task) => (
                              <li
                                key={task.id}
                                className="flex flex-wrap items-center gap-2 rounded-lg bg-elevated/50 px-2.5 py-1.5 cursor-pointer"
                                onClick={() => navigateToTask(task.id)}
                              >
                                <span className="min-w-0 flex-1 truncate text-xs text-ink">
                                  {task.title}
                                </span>
                                {task.dueDate ? (
                                  <span className="text-[10px] text-muted">
                                    {formatDate(task.dueDate)}
                                  </span>
                                ) : null}
                                <TaskStatusBadge status={task.status} />
                                <ArrowRight
                                  className="h-3 w-3 text-muted shrink-0 ml-1"
                                />
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};
