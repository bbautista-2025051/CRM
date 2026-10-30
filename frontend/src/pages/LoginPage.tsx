import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  Target,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/providers/ToastProvider';
import { useGoogleStatus } from '@/hooks/queries';
import { usePageTitle } from '@/hooks/usePageTitle';
import { loginSchema, type LoginValues } from '@/lib/validation';
import { ApiError } from '@/lib/api';
import { brand } from '@/config/brand';
import { Button } from '@/components/ui/Button';
import { Input, Field, Checkbox } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { Logo } from '@/components/ui/Logo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';

const benefits = [
  {
    icon: Target,
    title: 'Pipeline siempre visible',
    description: 'Oportunidades, etapas y probabilidades en un solo lugar.',
  },
  {
    icon: BarChart3,
    title: 'Decisiones con datos',
    description: 'Ingresos confirmados, conversión y actividad en tiempo real.',
  },
  {
    icon: ShieldCheck,
    title: 'Acceso seguro',
    description: 'Sesiones del servidor, roles y auditoría de cada cambio.',
  },
];

export const LoginPage = () => {
  usePageTitle('Iniciar sesión');
  const { login, loginWithGoogle } = useAuth();
  const { success } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const googleStatus = useGoogleStatus();
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

  const googleEnabled = googleStatus.data?.enabled && googleStatus.data.clientId;

  return (
    <div className="grid min-h-screen bg-canvas lg:grid-cols-[1.02fr_1fr]">
      <section className="brand-gradient relative hidden overflow-hidden p-10 text-white lg:flex lg:flex-col xl:p-14">
        <div className="dot-grid pointer-events-none absolute inset-0 opacity-[0.18]" />
        <div className="relative flex items-center justify-between">
          <Logo dark />
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
            Plataforma comercial
          </span>
        </div>

        <div className="relative my-auto max-w-xl py-14">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80">
            <Sparkles className="h-3.5 w-3.5 text-teal-300" />
            {brand.tagline}
          </span>
          <h1 className="mt-6 text-balance text-[42px] font-semibold leading-[1.08] tracking-tight xl:text-[52px]">
            Tu operación comercial,
            <span className="block bg-gradient-to-r from-sky-300 via-teal-200 to-emerald-200 bg-clip-text text-transparent">
              bajo control.
            </span>
          </h1>
          <p className="mt-5 max-w-lg text-[15px] leading-7 text-white/65">
            Centraliza empresas, clientes, oportunidades y ventas. Un espacio de trabajo
            claro para que tu equipo venda mejor y decida más rápido.
          </p>

          <div className="mt-10 grid gap-3">
            {benefits.map((benefit) => (
              <div
                key={benefit.title}
                className="flex items-start gap-3.5 rounded-xl border border-white/10 bg-white/[0.045] p-4 backdrop-blur-sm"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-teal-200">
                  <benefit.icon className="h-[18px] w-[18px]" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white/90">{benefit.title}</p>
                  <p className="mt-0.5 text-xs leading-5 text-white/55">
                    {benefit.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center justify-between text-[11px] text-white/40">
          <span>© {new Date().getFullYear()} {brand.company}</span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Servicio disponible
          </span>
        </div>
      </section>

      <section className="relative flex min-h-screen flex-col">
        <div className="flex items-center justify-between px-5 py-5 sm:px-8">
          <Logo className="lg:invisible" />
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center px-5 pb-12 pt-2 sm:px-8">
          <div className="w-full max-w-[410px]">
            <div className="mb-8">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-[11px] font-semibold text-brand-strong dark:text-brand">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Acceso de personal autorizado
              </div>
              <h2 className="text-[30px] font-semibold tracking-tight text-ink">
                Inicia sesión
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Usa tus credenciales corporativas para entrar a {brand.product}.
              </p>
            </div>

            {formError ? (
              <Alert variant="error" className="mb-5" onClose={() => setFormError(null)}>
                {formError}
              </Alert>
            ) : null}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <Field label="Correo electrónico" htmlFor="email" error={errors.email?.message} required>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="tu@empresa.com"
                  leadingIcon={<Mail className="h-4 w-4" />}
                  invalid={Boolean(errors.email)}
                  {...register('email')}
                />
              </Field>

              <Field label="Contraseña" htmlFor="password" error={errors.password?.message} required>
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••••"
                  leadingIcon={<LockKeyhole className="h-4 w-4" />}
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

              <div className="flex items-center justify-between gap-4">
                <Checkbox
                  label="Recuérdame"
                  hint="Mantiene la sesión hasta 30 días en este equipo."
                  {...register('rememberMe')}
                />
              </div>

              <Button
                type="submit"
                size="lg"
                fullWidth
                loading={isSubmitting}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                Entrar al CRM
              </Button>
            </form>

            {googleEnabled ? (
              <>
                <div className="my-6 flex items-center gap-3">
                  <span className="h-px flex-1 bg-line" />
                  <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
                    o continúa con
                  </span>
                  <span className="h-px flex-1 bg-line" />
                </div>
                <div className={googleLoading ? 'pointer-events-none opacity-60' : undefined}>
                  <GoogleSignInButton
                    clientId={googleStatus.data?.clientId ?? ''}
                    onCredential={(credential) => void onGoogle(credential)}
                  />
                </div>
                <p className="mt-3 text-center text-[11px] leading-5 text-muted">
                  Solo cuentas de Google ya vinculadas por un administrador.
                </p>
              </>
            ) : null}

            <div className="mt-8 rounded-xl border border-line bg-elevated/50 p-4">
              <div className="flex gap-2.5">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
                <p className="text-[11px] leading-5 text-muted">
                  ¿No tienes acceso? Solicítalo a un administrador. No permitimos
                  auto-registro y nunca compartimos tus credenciales.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 pb-6 text-center text-[11px] text-muted sm:px-8">
          {brand.product} · Sesiones seguras con cookies HttpOnly
        </div>
      </section>
    </div>
  );
};
