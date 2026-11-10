import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  CalendarDays,
  Download,
  File as FileIcon,
  FileArchive,
  Handshake,
  Image,
  Pencil,
  Plus,
  Target,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button, buttonStyles } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar } from '@/components/ui/Avatar';
import { SaleStatusBadge, StageBadge } from '@/components/ui/StatusBadges';
import { useAuth } from '@/providers/AuthProvider';
import { useConfirm } from '@/providers/ConfirmProvider';
import { useToast } from '@/providers/ToastProvider';
import { opportunitiesApi, unwrap } from '@/lib/endpoints';
import { ApiError } from '@/lib/api';
import { canDeleteOpportunity, canManageOpportunity } from '@/lib/permissions';
import { formatBytes, formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { OPPORTUNITY_STATUS_LABELS } from '@/lib/labels';
import type { Opportunity, OpportunityComment, OpportunityFile } from '@/types';

export const OpportunityDetailModal = ({
  opportunityId,
  onClose,
  onEdit,
}: {
  opportunityId: string | null;
  onClose: () => void;
  onEdit: (opportunity: Opportunity) => void;
}) => {
  const { user } = useAuth();
  const { confirm } = useConfirm();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stagedFilesRef = useRef<OpportunityFile[]>([]);
  const isMountedRef = useRef(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [stagedFiles, setStagedFiles] = useState<OpportunityFile[]>([]);

  const query = useQuery({
    queryKey: ['opportunities', 'detail', opportunityId],
    queryFn: async () => unwrap(await opportunitiesApi.get(opportunityId!)),
    enabled: Boolean(opportunityId),
  });

  const commentsQuery = useQuery({
    queryKey: ['opportunities', 'comments', opportunityId],
    queryFn: async () => unwrap(await opportunitiesApi.listComments(opportunityId!)),
    enabled: Boolean(opportunityId),
  });

  const opportunity = query.data;

  const uploadFile = useMutation({
    mutationFn: (file: File) => opportunitiesApi.uploadFile(opportunityId!, file),
    onSuccess: (response) => {
      const file = response.data;
      if (!isMountedRef.current) {
        void opportunitiesApi.removeFile(file.opportunityId, file.id).catch((error: unknown) => {
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
        error instanceof ApiError ? error.message : 'Inténtalo de nuevo.',
      );
    },
  });

  const createComment = useMutation({
    mutationFn: (body: string) =>
      opportunitiesApi.createComment(
        opportunityId!,
        body,
        stagedFiles.map((file) => file.id),
      ),
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
        queryKey: ['opportunities', 'comments', opportunityId],
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
    mutationFn: (fileId: string) => opportunitiesApi.removeFile(opportunityId!, fileId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['opportunities', 'comments', opportunityId],
      });
    },
    onError: (error) => {
      toastError(
        'No se pudo eliminar el archivo',
        error instanceof ApiError ? error.message : 'Inténtalo de nuevo.',
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
            opportunitiesApi.removeFile(file.opportunityId, file.id).then(
              () => null,
              (error: unknown) => error,
            ),
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
    [opportunityId, toastError],
  );

  const onPickFiles = async (picked: FileList | null) => {
    if (!picked?.length) return;
    for (const file of Array.from(picked)) {
      if (stagedFilesRef.current.length >= 10) {
        toastError('Límite de archivos', 'Puedes adjuntar hasta 10 archivos por comentario.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toastError('Archivo demasiado grande', `${file.name} supera el límite de 10 MB.`);
        continue;
      }
      try {
        await uploadFile.mutateAsync(file);
      } catch {
        // El error se comunica desde onError de la mutación; continuar con los demás archivos.
      }
    }
  };

  const onDownloadFile = async (file: OpportunityFile) => {
    try {
      const blob = await opportunitiesApi.downloadFile(file.opportunityId, file.id);
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

  const onDeleteFile = async (file: OpportunityFile) => {
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

  const remove = useMutation({
    mutationFn: () => opportunitiesApi.remove(opportunityId!),
    onSuccess: () => {
      success('Oportunidad eliminada', 'El registro se eliminó correctamente.');
      void queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    },
    onError: (error) => {
      toastError(
        'No se pudo eliminar',
        error instanceof ApiError ? error.message : 'Inténtalo de nuevo.',
      );
    },
  });

  const onDelete = async () => {
    if (!opportunity) return;
    const accepted = await confirm({
      title: `Eliminar ${opportunity.name}`,
      description:
        'Esta acción es permanente. Solo es posible si la oportunidad no tiene una venta asociada.',
      confirmLabel: 'Eliminar oportunidad',
      variant: 'danger',
    });
    if (accepted) remove.mutate();
  };

  const canManage = opportunity
    ? canManageOpportunity(user?.role, user?.id, opportunity.ownerId)
    : false;
  const canDelete = opportunity
    ? canDeleteOpportunity(
        user?.role,
        user?.id,
        opportunity.ownerId,
        Boolean(opportunity.sale),
      )
    : false;
  const canCreateSale =
    opportunity?.stage === 'GANADA' && !opportunity.sale && canManage;

  return (
    <Modal
      open={Boolean(opportunityId)}
      onClose={onClose}
      inline
      size="lg"
      title={opportunity?.name ?? 'Oportunidad'}
      description={
        opportunity
          ? `${opportunity.company?.name ?? 'Sin empresa'}${
              opportunity.client
                ? ` · ${opportunity.client.firstName} ${opportunity.client.lastName}`
                : ''
            }`
          : 'Detalle de la oportunidad'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          {opportunity && canCreateSale ? (
            <Link
              to={`/sales?create=1&opportunityId=${opportunity.id}`}
              className={buttonStyles({ variant: 'success' })}
              onClick={onClose}
            >
              <Handshake className="h-4 w-4" /> Registrar venta
            </Link>
          ) : null}
          {opportunity && canDelete ? (
            <Button
              variant="danger"
              onClick={() => void onDelete()}
              loading={remove.isPending}
              leftIcon={<Trash2 className="h-4 w-4" />}
            >
              Eliminar
            </Button>
          ) : null}
          {opportunity && canManage ? (
            <Button onClick={() => onEdit(opportunity)} leftIcon={<Pencil className="h-4 w-4" />}>
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
      ) : query.isError || !opportunity ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} compact />
      ) : (
        <div className="mx-auto max-w-4xl space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <StageBadge stage={opportunity.stage} />
            <Badge
              tone={
                opportunity.status === 'WON'
                  ? 'success'
                  : opportunity.status === 'LOST'
                    ? 'danger'
                    : 'info'
              }
            >
              {OPPORTUNITY_STATUS_LABELS[opportunity.status]}
            </Badge>
            <span className="text-xs text-muted">
              Creada {formatDateTime(opportunity.createdAt)}
            </span>
          </div>

          <div className="border-y border-line py-3.5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Importe estimado
                </p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-ink">
                  {formatMoney(opportunity.value)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Probabilidad
                </p>
                <p className="mt-1 text-lg font-semibold text-ink">
                  {opportunity.probability}%
                </p>
              </div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: `${Math.min(100, Math.max(0, opportunity.probability))}%` }}
              />
            </div>
          </div>

          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Empresa
              </dt>
              <dd className="mt-1 flex items-center gap-1.5 text-sm text-ink">
                <Building2 className="h-3.5 w-3.5 text-muted" />
                {opportunity.company ? (
                  <Link
                    to={`/companies/${opportunity.company.id}`}
                    className="hover:text-brand-strong hover:underline dark:hover:text-brand"
                  >
                    {opportunity.company.name}
                  </Link>
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
                {opportunity.client ? (
                  <Link
                    to={`/clients/${opportunity.client.id}`}
                    className="hover:text-brand-strong hover:underline dark:hover:text-brand"
                  >
                    {opportunity.client.firstName} {opportunity.client.lastName}
                  </Link>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Responsable
              </dt>
              <dd className="mt-1 flex items-center gap-2 text-sm text-ink">
                {opportunity.owner ? (
                  <>
                    <Avatar name={opportunity.owner.name} size="xs" />
                    {opportunity.owner.name}
                  </>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Cierre estimado
              </dt>
              <dd className="mt-1 flex items-center gap-1.5 text-sm text-ink">
                <CalendarDays className="h-3.5 w-3.5 text-muted" />
                {formatDate(opportunity.expectedCloseDate)}
              </dd>
            </div>
            {opportunity.wonAt ? (
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Ganada el
                </dt>
                <dd className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">
                  {formatDate(opportunity.wonAt)}
                </dd>
              </div>
            ) : null}
            {opportunity.lostAt ? (
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Perdida el
                </dt>
                <dd className="mt-1 text-sm text-rose-600 dark:text-rose-400">
                  {formatDate(opportunity.lostAt)}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Última actualización
              </dt>
              <dd className="mt-1 text-sm text-ink">
                {formatDateTime(opportunity.updatedAt)}
              </dd>
            </div>
          </dl>

          {opportunity.description ? (
            <div className="border-t border-line pt-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Descripción
              </p>
              <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-ink">
                {opportunity.description}
              </p>
            </div>
          ) : null}

          {opportunity.sale ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                    <Handshake className="h-4 w-4" />
                    Venta {opportunity.sale.saleNumber}
                  </p>
                  <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-300/80">
                    Esta oportunidad ya está vinculada a una venta.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <SaleStatusBadge status={opportunity.sale.status} />
                  <Link
                    to={`/sales?open=${opportunity.sale.id}`}
                    onClick={onClose}
                    className="text-xs font-semibold text-emerald-800 underline-offset-4 hover:underline dark:text-emerald-200"
                  >
                    Ver venta
                  </Link>
                </div>
              </div>
            </div>
          ) : opportunity.stage === 'GANADA' ? (
            <Alert variant="info" title="Oportunidad ganada sin venta">
              Puedes registrar la venta asociada desde el botón «Registrar venta».{' '}
              {!canManage ? 'Solo su responsable o un administrador puede hacerlo.' : null}
            </Alert>
          ) : null}

          <section aria-labelledby="opportunity-comments-heading" className="space-y-4 border-t border-line pt-5">
            <div>
              <h2 id="opportunity-comments-heading" className="text-sm font-semibold text-ink">
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
                    htmlFor="opportunity-comment"
                    className="text-[11px] font-semibold uppercase tracking-wide text-muted"
                  >
                    Agregar comentario
                  </label>
                  <textarea
                    id="opportunity-comment"
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
                {commentsQuery.data.map((comment: OpportunityComment) => (
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
                            const FileTypeIcon = /\.(zip|rar|7z|tar|gz)$/i.test(file.originalName)
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
              ? 'Tienes permiso para gestionar esta oportunidad.'
              : 'Solo lectura: esta oportunidad pertenece a otro responsable.'}
          </p>
        </div>
      )}
    </Modal>
  );
};
