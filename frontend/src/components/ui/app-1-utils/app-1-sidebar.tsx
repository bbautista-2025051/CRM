import { NavLink, Link, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Building2,
  CalendarDays,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { canManageUsers } from "@/lib/permissions";
import { ROLE_LABELS } from "@/lib/labels";
import { Logo } from "@/components/ui/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";
import { useSidebar } from "./sidebar";

interface NavGroup {
  label: string;
  items: Array<{
    to: string;
    label: string;
    icon: any;
    adminOnly?: boolean;
  }>;
}

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Comercial",
    items: [
      { to: "/opportunities", label: "Oportunidades", icon: BarChart3 },
      { to: "/sales", label: "Ventas", icon: Wallet },
      { to: "/companies", label: "Empresas", icon: Building2 },
      { to: "/clients", label: "Contacto", icon: Users },
    ],
  },
  {
    label: "Proyectos & Equipo",
    items: [
      { to: "/projects", label: "Proyectos", icon: FolderKanban },
      { to: "/team", label: "Equipo", icon: UserCheck, adminOnly: true },
    ],
  },
  {
    label: "Administración",
    items: [
      { to: "/users", label: "Usuarios", icon: ShieldCheck, adminOnly: true },
      { to: "/activity", label: "Actividad", icon: CalendarDays },
    ],
  },
];

export function App1Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { open, openMobile, setOpenMobile, isMobile } = useSidebar();

  if (!user) return null;

  const sidebarContent = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Brand Header */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border px-5">
        <Link
          to="/dashboard"
          onClick={() => isMobile && setOpenMobile(false)}
          className="flex items-center gap-3 transition-opacity hover:opacity-90"
        >
          <Logo compact={!open && !isMobile} />
        </Link>
      </div>

      {/* Navigation Groups */}
      <div className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4">
        {navGroups.map((group) => {
          const items = group.items.filter(
            (item) => !item.adminOnly || canManageUsers(user.role),
          );
          if (items.length === 0) return null;

          return (
            <div key={group.label} className="mb-6">
              {(open || isMobile) && (
                <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted/80">
                  {group.label}
                </p>
              )}
              <div className="space-y-1">
                {items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => isMobile && setOpenMobile(false)}
                    title={!open && !isMobile ? item.label : undefined}
                    className={({ isActive }) =>
                      cn(
                        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground shadow-sm"
                          : "text-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                        !open && !isMobile && "justify-center px-2",
                      )
                    }
                  >
                    <item.icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-105" />
                    {(open || isMobile) && <span className="truncate">{item.label}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* User Footer Card */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-sidebar-accent/60">
          <Avatar name={user.name} src={user.avatarUrl} size="sm" className="shrink-0" />
          {(open || isMobile) && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-sidebar-foreground">
                {user.name}
              </p>
              <p className="truncate text-[11px] text-muted">
                {ROLE_LABELS[user.role]}
              </p>
            </div>
          )}
          {(open || isMobile) && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  isMobile && setOpenMobile(false);
                  navigate("/settings");
                }}
                className="rounded-md p-1.5 text-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
                title="Configuración"
              >
                <Settings className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  isMobile && setOpenMobile(false);
                  void logout();
                }}
                className="rounded-md p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                title="Cerrar sesión"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Drawer */}
      {isMobile ? (
        openMobile && (
          <div className="fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
              onClick={() => setOpenMobile(false)}
            />
            <div className="relative w-72 max-w-[80vw] border-r border-sidebar-border shadow-xl">
              {sidebarContent}
            </div>
          </div>
        )
      ) : (
        /* Desktop Sticky/Collapsible Sidebar */
        <aside
          className={cn(
            "sticky top-0 z-20 hidden h-screen shrink-0 border-r border-sidebar-border transition-all duration-300 lg:block",
            open ? "w-64" : "w-16",
          )}
        >
          {sidebarContent}
        </aside>
      )}
    </>
  );
}
