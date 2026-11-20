import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Clock3,
  Download,
  File as FileIcon,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  Plus,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/providers/AuthProvider';
import { useConfirm } from '@/providers/ConfirmProvider';
import { useToast } from '@/providers/ToastProvider';
import { salesApi, unwrap } from '@/lib/endpoints';
import { ApiError } from '@/lib/api';
import { formatBytes, formatDateTime } from '@/lib/format';
import type { BadgeTone } from '@/components/ui/Badge';
import type { Sale, TicketComment, TicketFile, TicketStage } from '@/types';

const STAGE_LABELS: Record<TicketStage, string> = {
  IN_PROGRESS: 'Progreso',
  ACCEPTED: 'Aceptada',
  REJECTED: 'Rechazada',
};

const STAGE_TONES: Record<TicketStage, BadgeTone> = {
  IN_PROGRESS: 'info',
  ACCEPTED: 'success',
  REJECTED: 'danger',
};

const STAGE_OPTIONS: Array<{
  value: TicketStage;
  label: string;
  icon: typeof Clock3;
}> = [
  { value: 'IN_PROGRESS', label: 'Progreso', icon: Clock3 },
  { value: 'ACCEPTED', label: 'Aceptada', icon: CheckCircle2 },
  { value: 'REJECTED', label: 'Rechazada', icon: XCircle },
];

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

const fileStyle = (file: TicketFile) =>
  FILE_STYLES[extFromName(file.originalName)] ?? {
    icon: FileIcon,
    tone: 'bg-elevated text-muted',
  };

const RowInline = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <div className="border-b border-line px-4 py-3 last:border-b-0">
    <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted">
      {label}
    </p>
    <div className="mt-0.5 text-sm text-ink">{children}</div>
  </div>
);

export const TicketDetailModal = ({
  saleId,
  open,
  onClose,
}: {
  saleId: string;
  open: boolean;
  onClose: () => void;
}) => {
  const { user } = useAuth();
  const { confirm } = useConfirm();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stagedFilesRef = useRef<TicketFile[]>([]);
  const isMountedRef = useRef(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [stagedFiles, setStagedFiles] = useState<TicketFile[]>([]);

  const saleQuery = useQuery({
    queryKey: ['sales', 'detail', saleId],
    queryFn: async () => unwrap(await salesApi.get(saleId)),
    enabled: open && Boolean(saleId),
  });

  const commentsQuery = useQuery({
    queryKey: ['sales', 'ticket-comments', saleId],
    queryFn: async () => unwrap(await salesApi.listTicketComments(saleId)),
    enabled: open && Boolean(saleId),
  });

  const sale = saleQuery.data;
  const stage = (sale?.ticketStage ?? 'IN_PROGRESS') as TicketStage;

  const updateStage = useMutation({
    mutationFn: (nextStage: TicketStage) =>
      salesApi.updateTicket(saleId, { ticketStage: nextStage }),
    onSuccess: () => {
      success('Etapa del ticket actualizada');
      void queryClient.invalidateQueries({ queryKey: ['sales', 'detail', saleId] });
      void queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
    onError: (error) => {
      toastError(
        'No se pudo cambiar la etapa',
        error instanceof ApiError ? error.message : 'Inténtalo de nuevo.',
      );
    },
  });

  const uploadFile = useMutation({
    mutationFn: (file: File) => salesApi.uploadTicketFile(saleId, file),
    onSuccess: (response) => {
      const file = response.data;
      if (!isMountedRef.current) {
        void salesApi.removeTicketFile(saleId, file.id).catch(() => undefined);
        return;
      }
      stagedFilesRef.current = [...stagedFilesRef.current, file];
      setStagedFiles(stagedFilesRef.current);
    },
    onError: (error) => {
      toastError(
        'No se pudo subir el archivo',
        error instanceof Error ? error.message : 'Inténtalo de nuevo.',
      );
    },
  });

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      const filesToRemove = stagedFilesRef.current;
      stagedFilesRef.current = [];
      void Promise.all(
        filesToRemove.map((file) =>
          salesApi.removeTicketFile(saleId, file.id).then(
            () => null,
            (error: unknown) => error,
          ),
        ),
      );
    };
  }, [saleId]);

  const createComment = useMutation({
    mutationFn: (body: string) =>
      salesApi.createTicketComment(saleId, body, stagedFiles.map((file) => file.id)),
    onSuccess: (response) => {
      success(
        'Comentario agregado',
        response.data.files?.length
          ? `${response.data.files.length} archivo(s) adjunto(s).`
          : undefined,
      );
      setCommentDraft('');
      setStagedFiles([]);
      stagedFilesRef.current = [];
      void queryClient.invalidateQueries({
        queryKey: ['sales', 'ticket-comments', saleId],
      });
    },
    onError: (error) => {
      toastError(
        'No se pudo agregar el comentario',
        error instanceof ApiError ? error.message : 'Inténtalo de nuevo.',
      );
    },
  });

  const deleteFile = useMutation({
    mutationFn: (fileId: string) => salesApi.removeTicketFile(saleId, fileId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['sales', 'ticket-comments', saleId],
      });
    },
    onError: (error) => {
      toastError(
        'No se pudo eliminar el archivo',
        error instanceof ApiError ? error.message : 'Inténtalo de nuevo.',
      );
    },
  });

  const onPickFiles = async (picked: FileList | null) => {
    if (!picked?.length) return;
    for (const file of Array.from(picked)) {
      await uploadFile.mutateAsync(file).catch(() => undefined);
    }
  };

  const onDownloadFile = async (file: TicketFile) => {
    try {
      const blob = await salesApi.downloadTicketFile(saleId, file.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.originalName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      toastError(
        'No se pudo descargar el archivo',
        error instanceof ApiError ? error.message : 'Inténtalo de nuevo.',
      );
    }
  };

  const onDeleteFile = async (file: TicketFile) => {
    const accepted = await confirm({
      title: `Eliminar ${file.originalName}`,
      description: 'El archivo se eliminará del ticket. Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar archivo',
      variant: 'danger',
    });
    if (!accepted) return;
    try {
      await deleteFile.mutateAsync(file.id);
    } catch {
      return;
    }
    setStagedFiles((current) => {
      const next = current.filter((item) => item.id !== file.id);
      stagedFilesRef.current = next;
      return next;
    });
  };

  const onSubmitComment = () => {
    const body = commentDraft.trim();
    if (body) createComment.mutate(body);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      fullWindow={false}
      size="full"
      title={sale ? `Ticket de la venta ${sale.saleNumber}` : 'Ticket'}
      description={sale?.ticketNumber ? `No. Ticket ${sale.ticketNumber}` : 'Detalle del ticket'}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      {saleQuery.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      ) : saleQuery.isError || !sale ? (
        <ErrorState error={saleQuery.error} onRetry={() => void saleQuery.refetch()} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="h-fit overflow-hidden rounded-xl border border-line bg-surface">
            <div className="border-b border-line px-4 py-3">
              <p className="text-sm font-semibold text-ink">Datos del ticket</p>
            </div>

            <RowInline label="No. Ticket">
              <span className="font-mono font-semibold">
                {sale.ticketNumber?.trim() || 'Sin número'}
              </span>
            </RowInline>

            <div className="border-b border-line px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted">
                  Etapa
                </p>
                <Badge tone={STAGE_TONES[stage]} dot>
                  {STAGE_LABELS[stage]}
                </Badge>
              </div>
              <div className="mt-3 space-y-1.5">
                {STAGE_OPTIONS.map(({ value, label, icon: Icon }) => {
                  const active = stage === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        if (!active) updateStage.mutate(value);
                      }}
                      disabled={updateStage.isPending}
                      aria-pressed={active}
                      className={`focus-ring flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
                        active
                          ? 'border-brand/40 bg-brand/10 font-semibold text-ink'
                          : 'border-line text-muted hover:border-line hover:bg-elevated hover:text-ink'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <RowInline label="Venta">
              <span className="font-mono">{sale.saleNumber}</span>
            </RowInline>
            <RowInline label="Cliente">
              {sale.client
                ? `${sale.client.firstName} ${sale.client.lastName}`
                : 'Sin cliente'}
            </RowInline>
            <RowInline label="Empresa">{sale.company?.name ?? 'Sin empresa'}</RowInline>
            <RowInline label="Responsable">{sale.owner?.name ?? '—'}</RowInline>
          </aside>

          <section className="space-y-4" aria-labelledby="ticket-comments-heading">
            <div>
              <h2 id="ticket-comments-heading" className="text-sm font-semibold text-ink">
                Comentarios y archivos del ticket
              </h2>
              <p className="mt-1 text-xs text-muted">
                Adjunta archivos de Microsoft Office (.doc, .docx, .xls, .xlsx, .ppt,
                .pptx), ZIP y cualquier otro tipo. Máximo 10 archivos de 10 MB por
                comentario.
              </p>
            </div>

            <div className="rounded-xl border border-line bg-elevated/20 p-4">
              <div className="flex items-start gap-3">
                <Avatar
                  name={user?.name ?? ''}
                  src={user?.avatarUrl}
                  size="sm"
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <label
                    htmlFor="ticket-comment"
                    className="text-[11px] font-semibold uppercase tracking-wide text-muted"
                  >
                    Comentario para agregar
                  </label>
                  <textarea
                    id="ticket-comment"
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
                    className="mt-2 w-full resize-y rounded-[10px] border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-brand focus:ring-2 focus:ring-brand/15"
                  />

                  {stagedFiles.length ? (
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {stagedFiles.map((file) => (
                        <li
                          key={file.id}
                          className="flex max-w-full items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-ink"
                        >
                          <FileIcon className="h-3.5 w-3.5 shrink-0 text-muted" />
                          <span className="max-w-[200px] truncate" title={file.originalName}>
                            {file.originalName}
                          </span>
                          <span className="shrink-0 text-muted">{formatBytes(file.size)}</span>
                          <button
                            type="button"
                            onClick={() => void onDeleteFile(file)}
                            className="focus-ring rounded-full p-1 text-muted hover:bg-rose-500/10 hover:text-rose-500"
                            aria-label={`Quitar ${file.originalName}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
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
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadFile.isPending || stagedFiles.length >= 10}
                      leftIcon={<Plus className="h-4 w-4" />}
                    >
                      Adjuntar archivos
                    </Button>
                    <Button
                      size="sm"
                      onClick={onSubmitComment}
                      disabled={!commentDraft.trim() || uploadFile.isPending}
                      loading={createComment.isPending}
                    >
                      Comentar
                    </Button>
                  </div>
                  {uploadFile.isPending ? (
                    <p className="mt-2 text-xs text-muted">Subiendo archivo…</p>
                  ) : null}
                </div>
              </div>
            </div>

            {commentsQuery.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : commentsQuery.isError ? (
              <ErrorState
                error={commentsQuery.error}
                onRetry={() => void commentsQuery.refetch()}
                compact
              />
            ) : commentsQuery.data?.length ? (
              <ol className="divide-y divide-line rounded-xl border border-line bg-elevated/10">
                {commentsQuery.data.map((comment: TicketComment) => (
                  <li key={comment.id} className="flex items-start gap-3 p-4">
                    <Avatar
                      name={comment.author?.name ?? 'Usuario'}
                      src={comment.author?.avatarUrl ?? null}
                      size="sm"
                      className="mt-0.5 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-ink">
                          {comment.author?.name ?? 'Usuario'}
                        </span>
                        <span className="text-[11px] text-muted">
                          {formatDateTime(comment.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 whitespace-pre-line text-sm leading-5 text-ink">
                        {comment.body}
                      </p>
                      {comment.files?.length ? (
                        <ul className="mt-2 flex flex-wrap gap-2">
                          {comment.files.map((file) => {
                            const style = fileStyle(file);
                            const FileTypeIcon = style.icon;
                            const canDeleteFile =
                              user?.role === 'ADMIN' || file.uploadedById === user?.id;
                            return (
                              <li
                                key={file.id}
                                className="flex max-w-full items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2"
                              >
                                <FileTypeIcon className="h-4 w-4 shrink-0 text-muted" />
                                <div className="min-w-0">
                                  <p
                                    className="max-w-[220px] truncate text-xs font-medium text-ink"
                                    title={file.originalName}
                                  >
                                    {file.originalName}
                                  </p>
                                  <p className="text-[10px] text-muted">{formatBytes(file.size)}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => void onDownloadFile(file)}
                                  className="focus-ring rounded-md p-1.5 text-muted hover:bg-elevated hover:text-ink"
                                  aria-label={`Descargar ${file.originalName}`}
                                >
                                  <Download className="h-4 w-4" />
                                </button>
                                {canDeleteFile ? (
                                  <button
                                    type="button"
                                    onClick={() => void onDeleteFile(file)}
                                    className="focus-ring rounded-md p-1.5 text-muted hover:bg-rose-500/10 hover:text-rose-500"
                                    aria-label={`Eliminar ${file.originalName}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                ) : null}
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
                Todavía no hay comentarios. Agrega el primero para iniciar el seguimiento del
                ticket.
              </p>
            )}
          </section>
        </div>
      )}
    </Modal>
  );
};
