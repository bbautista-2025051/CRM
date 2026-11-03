import { useEffect, useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FolderKanban } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { useToast } from '@/providers/ToastProvider';
import { useCompanyOptions, useUserOptions } from '@/hooks/queries';
import { projectsApi, unwrap } from '@/lib/endpoints';
import { ApiError } from '@/lib/api';
import {
  emptyToNull,
  projectFormSchema,
  type ProjectFormValues,
} from '@/lib/validation';
import type { Project } from '@/types';

const defaults = (project?: Project | null): ProjectFormValues => ({
  name: project?.name ?? '',
  description: project?.description ?? '',
  companyId: project?.companyId ?? '',
  managerId: project?.managerId ?? '',
  status: project?.status ?? 'ACTIVE',
  startDate: project?.startDate?.slice(0, 10) ?? '',
  dueDate: project?.dueDate?.slice(0, 10) ?? '',
});

export const ProjectFormModal = ({
  open,
  onClose,
  project,
}: {
  open: boolean;
  onClose: () => void;
  project?: Project | null;
}) => {
  const { success } = useToast();
  const queryClient = useQueryClient();
  const companies = useCompanyOptions('', open);
  const users = useUserOptions(open);
  const formId = useId().replace(/:/g, '');
  const [formError, setFormError] = useState<string | null>(null);
  const editing = Boolean(project);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: defaults(project),
  });

  useEffect(() => {
    if (open) {
      reset(defaults(project));
      setFormError(null);
    }
  }, [open, project, reset]);

  const mutation = useMutation({
    mutationFn: async (values: ProjectFormValues) => {
      const payload = {
        name: values.name.trim(),
        description: emptyToNull(values.description),
        companyId: emptyToNull(values.companyId),
        managerId: emptyToNull(values.managerId),
        status: values.status,
        startDate: emptyToNull(values.startDate),
        dueDate: emptyToNull(values.dueDate),
      };
      return project
        ? unwrap(await projectsApi.update(project.id, payload))
        : unwrap(await projectsApi.create(payload));
    },
    onSuccess: (saved) => {
      success(
        editing ? 'Proyecto actualizado' : 'Proyecto creado',
        `${saved.name} se guardó correctamente.`,
      );
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      void queryClient.invalidateQueries({ queryKey: ['team'] });
      onClose();
    },
    onError: (error) => {
      setFormError(
        error instanceof ApiError ? error.message : 'No se pudo guardar el proyecto.',
      );
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={editing ? 'Editar proyecto' : 'Nuevo proyecto'}
      description="Define el alcance, el responsable y las fechas del proyecto."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form={formId}
            loading={mutation.isPending || isSubmitting}
            leftIcon={<FolderKanban className="h-4 w-4" />}
          >
            {editing ? 'Guardar cambios' : 'Crear proyecto'}
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

        <Field label="Nombre del proyecto" htmlFor="project-name" error={errors.name?.message} required>
          <Input
            id="project-name"
            placeholder="Implementación CRM 2026"
            invalid={Boolean(errors.name)}
            autoFocus
            {...register('name')}
          />
        </Field>

        <Field label="Descripción" htmlFor="project-description" error={errors.description?.message}>
          <Textarea
            id="project-description"
            rows={3}
            placeholder="Objetivo, alcance y entregables principales…"
            {...register('description')}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Empresa" htmlFor="project-company" error={errors.companyId?.message}>
            <Select id="project-company" {...register('companyId')}>
              <option value="">Sin empresa</option>
              {companies.data?.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Responsable" htmlFor="project-manager" error={errors.managerId?.message}>
            <Select id="project-manager" {...register('managerId')}>
              <option value="">Sin responsable</option>
              {users.data?.data.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Estado" htmlFor="project-status" error={errors.status?.message}>
            <Select id="project-status" {...register('status')}>
              <option value="ACTIVE">Activo</option>
              <option value="COMPLETED">Terminado</option>
            </Select>
          </Field>
          <Field label="Fecha de inicio" htmlFor="project-start" error={errors.startDate?.message}>
            <Input id="project-start" type="date" {...register('startDate')} />
          </Field>
          <Field label="Fecha de entrega" htmlFor="project-due" error={errors.dueDate?.message}>
            <Input id="project-due" type="date" {...register('dueDate')} />
          </Field>
        </div>
      </form>
    </Modal>
  );
};
