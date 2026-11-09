import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  Download,
  File as FileIcon,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  Phone,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';
import { Avatar } from '@/components/ui/Avatar';
import { ProjectStatusBadge } from '@/components/ui/StatusBadges';
import { useAuth } from '@/providers/AuthProvider';
import { useConfirm } from '@/providers/ConfirmProvider';
import { useToast } from '@/providers/ToastProvider';
import { projectsApi, unwrap } from '@/lib/endpoints';
import { ApiError } from '@/lib/api';
import { isAdmin } from '@/lib/permissions';
import { cn } from '@/lib/cn';
import { formatBytes, formatDate, formatDateTime, formatMoney } from '@/lib/format';
import type { ProjectComment, ProjectFile, ProjectStatus } from '@/types';

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

export const projectNumberLabel = (number?: number | null): string =>
  number ? `PRJ-${String(number).padStart(3, '0')}` : '—';

/** Encabezado centrado del wireframe: TITULO / EMPRESA / MONTO, sin líneas. */
const SheetHeader = ({
  title,
  company,
  amount,
}: {
  title: string;
  company: string;
  amount: string;
}) => (
  <header className="px-4 text-center">
    <h2 className="font-display text-[22px] font-bold tracking-[-0.02em] text-ink">{title}</h2>
    <p className="mt-1 font-display text-[16px] font-semibold tracking-[-0.01em] text-ink">
      {company}
    </p>
    <p className="mt-1 metric text-[15px] font-semibold text-ink">{amount}</p>
  </header>
);

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="px-4 py-2.5">
    <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</p>
    <div className="mt-1 text-sm text-ink">{children}</div>
  </div>
);

const RowInline = ({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: typeof CalendarDays;
  children: React.ReactNode;
}) => (
  <div className="flex items-center gap-3 px-4 py-2.5">
    {Icon ? <Icon className="h-4 w-4 shrink-0 text-muted" /> : null}
    <div className="min-w-0 flex-1">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</p>
      <div className="mt-0.5 text-sm text-ink">{children}</div>
    </div>
  </div>
);

/** Adjunto en línea, a la par del comentario que lo envió. */
const AttachmentRow = ({
  file,
  onDownload,
  onDelete,
}: {
  file: ProjectFile;
  onDownload?: (file: ProjectFile) => void;
  onDelete?: (file: ProjectFile) => void;
}) => {
  const style = fileStyle(file);
  const Icon = style.icon;
  return (
    <div className="mt-2 flex w-fit items-center gap-3 rounded-[10px] border border-line bg-surface px-2.5 py-2">
      <span
        className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', style.tone)}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium text-ink" title={file.originalName}>
          {file.originalName}
        </p>
        <p className="mt-0.5 text-[11px] text-muted">{formatBytes(file.size)}</p>
      </div>
      <button
        type="button"
        onClick={() => onDownload?.(file)}
        className="focus-ring rounded-lg p-1.5 text-muted transition hover:bg-elevated hover:text-ink"
        aria-label={`Descargar ${file.originalName}`}
      >
        <Download className="h-4 w-4" />
      </button>
      {onDelete ? (
        <button
          type="button"
          onClick={() => onDelete(file)}
          className="focus-ring rounded-lg p-1.5 text-muted transition hover:bg-rose-500/10 hover:text-rose-500"
          aria-label={`Eliminar ${file.originalName}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
};

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
  const [uploadingCount, setUploadingCount] = useState(0);
  const [commentDraft, setCommentDraft] = useState('');
  // Archivos subidos que aún no pertenecen a un comentario (pendientes de "Comentar").
  const [stagedFiles, setStagedFiles] = useState<ProjectFile[]>([]);

  const query = useQuery({
    queryKey: ['projects', 'detail', projectId],
    queryFn: async () => unwrap(await projectsApi.get(projectId as string)),
    enabled: open && Boolean(projectId),
  });

  const commentsQuery = useQuery({
    queryKey: ['projects', 'comments', projectId],
    queryFn: async () => unwrap(await projectsApi.listComments(projectId as string)),
    enabled: open && Boolean(projectId),
  });

  const removeFile = useMutation({
    mutationFn: (fileId: string) => projectsApi.removeFile(projectId as string, fileId),
    onError: (error) => {
      toastError(
        'No se pudo eliminar',
        error instanceof ApiError ? error.message : 'Inténtalo de nuevo.',
      );
    },
  });

  const uploadFile = useMutation({
    mutationFn: async (file: File) => {
      setUploadingCount((count) => count + 1);
      return projectsApi.uploadFile(projectId as string, file);
    },
    onSuccess: (response) => {
      const created = response.data as ProjectFile;
      setStagedFiles((current) => [...current, created]);
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

  const createComment = useMutation({
    mutationFn: (body: string) =>
      projectsApi.createComment(projectId as string, body, stagedFiles.map((file) => file.id)),
    onSuccess: (response) => {
      success('Comentario agregado', response.data.files?.length ? `${response.data.files.length} archivo(s) adjunto(s).` : undefined);
      setCommentDraft('');
      setStagedFiles([]);
      void queryClient.invalidateQueries({ queryKey: ['projects', 'comments', projectId] });
    },
    onError: (error) => {
      toastError(
        'No se pudo agregar el comentario',
        error instanceof ApiError ? error.message : 'Inténtalo de nuevo.',
      );
    },
  });

  const onPickFiles = async (picked: FileList | null) => {
    if (!picked?.length) return;
    for (const file of Array.from(picked)) {
      // Cada archivo se sube de forma secuencial para no saturar la API.
      await uploadFile.mutateAsync(file).catch(() => undefined);
    }
  };

  const onDownloadFile = async (file: ProjectFile) => {
    if (!projectId) return;
    try {
      const blob = await projectsApi.downloadFile(projectId, file.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.originalName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toastError(
        'No se pudo descargar el archivo',
        error instanceof ApiError ? error.message : 'Inténtalo de nuevo.',
      );
    }
  };

  const onDeleteFile = async (file: ProjectFile) => {
    const accepted = await confirm({
      title: `Eliminar ${file.originalName}`,
      description: 'El archivo se eliminará del comentario. Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar archivo',
      variant: 'danger',
    });
    if (accepted) {
      await removeFile.mutateAsync(file.id).catch(() => undefined);
      setStagedFiles((current) => current.filter((item) => item.id !== file.id));
      void queryClient.invalidateQueries({ queryKey: ['projects', 'comments', projectId] });
    }
  };

  const removeStagedFile = async (file: ProjectFile) => {
    await removeFile.mutateAsync(file.id).catch(() => undefined);
    setStagedFiles((current) => current.filter((item) => item.id !== file.id));
  };

  const canManageFile = (file: ProjectFile) => admin || file.uploadedById === user?.id;

  const onCloseInternal = () => {
    // Un archivo subido pero no comentado se descarta para dejar registros limpios.
    stagedFiles.forEach((file) => {
      void projectsApi.removeFile(projectId as string, file.id).catch(() => undefined);
    });
    setStagedFiles([]);
    onClose();
  };

  const onSubmitComment = () => {
    const body = commentDraft.trim();
    if (!body) return;
    createComment.mutate(body);
  };

  const project = query.data;
  const comments = commentsQuery.data ?? [];

  return (
    <Modal
      open={open}
      onClose={onCloseInternal}
      size="xl"
      fullWindow
      title="Detalle del proyecto"
      description="Ficha comercial y seguimiento del proyecto."
      footer={
        <Button variant="secondary" onClick={onCloseInternal}>
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
          {/* Encabezado del wireframe: TITULO / EMPRESA / MONTO */}
          <SheetHeader
            title={project.name}
            company={project.company?.name ?? 'Sin empresa'}
            amount={project.amount ? formatMoney(project.amount) : 'Sin monto'}
          />

          <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            {/* Columna izquierda: ficha */}
            <div className="h-fit rounded-xl border border-line bg-elevated/20">
              <div className="divide-y divide-line">
                <RowInline label="Vendedor">
                  {project.manager ? (
                    <span className="mt-0.5 flex items-center gap-2">
                      <Avatar
                        name={project.manager.name}
                        src={project.manager.avatarUrl}
                        size="xs"
                      />
                      <span className="truncate font-medium">{project.manager.name}</span>
                    </span>
                  ) : (
                    'Sin asignar'
                  )}
                </RowInline>
                <Row label="N.º de proyecto">
                  <span className="font-mono text-[13px] font-semibold">
                    {projectNumberLabel(project.number)}
                  </span>
                </Row>
                <Row label="Preventa">{project.preSales || 'Sin preventa'}</Row>
                <Row label="Solución">
                  {project.solution ? (
                    <span className="block whitespace-pre-line leading-6">{project.solution}</span>
                  ) : (
                    'Sin solución'
                  )}
                </Row>

                <RowInline label="Estado">
                  <ProjectStatusBadge status={project.status as ProjectStatus} />
                </RowInline>
                <RowInline label="Teléfono" icon={Phone}>
                  {project.phone || 'Sin teléfono'}
                </RowInline>
                <RowInline label="Inicio" icon={CalendarDays}>
                  {formatDate(project.startDate)}
                </RowInline>
                <RowInline label="Entrega" icon={CalendarDays}>
                  {formatDate(project.dueDate)}
                </RowInline>
              </div>
            </div>

            {/* Columna derecha: comentario nuevo + historial con adjuntos en línea */}
            <div className="space-y-5">
              <div className="rounded-xl border border-line bg-elevated/20 p-4">
                <div className="flex items-start gap-3">
                  <Avatar name={user?.name ?? ''} src={user?.avatarUrl} size="sm" className="mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <label
                      htmlFor="project-comment"
                      className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted"
                    >
                      Comentario para agregar
                    </label>
                    <textarea
                      id="project-comment"
                      value={commentDraft}
                      onChange={(event) => setCommentDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                          event.preventDefault();
                          onSubmitComment();
                        }
                      }}
                      rows={3}
                      maxLength={4000}
                      placeholder="Comentario para agregar…"
                      className="mt-2 w-full resize-none rounded-[10px] border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-brand focus:ring-2 focus:ring-brand/15"
                    />

                    {/* Archivos pendientes, a la par del comentario */}
                    {stagedFiles.length > 0 ? (
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {stagedFiles.map((file) => (
                          <li
                            key={file.id}
                            className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[12px] text-ink"
                          >
                            <span className="max-w-[160px] truncate" title={file.originalName}>
                              {file.originalName}
                            </span>
                            <span className="text-[11px] text-muted">{formatBytes(file.size)}</span>
                            <button
                              type="button"
                              onClick={() => void removeStagedFile(file)}
                              className="focus-ring -mr-1 rounded-full p-1 text-muted transition hover:bg-rose-500/10 hover:text-rose-500"
                              aria-label={`Quitar ${file.originalName}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    <div className="mt-2 flex items-center justify-end gap-1.5">
                      {uploadingCount > 0 ? (
                        <span className="mr-auto inline-flex items-center gap-2 text-xs text-muted">
                          Subiendo {uploadingCount} archivo{uploadingCount === 1 ? '' : 's'}…
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
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingCount > 0}
                        aria-label="Agregar archivos"
                        title="Agregar archivos"
                        className="focus-ring flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-sm transition hover:border-brand/40 hover:text-brand disabled:pointer-events-none disabled:opacity-50"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <Button
                        size="sm"
                        onClick={onSubmitComment}
                        disabled={!commentDraft.trim()}
                        loading={createComment.isPending}
                      >
                        Comentar
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-line bg-elevated/20">
                <div className="flex items-center justify-between border-b border-line px-4 py-3">
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted">
                    Historial de comentarios
                  </p>
                  <span className="text-xs text-muted">{comments.length}</span>
                </div>
                {comments.length === 0 ? (
                  <p className="px-4 py-6 text-center text-[13px] leading-5 text-muted">
                    Sin comentarios todavía. Escribe el primero arriba para dejar registro del
                    seguimiento.
                  </p>
                ) : (
                  <ul className="max-h-[420px] divide-y divide-line overflow-y-auto">
                    {comments.map((comment: ProjectComment) => (
                      <li key={comment.id} className="flex items-start gap-3 px-4 py-3.5">
                        <Avatar
                          name={comment.author?.name ?? 'Usuario'}
                          src={comment.author?.avatarUrl ?? null}
                          size="sm"
                          className="mt-0.5 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[13px] font-semibold text-ink">
                              {comment.author?.name ?? 'Usuario'}
                            </span>
                            <span className="text-[11px] text-muted">
                              {formatDateTime(comment.createdAt)}
                            </span>
                          </div>
                          <p className="mt-1 whitespace-pre-line text-[13px] leading-5 text-ink">
                            {comment.body}
                          </p>
                          {comment.files?.length ? (
                            <div>
                              {comment.files.map((file) => (
                                <AttachmentRow
                                  key={file.id}
                                  file={file}
                                  onDownload={(selected) => void onDownloadFile(selected)}
                                  onDelete={canManageFile(file) ? (selected) => void onDeleteFile(selected) : undefined}
                                />
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
};
