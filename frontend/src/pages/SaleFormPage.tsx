import { useEffect, useId, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Handshake, ArrowLeft } from 'lucide-react';
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
import { usePageTitle } from '@/hooks/usePageTitle';

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
  currency: sale?.currency ?? 'GTQ',
  status: sale?.status ?? 'PENDING',
  notes: sale?.notes ?? '',
});

export const SaleFormPage = () => {
  usePageTitle('Venta');
  const { user } = useAuth();
  const { success } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const formId = useId().replace(/:/g, '');
  const [formError, setFormError] = useState<string | null>(null);
  const saleId = id;
  const editing = Boolean(saleId);
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
    defaultValues: defaults(undefined, user?.id),
  });

  const companyId = watch('companyId');
  const opportunityId = watch('opportunityId');
  const selectedOpportunityId = opportunityId;

  const companies = useCompanyOptions('', true);
  const clients = useClientOptions({ companyId: companyId || undefined }, true);
  const users = useUserOptions(admin);

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
    enabled: !editing,
    staleTime: 30_000,
  });

  const availableOpportunities = (wonOpportunities.data?.data ?? []).filter(
    (item) => !item.sale && item.clientId,
  );

  useEffect(() => {
    if (saleId) {
      void salesApi.get(saleId).then((response) => {
        const sale = unwrap(response);
        reset(
          defaults(
            sale,
            user?.id,
            sale.companyId ?? undefined,
            sale.clientId ?? undefined,
            sale.opportunityId ?? undefined,
          ),
        );
        setFormError(null);
      });
    } else {
      reset(defaults(undefined, user?.id));
      setFormError(null);
    }
  }, [saleId, user?.id, reset]);

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

      if (editing && saleId) {
        return unwrap(await salesApi.update(saleId, common));
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
      navigate(`/negocio/venta/${saved.id}`);
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
  const linkedOpportunity = editing ? (getValues('opportunityId') ? { name: 'Vinculada', id: getValues('opportunityId') } : null) : null;
  const opportunityLocked = Boolean(selectedOpportunityId || linkedOpportunity);

  const syncedClientRef = useRef<string | null>(null);
  useEffect(() => {
    if (editing) {
      syncedClientRef.current = null;
      return;
    }
    const currentClientId = getValues('clientId');
    if (!currentClientId || syncedClientRef.current === currentClientId) return;
    if (!clientOptions.some((item) => item.id === currentClientId)) return;
    syncedClientRef.current = currentClientId;
    setValue('clientId', currentClientId);
  }, [clientOptions, editing, getValues, setValue]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[26px] font-extrabold leading-[1.15] tracking-[-0.03em] text-ink sm:text-[30px]">
            {editing ? 'Editar venta' : 'Registrar venta'}
          </h1>
          <p className="mt-1 text-[13px] leading-6 text-muted">
            {editing
              ? 'Actualiza los datos de la venta. Las ventas confirmadas requieren permisos de administrador.'
              : 'Registra una venta manualmente o vincúlala a una oportunidad ganada.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => navigate(-1)}
            disabled={mutation.isPending || isSubmitting}
          >
            <ArrowLeft className="h-4 w-4" /> Volver
          </Button>
          <Button
            type="submit"
            form={formId}
            loading={mutation.isPending || isSubmitting}
            leftIcon={<Handshake className="h-4 w-4" />}
          >
            {editing ? 'Guardar cambios' : 'Registrar venta'}
          </Button>
        </div>
      </div>

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
            La venta heredará el cliente, la empresa y el responsable de la oportunidad seleccionada.
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
              {clientOptions.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.firstName} {client.lastName}
                  {client.company ? ` · ${client.company.name}` : ''}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Fecha de venta" htmlFor="sale-date" error={errors.saleDate?.message} required>
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
    </div>
  );
};
