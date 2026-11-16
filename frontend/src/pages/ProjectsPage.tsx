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
        error instanceof ApiError ? error.message : 'Inténtalo de nuevo.',
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
        'Se eliminarán el proyecto y todas sus tareas asignadas. Esta acción no se puede deshacer.',
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
          value={counts ? formatNumber(counts.total) : '—'}
          hint="Total registrados"
          icon={FolderKanban}
          tone="brand"
          loading={query.isLoading}
        />
        <StatCard
          label="Activos"
          value={counts ? formatNumber(counts.ACTIVE) : '—'}
          hint="En ejecución"
          icon={Clock3}
          tone="amber"
          loading={query.isLoading}
        />
        <StatCard
          label="Terminados"
          value={counts ? formatNumber(counts.COMPLETED) : '—'}
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
            placeholder="Buscar proyecto o empresa…"
            className="sm:w-80"
          />
          <div className="flex flex-1 items-center gap-2">
            {hasFilters ? (
              <Button variant="ghost" size="sm" onClick={() => setSearch('')}>
                Limpiar búsqueda
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
                  : 'Todavía no hay proyectos terminados'
            }
            description={
              hasFilters
                ? 'Prueba con otra búsqueda.'
                : admin
                  ? 'Crea un proyecto y asigna tareas al equipo para empezar.'
                  : 'Cuando el administrador registre proyectos aparecerán aquí.'
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
            <div className="table-wrap overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Proyecto</th>
                    <th>Empresa</th>
                    <th>Responsable</th>
                    <th className="text-center">Progreso</th>
                    <th className="text-center">Tareas</th>
                    <th>Estado</th>
                    <th className="text-center">Cierre</th>
                    <th className="w-16 text-right">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <tr
                      key={project.id}
                      onClick={() => setDetailId(project.id)}
                      className="cursor-pointer hover:bg-elevated/50 transition-colors"
                    >
                      <td>
                        <div className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-ink hover:text-brand-strong dark:hover:text-brand">
                            {project.name}
                          </span>
                          {project.description ? (
                            <p className="mt-0.5 truncate text-xs text-muted">
                              {project.description}
                            </p>
                          ) : null}
                        </div>
                      </td>
                      <td className="max-w-[180px] truncate text-xs text-muted">
                        {project.company?.name ?? '—'}
                      </td>
                      <td>
                        <span className="inline-flex items-center gap-2 text-xs text-muted">
                          {project.manager ? (
                            <>
                              <Avatar name={project.manager.name} src={project.manager.avatarUrl} size="xs" />
                              {project.manager.name}
                            </>
                          ) : (
                            '—'
                          )}
                        </span>
                      </td>
                      <td className="whitespace-nowrap text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[10px] font-semibold text-muted">
                            {project.taskCounts.progress}%
                          </span>
                          <ProgressBar
                            value={project.taskCounts.progress}
                            tone={
                              project.taskCounts.progress === 100 ? 'success' : 'brand'
                            }
                            label={`Progreso de ${project.name}`}
                            className="h-1.5 w-[120px]"
                          />
                        </div>
                      </td>
                      <td className="whitespace-nowrap text-center text-xs tabular-nums text-muted">
                        {project.taskCounts.completed}/{project.taskCounts.total}
                      </td>
                      <td>
                        <ProjectStatusBadge status={project.status} />
                      </td>
                      <td className="whitespace-nowrap text-center text-xs text-muted">
                        {formatDate(project.dueDate) ?? '—'}
                      </td>
                      <td className="text-right">
                        <Dropdown
                          trigger={({ toggle }) => (
                            <button
                              type="button"
                              onClick={(e) => {
                                e?.stopPropagation();
                                toggle();
                              }}
                              className="focus-ring rounded-lg p-1.5 text-muted transition hover:bg-elevated hover:text-ink"
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
                                onClick={(e) => {
                                  e?.stopPropagation();
                                  close();
                                  setDetailId(project.id);
                                }}
                              >
                                Ver detalle
                              </DropdownItem>
                              {admin ? (
                                <>
                                  <DropdownItem
                                    icon={<Pencil className="h-4 w-4" />}
                                    onClick={(e) => {
                                      e?.stopPropagation();
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
                                    onClick={(e) => {
                                      e?.stopPropagation();
                                      close();
                                      void onDelete(project);
                                    }}
                                  >
                                    Eliminar
                                  </DropdownItem>
                                </>
                              ) : null}
                            </>
                          )}
                        </Dropdown>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
