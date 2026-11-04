import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  CalendarDays,
  Download,
  File as FileIcon,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  ListChecks,
  Phone,
  Trash2,
  UploadCloud,
  Users,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar } from '@/components/ui/Avatar';
import { ProjectStatusBadge } from '@/components/ui/StatusBadges';
import { useAuth } from '@/providers/AuthProvider';
import { useConfirm } from '@/providers/ConfirmProvider';
import { useToast } from '@/providers/ToastProvider';
import { projectsApi, unwrap } from '@/lib/endpoints';
import { ApiError } from '@/lib/api';
import { isAdmin } from '@/lib/permissions';
import { cn } from '@/lib/cn';
import { formatBytes, formatDate, formatDateTime, formatNumber } from '@/lib/format';
import type { ProjectFile } from '@/types';

const extFromName = (name: string): string => {
  const index = name.lastIndexOf('.');
  return index >= 0 ? name.slice(index + 1).toLowerCase() : '';
};

const FILE_STYLES: Record<string, { icon: typeof FileIcon; tone: string }> = {
  pdf: { icon: FileText, tone: 'bg-rose-500/10 text-rose-500' },
  doc: { icon: FileText, tone: 'bg-blue-500/10 text-blue-500' },
  docx: { icon: FileText, tone: 'bg-blue-500/10 text-blue-500' },
  txt: { icon: FileText, tone: 'bg-slate-500/10 text-slate-400' },
  xls: { icon: FileSpreadsheet, tone: 'bg-emerald-500/10 text-emerald-500' },
  xlsx: { icon: FileSpreadsheet, tone: 'bg-emerald-500/10 text-emerald-500' },
  csv: { icon: FileSpreadsheet, tone: 'bg-emerald-500/10 text-emerald-500' },
  ppt: { icon: FileText, tone: 'bg-amber-500/10 text-amber-500' },
  pptx: { icon: FileText, tone: 'bg-amber-500/10 text-amber-500' },
  jpg: { icon: FileImage, tone: 'bg-violet-500/10 text-violet-500' },
  jpeg: { icon: FileImage, tone: 'bg-violet-500/10 text-violet-500' },
  png: { icon: FileImage, tone: 'bg-violet-500/10 text-violet-500' },
  gif: { icon: FileImage, tone: 'bg-violet-500/10 text-violet-500' },
  webp: { icon: FileImage, tone: 'bg-violet-500/10 text-violet-500' },
  svg: { icon: FileImage, tone: 'bg-violet-500/10 text-violet-500' },
  zip: { icon: FileArchive, tone: 'bg-orange-500/10 text-orange-500' },
  rar: { icon: FileArchive, tone: 'bg-orange-500/10 text-orange-500' },
  '7z': { icon: FileArchive, tone: 'bg-orange-500/10 text-orange-500' },
};

const fileStyle = (file: ProjectFile) =>
  FILE_STYLES[extFromName(file.originalName)] ?? { icon: FileIcon, tone: 'bg-elevated text-muted' };

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);

  const query = useQuery({
    queryKey: ['projects', 'detail', projectId],
    queryFn: async () => unwrap(await projectsApi.get(projectId as string)),
    enabled: open && Boolean(projectId),
  });

  const filesQuery = useQuery({
    queryKey: ['projects', 'files', projectId],
    queryFn: async () => unwrap(await projectsApi.listFiles(projectId as string)),
    enabled: open && Boolean(projectId),
  });

  const uploadFile = useMutation({
    mutationFn: async (file: File) => {
      setUploadingCount((count) => count + 1);
      return projectsApi.uploadFile(projectId as string, file);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects', 'files', projectId] });
    },
    onError: (error) => {
      toastError(
        'No se pudo subir el archivo',
        error instanceof ApiError ? error.message : 'Inténtalo de nuevo.',
      );
    },
    onSettled: () => {
      setUploadingCount((count) => Math.max(0, count - 1));
    },
  });

  const removeFile = useMutation({
    mutationFn: (fileId: string) =>
      projectsApi.removeFile(projectId as string, fileId),
    onSuccess: () => {
      success('Archivo eliminado', 'El archivo se quitó del proyecto.');
      void queryClient.invalidateQueries({ queryKey: ['projects', 'files', projectId] });
    },
    onError: (error) => {
      toastError(
        'No se pudo eliminar',
        error instanceof ApiError ? error.message : 'Inténtalo de nuevo.',
      );
    },
  });

  const onPickFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      // Cada archivo se sube de forma secuencial para no saturar la API.
      await uploadFile.mutateAsync(file).catch(() => undefined);
    }
  };

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    void onPickFiles(event.dataTransfer.files);
  };

  const onDeleteFile = async (file: ProjectFile) => {
    const accepted = await confirm({
      title: `Eliminar ${file.originalName}`,
      description: 'El archivo se eliminará del proyecto. Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar archivo',
      variant: 'danger',
    });
    if (accepted) removeFile.mutate(file.id);
  };

  const project = query.data;
  const files = filesQuery.data ?? [];
  const memberIds = new Set(project?.tasks.map((task) => task.assigneeId) ?? []);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={project?.name ?? 'Detalle del proyecto'}
      description="Consulta los datos del proyecto y sus archivos."
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
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Columna izquierda: datos del proyecto */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <ProjectStatusBadge status={project.status} />
              {project.company ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                  <Building2 className="h-3.5 w-3.5" />
                  {project.company.name}
                </span>
              ) : (
                <span className="text-xs text-muted">Sin empresa</span>
              )}
              <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted">
                <Users className="h-3.5 w-3.5" />
                {formatNumber(memberIds.size)} integrantes
              </span>
            </div>

              <dl className="divide-y divide-line rounded-xl border border-line bg-elevated/20">
                <div className="px-4 py-3">
                  <dt className="text-[11px] uppercase tracking-wide text-muted">Descripción</dt>
                  <dd className="mt-1 whitespace-pre-line text-sm leading-6 text-ink">
                    {project.description || 'Sin descripción.'}
                  </dd>
                </div>

                <div className="flex items-center gap-3 px-4 py-3">
                  <Phone className="h-4 w-4 shrink-0 text-muted" />
                  <div className="min-w-0">
                    <dt className="text-[11px] uppercase tracking-wide text-muted">Teléfono</dt>
                    <dd className="mt-0.5 text-sm text-ink">{project.phone || 'Sin teléfono'}</dd>
                  </div>
                </div>

                <div className="flex items-center gap-3 px-4 py-3">
                  <Building2 className="h-4 w-4 shrink-0 text-muted" />
                  <div className="min-w-0">
                    <dt className="text-[11px] uppercase tracking-wide text-muted">Empresa</dt>
                    <dd className="mt-0.5 truncate text-sm text-ink">
                      {project.company?.name ?? 'Sin empresa'}
                    </dd>
                  </div>
                </div>

                <div className="flex items-center gap-3 px-4 py-3">
                  {project.manager ? (
                    <Avatar
                      name={project.manager.name}
                      src={project.manager.avatarUrl}
                      size="sm"
                      className="shrink-0"
                    />
                  ) : (
                    <Users className="h-4 w-4 shrink-0 text-muted" />
                  )}
                  <div className="min-w-0">
                    <dt className="text-[11px] uppercase tracking-wide text-muted">Responsable</dt>
                    <dd className="mt-0.5 truncate text-sm font-medium text-ink">
                      {project.manager?.name ?? 'Sin asignar'}
                    </dd>
                  </div>
                </div>

                <div className="flex items-center gap-3 px-4 py-3">
                  <CalendarDays className="h-4 w-4 shrink-0 text-muted" />
                  <div className="min-w-0">
                    <dt className="text-[11px] uppercase tracking-wide text-muted">Inicio</dt>
                    <dd className="mt-0.5 text-sm text-ink">{formatDate(project.startDate)}</dd>
                  </div>
                </div>

                <div className="flex items-center gap-3 px-4 py-3">
                  <CalendarDays className="h-4 w-4 shrink-0 text-muted" />
                  <div className="min-w-0">
                    <dt className="text-[11px] uppercase tracking-wide text-muted">Entrega</dt>
                    <dd className="mt-0.5 text-sm text-ink">{formatDate(project.dueDate)}</dd>
                  </div>
                </div>
              </dl>
            </div>

          {/* Columna derecha: archivos del proyecto */}
          <div className="space-y-3">
            <div
              role="button"
              tabIndex={0}
              aria-label="Subir archivos"
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') fileInputRef.current?.click();
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-7 text-center transition',
                dragging
                  ? 'border-brand bg-brand/5'
                  : 'border-line bg-elevated/40 hover:border-brand hover:bg-brand/5',
              )}
            >
              <UploadCloud className="h-8 w-8 text-muted" />
              <p className="mt-3 text-sm font-semibold text-ink">Subir archivos de todo tipo</p>
              <p className="mt-1 text-xs text-muted">
                Arrastra y suelta, o haz clic aquí para seleccionar. <br />
                PDF, Word, Excel, imágenes… hasta 10 MB.
              </p>
              {uploadingCount > 0 ? (
                <span className="mt-3 inline-flex items-center gap-2 text-xs text-muted">
                  <Spinner className="h-3.5 w-3.5" /> Subiendo {uploadingCount} archivo
                  {uploadingCount === 1 ? '' : 's'}…
                </span>
              ) : null}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(event) => {
                  void onPickFiles(event.target.files);
                  event.target.value = '';
                }}
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <FileText className="h-4 w-4 text-muted" /> Archivos subidos
                </h3>
                <span className="text-[11px] text-muted">{files.length} archivo{files.length === 1 ? '' : 's'}</span>
              </div>

              {filesQuery.isLoading ? (
                <div className="flex justify-center py-6">
                  <Spinner className="h-5 w-5" label="Cargando archivos" />
                </div>
              ) : files.length === 0 ? (
                <EmptyState
                  icon={ListChecks}
                  title="Aún no hay archivos"
                  description="Sube el primer archivo del proyecto: documentos, imágenes, hojas de cálculo…"
                  compact
                />
              ) : (
                <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {files.map((file) => {
                    const style = fileStyle(file);
                    const Icon = style.icon;
                    const canDelete = admin || file.uploadedById === user?.id;
                    return (
                      <li
                        key={file.id}
                        className="flex items-center gap-3 rounded-xl border border-line bg-elevated/40 p-2.5"
                      >
                        <span
                          className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                            style.tone,
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p
                            className="truncate text-[13px] font-medium text-ink"
                            title={file.originalName}
                          >
                            {file.originalName}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] text-muted">
                            {formatBytes(file.size)}
                            {file.uploadedBy ? ` · ${file.uploadedBy.name}` : ''}
                            {` · ${formatDateTime(file.createdAt)}`}
                          </p>
                        </div>
                        <a
                          href={`/uploads/projects/${file.storedName}`}
                          download={file.originalName}
                          className="focus-ring rounded-lg p-1.5 text-muted transition hover:bg-elevated hover:text-ink"
                          aria-label={`Descargar ${file.originalName}`}
                          title="Descargar"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                        {canDelete ? (
                          <button
                            type="button"
                            onClick={() => void onDeleteFile(file)}
                            className="focus-ring rounded-lg p-1.5 text-muted transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                            aria-label={`Eliminar ${file.originalName}`}
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
};
