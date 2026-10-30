import { useEffect, useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Checkbox, Field, Input, Select } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { useToast } from '@/providers/ToastProvider';
import { usersApi } from '@/lib/endpoints';
import { ApiError, getFieldErrors } from '@/lib/api';
import {
  userCreateSchema,
  type UserCreateValues,
} from '@/lib/validation';

const defaults: UserCreateValues = {
  name: '',
  email: '',
  password: '',
  role: 'VENDEDOR',
  status: 'ACTIVE',
  mustChangePassword: true,
};

export const UserCreateModal = ({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) => {
  const { success } = useToast();
  const queryClient = useQueryClient();
  const formId = useId().replace(/:/g, '');
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UserCreateValues>({
    resolver: zodResolver(userCreateSchema),
    defaultValues: defaults,
  });

  useEffect(() => {
    if (open) {
      reset(defaults);
      setFormError(null);
      setShowPassword(false);
    }
  }, [open, reset]);

  const mutation = useMutation({
    mutationFn: async (values: UserCreateValues) =>
      usersApi.create({
        name: values.name,
        email: values.email,
        password: values.password,
        role: values.role,
        status: values.status,
        mustChangePassword: values.mustChangePassword,
      }),
    onSuccess: (response) => {
      success(
        'Usuario creado',
        `${response.data.name} ya puede iniciar sesión con su contraseña temporal.`,
      );
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        const fields = getFieldErrors(error.details);
        let applied = false;
        for (const [field, message] of Object.entries(fields)) {
          if (field === 'name' || field === 'email' || field === 'password' || field === 'role' || field === 'status') {
            setError(field, { message });
            applied = true;
          }
        }
        setFormError(applied ? null : error.message);
      } else {
        setFormError('No se pudo crear el usuario.');
      }
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Nuevo usuario"
      description="Crea una cuenta interna. No existe auto-registro público."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form={formId}
            loading={mutation.isPending || isSubmitting}
            leftIcon={<UserPlus className="h-4 w-4" />}
          >
            Crear usuario
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
          <Field label="Nombre completo" htmlFor="user-name" error={errors.name?.message} required>
            <Input
              id="user-name"
              autoComplete="name"
              placeholder="Ana Martínez"
              invalid={Boolean(errors.name)}
              {...register('name')}
            />
          </Field>
          <Field label="Correo electrónico" htmlFor="user-email" error={errors.email?.message} required>
            <Input
              id="user-email"
              type="email"
              autoComplete="email"
              placeholder="ana@empresa.com"
              invalid={Boolean(errors.email)}
              {...register('email')}
            />
          </Field>
          <Field
            label="Contraseña temporal"
            htmlFor="user-password"
            error={errors.password?.message}
            hint="Mínimo 10 caracteres, con mayúscula, minúscula y número."
            required
          >
            <Input
              id="user-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••••"
              invalid={Boolean(errors.password)}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="rounded-md p-1.5 text-muted transition hover:bg-elevated hover:text-ink"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
              {...register('password')}
            />
          </Field>
          <Field label="Rol" htmlFor="user-role" error={errors.role?.message} required>
            <Select id="user-role" invalid={Boolean(errors.role)} {...register('role')}>
              <option value="VENDEDOR">Vendedor</option>
              <option value="ADMIN">Administrador</option>
            </Select>
          </Field>
          <Field label="Estado" htmlFor="user-status" error={errors.status?.message} required>
            <Select id="user-status" invalid={Boolean(errors.status)} {...register('status')}>
              <option value="ACTIVE">Activo</option>
              <option value="INACTIVE">Inactivo</option>
            </Select>
          </Field>
        </div>

        <Checkbox
          label="Solicitar cambio de contraseña al primer inicio de sesión"
          hint="Recomendado para contraseñas temporales."
          {...register('mustChangePassword')}
        />

        <Alert variant="info">
          Los vendedores pueden ver toda la información comercial, pero solo gestionan sus
          propias oportunidades y ventas. Los administradores archivan registros, confirman
          ventas y gestionan usuarios.
        </Alert>
      </form>
    </Modal>
  );
};
