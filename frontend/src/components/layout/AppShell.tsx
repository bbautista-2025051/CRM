import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Search,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Alert } from '@/components/ui/Alert';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/app-1-utils/sidebar';
import { App1Sidebar } from '@/components/ui/app-1-utils/app-1-sidebar';

const sectionTitle = (pathname: string): string => {
  if (pathname.startsWith('/companies')) return 'Empresas';
  if (pathname.startsWith('/clients')) return 'Clientes';
  if (
    pathname.startsWith('/negocio') ||
    pathname.startsWith('/opportunities') ||
    pathname.startsWith('/sales')
  )
    return 'Negocio';
  if (pathname.startsWith('/projects')) return 'Proyectos';
  if (pathname.startsWith('/team')) return 'Equipo';
  if (pathname.startsWith('/users')) return 'Usuarios';
  if (pathname.startsWith('/activity')) return 'Actividad';
  if (pathname.startsWith('/settings')) return 'Configuración';
  return 'Panel';
};

export const AppShell = () => {
  const { user } = useAuth();
  const [passwordNoticeVisible, setPasswordNoticeVisible] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.mustChangePassword) return;
    const timer = window.setTimeout(() => setPasswordNoticeVisible(false), 10_000);
    return () => window.clearTimeout(timer);
  }, [user?.mustChangePassword]);

  if (!user) return null;

  const firstName = user.name.split(' ')[0];

  return (
    <>
      <SidebarProvider defaultOpen={true}>
        <App1Sidebar />

        {/*
          min-w-0: the inset is a flex item, and a flex item's min-width is `auto`, so it
          refuses to shrink below the min-content width of the widest thing inside it. At
          tablet widths, where the sidebar becomes permanent, that pushed the inset ~23px
          past the viewport and ate the right padding off every card.
        */}
        <SidebarInset className="min-w-0 bg-background text-foreground">
          <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6">
            <SidebarTrigger aria-label="Toggle navigation" />

            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate text-base font-semibold sm:text-lg">
                {location.pathname === '/dashboard' || location.pathname === '/'
                  ? `Welcome back, ${firstName}`
                  : sectionTitle(location.pathname)}
              </h1>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle />

              <Button
                variant="ghost"
                size="icon"
                aria-label="Buscar"
                onClick={() => {
                  const searchEl = document.querySelector('input[type="search"], input[placeholder*="Buscar"]') as HTMLInputElement | null;
                  if (searchEl) {
                    searchEl.focus();
                  }
                }}
              >
                <Search className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                aria-label="Notificaciones"
                onClick={() => navigate('/activity')}
              >
                <Bell className="h-4 w-4" />
              </Button>

              <button
                type="button"
                onClick={() => navigate('/settings')}
                className="ml-1 rounded-full ring-offset-background transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                title="Ir a mi cuenta"
              >
                <Avatar
                  name={user.name}
                  src={user.avatarUrl}
                  size="sm"
                  className="size-8 cursor-pointer"
                />
              </button>
            </div>
          </header>

          <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
            {user.mustChangePassword && passwordNoticeVisible ? (
              <Alert
                variant="warning"
                title="Debes cambiar tu contraseña"
                className="py-2.5"
                onClose={() => setPasswordNoticeVisible(false)}
              >
                Estás usando una contraseña temporal. Actualízala desde{' '}
                <Link to="/settings?tab=security" className="font-semibold underline">
                  Seguridad
                </Link>
                .
              </Alert>
            ) : null}
            <Outlet />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
};