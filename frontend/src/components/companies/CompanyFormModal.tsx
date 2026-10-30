import { useEffect, useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { useToast } from '@/providers/ToastProvider';
import { useAuth } from '@/providers/AuthProvider';
import { useSectors } from '@/hooks/queries';
import { companiesApi, unwrap } from '@/lib/endpoints';
import { ApiError } from '@/lib/api';
import { isAdmin } from '@/lib/permissions';
import {
  companyFormSchema,
  emptyToNull,
  type CompanyFormValues,
} from '@/lib/validation';
import type { Company } from '@/types';

const defaults = (company?: Company | null): CompanyFormValues => ({
  name: company?.name ?? '',
  legalName: company?.legalName ?? '',
  taxId: company?.taxId ?? '',
  sector: company?.sector ?? '',
  email: company?.email ?? '',
  phone: company?.phone ?? '',
  address: company?.address ?? '',
  website: company?.website ?? '',
  status: company?.status ?? 'ACTIVE',
  notes: company?.notes ?? '',
});

export const CompanyFormModal = ({
  open,
  onClose,
  company,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  company?: Company | null;
  onSaved?: (company: Company) => void;
}) => {
  const { user } = useAuth();
  const { success } = useToast();
  const queryClient = useQueryClient();
  const sectors = useSectors();
  const formId = useId().replace(/:/g, '');
  const [formError, setFormError] = useState<string | null>(null);
  const editing = Boolean(company);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: defaults(company),
  });

  useEffect(() => {
    if (open) {
      reset(defaults(company));
      setFormError(null);
    }
  }, [open, company, reset]);

  const mutation = useMutation({
    mutationFn: async (values: CompanyFormValues) => {
      const payload = {
        name: values.name.trim(),
        legalName: emptyToNull(values.legalName),
        taxId: emptyToNull(values.taxId),
        sector: emptyToNull(values.sector),
        email: emptyToNull(values.email),
        phone: emptyToNull(values.phone),
        address: emptyToNull(values.address),
        website: emptyToNull(values.website),
        status: values.status,
        notes: emptyToNull(values.notes),
      };
      return company
        ? unwrap(await companiesApi.update(company.id, payload))
        : unwrap(await companiesApi.create(payload));
    },
    onSuccess: (saved) => {
      success(
        editing ? 'Empresa actualizada' : 'Empresa creada',
        `${saved.name} se guardó correctamente.`,
      );
      void queryClient.invalidateQueries({ queryKey: ['companies'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onSaved?.(saved);
      onClose();
    },
    onError: (error) => {
      setFormError(
        error instanceof ApiError ? error.message : 'No se pudo guardar la empresa.',
      );
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={editing ? 'Editar empresa' : 'Nueva empresa'}
      description={
        editing
          ? 'Actualiza los datos comerciales y de contacto.'
          : 'Registra una empresa para agrupar clientes, oportunidades y ventas.'
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
            leftIcon={<Building2 className="h-4 w-4" />}
          >
            {editing ? 'Guardar cambios' : 'Crear empresa'}
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

        <Field label="Nombre comercial" htmlFor="company-name" error={errors.name?.message} required>
          <Input
            id="company-name"
            placeholder="Acme S.A.S."
            invalid={Boolean(errors.name)}
            autoFocus
            {...register('name')}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Razón social" htmlFor="company-legal-name" error={errors.legalName?.message}>
            <Input
              id="company-legal-name"
              placeholder="Acme Servicios S.A.S."
              {...register('legalName')}
            />
          </Field>
          <Field label="NIT / Identificación fiscal" htmlFor="company-tax-id" error={errors.taxId?.message}>
            <Input id="company-tax-id" placeholder="900.123.456-7" {...register('taxId')} />
          </Field>
          <Field label="Sector" htmlFor="company-sector" error={errors.sector?.message}>
            <Input
              id="company-sector"
              list="company-sectors"
              placeholder="Tecnología"
              {...register('sector')}
            />
            <datalist id="company-sectors">
              {sectors.data?.map((sector) => (
                <option key={sector} value={sector} />
              ))}
            </datalist>
          </Field>
          <Field label="Sitio web" htmlFor="company-website" error={errors.website?.message}>
            <Input id="company-website" placeholder="acme.com" {...register('website')} />
          </Field>
          <Field label="Correo de contacto" htmlFor="company-email" error={errors.email?.message}>
            <Input
              id="company-email"
              type="email"
              placeholder="contacto@acme.com"
              {...register('email')}
            />
          </Field>
          <Field label="Teléfono" htmlFor="company-phone" error={errors.phone?.message}>
            <Input id="company-phone" placeholder="+57 601 000 0000" {...register('phone')} />
          </Field>
        </div>

        <Field label="Dirección" htmlFor="company-address" error={errors.address?.message}>
          <Input id="company-address" placeholder="Calle 100 # 10-20, Bogotá" {...register('address')} />
        </Field>

        {isAdmin(user?.role) ? (
          <Field
            label="Estado"
            htmlFor="company-status"
            error={errors.status?.message}
            hint="Archivar conserva clientes, oportunidades y ventas relacionadas."
          >
            <Select id="company-status" {...register('status')}>
              <option value="ACTIVE">Activa</option>
              <option value="ARCHIVED">Archivada</option>
            </Select>
          </Field>
        ) : (
          <input type="hidden" {...register('status')} />
        )}

        <Field label="Notas internas" htmlFor="company-notes" error={errors.notes?.message}>
          <Textarea
            id="company-notes"
            rows={3}
            placeholder="Contexto comercial, acuerdos o información relevante…"
            {...register('notes')}
          />
        </Field>
      </form>
    </Modal>
  );
};
