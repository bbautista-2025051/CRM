import { useEffect, useId, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Handshake } from 'lucide-react';
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
import { opportunitiesApi, salesApi, unwrap } from '@/lib/endpoints';
import { ApiError } from '@/lib/api';
import { isAdmin } from '@/lib/permissions';
import { formatMoney, todayISO } from '@/lib/format';
import { emptyToNull, saleFormSchema, type SaleFormValues } from '@/lib/validation';
import type { Sale } from '@/types';

const defaults = (
  sale?: Sale | null,
  ownerId?: string,
  companyId?: string,
  clientId?: string,
  opportunityId?: string,
): SaleFormValues => ({
  opportunityId: sale?.opportunityId ?? opportunityId ?? '',
  clientId: sale?.clientId ?? clientId ?? '',
  companyId: sale?.companyId ?? companyId ?? '',
  ownerId: sale?.ownerId ?? ownerId ?? '',
  saleDate: sale?.saleDate?.slice(0, 10) ?? todayISO(),
  amount: sale?.amount ?? '',
  currency: sale?.currency ?? 'USD',
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
}: {
  open: boolean;
  onClose: () => void;
  sale?: Sale | null;
  defaultCompanyId?: string;
  defaultClientId?: string;
  defaultOpportunityId?: string;
  onSaved?: (sale: Sale) => void;
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
    resolver: zodResolver(saleFormSchema),
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

  const wonOpportunities = useQuery({
    queryKey: ['opportunities', 'won-options', admin ? 'all' : user?.id],
    queryFn: async () =>
      opportunitiesApi.list({
        pageSize: 100,
        stage: 'GANADA',
        status: 'WON',
        ownerId: admin ? undefined : user?.id,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      }),
    enabled: open && !editing,
    staleTime: 30_000,
  });

  const availableOpportunities = (wonOpportunities.data?.data ?? []).filter(
    (item) => !item.sale && item.clientId,
  );

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

  const applyOpportunity = (nextId: string) => {
    const selected = availableOpportunities.find((item) => item.id === nextId);
    if (!selected) return;
    setValue('clientId', selected.clientId ?? '');
    setValue('companyId', selected.companyId ?? '');
    setValue('ownerId', selected.ownerId);
    setValue('amount', selected.value);
  };

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
          opportunityId: emptyToNull(values.opportunityId),
          ownerId: values.ownerId || user?.id,
        }),
      );
    },
    onSuccess: (saved) => {
      success(
        editing ? 'Venta actualizada' : 'Venta registrada',
        `${saved.saleNumber} se guardó correctamente.`,
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
  const opportunityLocked = Boolean(selectedOpportunityId || linkedOpportunity);

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
      size="xl"
      title={editing ? `Editar venta ${sale?.saleNumber ?? ''}` : 'Registrar venta'}
      description={
        editing
          ? 'Actualiza los datos de la venta. Las ventas confirmadas requieren permisos de administrador.'
          : 'Registra una venta manualmente o vincúlala a una oportunidad ganada.'
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
            label="Oportunidad ganada (opcional)"
            htmlFor="sale-opportunity"
            error={errors.opportunityId?.message}
            hint="Al vincularla se completan el cliente, la empresa y el importe."
          >
            <Select
              id="sale-opportunity"
              {...register('opportunityId', {
                onChange: (event) => applyOpportunity(event.target.value),
              })}
            >
              <option value="">Venta manual sin oportunidad</option>
              {availableOpportunities.map((opportunity) => (
                <option key={opportunity.id} value={opportunity.id}>
                  {opportunity.name} · {formatMoney(opportunity.value)}
                </option>
              ))}
            </Select>
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

        {opportunityLocked && !editing ? (
          <Alert variant="info">
            La venta heredará el cliente, la empresa y el responsable de la oportunidad
            seleccionada.
          </Alert>
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
            hint="Obligatorio si no vinculas una oportunidad."
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
            <Input
              id="sale-currency"
              list="sale-currencies"
              placeholder="USD"
              maxLength={3}
              className="uppercase"
              invalid={Boolean(errors.currency)}
              {...register('currency')}
            />
            <datalist id="sale-currencies">
              <option value="USD" />
              <option value="EUR" />
              <option value="COP" />
              <option value="MXN" />
              <option value="CLP" />
              <option value="PEN" />
            </datalist>
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
      </form>
    </Modal>
  );
};
