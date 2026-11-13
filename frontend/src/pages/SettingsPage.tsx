import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  Camera,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Link2,
  Laptop,
  Monitor,
  Moon,
  Palette,
  Save,
  ShieldCheck,
  Smartphone,
  Sun,
  Trash2,
  Unlink,
  UserRound,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { useToast } from '@/providers/ToastProvider';
import { useConfirm } from '@/providers/ConfirmProvider';
import { usePageTitle } from '@/hooks/usePageTitle';
import { brand } from '@/config/brand';
import { useProfile, useSessions } from '@/hooks/queries';
import { authApi, settingsApi } from '@/lib/endpoints';
import { ApiError, getFieldErrors } from '@/lib/api';
import {
  changePasswordSchema,
  profileSchema,
  type ChangePasswordValues,
  type ProfileValues,
} from '@/lib/validation';
import { formatDate, formatDateTime } from '@/lib/format';
import { ROLE_LABELS, THEME_LABELS } from '@/lib/labels';
import { cn } from '@/lib/cn';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { UserStatusBadge } from '@/components/ui/StatusBadges';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import type { ThemePreference, UserStatus } from '@/types';

type TabValue = 'profile' | 'security' | 'preferences' | 'sessions' | 'google';

const TABS: Array<{ value: TabValue; label: string }> = [
  { value: 'profile', label: 'Perfil' },
  { value: 'security', label: 'Seguridad' },
  { value: 'preferences', label: 'Preferencias' },
  { value: 'sessions', label: 'Sesiones' },
  { value: 'google', label: 'Google' },
];

const themeOptions: Array<{
  value: ThemePreference;
  label: string;
  description: string;
  icon: typeof Sun;
}> = [
  {
    value: 'LIGHT',
    label: 'Claro',
    description: 'Interfaz luminosa para entornos con buena luz.',
    icon: Sun,
  },
  {
    value: 'DARK',
    label: 'Oscuro',
    description: 'Reduce la fatiga visual en jornadas largas.',
    icon: Moon,
  },
  {
    value: 'SYSTEM',
    label: 'Sistema',
    description: 'Sigue autom├íticamente la preferencia del equipo.',
    icon: Laptop,
  },
];

const describeAgent = (userAgent: string | null): { label: string; mobile: boolean } => {
  if (!userAgent) return { label: 'Dispositivo desconocido', mobile: false };
  const browser = /Edg\//i.test(userAgent)
    ? 'Edge'
    : /Firefox\//i.test(userAgent)
      ? 'Firefox'
      : /Chrome\//i.test(userAgent)
        ? 'Chrome'
        : /Safari\//i.test(userAgent)
          ? 'Safari'
          : 'Navegador';
  const os = /Windows/i.test(userAgent)
    ? 'Windows'
    : /Android/i.test(userAgent)
      ? 'Android'
      : /iPhone|iPad|iPod/i.test(userAgent)
        ? 'iOS'
        : /Mac OS X/i.test(userAgent)
          ? 'macOS'
          : /Linux/i.test(userAgent)
            ? 'Linux'
            : 'Sistema desconocido';
  return {
    label: `${browser} ┬À ${os}`,
    mobile: /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent),
  };
};

export const SettingsPage = () => {
  usePageTitle('Configuraci├│n');
  const { user, updateUser } = useAuth();
  const { preference, setPreference } = useTheme();
  const { success, error: toastError, info } = useToast();
  const { confirm } = useConfirm();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const profileQuery = useProfile();
  const sessionsQuery = useSessions();
  const profile = profileQuery.data;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const tabParam = searchParams.get('tab');
  const initialTab = TABS.some((item) => item.value === tabParam)
    ? (tabParam as TabValue)
    : 'profile';
  const [tab, setTab] = useState<TabValue>(initialTab);

  useEffect(() => {
    if (tabParam && TABS.some((item) => item.value === tabParam)) {
      setTab(tabParam as TabValue);
    }
  }, [tabParam]);

  const changeTab = (next: TabValue) => {
    setTab(next);
    const params = new URLSearchParams(searchParams);
    params.set('tab', next);
    setSearchParams(params, { replace: true });
  };

  const currentUser = profile?.user ?? user;

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: currentUser?.name ?? '' },
  });

  useEffect(() => {
    if (currentUser?.name) {
      profileForm.reset({ name: currentUser.name });
    }
    // Solo sincroniza cuando cambia el nombre del servidor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.name]);

  const passwordForm = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const refreshProfile = () => {
    void queryClient.invalidateQueries({ queryKey: ['settings', 'profile'] });
  };

  const updateProfile = useMutation({
    mutationFn: async (values: ProfileValues) =>
      settingsApi.updateProfile(values.name),
    onSuccess: (response) => {
      updateUser(response.data.user);
      success('Perfil actualizado', response.message);
      refreshProfile();
    },
    onError: (error) => {
      toastError(
        'No se pudo guardar',
        error instanceof ApiError ? error.message : 'Int├®ntalo de nuevo.',
      );
    },
  });

  const uploadAvatar = useMutation({
    mutationFn: (file: File) => settingsApi.uploadAvatar(file),
    onSuccess: (response) => {
      updateUser(response.data.user);
      success('Foto actualizada', response.message);
      refreshProfile();
    },
    onError: (error) => {
      toastError(
        'No se pudo subir la imagen',
        error instanceof ApiError ? error.message : 'Int├®ntalo de nuevo.',
      );
    },
  });

  const removeAvatar = useMutation({
    mutationFn: () => settingsApi.deleteAvatar(),
    onSuccess: (response) => {
      updateUser(response.data.user);
      success('Foto eliminada', response.message);
      refreshProfile();
    },
    onError: (error) => {
      toastError(
        'No se pudo eliminar la foto',
        error instanceof ApiError ? error.message : 'Int├®ntalo de nuevo.',
      );
    },
  });

  const onSelectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toastError('Formato no v├ílido', 'Solo se permiten im├ígenes JPG, PNG o WebP.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toastError('Imagen demasiado grande', 'El tama├▒o m├íximo es 10 MB.');
      return;
    }
    uploadAvatar.mutate(file);
  };

  const onDeleteAvatar = async () => {
    const accepted = await confirm({
      title: 'Eliminar foto de perfil',
      description: 'Se quitar├í tu imagen actual y se mostrar├ín tus iniciales.',
      confirmLabel: 'Eliminar foto',
      variant: 'danger',
    });
    if (accepted) removeAvatar.mutate();
  };

  const changePassword = useMutation({
    mutationFn: async (values: ChangePasswordValues) =>
      authApi.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      }),
    onSuccess: (response) => {
      updateUser(response.data.user);
      passwordForm.reset();
      setPasswordError(null);
      success(
        'Contrase├▒a actualizada',
        'Se cerraron las dem├ís sesiones por seguridad.',
      );
      refreshProfile();
      void queryClient.invalidateQueries({ queryKey: ['settings', 'sessions'] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        const fields = getFieldErrors(error.details);
        let applied = false;
        if (fields.currentPassword) {
          passwordForm.setError('currentPassword', { message: fields.currentPassword });
          applied = true;
        }
        if (fields.newPassword) {
          passwordForm.setError('newPassword', { message: fields.newPassword });
          applied = true;
        }
        setPasswordError(applied ? null : error.message);
      } else {
        setPasswordError('No se pudo actualizar la contrase├▒a.');
      }
    },
  });

  const updatePreferences = useMutation({
    mutationFn: (next: ThemePreference) => settingsApi.updatePreferences(next),
    onSuccess: (response, next) => {
      updateUser(response.data.user);
      setPreference(next, true);
      success('Preferencias guardadas', `Tema ${THEME_LABELS[next].toLowerCase()} aplicado.`);
      refreshProfile();
    },
    onError: (error) => {
      setPreference(profile?.user.themePreference ?? 'SYSTEM', true);
      toastError(
        'No se pudo guardar el tema',
        error instanceof ApiError ? error.message : 'Int├®ntalo de nuevo.',
      );
    },
  });

  const selectTheme = (next: ThemePreference) => {
    if (next === preference || updatePreferences.isPending) return;
    setPreference(next, true);
    updatePreferences.mutate(next);
  };

  const revokeSessions = useMutation({
    mutationFn: () => settingsApi.revokeOtherSessions(),
    onSuccess: (response) => {
      success('Sesiones cerradas', response.message);
      void queryClient.invalidateQueries({ queryKey: ['settings', 'sessions'] });
    },
    onError: (error) => {
      toastError(
        'No se pudieron cerrar las sesiones',
        error instanceof ApiError ? error.message : 'Int├®ntalo de nuevo.',
      );
    },
  });

  const onRevokeSessions = async () => {
    const accepted = await confirm({
      title: 'Cerrar las dem├ís sesiones',
      description:
        'Se cerrar├í la sesi├│n en todos los dem├ís dispositivos. Tu sesi├│n actual se mantiene.',
      confirmLabel: 'Cerrar otras sesiones',
      variant: 'danger',
    });
    if (accepted) revokeSessions.mutate();
  };

  const linkGoogle = useMutation({
    mutationFn: (credential: string) => settingsApi.linkGoogle(credential),
    onSuccess: (response) => {
      updateUser(response.data.user);
      success('Google vinculado', response.message);
      refreshProfile();
    },
    onError: (error) => {
      toastError(
        'No se pudo vincular Google',
        error instanceof ApiError ? error.message : 'Int├®ntalo de nuevo.',
      );
    },
  });

  const unlinkGoogle = useMutation({
    mutationFn: () => settingsApi.unlinkGoogle(),
    onSuccess: (response) => {
      updateUser(response.data.user);
      success('Google desvinculado', response.message);
      refreshProfile();
    },
    onError: (error) => {
      toastError(
        'No se pudo desvincular Google',
        error instanceof ApiError ? error.message : 'Int├®ntalo de nuevo.',
      );
    },
  });

  const onUnlinkGoogle = async () => {
    if (!currentUser) return;
    if (!currentUser.hasPassword) {
      toastError(
        'No puedes desvincular Google',
        'Primero establece una contrase├▒a para no perder el acceso.',
      );
      return;
    }
    const accepted = await confirm({
      title: 'Desvincular Google',
      description:
        'Dejar├ís de poder iniciar sesi├│n con Google. Podr├ís seguir entrando con tu correo y contrase├▒a.',
      confirmLabel: 'Desvincular',
      variant: 'danger',
    });
    if (accepted) unlinkGoogle.mutate();
  };

  const sessions = sessionsQuery.data ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Configuraci├│n"
        description="Administra tu perfil, la seguridad de la cuenta y tus preferencias de trabajo."
      />

      <Card>
        <Tabs items={TABS} value={tab} onChange={changeTab} />

        {tab === 'profile' ? (
          <>
            <CardHeader
              title="Perfil"
              description="Tu identidad dentro del espacio de trabajo."
            />
            {profileQuery.isLoading ? (
              <div className="space-y-4 p-5">
                <Skeleton className="h-20 w-20 rounded-full" />
                <Skeleton className="h-10 w-full max-w-md" />
              </div>
            ) : profileQuery.isError ? (
              <ErrorState
                error={profileQuery.error}
                onRetry={() => void profileQuery.refetch()}
              />
            ) : (
              <CardBody className="space-y-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                  <Avatar
                    name={currentUser?.name ?? 'Usuario'}
                    src={currentUser?.avatarUrl}
                    size="xl"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold text-ink">
                      {currentUser?.name}
                    </p>
                    <p className="text-sm text-muted">{currentUser?.email}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge tone={currentUser?.role === 'ADMIN' ? 'brand' : 'neutral'}>
                        {currentUser ? ROLE_LABELS[currentUser.role] : 'ÔÇö'}
                      </Badge>
                      <UserStatusBadge
                        status={(currentUser?.status ?? 'INACTIVE') as UserStatus}
                      />
                      {currentUser?.googleLinked ? (
                        <Badge tone="success">Google vinculado</Badge>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={onSelectFile}
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      loading={uploadAvatar.isPending}
                      leftIcon={<Camera className="h-4 w-4" />}
                    >
                      Cambiar foto
                    </Button>
                    {currentUser?.avatarUrl ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void onDeleteAvatar()}
                        loading={removeAvatar.isPending}
                        leftIcon={<Trash2 className="h-4 w-4" />}
                      >
                        Quitar
                      </Button>
                    ) : null}
                  </div>
                </div>

                <form
                  onSubmit={profileForm.handleSubmit((values) =>
                    updateProfile.mutate(values),
                  )}
                  className="max-w-xl space-y-4"
                  noValidate
                >
                  <Field
                    label="Nombre completo"
                    htmlFor="profile-name"
                    error={profileForm.formState.errors.name?.message}
                    required
                  >
                    <Input
                      id="profile-name"
                      autoComplete="name"
                      invalid={Boolean(profileForm.formState.errors.name)}
                      {...profileForm.register('name')}
                    />
                  </Field>
                  <Field
                    label="Correo electr├│nico"
                    htmlFor="profile-email"
                    hint="Solo un administrador puede cambiar tu correo."
                  >
                    <Input
                      id="profile-email"
                      type="email"
                      value={currentUser?.email ?? ''}
                      disabled
                      readOnly
                    />
                  </Field>
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      loading={
                        updateProfile.isPending || profileForm.formState.isSubmitting
                      }
                      leftIcon={<Save className="h-4 w-4" />}
                    >
                      Guardar perfil
                    </Button>
                  </div>
                </form>

                <div className="grid gap-3 rounded-xl border border-line bg-elevated/40 p-4 text-xs text-muted sm:grid-cols-3">
                  <span>
                    <span className="block text-[10px] font-semibold uppercase tracking-wide">
                      Miembro desde
                    </span>
                    {formatDate(currentUser?.createdAt)}
                  </span>
                  <span>
                    <span className="block text-[10px] font-semibold uppercase tracking-wide">
                      ├Ültimo acceso
                    </span>
                    {currentUser?.lastLoginAt
                      ? formatDateTime(currentUser.lastLoginAt)
                      : 'Nunca'}
                  </span>
                  <span>
                    <span className="block text-[10px] font-semibold uppercase tracking-wide">
                      Sesi├│n actual
                    </span>
                    {profile
                      ? `${profile.session.rememberMe ? 'Recordada' : 'Est├índar'} ┬À vence ${formatDateTime(profile.session.expiresAt)}`
                      : 'ÔÇö'}
                  </span>
                </div>
              </CardBody>
            )}
          </>
        ) : null}

        {tab === 'security' ? (
          <>
            <CardHeader
              title="Seguridad"
              description="Cambia tu contrase├▒a y revisa el estado de la cuenta."
            />
            <CardBody className="grid gap-6 lg:grid-cols-2">
              <form
                onSubmit={passwordForm.handleSubmit((values) =>
                  changePassword.mutate(values),
                )}
                className="space-y-4"
                noValidate
              >
                {currentUser?.mustChangePassword ? (
                  <Alert variant="warning" title="Cambio de contrase├▒a pendiente">
                    Est├ís usando una contrase├▒a temporal. Actual├¡zala para proteger tu
                    cuenta.
                  </Alert>
                ) : null}
                {passwordError ? (
                  <Alert variant="error" onClose={() => setPasswordError(null)}>
                    {passwordError}
                  </Alert>
                ) : null}

                <Field
                  label="Contrase├▒a actual"
                  htmlFor="current-password"
                  error={passwordForm.formState.errors.currentPassword?.message}
                  required
                >
                  <Input
                    id="current-password"
                    type={showCurrent ? 'text' : 'password'}
                    autoComplete="current-password"
                    invalid={Boolean(passwordForm.formState.errors.currentPassword)}
                    trailing={
                      <button
                        type="button"
                        onClick={() => setShowCurrent((value) => !value)}
                        className="rounded-md p-1.5 text-muted transition hover:bg-elevated hover:text-ink"
                        aria-label={showCurrent ? 'Ocultar contrase├▒a' : 'Mostrar contrase├▒a'}
                      >
                        {showCurrent ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    }
                    {...passwordForm.register('currentPassword')}
                  />
                </Field>
                <Field
                  label="Nueva contrase├▒a"
                  htmlFor="new-password"
                  error={passwordForm.formState.errors.newPassword?.message}
                  hint="M├¡nimo 10 caracteres, con may├║scula, min├║scula y n├║mero."
                  required
                >
                  <Input
                    id="new-password"
                    type={showNew ? 'text' : 'password'}
                    autoComplete="new-password"
                    invalid={Boolean(passwordForm.formState.errors.newPassword)}
                    trailing={
                      <button
                        type="button"
                        onClick={() => setShowNew((value) => !value)}
                        className="rounded-md p-1.5 text-muted transition hover:bg-elevated hover:text-ink"
                        aria-label={showNew ? 'Ocultar contrase├▒a' : 'Mostrar contrase├▒a'}
                      >
                        {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    }
                    {...passwordForm.register('newPassword')}
                  />
                </Field>
                <Field
                  label="Confirmar nueva contrase├▒a"
                  htmlFor="confirm-password"
                  error={passwordForm.formState.errors.confirmPassword?.message}
                  required
                >
                  <Input
                    id="confirm-password"
                    type={showNew ? 'text' : 'password'}
                    autoComplete="new-password"
                    invalid={Boolean(passwordForm.formState.errors.confirmPassword)}
                    {...passwordForm.register('confirmPassword')}
                  />
                </Field>
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    loading={
                      changePassword.isPending || passwordForm.formState.isSubmitting
                    }
                    leftIcon={<KeyRound className="h-4 w-4" />}
                  >
                    Actualizar contrase├▒a
                  </Button>
                </div>
              </form>

              <div className="space-y-3">
                <div className="rounded-xl border border-line bg-elevated/40 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <ShieldCheck className="h-4 w-4 text-brand" /> Protecci├│n de la cuenta
                  </p>
                  <ul className="mt-3 space-y-2 text-xs leading-5 text-muted">
                    <li>┬À Las contrase├▒as se almacenan con Argon2id, nunca en texto plano.</li>
                    <li>┬À La sesi├│n usa una cookie HttpOnly y un token CSRF por sesi├│n.</li>
                    <li>┬À Al cambiar la contrase├▒a se cierran las dem├ís sesiones.</li>
                    <li>┬À La cuenta se bloquea temporalmente tras intentos fallidos repetidos.</li>
                  </ul>
                </div>
                <div className="rounded-xl border border-line p-4">
                  <p className="text-sm font-semibold text-ink">Sesi├│n actual</p>
                  <p className="mt-1 text-xs text-muted">
                    {profile
                      ? `${profile.session.rememberMe ? 'Recordada por 30 d├¡as' : 'Duraci├│n est├índar de 8 horas'} ┬À vence ${formatDateTime(profile.session.expiresAt)}`
                      : 'CargandoÔÇª'}
                  </p>
                </div>
                <div className="rounded-xl border border-line p-4">
                  <p className="text-sm font-semibold text-ink">Acceso con Google</p>
                  <p className="mt-1 text-xs text-muted">
                    {currentUser?.googleLinked
                      ? 'Vinculado. Puedes gestionarlo en la pesta├▒a Google.'
                      : 'No vinculado. Puedes vincularlo desde la pesta├▒a Google.'}
                  </p>
                </div>
              </div>
            </CardBody>
          </>
        ) : null}

        {tab === 'preferences' ? (
          <>
            <CardHeader
              title="Preferencias"
              description={`Personaliza la apariencia de ${brand.product}.`}
            />
            <CardBody className="space-y-6">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <Palette className="h-4 w-4 text-brand" /> Tema de la interfaz
                </p>
                <p className="mt-1 text-xs text-muted">
                  La preferencia se guarda en tu cuenta y se aplica en todos tus
                  dispositivos.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {themeOptions.map((option) => {
                    const active = preference === option.value;
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => selectTheme(option.value)}
                        disabled={updatePreferences.isPending}
                        aria-pressed={active}
                        className={cn(
                          'focus-ring relative flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition',
                          active
                            ? 'border-brand bg-brand-soft/60 ring-1 ring-brand/30'
                            : 'border-line bg-surface hover:border-muted/40 hover:bg-elevated/40',
                        )}
                      >
                        <span className="flex w-full items-center justify-between">
                          <Icon
                            className={cn(
                              'h-5 w-5',
                              active ? 'text-brand-strong dark:text-brand' : 'text-muted',
                            )}
                          />
                          {active ? (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-brand-ink">
                              <Check className="h-3 w-3" />
                            </span>
                          ) : null}
                        </span>
                        <span className="text-sm font-semibold text-ink">
                          {option.label}
                        </span>
                        <span className="text-[11px] leading-5 text-muted">
                          {option.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {updatePreferences.isPending ? (
                  <p className="mt-2 text-[11px] text-muted">Guardando preferenciaÔÇª</p>
                ) : null}
              </div>

              <div className="grid gap-3 rounded-xl border border-line bg-elevated/40 p-4 text-xs text-muted sm:grid-cols-2">
                <span className="inline-flex items-center gap-2">
                  <Monitor className="h-4 w-4" /> Resoluci├│n adaptada a escritorio y m├│vil.
                </span>
                <span className="inline-flex items-center gap-2">
                  <Palette className="h-4 w-4" /> Paleta corporativa con contraste AA.
                </span>
              </div>
            </CardBody>
          </>
        ) : null}

        {tab === 'sessions' ? (
          <>
            <CardHeader
              title="Sesiones activas"
              description="Dispositivos con acceso a tu cuenta. Cierra las que no reconozcas."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void onRevokeSessions()}
                  loading={revokeSessions.isPending}
                  disabled={sessions.every((session) => session.current)}
                >
                  Cerrar las dem├ís
                </Button>
              }
            />
            {sessionsQuery.isLoading ? (
              <div className="space-y-3 p-5">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : sessionsQuery.isError ? (
              <ErrorState
                error={sessionsQuery.error}
                onRetry={() => void sessionsQuery.refetch()}
              />
            ) : sessions.length === 0 ? (
              <div className="p-5 text-sm text-muted">No hay sesiones activas.</div>
            ) : (
              <div className="divide-y divide-line">
                {sessions.map((session) => {
                  const agent = describeAgent(session.userAgent);
                  return (
                    <div
                      key={session.id}
                      className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-elevated text-muted">
                        {agent.mobile ? (
                          <Smartphone className="h-5 w-5" />
                        ) : (
                          <Monitor className="h-5 w-5" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
                          {agent.label}
                          {session.current ? (
                            <Badge tone="success" dot>
                              Esta sesi├│n
                            </Badge>
                          ) : null}
                          {session.rememberMe ? (
                            <Badge tone="neutral">Recordada</Badge>
                          ) : null}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted">
                          Inici├│ {formatDateTime(session.createdAt)} ┬À ├║ltima actividad{' '}
                          {formatDateTime(session.lastSeenAt)}
                          {session.ipAddress ? ` ┬À IP ${session.ipAddress}` : ''}
                        </p>
                      </div>
                      <div className="shrink-0 text-right text-[11px] text-muted">
                        Vence {formatDateTime(session.expiresAt)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <CardBody className="border-t border-line py-3">
              <p className="flex items-start gap-1.5 text-[11px] text-muted">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Cerrar una sesi├│n invalida su cookie en el servidor de inmediato. Las
                sesiones recordadas duran hasta 30 d├¡as; las normales, 8 horas.
              </p>
            </CardBody>
          </>
        ) : null}

        {tab === 'google' ? (
          <>
            <CardHeader
              title="Cuenta de Google"
              description="Vincula tu identidad de Google para iniciar sesi├│n sin contrase├▒a."
            />
            <CardBody className="space-y-5">
              {!profile?.googleEnabled ? (
                <Alert variant="info" title="Google no est├í configurado">
                  Un administrador debe configurar las credenciales OAuth de Google en el
                  servidor para habilitar esta opci├│n. El acceso con correo y contrase├▒a
                  sigue disponible.
                </Alert>
              ) : null}

              <div className="flex flex-col gap-4 rounded-xl border border-line p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-elevated text-muted">
                    <Link2 className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {currentUser?.googleLinked
                        ? 'Google vinculado'
                        : 'Google no vinculado'}
                    </p>
                    <p className="mt-1 max-w-lg text-xs leading-5 text-muted">
                      {currentUser?.googleLinked
                        ? 'Puedes iniciar sesi├│n con el bot├│n de Google. Tu correo debe coincidir con el registrado en el CRM.'
                        : 'Solo puedes vincular una cuenta de Google cuyo correo coincida exactamente con tu correo del CRM. No hay auto-registro.'}
                    </p>
                    {currentUser && !currentUser.hasPassword ? (
                      <p className="mt-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                        Establece una contrase├▒a antes de desvincular Google para no perder
                        el acceso.
                      </p>
                    ) : null}
                  </div>
                </div>
                {currentUser?.googleLinked ? (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => void onUnlinkGoogle()}
                    loading={unlinkGoogle.isPending}
                    leftIcon={<Unlink className="h-4 w-4" />}
                    disabled={!currentUser.hasPassword}
                  >
                    Desvincular
                  </Button>
                ) : null}
              </div>

              {profile?.googleEnabled && profile.googleClientId && !currentUser?.googleLinked ? (
                <div className="max-w-sm">
                  <p className="mb-2 text-xs font-medium text-ink">
                    Continuar con tu cuenta de Google
                  </p>
                  <GoogleSignInButton
                    clientId={profile.googleClientId}
                    mode="link"
                    disabled={linkGoogle.isPending}
                    onCredential={(credential) => {
                      if (linkGoogle.isPending) return;
                      linkGoogle.mutate(credential);
                    }}
                  />
                </div>
              ) : null}

              <div className="rounded-xl border border-line bg-elevated/40 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <UserRound className="h-4 w-4 text-brand" /> C├│mo funciona
                </p>
                <ul className="mt-2 space-y-1.5 text-xs leading-5 text-muted">
                  <li>┬À No se crean cuentas autom├íticamente desde Google.</li>
                  <li>┬À Tu administrador debe crear primero tu usuario en el CRM.</li>
                  <li>┬À La vinculaci├│n exige que el correo de Google est├® verificado y coincida.</li>
                  <li>┬À Puedes desvincular Google si tienes una contrase├▒a activa.</li>
                </ul>
              </div>
              <p className="text-[11px] text-muted">
                Estado del proveedor:{' '}
                <span className="font-medium text-ink">
                  {profile?.googleEnabled ? 'Configurado en el servidor' : 'No configurado'}
                </span>
                . La integraci├│n no se ha validado en vivo sin credenciales reales.
              </p>
            </CardBody>
          </>
        ) : null}
      </Card>

      <div className="flex items-center gap-2 px-1 text-[11px] text-muted">
        <Laptop className="h-3.5 w-3.5" />
        Los cambios de tema se aplican al instante y se sincronizan con tu cuenta.
        <button
          type="button"
          onClick={() =>
            info(
              'Soporte',
              'Contacta a un administrador si necesitas cambiar tu correo, rol o acceso.',
            )
          }
          className="font-medium text-brand-strong hover:underline dark:text-brand"
        >
          ┬┐Necesitas ayuda?
        </button>
      </div>
    </div>
  );
};
