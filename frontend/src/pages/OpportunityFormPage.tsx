import { useEffect, useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Target, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { useToast } from '@/providers/ToastProvider';
import { useAuth } from '@/providers/AuthProvider';
import {
  useCompanyOptions,
  useClientOptions,
  useUserOptions,
  useOpportunityStages,
} from '@/hooks/queries';
import { opportunitiesApi, unwrap } from '@/lib/endpoints';
import { ApiError } from '@/lib/api';
import { isAdmin } from '@/lib/permissions';
import { emptyToNull, opportunityFormSchema, type OpportunityFormValues } from '@/lib/validation';
import type { Opportunity } from '@/types';
import { usePageTitle } from '@/hooks/usePageTitle';

const defaults = (
  opportunity?: Opportunity | null,
  ownerId?: string,
  companyId?: string,
  clientId?: string,
  stage?: string,
): OpportunityFormValues => ({
  name: opportunity?.name ?? '',
  description: opportunity?.description ?? '',
  companyId: opportunity?.companyId ?? companyId ?? '',
  clientId: opportunity?.clientId ?? clientId ?? '',
  ownerId: opportunity?.ownerId ?? ownerId ?? '',
  value: opportunity?.value ?? '',
  probability: String(opportunity?.probability ?? ''),
  expectedCloseDate: opportunity?.expectedCloseDate?.slice(0, 10) ?? '',
  stage: opportunity?.stage ?? stage ?? 'NEGOCIACION',
});

export const OpportunityFormPage = () => {
  usePageTitle('Oportunidad');
  const { user } = useAuth();
  const { success } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const formId = useId().replace(/:/g, '');
  const [formError, setFormError] = useState<string | null>(null);
  const opportunityId = id;
  const editing = Boolean(opportunityId);
  const admin = isAdmin(user?.role);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<OpportunityFormValues>({
    resolver: zodResolver(opportunityFormSchema),
    defaultValues: defaults(undefined, user?.id),
  });

  const companyId = watch('companyId');

  const companies = useCompanyOptions('', true);
  const clients = useClientOptions({ companyId: companyId || undefined }, true);
  const users = useUserOptions(admin);
  const stages = useOpportunityStages(true);

  useEffect(() => {
    if (opportunityId) {
      void opportunitiesApi.get(opportunityId).then((response) => {
        const opportunity = unwrap(response);
        reset(
          defaults(
            opportunity,
            user?.id,
            opportunity.companyId ?? undefined,
            opportunity.clientId ?? undefined,
            opportunity.stage,
          ),
        );
        setFormError(null);
      });
    } else {
      reset(defaults(undefined, user?.id));
      setFormError(null);
    }
  }, [opportunityId, user?.id, reset]);

  const companyOptions = companies.data ?? [];
  const clientOptions = clients.data ?? [];
  const userOptions = users.data?.data ?? [];
  const stageOptions = stages.data ?? [
    { value: 'NEGOCIACION', label: 'Negociación', isCustom: false },
    { value: 'GANADA', label: 'Ganada', isCustom: false },
    { value: 'PERDIDA', label: 'Perdida', isCustom: false },
  ];

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
      return opportunityId
        ? unwrap(await opportunitiesApi.update(opportunityId, payload))
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
      navigate(`/negocio/oportunidad/${saved.id}`);
    },
    onError: (error) => {
      setFormError(
        error instanceof ApiError
          ? error.message
          : 'No se pudo guardar la oportunidad.',
      );
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[26px] font-extrabold leading-[1.15] tracking-[-0.03em] text-ink sm:text-[30px]">
            {editing ? 'Editar oportunidad' : 'Nueva oportunidad'}
          </h1>
          <p className="mt-1 text-[13px] leading-6 text-muted">
            {editing
              ? 'Actualiza el importe, la etapa y los datos de seguimiento.'
              : 'Registra una oportunidad y asígnala a un responsable.'}
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
            leftIcon={<Target className="h-4 w-4" />}
          >
            {editing ? 'Guardar cambios' : 'Crear oportunidad'}
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
          <Field label="Empresa" htmlFor="opportunity-company" error={errors.companyId?.message}>
            <div className="flex gap-2">
              <div className="min-w-0 flex-1">
                <Select
                  id="opportunity-company"
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
              </div>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-[38px] w-[38px] shrink-0 rounded-[10px]"
                onClick={() => navigate('/companies/nuevo')}
                aria-label="Registrar una empresa nueva"
                title="Registrar una empresa nueva"
              >
                <span className="sr-only">Registrar empresa</span>
              </Button>
            </div>
          </Field>
          <Field
            label="Cliente"
            htmlFor="opportunity-client"
            error={errors.clientId?.message}
            hint="Al elegir un cliente se completa su empresa."
          >
            <div className="flex gap-2">
              <div className="min-w-0 flex-1">
                <Select
                  id="opportunity-client"
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
                  <option value="">Sin cliente</option>
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
                onClick={() => navigate('/clients/nuevo')}
                aria-label="Registrar un cliente nuevo"
                title="Registrar un cliente nuevo"
              >
                <span className="sr-only">Registrar cliente</span>
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
            hint={undefined}
          >
            <Select id="opportunity-stage" {...register('stage')}>
              {stageOptions.map((stage: { value: string; label: string }) => (
                <option key={stage.value} value={stage.value}>
                  {stage.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {admin ? (
          <Field
            label="Responsable"
            htmlFor="opportunity-owner"
            error={errors.ownerId?.message}
            hint="Los administradores pueden asignar la oportunidad a cualquier vendedor activo."
          >
            <Select id="opportunity-owner" {...register('ownerId')}>
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
    </div>
  );
};
