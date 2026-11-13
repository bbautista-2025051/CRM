import { useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  FolderKanban,
  ListChecks,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useConfirm } from '@/providers/ConfirmProvider';
import { useToast } from '@/providers/ToastProvider';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { projectsApi } from '@/lib/endpoints';
import { isAdmin } from '@/lib/permissions';
import { formatDate, formatNumber } from '@/lib/format';
import { ApiError } from '@/lib/api';
import { ProjectFormModal } from '@/components/projects/ProjectFormModal';
import { ProjectDetailModal } from '@/components/projects/ProjectDetailModal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { Pagination } from '@/components/ui/Pagination';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar } from '@/components/ui/Avatar';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StatCard } from '@/components/ui/StatCard';
import { Tabs } from '@/components/ui/Tabs';
import { ProjectStatusBadge } from '@/components/ui/StatusBadges';
import {
  Dropdown,
  DropdownItem,
  DropdownSeparator,
} from '@/components/ui/Dropdown';
import type { Project, ProjectStatus } from '@/types';

export const ProjectsPage = () => {
  usePageTitle('Proyectos');
  const { user } = useAuth();
  const { confirm } = useConfirm();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();
  const admin = isAdmin(user?.role);

  const [status, setStatus] = useState<ProjectStatus>('ACTIVE');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status]);

  useEffect(() => {
    if (searchParams.get('create') !== '1') return;
    setEditing(null);
    setFormOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete('create');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const query = useQuery({
    queryKey: ['projects', 'list', { status, page, search: debouncedSearch }],
    queryFn: () =>
      projectsApi.list({
        page,
        pageSize: 12,
        status,
        search: debouncedSearch || undefined,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => projectsApi.remove(id),
    onSuccess: () => {
      success('Proyecto eliminado', 'El proyecto y sus tareas se eliminaron.');
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      void queryClient.invalidateQueries({ queryKey: ['team'] });
    },
    onError: (error) => {
      toastError(
        'No se pudo eliminar',
        error instanceof ApiError ? error.message : 'Int├®ntalo de nuevo.',
      );
    },
  });

  const projects = query.data?.data ?? [];
  const meta = query.data?.meta;
  const counts = query.data?.counts;
  const hasFilters = Boolean(debouncedSearch);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (project: Project) => {
    setEditing(project);
    setFormOpen(true);
  };

  const onDelete = async (project: Project) => {
    const accepted = await confirm({
      title: `Eliminar ${project.name}`,
      description:
        'Se eliminar├ín el proyecto y todas sus tareas asignadas. Esta acci├│n no se puede deshacer.',
      confirmLabel: 'Eliminar proyecto',
      variant: 'danger',
    });
    if (accepted) remove.mutate(project.id);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Proyectos"
        description="Organiza el trabajo del equipo, separa proyectos activos y terminados, y revisa su avance."
        actions={
          admin ? (
            <Button onClick={openCreate} leftIcon={<Plus className="h-4 w-4" />}>
              Nuevo proyecto
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Proyectos"
          value={counts ? formatNumber(counts.total) : 'ÔÇö'}
          hint="Total registrados"
          icon={FolderKanban}
          tone="brand"
          loading={query.isLoading}
        />
        <StatCard
          label="Activos"
          value={counts ? formatNumber(counts.ACTIVE) : 'ÔÇö'}
          hint="En ejecuci├│n"
          icon={Clock3}
          tone="amber"
          loading={query.isLoading}
        />
        <StatCard
          label="Terminados"
          value={counts ? formatNumber(counts.COMPLETED) : 'ÔÇö'}
          hint="Completados"
          icon={CheckCircle2}
          tone="emerald"
          loading={query.isLoading}
        />
      </div>

      <Card>
        <div className="border-b border-line px-4 pt-1">
          <Tabs
            value={status}
            onChange={setStatus}
            items={[
              { value: 'ACTIVE', label: 'Activos', count: counts?.ACTIVE },
              { value: 'COMPLETED', label: 'Terminados', count: counts?.COMPLETED },
            ]}
          />
        </div>

        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar proyecto o empresaÔÇª"
            className="sm:w-80"
          />
          <div className="flex flex-1 items-center gap-2">
            {hasFilters ? (
              <Button variant="ghost" size="sm" onClick={() => setSearch('')}>
                Limpiar b├║squeda
              </Button>
            ) : null}
            <span className="ml-auto text-xs text-muted">
              {meta ? `${formatNumber(meta.total)} proyectos` : ''}
            </span>
          </div>
        </div>

        {query.isLoading ? (
          <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-56 animate-pulse rounded-xl bg-elevated" />
            ))}
          </div>
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : projects.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title={
              hasFilters
                ? 'No encontramos proyectos'
                : status === 'ACTIVE'
                  ? 'No hay proyectos activos'
                  : 'Todav├¡a no hay proyectos terminados'
            }
            description={
              hasFilters
                ? 'Prueba con otra b├║squeda.'
                : admin
                  ? 'Crea un proyecto y asigna tareas al equipo para empezar.'
                  : 'Cuando el administrador registre proyectos aparecer├ín aqu├¡.'
            }
            action={
              admin && !hasFilters ? (
                <Button size="sm" onClick={openCreate} leftIcon={<Plus className="h-4 w-4" />}>
                  Nuevo proyecto
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => (
                <article
                  key={project.id}
                  className="group flex flex-col rounded-xl border border-line bg-surface p-4 transition hover:border-brand/30 hover:shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-strong dark:text-brand">
                      <FolderKanban className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => setDetailId(project.id)}
                        className="block max-w-full truncate text-left text-sm font-semibold text-ink hover:text-brand-strong dark:hover:text-brand"
                      >
                        {project.name}
                      </button>
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {project.company?.name ?? 'Sin empresa'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <ProjectStatusBadge status={project.status} />
                      {admin ? (
                        <Dropdown
                          align="right"
                          trigger={({ toggle }) => (
                            <button
                              type="button"
                              onClick={toggle}
                              className="focus-ring rounded-lg p-1 text-muted transition hover:bg-elevated hover:text-ink"
                              aria-label={`Acciones para ${project.name}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          )}
                        >
                          {(close) => (
                            <>
                              <DropdownItem
                                icon={<Eye className="h-4 w-4" />}
                                onClick={() => {
                                  close();
                                  setDetailId(project.id);
                                }}
                              >
                                Ver detalle
                              </DropdownItem>
                              <DropdownItem
                                icon={<Pencil className="h-4 w-4" />}
                                onClick={() => {
                                  close();
                                  openEdit(project);
                                }}
                              >
                                Editar
                              </DropdownItem>
                              <DropdownSeparator />
                              <DropdownItem
                                icon={<Trash2 className="h-4 w-4" />}
                                danger
                                disabled={remove.isPending}
                                onClick={() => {
                                  close();
                                  void onDelete(project);
                                }}
                              >
                                Eliminar
                              </DropdownItem>
                            </>
                          )}
                        </Dropdown>
                      ) : null}
                    </div>
                  </div>

                  <p className="mt-3 line-clamp-2 min-h-[2.5rem] text-xs leading-5 text-muted">
                    {project.description ?? 'Sin descripci├│n registrada.'}
                  </p>

                  <div className="mt-3">
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="text-muted">Progreso</span>
                      <span className="font-semibold text-ink">
                        {project.taskCounts.progress}%
                      </span>
                    </div>
                    <ProgressBar
                      value={project.taskCounts.progress}
                      tone={project.taskCounts.progress === 100 ? 'success' : 'brand'}
                      label={`Progreso de ${project.name}`}
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted">
                    <span className="inline-flex items-center gap-1">
                      <ListChecks className="h-3.5 w-3.5" />
                      {project.taskCounts.completed}/{project.taskCounts.total} tareas
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatDate(project.dueDate)}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3">
                    <div className="flex min-w-0 items-center gap-2">
                      {project.manager ? (
                        <>
                          <Avatar
                            name={project.manager.name}
                            src={project.manager.avatarUrl}
                            size="xs"
                          />
                          <span className="truncate text-xs text-muted">
                            {project.manager.name}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-muted">Sin responsable</span>
                      )}
                    </div>
                    <Button
                      size="xs"
                      variant="secondary"
                      onClick={() => setDetailId(project.id)}
                    >
                      Ver detalle
                    </Button>
                  </div>
                </article>
              ))}
            </div>
            {meta ? <Pagination meta={meta} onPageChange={setPage} /> : null}
          </>
        )}
      </Card>

      {admin ? (
        <ProjectFormModal
          open={formOpen}
          onClose={() => setFormOpen(false)}
          project={editing}
        />
      ) : null}

      <ProjectDetailModal
        open={Boolean(detailId)}
        onClose={() => setDetailId(null)}
        projectId={detailId}
      />
    </div>
  );
};
