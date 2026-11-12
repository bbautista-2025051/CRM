import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Building2,
  CalendarDays,
  Download,
  File as FileIcon,
  FileArchive,
  Handshake,
  Image,
  Pencil,
  Target,
  UserRound,
  Trash2,
  X,
  Plus,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button, buttonStyles } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar } from '@/components/ui/Avatar';
import { SaleStatusBadge } from '@/components/ui/StatusBadges';
import { StageBadge } from '@/components/ui/StatusBadges';
import { useAuth } from '@/providers/AuthProvider';
import { useConfirm } from '@/providers/ConfirmProvider';
import { useToast } from '@/providers/ToastProvider';
import { salesApi, unwrap } from '@/lib/endpoints';
import { useSaleStages } from '@/hooks/queries';
import { ApiError } from '@/lib/api';
import { formatBytes, formatDate, formatDateTime, formatMoney } from '@/lib/format';
import type { Sale, SaleComment, SaleFile } from '@/types';

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

const fileStyle = (file: SaleFile) =>
  FILE_STYLES[extFromName(file.originalName)] ?? {
    icon: FileIcon,
    tone: 'bg-elevated text-muted',
  };

interface SaleFieldsDraft {
  notes: string;
}

export const saleNumberLabel = (number?: string | null): string =>
  number ? `V-${number}` : '—';

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

export const SaleDetailModal = ({
  saleId,
  onClose,
  onEdit,
}: {
  saleId: string | null;
  onClose: () => void;
  onEdit: (sale: Sale) => void;
}) => {
  const { user } = useAuth();
  const { confirm } = useConfirm();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stagedFilesRef = useRef<SaleFile[]>([]);
  const isMountedRef = useRef(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [stagedFiles, setStagedFiles] = useState<SaleFile[]>([]);

  const query = useQuery({
    queryKey: ['sales', 'detail', saleId],
    queryFn: async () => unwrap(await salesApi.get(saleId!)),
    enabled: Boolean(saleId),
  });

  const commentsQuery = useQuery({
    queryKey: ['sales', 'comments', saleId],
    queryFn: async () => unwrap(await salesApi.listComments(saleId!)),
    enabled: Boolean(saleId),
  });

  const sale = query.data;

  const uploadFile = useMutation({
    mutationFn: (file: File) => {
      // Convert File to the format expected by the service
      return salesApi.uploadFile(saleId!, file);
    },
    onSuccess: (response) => {
      const file = response.data;
      if (!isMountedRef.current) {
        void salesApi.removeFile(saleId!, file.id).catch((error: unknown) => {
          toastError(
            'No se pudo limpiar un archivo temporal',
            error instanceof ApiError ? error.message : 'El archivo quedó sin asociar.',
          );
        });
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

  useEffect(
    () => {
      isMountedRef.current = true;
      return () => {
        isMountedRef.current = false;
        const filesToRemove = stagedFilesRef.current;
        stagedFilesRef.current = [];
        void Promise.all(
          filesToRemove.map((file) =>
            salesApi.removeFile(file.opportunityId, file.id).then(() => null, (error: unknown) => error),
          ),
        ).then((results) => {
          const failures = results.filter((result) => result !== null);
          if (failures.length) {
            const firstError = failures[0];
            toastError(
              'No se pudieron limpiar algunos archivos temporales',
              firstError instanceof ApiError
                ? firstError.message
                : `${failures.length} archivo(s) quedaron sin asociar.`,
            );
          }
        });
      };
    },
    [saleId, toastError],
  );

  const createComment = useMutation({
    mutationFn: (body: string) =>
      salesApi.createComment(saleId!, body, stagedFiles.map((file) => file.id)),
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
        queryKey: ['sales', 'comments', saleId],
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
    mutationFn: (fileId: string) => salesApi.removeFile(saleId!, fileId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['sales', 'comments', saleId],
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

  const onDownloadFile = async (file: SaleFile) => {
    try {
      const blob = await salesApi.downloadFile(file.saleId, file.id);
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

  const onDeleteFile = async (file: SaleFile) => {
    const accepted = await confirm({
      title: `Eliminar ${file.originalName}`,
      description: 'El archivo se eliminará del comentario. Esta acción no se puede deshacer.',
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

  const removeStagedFile = async (file: SaleFile) => {
    await deleteFile.mutateAsync(file.id).catch(() => undefined);
    setStagedFiles((current) => current.filter((item) => item.id !== file.id));
  };

  const canManageFile = (file: SaleFile) =>
    user?.role === 'ADMIN' || file.uploadedById === user?.id;

  const canManage = sale
    ? user?.role === 'ADMIN' || (sale.ownerId && sale.ownerId === user?.id)
    : false;

  return (
    <Modal
      open={Boolean(saleId)}
      onClose={onClose}
      inline
      size="lg"
      title={sale?.saleNumber ?? 'Venta'}
      description={
        sale
          ? `${sale.client?.firstName} ${sale.client?.lastName} · ${sale.company?.name ?? 'Sin empresa'}`
          : 'Detalle de la venta'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          {sale && canManage ? (
            <Button onClick={() => onEdit(sale)} leftIcon={<Pencil className="h-4 w-4" />}>
              Editar
            </Button>
          ) : null}
        </>
      }
    >
      {query.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : query.isError || !sale ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} compact />
      ) : (
        <div className="mx-auto max-w-4xl space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <StageBadge
              stage={sale?.stage}
              label={sale?.status}
            />
            <SaleStatusBadge status={sale?.status} />
            <span className="text-xs text-muted">
              {sale?.saleNumber ?? ''}
            </span>
          </div>

          <div className="border-y border-line py-3.5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Importe
                </p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-ink">
                  {formatMoney(sale?.amount, sale?.currency)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Moneda
                </p>
                <p className="mt-1 text-lg font-semibold text-ink">{sale?.currency}</p>
              </div>
            </div>
          </div>

          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Fecha de venta
              </dt>
              <dd className="mt-1 flex items-center gap-1.5 text-sm text-ink">
                <CalendarDays className="h-3.5 w-3.5 text-muted" />
                {formatDate(sale?.saleDate)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Responsable
              </dt>
              <dd className="mt-1 flex items-center gap-2 text-sm text-ink">
                {sale?.owner ? (
                  <>
                    <Avatar name={sale.owner.name} size="xs" />
                    {sale.owner.name}
                  </>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Cliente
              </dt>
              <dd className="mt-1 flex items-center gap-1.5 text-sm text-ink">
                <UserRound className="h-3.5 w-3.5 text-muted" />
                {sale?.client ? (
                  <a
                    href={`/clients/${sale.client.id}`}
                    className="hover:text-brand-strong hover:underline dark:hover:text-brand"
                  >
                    {sale.client.firstName} {sale.client.lastName}
                  </a>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Empresa
              </dt>
              <dd className="mt-1 flex items-center gap-1.5 text-sm text-ink">
                <Building2 className="h-3.5 w-3.5 text-muted" />
                {sale?.company ? (
                  <a
                    href={`/companies/${sale.company.id}`}
                    className="hover:text-brand-strong hover:underline dark:hover:text-brand"
                  >
                    {sale.company.name}
                  </a>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Oportunidad
              </dt>
              <dd className="mt-1 flex items-center gap-1.5 text-sm text-ink">
                <Target className="h-3.5 w-3.5 text-muted" />
                {sale?.opportunity ? (
                  <a
                    href={`/negocio/oportunidad/${sale.opportunity.id}`}
                    className="hover:text-brand-strong hover:underline dark:hover:text-brand"
                  >
                    {sale.opportunity.name}
                  </a>
                ) : (
                  <span className="text-muted">Venta manual sin oportunidad</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Registrada
              </dt>
              <dd className="mt-1 text-sm text-ink">{formatDateTime(sale?.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Última actualización
              </dt>
              <dd className="mt-1 text-sm text-ink">{formatDateTime(sale?.updatedAt)}</dd>
            </div>
          </dl>

          {sale.notes ? (
            <div className="border-t border-line pt-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Observaciones
              </p>
              <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-ink">
                {sale.notes}
              </p>
            </div>
          ) : null}

          <section aria-labelledby="sale-comments-heading" className="space-y-4 border-t border-line pt-5">
            <div>
              <h2 id="sale-comments-heading" className="text-sm font-semibold text-ink">
                Comentarios y archivos
              </h2>
              <p className="mt-1 text-xs text-muted">
                Comparte actualizaciones y adjunta cualquier tipo de archivo, incluidos ZIP.
                Máximo 10 archivos de 10 MB cada uno por comentario.
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
                    htmlFor="sale-comment"
                    className="text-[11px] font-semibold uppercase tracking-wide text-muted"
                  >
                    Agregar comentario
                  </label>
                  <textarea
                    id="sale-comment"
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
                    placeholder="Escribe una actualización…"
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
                {commentsQuery.data.map((comment: SaleComment) => (
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
                            const FileTypeIcon = /\.(zip|rar|7z|tar|gz)$/i.test(
                              file.originalName,
                            )
                              ? FileArchive
                              : /\.(png|jpe?g|gif|webp|svg)$/i.test(file.originalName)
                              ? Image
                              : FileIcon;
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
                Todavía no hay comentarios. Agrega el primero para iniciar el seguimiento.
              </p>
            )}
          </section>

          <p className="flex items-center gap-1.5 text-[11px] text-muted">
            <Target className="h-3.5 w-3.5" />
            {canManage
              ? 'Tienes permiso para gestionar esta venta.'
              : 'Solo lectura: esta venta pertenece a otro responsable.'}
          </p>
        </div>
      )}
    </Modal>
  );
};