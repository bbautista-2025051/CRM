import { useEffect, useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { useToast } from '@/providers/ToastProvider';
import { usersApi } from '@/lib/endpoints';
import { ApiError, getFieldErrors } from '@/lib/api';
import { resetPasswordSchema, type ResetPasswordValues } from '@/lib/validation';
import type { PublicUser } from '@/types';

const defaults: ResetPasswordValues = { newPassword: '' };

export const UserResetPasswordModal = ({
  open,
  onClose,
  user,
}: {
  open: boolean;
  onClose: () => void;
  user: PublicUser | null;
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
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
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
    mutationFn: async (values: ResetPasswordValues) => {
      if (!user) throw new Error('Usuario no disponible');
      return usersApi.resetPassword(user.id, values.newPassword);
    },
    onSuccess: () => {
      success(
        'Contraseña restablecida',
        `${user?.name ?? 'El usuario'} deberá cambiarla en su próximo inicio de sesión. Sus sesiones se cerraron.`,
      );
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        const fields = getFieldErrors(error.details);
        const message = fields.newPassword;
        if (message) setError('newPassword', { message });
        setFormError(message ? null : error.message);
      } else {
        setFormError('No se pudo restablecer la contraseña.');
      }
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={`Restablecer contraseña${user ? ` de ${user.name}` : ''}`}
      description="Se asignará una contraseña temporal y se cerrarán todas las sesiones del usuario."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form={formId}
            loading={mutation.isPending || isSubmitting}
            leftIcon={<KeyRound className="h-4 w-4" />}
          >
            Restablecer
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

        <Field
          label="Nueva contraseña temporal"
          htmlFor="reset-password"
          error={errors.newPassword?.message}
          hint="Mínimo 10 caracteres, con mayúscula, minúscula y número. El usuario deberá cambiarla."
          required
        >
          <Input
            id="reset-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="••••••••••"
            invalid={Boolean(errors.newPassword)}
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
            {...register('newPassword')}
          />
        </Field>

        <Alert variant="warning">
          Comparte la contraseña temporal por un canal seguro. No se mostrará de nuevo.
        </Alert>
      </form>
    </Modal>
  );
};
