import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  CircleUserRound,
  LogOut,
  Menu,
  Plus,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  ActivityIcon,
  ClientsIcon,
  CompaniesIcon,
  OpportunitiesIcon,
  PanelIcon,
  ProjectsIcon,
  SalesIcon,
  TeamIcon,
  UsersAdminIcon,
  SettingsIcon,
} from '@/components/ui/NexoIcons';
import type { NexoIcon } from '@/components/ui/NexoIcons';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { canManageUsers, isAdmin } from '@/lib/permissions';
import { ROLE_LABELS } from '@/lib/labels';
import { cn } from '@/lib/cn';
import { Avatar } from '@/components/ui/Avatar';
import { Logo } from '@/components/ui/Logo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Badge } from '@/components/ui/Badge';
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui/Dropdown';
import { Alert } from '@/components/ui/Alert';

interface NavItem {
  to: string;
  label: string;
  icon: typeof PanelIcon;
  adminOnly?: boolean;
}

const sections: Array<{ label: string; items: NavItem[] }> = [
  {
    label: 'Principal',
    items: [{ to: '/dashboard', label: 'Panel', icon: PanelIcon }],
  },
  {
    label: 'Comercial',
    items: [
      { to: '/companies', label: 'Empresas', icon: CompaniesIcon },
      { to: '/clients', label: 'Clientes', icon: ClientsIcon },
      { to: '/opportunities', label: 'Oportunidades', icon: OpportunitiesIcon },
      { to: '/sales', label: 'Ventas', icon: SalesIcon },
    ],
  },
  {
    label: 'Trabajo',
    items: [
      { to: '/projects', label: 'Proyectos', icon: ProjectsIcon },
      { to: '/team', label: 'Equipo', icon: TeamIcon, adminOnly: true },
    ],
  },
  {
    label: 'Administración',
    items: [
      { to: '/users', label: 'Usuarios', icon: UsersAdminIcon, adminOnly: true },
      { to: '/activity', label: 'Actividad', icon: ActivityIcon },
    ],
  },
];

const contextualAction = (
  pathname: string,
  isAdmin: boolean,
): { to: string; label: string; icon: LucideIcon | NexoIcon } | null => {
  if (pathname.startsWith('/companies'))
    return { to: '/companies?create=1', label: 'Nueva empresa', icon: Plus };
  if (pathname.startsWith('/clients'))
    return { to: '/clients?create=1', label: 'Nuevo cliente', icon: Plus };
  if (pathname.startsWith('/opportunities'))
    return { to: '/opportunities?create=1', label: 'Nueva oportunidad', icon: OpportunitiesIcon };
  if (pathname.startsWith('/sales'))
    return { to: '/sales?create=1', label: 'Registrar venta', icon: SalesIcon };
  if (pathname.startsWith('/projects'))
    return { to: '/projects?create=1', label: 'Nuevo proyecto', icon: Plus };
  if (pathname.startsWith('/users') && isAdmin)
    return { to: '/users?create=1', label: 'Nuevo usuario', icon: UsersAdminIcon };
  return null;
};

const sectionTitle = (pathname: string): string => {
  if (pathname.startsWith('/companies')) return 'Empresas';
  if (pathname.startsWith('/clients')) return 'Clientes';
  if (pathname.startsWith('/opportunities')) return 'Oportunidades';
  if (pathname.startsWith('/sales')) return 'Ventas';
  if (pathname.startsWith('/projects')) return 'Proyectos';
  if (pathname.startsWith('/team')) return 'Equipo';
  if (pathname.startsWith('/users')) return 'Usuarios';
  if (pathname.startsWith('/activity')) return 'Actividad';
  if (pathname.startsWith('/settings')) return 'Configuración';
  return 'Panel';
};

const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Link to="/dashboard" onClick={onNavigate} aria-label="Ir al panel">
          <Logo />
        </Link>
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 pb-4" aria-label="Navegación principal">
        {sections.map((section) => {
          const items = section.items.filter(
            (item) => !item.adminOnly || canManageUsers(user.role),
          );
          if (items.length === 0) return null;
          return (
            <div key={section.label} className="mb-5">
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted/70">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn('nav-link', isActive && 'nav-link-active')
                    }
                  >
                    <item.icon className="h-[17px] w-[17px] shrink-0 opacity-80" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}

        <div className="mb-5">
          <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted/70">
            Cuenta
          </p>
          <NavLink
            to="/settings"
            onClick={onNavigate}
            className={({ isActive }) => cn('nav-link', isActive && 'nav-link-active')}
          >
            <SettingsIcon className="h-[17px] w-[17px] shrink-0 opacity-80" />
            Configuración
          </NavLink>
        </div>
      </nav>

      <div className="border-t border-line p-3">
        <Dropdown
          align="left"
          className="w-full"
          trigger={({ toggle }) => (
            <button
              type="button"
              onClick={toggle}
              className="flex w-full items-center gap-3 rounded-[10px] p-2 text-left transition hover:bg-elevated/70"
            >
              <Avatar name={user.name} src={user.avatarUrl} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-ink">
                  {user.name}
                </span>
                <span className="block truncate text-[11px] text-muted">
                  {ROLE_LABELS[user.role]}
                </span>
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted" />
            </button>
          )}
        >
          {(close) => (
            <>
              <div className="px-2.5 py-2">
                <p className="truncate text-[13px] font-semibold text-ink">{user.name}</p>
                <p className="truncate text-[11px] text-muted">{user.email}</p>
              </div>
              <DropdownSeparator />
              <DropdownItem
                icon={<CircleUserRound className="h-4 w-4" />}
                onClick={() => {
                  close();
                  navigate('/settings');
                }}
              >
                Mi cuenta
              </DropdownItem>
              <DropdownItem
                icon={<LogOut className="h-4 w-4" />}
                danger
                onClick={() => {
                  close();
                  onNavigate?.();
                  void logout();
                }}
              >
                Cerrar sesión
              </DropdownItem>
            </>
          )}
        </Dropdown>
      </div>
    </div>
  );
};

export const AppShell = () => {
  const { user, logout } = useAuth();
  const { preference } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  // Aviso de contraseña temporal: visible 10 segundos por sesión y desaparece solo.
  const [passwordNoticeVisible, setPasswordNoticeVisible] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!user?.mustChangePassword) return;
    const timer = window.setTimeout(() => setPasswordNoticeVisible(false), 10_000);
    return () => window.clearTimeout(timer);
  }, [user?.mustChangePassword]);

  useEffect(() => {
    if (!mobileOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [mobileOpen]);

  if (!user) return null;

  const headerAction = contextualAction(location.pathname, isAdmin(user.role));

  return (
    <div className="min-h-full bg-canvas">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] border-r border-line bg-surface lg:block">
        <SidebarContent />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/60"
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar menú"
          />
          <aside className="absolute inset-y-0 left-0 w-[284px] animate-slide-in-right border-r border-line bg-surface shadow-float">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 rounded-lg p-1.5 text-muted hover:bg-elevated hover:text-ink"
              aria-label="Cerrar menú"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-30 border-b border-line bg-surface">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="focus-ring rounded-lg p-2 text-muted hover:bg-elevated hover:text-ink lg:hidden"
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex min-w-0 items-center gap-2 lg:hidden">
              <Logo compact />
              <span className="truncate text-sm font-semibold text-ink">
                {sectionTitle(location.pathname)}
              </span>
            </div>

            <div className="hidden items-center gap-2 text-xs text-muted lg:flex">
              <span>Espacio de trabajo</span>
              <span className="text-muted/50">/</span>
              <span className="font-medium text-ink">{sectionTitle(location.pathname)}</span>
            </div>

            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              {headerAction ? (
                <Link
                  to={headerAction.to}
                  className="hidden items-center gap-2 rounded-[10px] bg-brand px-3 py-2 text-[13px] font-semibold text-brand-ink shadow-sm transition hover:bg-brand-strong sm:inline-flex"
                >
                  <headerAction.icon className="h-4 w-4" />
                  {headerAction.label}
                </Link>
              ) : null}
              <ThemeToggle />
              <Link
                to="/activity"
                className="focus-ring flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-elevated hover:text-ink"
                aria-label="Actividad reciente"
                title="Actividad"
              >
                <ActivityIcon className="h-[18px] w-[18px]" strokeWidth={1.7} />
              </Link>

              <div className="mx-1 hidden h-6 w-px bg-line sm:block" />

              <Dropdown
                trigger={({ toggle }) => (
                  <button
                    type="button"
                    onClick={toggle}
                    className="focus-ring flex items-center gap-2 rounded-lg p-1 transition hover:bg-elevated"
                    aria-label="Menú de usuario"
                  >
                    <Avatar name={user.name} src={user.avatarUrl} size="sm" />
                    <span className="hidden max-w-[140px] truncate text-[13px] font-medium text-ink xl:block">
                      {user.name}
                    </span>
                    <ChevronDown className="hidden h-4 w-4 text-muted xl:block" />
                  </button>
                )}
              >
                {(close) => (
                  <>
                    <div className="flex items-center gap-3 px-2.5 py-2">
                      <Avatar name={user.name} src={user.avatarUrl} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-ink">
                          {user.name}
                        </p>
                        <p className="truncate text-[11px] text-muted">{user.email}</p>
                      </div>
                    </div>
                    <div className="px-2.5 pb-2">
                      <Badge tone={isAdmin(user.role) ? 'brand' : 'neutral'}>
                        {ROLE_LABELS[user.role]}
                      </Badge>
                    </div>
                    <DropdownSeparator />
                    <DropdownItem
                      icon={<CircleUserRound className="h-4 w-4" />}
                      onClick={() => {
                        close();
                        navigate('/settings');
                      }}
                    >
                      Mi cuenta
                    </DropdownItem>
                    <DropdownItem
                      icon={<SettingsIcon className="h-4 w-4" />}
                      onClick={() => {
                        close();
                        navigate('/settings?tab=preferences');
                      }}
                    >
                      Preferencias
                    </DropdownItem>
                    <DropdownSeparator />
                    <DropdownItem
                      icon={<LogOut className="h-4 w-4" />}
                      danger
                      onClick={() => {
                        close();
                        void logout();
                      }}
                    >
                      Cerrar sesión
                    </DropdownItem>
                  </>
                )}
              </Dropdown>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {user.mustChangePassword && passwordNoticeVisible ? (
            <Alert
              variant="warning"
              title="Debes cambiar tu contraseña"
              className="mb-4 py-2.5"
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

        <footer className="mx-auto flex w-full max-w-[1500px] flex-col gap-1 px-4 pb-6 text-[11px] text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>
            © {new Date().getFullYear()} Nexo CRM · {preference === 'SYSTEM' ? 'Tema del sistema' : preference === 'DARK' ? 'Tema oscuro' : 'Tema claro'}
          </span>
          <span>Datos comerciales protegidos · Sesión segura</span>
        </footer>
      </div>
    </div>
  );
};
