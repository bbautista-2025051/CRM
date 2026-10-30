import { useEffect, useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UserRoundPlus } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
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
import type { Client } from '@/types';

const defaults = (
  client?: Client | null,
  defaultCompanyId?: string,
): ClientFormValues => ({
  firstName: client?.firstName ?? '',
  lastName: client?.lastName ?? '',
  email: client?.email ?? '',
  phone: client?.phone ?? '',
  jobTitle: client?.jobTitle ?? '',
  companyId: client?.companyId ?? defaultCompanyId ?? '',
  status: client?.status ?? 'ACTIVE',
  notes: client?.notes ?? '',
});

export const ClientFormModal = ({
  open,
  onClose,
  client,
  defaultCompanyId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  client?: Client | null;
  defaultCompanyId?: string;
  onSaved?: (client: Client) => void;
}) => {
  const { user } = useAuth();
  const { success } = useToast();
  const queryClient = useQueryClient();
  const companies = useCompanyOptions('', open);
  const formId = useId().replace(/:/g, '');
  const [formError, setFormError] = useState<string | null>(null);
  const editing = Boolean(client);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: defaults(client, defaultCompanyId),
  });

  useEffect(() => {
    if (open) {
      reset(defaults(client, defaultCompanyId));
      setFormError(null);
    }
  }, [open, client, defaultCompanyId, reset]);

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
      return client
        ? unwrap(await clientsApi.update(client.id, payload))
        : unwrap(await clientsApi.create(payload));
    },
    onSuccess: (saved) => {
      success(
        editing ? 'Cliente actualizado' : 'Cliente creado',
        `${saved.firstName} ${saved.lastName} se guardó correctamente.`,
      );
      void queryClient.invalidateQueries({ queryKey: ['clients'] });
      void queryClient.invalidateQueries({ queryKey: ['companies'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onSaved?.(saved);
      onClose();
    },
    onError: (error) => {
      setFormError(
        error instanceof ApiError ? error.message : 'No se pudo guardar el cliente.',
      );
    },
  });

  const companyOptions = companies.data ?? [];
  const currentCompanyMissing =
    client?.company && !companyOptions.some((item) => item.id === client.company?.id);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={editing ? 'Editar cliente' : 'Nuevo cliente'}
      description={
        editing
          ? 'Actualiza los datos de contacto y la empresa asociada.'
          : 'Registra un contacto para dar seguimiento a tu relación comercial.'
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
            leftIcon={<UserRoundPlus className="h-4 w-4" />}
          >
            {editing ? 'Guardar cambios' : 'Crear cliente'}
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
              {currentCompanyMissing && client?.company ? (
                <option value={client.company.id}>{client.company.name} (archivada)</option>
              ) : null}
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
    </Modal>
  );
};
