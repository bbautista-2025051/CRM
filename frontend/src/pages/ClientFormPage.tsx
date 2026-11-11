import { useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserRoundPlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { useToast } from '@/providers/ToastProvider';
import { useAuth } from '@/providers/AuthProvider';
import { useCompanyOptions } from '@/hooks/queries';
import { clientsApi, unwrap } from '@/lib/endpoints';
import { ApiError } from '@/lib/api';
import { isAdmin } from '@/lib/permissions';
import { clientFormSchema, emptyToNull, type ClientFormValues } from '@/lib/validation';
import { usePageTitle } from '@/hooks/usePageTitle';

/**
 * Estado de navegación cuando la página se abre desde otro formulario
 * (por ejemplo, el de nueva oportunidad). Tras guardar se regresa a
 * `returnTo` devolviendo el borrador intacto y el cliente recién creado
 * para preseleccionarlo en el formulario de origen. `companyId` prellena
 * la empresa del cliente con la que ya estaba elegida en el origen.
 */
type ClientFormNavState = {
  returnTo?: string;
  draft?: unknown;
  companyId?: string;
};

const defaults = (companyId?: string): ClientFormValues => ({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  jobTitle: '',
  companyId: companyId ?? '',
  status: 'ACTIVE',
  notes: '',
});

export const ClientFormPage = () => {
  usePageTitle('Nuevo cliente');
  const { user } = useAuth();
  const { success } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const companies = useCompanyOptions('', true);
  const formId = useId().replace(/:/g, '');
  const [formError, setFormError] = useState<string | null>(null);

  const navState = (location.state ?? null) as ClientFormNavState | null;
  // Solo se aceptan retornos internos (rutas de la propia aplicación).
  const returnTo =
    navState?.returnTo?.startsWith('/') && !navState.returnTo.startsWith('//')
      ? navState.returnTo
      : null;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: defaults(navState?.companyId),
  });

  const mutation = useMutation({
    mutationFn: async (values: ClientFormValues) => {
      const payload = {
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim().toLowerCase(),
        phone: emptyToNull(values.phone),
        jobTitle: emptyToNull(values.jobTitle),
        companyId: emptyToNull(values.companyId),
        status: values.status,
        notes: emptyToNull(values.notes),
      };
      return unwrap(await clientsApi.create(payload));
    },
    onSuccess: (saved) => {
      success('Cliente creado', `${saved.firstName} ${saved.lastName} se guardó correctamente.`);
      void queryClient.invalidateQueries({ queryKey: ['clients'] });
      void queryClient.invalidateQueries({ queryKey: ['companies'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      if (returnTo) {
        navigate(returnTo, {
          state: {
            draft: navState?.draft,
            // La empresa del cliente se devuelve junto al cliente para que el
            // formulario de origen quede con una combinación válida.
            preselect: {
              clientId: saved.id,
              companyId: saved.companyId ?? '',
            },
          },
        });
      } else {
        navigate(`/clients/${saved.id}`);
      }
    },
    onError: (error) => {
      setFormError(
        error instanceof ApiError ? error.message : 'No se pudo guardar el cliente.',
      );
    },
  });

  const companyOptions = companies.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[26px] font-extrabold leading-[1.15] tracking-[-0.03em] text-ink sm:text-[30px]">
            Nuevo cliente
          </h1>
          <p className="mt-1 text-[13px] leading-6 text-muted">
            Registra un contacto para dar seguimiento a tu relación comercial.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              // Al cancelar también se devuelve el borrador del formulario
              // de origen para no perder lo que el usuario había escrito.
              if (returnTo) {
                navigate(returnTo, { state: { draft: navState?.draft } });
              } else {
                navigate(-1);
              }
            }}
            disabled={mutation.isPending || isSubmitting}
          >
            <ArrowLeft className="h-4 w-4" /> Volver
          </Button>
          <Button
            type="submit"
            form={formId}
            loading={mutation.isPending || isSubmitting}
            leftIcon={<UserRoundPlus className="h-4 w-4" />}
          >
            Crear cliente
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

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre" htmlFor="client-first-name" error={errors.firstName?.message} required>
            <Input
              id="client-first-name"
              placeholder="María"
              invalid={Boolean(errors.firstName)}
              autoFocus
              {...register('firstName')}
            />
          </Field>
          <Field label="Apellido" htmlFor="client-last-name" error={errors.lastName?.message} required>
            <Input
              id="client-last-name"
              placeholder="Gómez"
              invalid={Boolean(errors.lastName)}
              {...register('lastName')}
            />
          </Field>
          <Field label="Correo electrónico" htmlFor="client-email" error={errors.email?.message} required>
            <Input
              id="client-email"
              type="email"
              placeholder="maria@empresa.com"
              invalid={Boolean(errors.email)}
              {...register('email')}
            />
          </Field>
          <Field label="Teléfono" htmlFor="client-phone" error={errors.phone?.message}>
            <Input id="client-phone" placeholder="+57 300 000 0000" {...register('phone')} />
          </Field>
          <Field label="Cargo" htmlFor="client-job-title" error={errors.jobTitle?.message}>
            <Input id="client-job-title" placeholder="Gerente comercial" {...register('jobTitle')} />
          </Field>
          <Field
            label="Empresa"
            htmlFor="client-company"
            error={errors.companyId?.message}
            hint="Opcional. Puedes asociarlo a una empresa activa."
          >
            <Select id="client-company" {...register('companyId')}>
              <option value="">Sin empresa</option>
              {companyOptions.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {isAdmin(user?.role) ? (
          <Field
            label="Estado"
            htmlFor="client-status"
            error={errors.status?.message}
            hint="Archivar conserva oportunidades y ventas relacionadas."
          >
            <Select id="client-status" {...register('status')}>
              <option value="ACTIVE">Activo</option>
              <option value="ARCHIVED">Archivado</option>
            </Select>
          </Field>
        ) : (
          <input type="hidden" {...register('status')} />
        )}

        <Field label="Notas internas" htmlFor="client-notes" error={errors.notes?.message}>
          <Textarea
            id="client-notes"
            rows={3}
            placeholder="Preferencias de contacto, contexto de la relación…"
            {...register('notes')}
          />
        </Field>
      </form>
    </div>
  );
};
