import { useEffect, useId, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Handshake, Ticket } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { useToast } from '@/providers/ToastProvider';
import { useAuth } from '@/providers/AuthProvider';
import {
  useClientOptions,
  useCompanyOptions,
  useUserOptions,
} from '@/hooks/queries';
import { salesApi, unwrap } from '@/lib/endpoints';
import { ApiError } from '@/lib/api';
import { isAdmin } from '@/lib/permissions';
import { todayISO } from '@/lib/format';
import {
  emptyToNull,
  saleEditFormSchema,
  saleFormSchema,
  type SaleFormValues,
} from '@/lib/validation';
import type { Sale } from '@/types';

const defaults = (
  sale?: Sale | null,
  ownerId?: string,
  companyId?: string,
  clientId?: string,
  opportunityId?: string,
): SaleFormValues => ({
  opportunityId: sale?.opportunityId ?? opportunityId ?? '',
  opportunityName: sale?.opportunity?.name ?? '',
  clientId: sale?.clientId ?? clientId ?? '',
  companyId: sale?.companyId ?? companyId ?? '',
  ownerId: sale?.ownerId ?? ownerId ?? '',
  saleDate: sale?.saleDate?.slice(0, 10) ?? todayISO(),
  amount: sale?.amount ?? '',
  currency: sale?.currency ?? 'GTQ',
  status: sale?.status ?? 'PENDING',
  notes: sale?.notes ?? '',
});

export const SaleFormModal = ({
  open,
  onClose,
  sale,
  defaultCompanyId,
  defaultClientId,
  defaultOpportunityId,
  onSaved,
  inline = false,
}: {
  open: boolean;
  onClose: () => void;
  sale?: Sale | null;
  defaultCompanyId?: string;
  defaultClientId?: string;
  defaultOpportunityId?: string;
  onSaved?: (sale: Sale) => void;
  inline?: boolean;
}) => {
  const { user } = useAuth();
  const { success } = useToast();
  const queryClient = useQueryClient();
  const formId = useId().replace(/:/g, '');
  const [formError, setFormError] = useState<string | null>(null);
  const editing = Boolean(sale);
  const admin = isAdmin(user?.role);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SaleFormValues>({
    resolver: zodResolver(editing ? saleEditFormSchema : saleFormSchema),
    defaultValues: defaults(
      sale,
      user?.id,
      defaultCompanyId,
      defaultClientId,
      defaultOpportunityId,
    ),
  });

  const companyId = watch('companyId');
  const opportunityId = watch('opportunityId');
  const selectedOpportunityId = opportunityId;

  const companies = useCompanyOptions('', open);
  const clients = useClientOptions({ companyId: companyId || undefined }, open);
  const users = useUserOptions(admin && open);

  useEffect(() => {
    if (open) {
      reset(
        defaults(
          sale,
          user?.id,
          defaultCompanyId,
          defaultClientId,
          defaultOpportunityId,
        ),
      );
      setFormError(null);
    }
  }, [
    open,
    sale,
    user?.id,
    defaultCompanyId,
    defaultClientId,
    defaultOpportunityId,
    reset,
  ]);

  const mutation = useMutation({
    mutationFn: async (values: SaleFormValues) => {
      const common = {
        clientId: emptyToNull(values.clientId),
        companyId: emptyToNull(values.companyId),
        saleDate: values.saleDate,
        amount: values.amount.trim(),
        currency: values.currency.trim().toUpperCase(),
        status: values.status,
        notes: emptyToNull(values.notes),
      };

      if (sale) {
        return unwrap(await salesApi.update(sale.id, common));
      }

      return unwrap(
        await salesApi.create({
          ...common,
          opportunityName: values.opportunityName.trim(),
          ownerId: values.ownerId || user?.id,
        }),
      );
    },
    onSuccess: (saved) => {
      success(
        editing ? 'Venta actualizada' : 'Venta registrada',
        `${saved.opportunity?.name ?? saved.saleNumber} se guardó correctamente.`,
      );
      void queryClient.invalidateQueries({ queryKey: ['sales'] });
      void queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['companies'] });
      void queryClient.invalidateQueries({ queryKey: ['clients'] });
      onSaved?.(saved);
      onClose();
    },
    onError: (error) => {
      setFormError(
        error instanceof ApiError ? error.message : 'No se pudo guardar la venta.',
      );
    },
  });

  const companyOptions = companies.data ?? [];
  const clientOptions = clients.data ?? [];
  const userOptions = users.data?.data ?? [];
  const linkedOpportunity = sale?.opportunity;
  const opportunityLocked = Boolean(editing && linkedOpportunity);

  // El <select> de cliente no está controlado: si la oportunidad fija el
  // cliente antes de que la lista filtrada por empresa haya cargado, el
  // navegador descarta el valor. Cuando la opción ya existe, se reaplica.
  const syncedClientRef = useRef<string | null>(null);
  useEffect(() => {
    if (!open || editing) {
      syncedClientRef.current = null;
      return;
    }
    const currentClientId = getValues('clientId');
    if (!currentClientId || syncedClientRef.current === currentClientId) return;
    if (!clientOptions.some((item) => item.id === currentClientId)) return;
    syncedClientRef.current = currentClientId;
    setValue('clientId', currentClientId);
  }, [clientOptions, editing, getValues, open, setValue]);

  const currentCompanyMissing =
    sale?.company && !companyOptions.some((item) => item.id === sale.company?.id);
  const currentClientMissing =
    sale?.client && !clientOptions.some((item) => item.id === sale.client?.id);
  const currentOwnerMissing =
    sale?.owner && !userOptions.some((item) => item.id === sale.owner?.id);

  return (
    <Modal
      open={open}
      onClose={onClose}
      inline={inline}
      size="xl"
      title={
        editing
          ? sale?.opportunity?.name
            ? `Editar ${sale.opportunity.name}`
            : `Editar venta ${sale?.saleNumber ?? ''}`
          : 'Registrar venta'
      }
      description={
        editing
          ? 'Actualiza los datos de la venta. Las ventas confirmadas requieren permisos de administrador.'
          : 'Registra una venta indicando el nombre de la oportunidad ganada, el cliente y el importe.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form={formId}
            loading={mutation.isPending || isSubmitting}
            leftIcon={<Handshake className="h-4 w-4" />}
          >
            {editing ? 'Guardar cambios' : 'Registrar venta'}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        className="space-y-4"
        noValidate
      >
        {formError ? (
          <Alert variant="error" onClose={() => setFormError(null)}>
            {formError}
          </Alert>
        ) : null}

        {!editing ? (
          <Field
            label="Oportunidad ganada"
            htmlFor="sale-opportunity-name"
            error={errors.opportunityName?.message}
            hint="Escribe el nombre de la oportunidad ganada; este nombre identificará la venta."
            required
          >
            <Input
              id="sale-opportunity-name"
              type="text"
              maxLength={180}
              placeholder="Ej. Implementación CRM anual"
              invalid={Boolean(errors.opportunityName)}
              required
              {...register('opportunityName')}
            />
          </Field>
        ) : linkedOpportunity ? (
          <div className="rounded-xl border border-line bg-elevated/40 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              Oportunidad vinculada
            </p>
            <p className="mt-1 text-sm font-medium text-ink">{linkedOpportunity.name}</p>
            <p className="mt-0.5 text-xs text-muted">
              La oportunidad de una venta no puede modificarse.
            </p>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Empresa" htmlFor="sale-company" error={errors.companyId?.message}>
            <Select
              id="sale-company"
              disabled={opportunityLocked}
              {...register('companyId', {
                onChange: () => setValue('clientId', ''),
              })}
            >
              <option value="">Sin empresa</option>
              {currentCompanyMissing && sale?.company ? (
                <option value={sale.company.id}>{sale.company.name} (archivada)</option>
              ) : null}
              {companyOptions.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Cliente"
            htmlFor="sale-client"
            error={errors.clientId?.message}
            hint="Obligatorio para registrar la venta."
            required={!editing}
          >
            <Select
              id="sale-client"
              disabled={opportunityLocked}
              {...register('clientId', {
                onChange: (event) => {
                  const selected = clientOptions.find(
                    (item) => item.id === event.target.value,
                  );
                  if (selected?.companyId) setValue('companyId', selected.companyId);
                },
              })}
            >
              <option value="">Selecciona un cliente</option>
              {currentClientMissing && sale?.client ? (
                <option value={sale.client.id}>
                  {sale.client.firstName} {sale.client.lastName} (archivado)
                </option>
              ) : null}
              {clientOptions.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.firstName} {client.lastName}
                  {client.company ? ` · ${client.company.name}` : ''}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Fecha de venta"
            htmlFor="sale-date"
            error={errors.saleDate?.message}
            required
          >
            <Input
              id="sale-date"
              type="date"
              invalid={Boolean(errors.saleDate)}
              {...register('saleDate')}
            />
          </Field>
          <Field label="Importe" htmlFor="sale-amount" error={errors.amount?.message} required>
            <Input
              id="sale-amount"
              inputMode="decimal"
              placeholder="15000.00"
              invalid={Boolean(errors.amount)}
              {...register('amount')}
            />
          </Field>
          <Field label="Moneda" htmlFor="sale-currency" error={errors.currency?.message} required>
            <Select
              id="sale-currency"
              invalid={Boolean(errors.currency)}
              {...register('currency')}
            >
              <option value="GTQ">Quetzal (GTQ)</option>
              <option value="USD">Dólar estadounidense (USD)</option>
            </Select>
          </Field>
          {editing && admin ? (
            <Field
              label="Estado"
              htmlFor="sale-status"
              error={errors.status?.message}
              hint="Usa la acción de cancelación para anular una venta."
            >
              <Select id="sale-status" {...register('status')}>
                <option value="PENDING">Pendiente</option>
                <option value="CONFIRMED">Confirmada</option>
              </Select>
            </Field>
          ) : (
            <input type="hidden" {...register('status')} />
          )}
          {admin && !editing ? (
            <Field
              label="Responsable"
              htmlFor="sale-owner"
              error={errors.ownerId?.message}
              hint="Los administradores pueden asignar la venta a cualquier vendedor activo."
            >
              <Select
                id="sale-owner"
                disabled={opportunityLocked}
                {...register('ownerId')}
              >
                {currentOwnerMissing && sale?.owner ? (
                  <option value={sale.owner.id}>{sale.owner.name}</option>
                ) : null}
                {userOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name} · {option.role === 'ADMIN' ? 'Administrador' : 'Vendedor'}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <input type="hidden" {...register('ownerId')} />
          )}
        </div>

        <Field label="Observaciones" htmlFor="sale-notes" error={errors.notes?.message}>
          <Textarea
            id="sale-notes"
            rows={3}
            placeholder="Condiciones de pago, referencia de factura…"
            {...register('notes')}
          />
        </Field>

        <div className="flex items-start gap-3 rounded-xl border border-line bg-elevated/20 p-4">
          <Ticket className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
          <div>
            <p className="text-sm font-semibold text-ink">Ticket</p>
            <p className="mt-0.5 text-xs text-muted">
              {sale?.ticketNumber
                ? `Este proyecto tiene asignado el ticket ${sale.ticketNumber}. El número se genera automáticamente.`
                : 'El número de ticket se asignará automáticamente al guardar la venta, siguiendo el consecutivo de proyectos.'}
            </p>
          </div>
        </div>
      </form>
    </Modal>
  );
};
