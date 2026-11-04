import { useEffect, useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/providers/ToastProvider';
import { usersApi } from '@/lib/endpoints';
import { ApiError, getFieldErrors } from '@/lib/api';
import { userEditSchema, type UserEditValues } from '@/lib/validation';
import { ROLE_LABELS } from '@/lib/labels';
import type { PublicUser, Role } from '@/types';

const ROLE_OPTIONS: Role[] = ['ADMIN', 'PROGRAMADOR', 'VENDEDOR', 'SUPERVISOR', 'OPERACIONES'];

const defaults = (user?: PublicUser | null): UserEditValues => ({
  name: user?.name ?? '',
  email: user?.email ?? '',
  role: user?.role ?? 'VENDEDOR',
  status: user?.status ?? 'ACTIVE',
});

export const UserEditModal = ({
  open,
  onClose,
  user,
  currentUserId,
}: {
  open: boolean;
  onClose: () => void;
  user: PublicUser | null;
  currentUserId: string | undefined;
}) => {
  const { success } = useToast();
  const queryClient = useQueryClient();
  const formId = useId().replace(/:/g, '');
  const [formError, setFormError] = useState<string | null>(null);
  const isSelf = Boolean(user && currentUserId && user.id === currentUserId);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UserEditValues>({
    resolver: zodResolver(userEditSchema),
    defaultValues: defaults(user),
  });

  useEffect(() => {
    if (open) {
      reset(defaults(user));
      setFormError(null);
    }
  }, [open, user, reset]);

  const mutation = useMutation({
    mutationFn: async (values: UserEditValues) => {
      if (!user) throw new Error('Usuario no disponible');
      return usersApi.update(user.id, {
        name: values.name,
        email: values.email,
        ...(isSelf ? {} : { role: values.role, status: values.status }),
      });
    },
    onSuccess: (response) => {
      success('Usuario actualizado', `Se guardaron los cambios de ${response.data.name}.`);
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        const fields = getFieldErrors(error.details);
        let applied = false;
        for (const [field, message] of Object.entries(fields)) {
          if (field === 'name' || field === 'email' || field === 'role' || field === 'status') {
            setError(field, { message });
            applied = true;
          }
        }
        setFormError(applied ? null : error.message);
      } else {
        setFormError('No se pudo actualizar el usuario.');
      }
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={user ? `Editar ${user.name}` : 'Editar usuario'}
      description={
        user
          ? `${user.email} · ${user.googleLinked ? 'Google vinculado' : 'Acceso con contraseña'}`
          : 'Datos del usuario'
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
            leftIcon={<Save className="h-4 w-4" />}
          >
            Guardar cambios
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

        {isSelf ? (
          <Alert variant="info">
            Estás editando tu propia cuenta. Por seguridad no puedes cambiar tu rol ni
            desactivarte.
          </Alert>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre completo" htmlFor="edit-user-name" error={errors.name?.message} required>
            <Input
              id="edit-user-name"
              autoComplete="name"
              invalid={Boolean(errors.name)}
              {...register('name')}
            />
          </Field>
          <Field label="Correo electrónico" htmlFor="edit-user-email" error={errors.email?.message} required>
            <Input
              id="edit-user-email"
              type="email"
              autoComplete="email"
              invalid={Boolean(errors.email)}
              {...register('email')}
            />
          </Field>
          <Field label="Rol" htmlFor="edit-user-role" error={errors.role?.message} required>
            <Select
              id="edit-user-role"
              disabled={isSelf}
              invalid={Boolean(errors.role)}
              {...register('role')}
            >
              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>{ROLE_LABELS[role]}</option>
              ))}
            </Select>
            {isSelf ? <p className="hint">No puedes cambiar tu propio rol.</p> : null}
          </Field>
          <Field label="Estado" htmlFor="edit-user-status" error={errors.status?.message} required>
            <Select
              id="edit-user-status"
              disabled={isSelf}
              invalid={Boolean(errors.status)}
              {...register('status')}
            >
              <option value="ACTIVE">Activo</option>
              <option value="INACTIVE">Inactivo</option>
            </Select>
            {isSelf ? (
              <p className="hint">No puedes desactivar tu propia cuenta.</p>
            ) : (
              <p className="hint">
                Al desactivar la cuenta se cierran todas sus sesiones activas.
              </p>
            )}
          </Field>
        </div>

        {user ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-elevated/40 px-4 py-3 text-xs text-muted">
            <Badge tone={user.googleLinked ? 'success' : 'neutral'}>
              {user.googleLinked ? 'Google vinculado' : 'Sin Google'}
            </Badge>
            <Badge tone={user.hasPassword ? 'neutral' : 'warning'}>
              {user.hasPassword ? 'Contraseña activa' : 'Sin contraseña'}
            </Badge>
            {user.mustChangePassword ? (
              <Badge tone="warning">Cambio de contraseña pendiente</Badge>
            ) : null}
            <span>El correo es único y se usa para iniciar sesión.</span>
          </div>
        ) : null}
      </form>
    </Modal>
  );
};
