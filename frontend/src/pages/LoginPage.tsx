import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/providers/ToastProvider';
import { useGoogleStatus } from '@/hooks/queries';
import { usePageTitle } from '@/hooks/usePageTitle';
import { loginSchema, type LoginValues } from '@/lib/validation';
import { ApiError } from '@/lib/api';
import { brand } from '@/config/brand';
import { Alert } from '@/components/ui/Alert';
import { Field, Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { LoginDotMap } from '@/components/auth/LoginDotMap';
import GlowCursor from '@/components/effects/GlowCursor';
import { useTheme } from '@/providers/ThemeProvider';
import { cn } from '@/lib/cn';

const fieldClasses =
  'h-11 rounded-lg border-gray-200 bg-gray-50 text-sm text-gray-800 shadow-none placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500/20 dark:border-white/10 dark:bg-slate-800/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-400/20';

const labelClasses =
  'mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300';

export const LoginPage = () => {
  usePageTitle('Iniciar sesión');
  const { login, loginWithGoogle } = useAuth();
  const { success, info } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const googleStatus = useGoogleStatus();
  const { resolved } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const onSubmit = async (values: LoginValues) => {
    setFormError(null);
    try {
      const user = await login(values.email, values.password, values.rememberMe);
      success(`Bienvenido, ${user.name.split(' ')[0]}`, 'Tu sesión se inició correctamente.');
      navigate(from, { replace: true });
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : 'No se pudo iniciar sesión. Inténtalo de nuevo.',
      );
    }
  };

  const onGoogle = async (credential: string) => {
    setFormError(null);
    setGoogleLoading(true);
    try {
      const user = await loginWithGoogle(credential);
      success(`Bienvenido, ${user.name.split(' ')[0]}`, 'Sesión iniciada con Google.');
      navigate(from, { replace: true });
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : 'No se pudo iniciar sesión con Google.',
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  const googleEnabled = Boolean(googleStatus.data?.enabled && googleStatus.data?.clientId);

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-indigo-100 p-4 dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-blue-300/20 blur-3xl dark:bg-blue-500/10"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-indigo-300/20 blur-3xl dark:bg-indigo-500/10"
      />

      <ThemeToggle className="absolute right-4 top-4 z-20 border border-white/60 bg-white/70 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5" />

      <div className="relative z-10 w-full max-w-4xl animate-login-scale overflow-hidden rounded-2xl bg-white shadow-xl shadow-indigo-200/40 ring-1 ring-black/5 dark:bg-slate-900 dark:shadow-black/40 dark:ring-white/10">
        <div className="flex">
          <section className="relative hidden w-1/2 overflow-hidden border-r border-gray-100 md:block dark:border-white/10">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-indigo-100 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950">
              <LoginDotMap />

              <GlowCursor
                autoDraw
                color="#1291F8"
                intensity={1.15}
                trailWidth={4}
                linger={2.6}
                glow={1.1}
                clickBurst
                theme={resolved === 'dark' ? 'dark' : 'light'}
                className="!absolute inset-0"
                style={{ position: 'absolute', inset: 0 }}
              />

              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-10 text-center">
                <div
                  className="animate-login-up rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-3 shadow-lg shadow-blue-500/25"
                  style={{ animationDelay: '120ms' }}
                >
                  <ArrowRight className="h-7 w-7 text-white" />
                </div>
                <img
                  src="/login-brand.png"
                  alt={brand.product}
                  className="mt-6 w-full max-w-[300px] animate-login-up select-none drop-shadow-sm"
                  style={{ animationDelay: '220ms' }}
                  draggable={false}
                />
                <p
                  className="mt-3 max-w-xs animate-login-up text-sm leading-6 text-gray-600 dark:text-slate-400"
                  style={{ animationDelay: '320ms' }}
                >
                  Inicia sesión para acceder a tu espacio de trabajo comercial y tener tu
                  operación bajo control.
                </p>
                <div
                  className="mt-8 inline-flex animate-login-up items-center gap-2 rounded-full border border-white/70 bg-white/60 px-3 py-1.5 text-[11px] font-medium text-gray-600 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                  style={{ animationDelay: '420ms' }}
                >
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  {brand.tagline}
                </div>
              </div>

              <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between px-8 pb-7 text-[11px] text-gray-500 dark:text-slate-500">
                <span>
                  © {new Date().getFullYear()} {brand.company}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Servicio disponible
                </span>
              </div>
            </div>
          </section>

          <section className="flex w-full flex-col justify-center bg-white p-7 sm:p-10 md:w-1/2 dark:bg-slate-900">
            <div className="mx-auto w-full max-w-[380px]">
              <div className="animate-login-up">
                <h1 className="text-2xl font-bold tracking-tight text-gray-800 sm:text-3xl dark:text-slate-100">
                  Bienvenido de nuevo
                </h1>
                <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
                  Inicia sesión en tu cuenta de {brand.product}.
                </p>
              </div>

              {googleEnabled ? (
                <div className="mt-7 animate-login-up" style={{ animationDelay: '90ms' }}>
                  <div
                    className={cn(
                      'overflow-hidden rounded-lg',
                      googleLoading && 'pointer-events-none opacity-60',
                    )}
                  >
                    <GoogleSignInButton
                      clientId={googleStatus.data?.clientId ?? ''}
                      onCredential={(credential) => void onGoogle(credential)}
                    />
                  </div>
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200 dark:border-white/10" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-white px-3 uppercase tracking-wider text-gray-400 dark:bg-slate-900 dark:text-slate-500">
                        o
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}

              {formError ? (
                <Alert variant="error" className="mb-5" onClose={() => setFormError(null)}>
                  {formError}
                </Alert>
              ) : null}

              <form
                onSubmit={handleSubmit(onSubmit)}
                className="animate-login-up space-y-5"
                style={{ animationDelay: '160ms' }}
                noValidate
              >
                <Field htmlFor="email" error={errors.email?.message}>
                  <label htmlFor="email" className={labelClasses}>
                    Correo electrónico <span className="text-blue-500">*</span>
                  </label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="tu@empresa.com"
                    invalid={Boolean(errors.email)}
                    className={fieldClasses}
                    {...register('email')}
                  />
                </Field>

                <Field htmlFor="password" error={errors.password?.message}>
                  <label htmlFor="password" className={labelClasses}>
                    Contraseña <span className="text-blue-500">*</span>
                  </label>
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••••"
                    invalid={Boolean(errors.password)}
                    className={cn(fieldClasses, 'pr-11')}
                    trailing={
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        className="rounded-md p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-200"
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    }
                    {...register('password')}
                  />
                </Field>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-white/20 dark:bg-slate-800"
                      {...register('rememberMe')}
                    />
                    Recuérdame
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      info('Restablecer contraseña', 'Solicita el cambio a un administrador.')
                    }
                    className="text-sm font-medium text-blue-600 transition hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="group relative inline-flex h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:from-blue-600 hover:to-indigo-700 hover:shadow-lg hover:shadow-blue-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 dark:hover:shadow-blue-950/60"
                >
                  {isSubmitting ? (
                    <>
                      <Spinner className="h-4 w-4" />
                      Iniciando sesión…
                    </>
                  ) : (
                    <>
                      Iniciar sesión
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                    </>
                  )}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 blur-md group-hover:animate-login-shine"
                  />
                </button>
              </form>

              <div className="mt-8 flex gap-2.5 rounded-xl border border-gray-100 bg-gray-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
                <p className="text-[11px] leading-5 text-gray-500 dark:text-slate-400">
                  ¿No tienes acceso? Solicítalo a un administrador. No permitimos
                  auto-registro y nunca compartimos tus credenciales.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
