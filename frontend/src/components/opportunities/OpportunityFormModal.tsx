import { useEffect, useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Target, Plus } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { CompanyFormModal } from '@/components/companies/CompanyFormModal';
import { ClientFormModal } from '@/components/clients/ClientFormModal';
import { useToast } from '@/providers/ToastProvider';
import { useAuth } from '@/providers/AuthProvider';
import {
  useClientOptions,
  useCompanyOptions,
  useUserOptions,
} from '@/hooks/queries';
import { opportunitiesApi, unwrap } from '@/lib/endpoints';
import { ApiError } from '@/lib/api';
import { isAdmin } from '@/lib/permissions';
import { STAGE_LABELS, STAGE_ORDER } from '@/lib/labels';
import {
  emptyToNull,
  opportunityFormSchema,
  type OpportunityFormValues,
} from '@/lib/validation';
import type { Opportunity, OpportunityStage } from '@/types';

const defaults = (
  opportunity?: Opportunity | null,
  ownerId?: string,
  companyId?: string,
  clientId?: string,
  stage?: OpportunityStage,
): OpportunityFormValues => ({
  name: opportunity?.name ?? '',
  description: opportunity?.description ?? '',
  companyId: opportunity?.companyId ?? companyId ?? '',
  clientId: opportunity?.clientId ?? clientId ?? '',
  ownerId: opportunity?.ownerId ?? ownerId ?? '',
  value: opportunity?.value ?? '',
  probability: opportunity ? String(opportunity.probability) : '50',
  expectedCloseDate: opportunity?.expectedCloseDate?.slice(0, 10) ?? '',
  stage: opportunity?.stage ?? stage ?? 'PROSPECTO',
});

export const OpportunityFormModal = ({
  open,
  onClose,
  opportunity,
  defaultCompanyId,
  defaultClientId,
  defaultStage,
  onSaved,
  inline = false,
}: {
  open: boolean;
  onClose: () => void;
  opportunity?: Opportunity | null;
  defaultCompanyId?: string;
  defaultClientId?: string;
  defaultStage?: OpportunityStage;
  onSaved?: (opportunity: Opportunity) => void;
  inline?: boolean;
}) => {
  const { user } = useAuth();
  const { success } = useToast();
  const queryClient = useQueryClient();
  const formId = useId().replace(/:/g, '');
  const [formError, setFormError] = useState<string | null>(null);
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  // Elementos creados desde los modales anidados: se seleccionan en el
  // formulario en cuanto aparecen en las opciones del select correspondiente.
  const [pendingCompanyId, setPendingCompanyId] = useState<string | null>(null);
  const [pendingClientId, setPendingClientId] = useState<string | null>(null);
  const editing = Boolean(opportunity);
  const hasSale = Boolean(opportunity?.sale);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<OpportunityFormValues>({
    resolver: zodResolver(opportunityFormSchema),
    defaultValues: defaults(
      opportunity,
      user?.id,
      defaultCompanyId,
      defaultClientId,
      defaultStage,
    ),
  });

  const companyId = watch('companyId');

  const companies = useCompanyOptions('', open);
  const clients = useClientOptions(
    { companyId: companyId || undefined },
    open,
  );
  const users = useUserOptions(isAdmin(user?.role) && open);

  useEffect(() => {
    if (open) {
      reset(
        defaults(
          opportunity,
          user?.id,
          defaultCompanyId,
          defaultClientId,
          defaultStage,
        ),
      );
      setFormError(null);
    }
  }, [
    open,
    opportunity,
    user?.id,
    defaultCompanyId,
    defaultClientId,
    defaultStage,
    reset,
  ]);

  const mutation = useMutation({
    mutationFn: async (values: OpportunityFormValues) => {
      const payload = {
        name: values.name.trim(),
        description: emptyToNull(values.description),
        companyId: emptyToNull(values.companyId),
        clientId: emptyToNull(values.clientId),
        ownerId: values.ownerId || user?.id,
        value: values.value.trim(),
        probability: Number(values.probability),
        expectedCloseDate: emptyToNull(values.expectedCloseDate),
        stage: values.stage,
      };
      return opportunity
        ? unwrap(await opportunitiesApi.update(opportunity.id, payload))
        : unwrap(await opportunitiesApi.create(payload));
    },
    onSuccess: (saved) => {
      success(
        editing ? 'Oportunidad actualizada' : 'Oportunidad creada',
        `${saved.name} se guardó correctamente.`,
      );
      void queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      void queryClient.invalidateQueries({ queryKey: ['sales'] });
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['companies'] });
      void queryClient.invalidateQueries({ queryKey: ['clients'] });
      onSaved?.(saved);
      onClose();
    },
    onError: (error) => {
      setFormError(
        error instanceof ApiError
          ? error.message
          : 'No se pudo guardar la oportunidad.',
      );
    },
  });

  const companyOptions = companies.data ?? [];
  const clientOptions = clients.data ?? [];
  const userOptions = users.data?.data ?? [];

  // Aplica la empresa creada desde el modal anidado cuando el select ya la
  // incluye (las opciones se recargan tras invalidar la caché de empresas).
  useEffect(() => {
    if (!pendingCompanyId) return;
    if (!companyOptions.some((company) => company.id === pendingCompanyId)) return;
    setValue('companyId', pendingCompanyId);
    // El cliente elegido puede pertenecer a otra empresa: se limpia, igual
    // que al cambiar la empresa manualmente desde el select.
    setValue('clientId', '');
    setPendingCompanyId(null);
  }, [pendingCompanyId, companyOptions, setValue]);

  // Aplica el contacto creado desde el modal anidado cuando el select ya lo
  // incluye (la lista depende de la empresa seleccionada).
  useEffect(() => {
    if (!pendingClientId) return;
    if (!clientOptions.some((client) => client.id === pendingClientId)) return;
    setValue('clientId', pendingClientId);
    setPendingClientId(null);
  }, [pendingClientId, clientOptions, setValue]);

  // Al cerrar el formulario se descartan los modales anidados y las
  // selecciones pendientes que no llegaron a aplicarse.
  useEffect(() => {
    if (open) return;
    setCompanyModalOpen(false);
    setClientModalOpen(false);
    setPendingCompanyId(null);
    setPendingClientId(null);
  }, [open]);

  const currentCompanyMissing =
    opportunity?.company &&
    !companyOptions.some((item) => item.id === opportunity.company?.id);
  const currentClientMissing =
    opportunity?.client &&
    !clientOptions.some((item) => item.id === opportunity.client?.id);
  const currentOwnerMissing =
    opportunity?.owner &&
    !userOptions.some((item) => item.id === opportunity.owner?.id);

  return (
    <Modal
      open={open}
      onClose={onClose}
      inline={inline}
      size="xl"
      title={editing ? 'Editar oportunidad' : 'Nueva oportunidad'}
      description={
        editing
          ? 'Actualiza el importe, la etapa y los datos de seguimiento.'
          : 'Registra una oportunidad y asígnala a un responsable.'
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
            leftIcon={<Target className="h-4 w-4" />}
          >
            {editing ? 'Guardar cambios' : 'Crear oportunidad'}
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

        {hasSale ? (
          <Alert variant="warning">
            Esta oportunidad ya tiene una venta asociada. La etapa solo puede mantenerse
            como «Ganada» mientras la venta exista.
          </Alert>
        ) : null}

        <Field
          label="Nombre de la oportunidad"
          htmlFor="opportunity-name"
          error={errors.name?.message}
          required
        >
          <Input
            id="opportunity-name"
            placeholder="Renovación anual de licencias"
            invalid={Boolean(errors.name)}
            autoFocus
            {...register('name')}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Empresa"
            htmlFor="opportunity-company"
            error={errors.companyId?.message}
            required
          >
            <div className="flex gap-2">
              <div className="min-w-0 flex-1">
                <Select
                  id="opportunity-company"
                  required
                  invalid={Boolean(errors.companyId)}
                  {...register('companyId', {
                    onChange: () => setValue('clientId', ''),
                  })}
                >
                  <option value="">Selecciona una empresa</option>
                  {currentCompanyMissing && opportunity?.company ? (
                    <option value={opportunity.company.id}>
                      {opportunity.company.name} (archivada)
                    </option>
                  ) : null}
                  {companyOptions.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </Select>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-[38px] w-[38px] shrink-0 rounded-[10px]"
                onClick={() => setCompanyModalOpen(true)}
                aria-label="Registrar una empresa nueva"
                title="Registrar una empresa nueva"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </Field>
          <Field
            label="Cliente"
            htmlFor="opportunity-client"
            error={errors.clientId?.message}
            hint="Al elegir un cliente se completa su empresa."
            required
          >
            <div className="flex gap-2">
              <div className="min-w-0 flex-1">
                <Select
                  id="opportunity-client"
                  required
                  invalid={Boolean(errors.clientId)}
                  {...register('clientId', {
                    onChange: (event) => {
                      const selected = clientOptions.find(
                        (item) => item.id === event.target.value,
                      );
                      if (selected?.companyId) {
                        setValue('companyId', selected.companyId);
                      }
                    },
                  })}
                >
                  <option value="">Selecciona un cliente</option>
                  {currentClientMissing && opportunity?.client ? (
                    <option value={opportunity.client.id}>
                      {opportunity.client.firstName} {opportunity.client.lastName} (archivado)
                    </option>
                  ) : null}
                  {clientOptions.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.firstName} {client.lastName}
                      {client.company ? ` · ${client.company.name}` : ''}
                    </option>
                  ))}
                </Select>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-[38px] w-[38px] shrink-0 rounded-[10px]"
                onClick={() => setClientModalOpen(true)}
                aria-label="Registrar un cliente nuevo"
                title="Registrar un cliente nuevo"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Importe estimado"
            htmlFor="opportunity-value"
            error={errors.value?.message}
            required
          >
            <Input
              id="opportunity-value"
              inputMode="decimal"
              placeholder="15000.00"
              invalid={Boolean(errors.value)}
              {...register('value')}
            />
          </Field>
          <Field
            label="Probabilidad (%)"
            htmlFor="opportunity-probability"
            error={errors.probability?.message}
            required
          >
            <Input
              id="opportunity-probability"
              type="number"
              min={0}
              max={100}
              step={1}
              placeholder="50"
              invalid={Boolean(errors.probability)}
              {...register('probability')}
            />
          </Field>
          <Field
            label="Fecha estimada de cierre"
            htmlFor="opportunity-close-date"
            error={errors.expectedCloseDate?.message}
          >
            <Input
              id="opportunity-close-date"
              type="date"
              invalid={Boolean(errors.expectedCloseDate)}
              {...register('expectedCloseDate')}
            />
          </Field>
          <Field
            label="Etapa"
            htmlFor="opportunity-stage"
            error={errors.stage?.message}
            hint={hasSale ? 'Solo puede permanecer en Ganada.' : undefined}
          >
            <Select id="opportunity-stage" disabled={hasSale} {...register('stage')}>
              {STAGE_ORDER.filter((stage) => !hasSale || stage === 'GANADA').map(
                (stage) => (
                  <option key={stage} value={stage}>
                    {STAGE_LABELS[stage]}
                  </option>
                ),
              )}
            </Select>
          </Field>
        </div>

        {isAdmin(user?.role) ? (
          <Field
            label="Responsable"
            htmlFor="opportunity-owner"
            error={errors.ownerId?.message}
            hint="Los administradores pueden asignar la oportunidad a cualquier vendedor activo."
          >
            <Select id="opportunity-owner" {...register('ownerId')}>
              {currentOwnerMissing && opportunity?.owner ? (
                <option value={opportunity.owner.id}>{opportunity.owner.name}</option>
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

        <Field
          label="Descripción"
          htmlFor="opportunity-description"
          error={errors.description?.message}
        >
          <Textarea
            id="opportunity-description"
            rows={3}
            placeholder="Necesidad del cliente, alcance y siguientes pasos…"
            {...register('description')}
          />
        </Field>
      </form>

      {/*
        Ventanas emergentes anidadas (se renderizan como portales sobre este
        modal): permiten registrar una empresa o un cliente sin salir del
        formulario. Al guardar, el elemento creado queda seleccionado en el
        select correspondiente.
      */}
      <CompanyFormModal
        open={companyModalOpen}
        onClose={() => setCompanyModalOpen(false)}
        onSaved={(saved) => setPendingCompanyId(saved.id)}
      />

      <ClientFormModal
        open={clientModalOpen}
        onClose={() => setClientModalOpen(false)}
        defaultCompanyId={companyId || undefined}
        onSaved={(saved) => {
          if (saved.companyId) setPendingCompanyId(saved.companyId);
          setPendingClientId(saved.id);
        }}
      />
    </Modal>
  );
};
