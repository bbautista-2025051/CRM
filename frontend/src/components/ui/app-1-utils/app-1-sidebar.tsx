import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import {
  Briefcase,
  Building2,
  CalendarDays,
  ChevronDown,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { canManageUsers } from "@/lib/permissions";
import { ROLE_LABELS } from "@/lib/labels";
import { Logo } from "@/components/ui/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";
import { useSidebar } from "./sidebar";
import {
  Dropdown,
  DropdownItem,
} from "@/components/ui/Dropdown";

interface NavChild {
  to: string;
  label: string;
}

interface NavItem {
  to?: string;
  label: string;
  icon?: any;
  adminOnly?: boolean;
  children?: NavChild[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
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
      { to: "/negocio", label: "Negocio", icon: Briefcase },
      { to: "/companies", label: "Empresas", icon: Building2 },
      { to: "/clients", label: "Contacto", icon: Users },
    ],
  },
  {
    label: "Proyectos & Equipo",
    items: [
      {
        label: "Proyectos",
        icon: FolderKanban,
        children: [
          { to: "/projects", label: "Ver proyectos" },
        ],
      },
      { to: "/team", label: "Equipo", icon: UserCheck },
    ],
  },
  {
    label: "Administración",
    items: [
      {
        label: "Usuarios",
        icon: ShieldCheck,
        adminOnly: true,
        children: [
          { to: "/users", label: "Ver usuarios" },
        ],
      },
      { to: "/activity", label: "Actividad", icon: CalendarDays },
    ],
  },
];

export function App1Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { open, openMobile, setOpenMobile, isMobile } = useSidebar();

  if (!user) return null;

  const isActive = (to: string) =>
    location.pathname === to || location.pathname.startsWith(`${to}/`);

  const isGroupActive = (children: NavChild[]) =>
    children.some((child) => isActive(child.to));

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
                {items.map((item) => {
                  const hasChildren = Boolean(item.children?.length);
                  const active = hasChildren
                    ? isGroupActive(item.children!)
                    : isActive(item.to!);
                  return (
                    <div
                      key={item.to ?? item.label}
                      className="relative"
                    >
                      {hasChildren ? (
                        <Dropdown
                          align="right"
                          trigger={({ open: isOpen, toggle }) => (
                            <button
                              type="button"
                              onClick={toggle}
                              className={cn(
                                "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                active
                                  ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground shadow-sm"
                                  : "text-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                                !open && !isMobile && "justify-center px-2",
                              )}
                              aria-label={item.label}
                              aria-expanded={isOpen}
                            >
                              <item.icon
                                className={cn(
                                  "h-4 w-4 shrink-0 transition-transform group-hover:scale-105",
                                  isOpen && "rotate-180",
                                )}
                              />
                              {(open || isMobile) && (
                                <span className="truncate">{item.label}</span>
                              )}
                              <ChevronDown
                                className={cn(
                                  "h-3 w-3 shrink-0 text-muted transition-transform ml-auto",
                                  isOpen && "rotate-180",
                                )}
                              />
                            </button>
                          )}
                        >
                          {(close) => (
                            <>
                              {item.children?.map((child) => (
                                <DropdownItem
                                  key={child.to}
                                  icon={item.icon}
                                  onClick={() => {
                                    close();
                                    if (isMobile) setOpenMobile(false);
                                    navigate(child.to);
                                  }}
                                >
                                  {child.label}
                                </DropdownItem>
                              ))}
                            </>
                          )}
                        </Dropdown>
                      ) : (
                        <NavLink
                          key={item.to}
                          to={item.to!}
                          onClick={() => isMobile && setOpenMobile(false)}
                          title={!open && !isMobile ? item.label : undefined}
                          className={({ isActive: linkActive }) =>
                            cn(
                              "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                              linkActive
                                ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground shadow-sm"
                                : "text-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                              !open && !isMobile && "justify-center px-2",
                            )
                          }
                        >
                          <item.icon
                            className="h-4 w-4 shrink-0 transition-transform group-hover:scale-105"
                          />
                          {(open || isMobile) && <span className="truncate">{item.label}</span>}
                        </NavLink>
                      )}
                    </div>
                  );
                })}
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
