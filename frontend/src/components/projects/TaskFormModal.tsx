import { useEffect, useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ListChecks } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { useToast } from '@/providers/ToastProvider';
import { useUserOptions } from '@/hooks/queries';
import { projectsApi } from '@/lib/endpoints';
import { ApiError } from '@/lib/api';
import {
  emptyToNull,
  taskFormSchema,
  type TaskFormValues,
} from '@/lib/validation';
import type { ProjectTask } from '@/types';

const defaults = (task?: ProjectTask | null): TaskFormValues => ({
  title: task?.title ?? '',
  description: task?.description ?? '',
  assigneeId: task?.assigneeId ?? '',
  status: task?.status ?? 'PENDING',
  dueDate: task?.dueDate?.slice(0, 10) ?? '',
});

export const TaskFormModal = ({
  open,
  onClose,
  projectId,
  task,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  task?: ProjectTask | null;
}) => {
  const { success } = useToast();
  const queryClient = useQueryClient();
  const users = useUserOptions(open);
  const formId = useId().replace(/:/g, '');
  const [formError, setFormError] = useState<string | null>(null);
  const editing = Boolean(task);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: defaults(task),
  });

  useEffect(() => {
    if (open) {
      reset(defaults(task));
      setFormError(null);
    }
  }, [open, task, reset]);

  const mutation = useMutation({
    mutationFn: (values: TaskFormValues) => {
      const payload = {
        title: values.title.trim(),
        description: emptyToNull(values.description),
        assigneeId: values.assigneeId,
        status: values.status,
        dueDate: emptyToNull(values.dueDate),
      };
      return task
        ? projectsApi.updateTask(projectId, task.id, payload)
        : projectsApi.createTask(projectId, payload);
    },
    onSuccess: () => {
      success(
        editing ? 'Tarea actualizada' : 'Tarea asignada',
        'El avance del proyecto se actualizó correctamente.',
      );
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      void queryClient.invalidateQueries({ queryKey: ['team'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      onClose();
    },
    onError: (error) => {
      setFormError(
        error instanceof ApiError ? error.message : 'No se pudo guardar la tarea.',
      );
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar tarea' : 'Nueva tarea'}
      description="Asigna una parte del proyecto a un integrante del equipo."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form={formId}
            loading={mutation.isPending || isSubmitting}
            leftIcon={<ListChecks className="h-4 w-4" />}
          >
            {editing ? 'Guardar cambios' : 'Asignar tarea'}
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

        <Field label="Título de la tarea" htmlFor="task-title" error={errors.title?.message} required>
          <Input
            id="task-title"
            placeholder="Configurar flujo de ventas"
            invalid={Boolean(errors.title)}
            autoFocus
            {...register('title')}
          />
        </Field>

        <Field label="Descripción" htmlFor="task-description" error={errors.description?.message}>
          <Textarea
            id="task-description"
            rows={3}
            placeholder="Detalle de la parte del proyecto asignada…"
            {...register('description')}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Integrante asignado"
            htmlFor="task-assignee"
            error={errors.assigneeId?.message}
            required
          >
            <Select id="task-assignee" {...register('assigneeId')}>
              <option value="">Selecciona un integrante</option>
              {users.data?.data.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Estado" htmlFor="task-status" error={errors.status?.message}>
            <Select id="task-status" {...register('status')}>
              <option value="PENDING">Pendiente</option>
              <option value="IN_PROGRESS">En proceso</option>
              <option value="COMPLETED">Completada</option>
            </Select>
          </Field>
        </div>

        <Field label="Fecha límite" htmlFor="task-due" error={errors.dueDate?.message}>
          <Input id="task-due" type="date" {...register('dueDate')} />
        </Field>
      </form>
    </Modal>
  );
};
