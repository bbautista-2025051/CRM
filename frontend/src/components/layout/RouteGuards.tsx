import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { Logo } from '@/components/ui/Logo';
import { Spinner } from '@/components/ui/Spinner';
import { isAdmin } from '@/lib/permissions';

const FullScreenLoader = () => (
  <div className="flex min-h-svh flex-col items-center justify-center gap-5 bg-canvas">
    <Logo />
    <div className="flex items-center gap-2 text-sm text-muted">
      <Spinner className="h-4 w-4" />
      Preparando tu espacio de trabajo…
    </div>
  </div>
);

export const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullScreenLoader />;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <Outlet />;
};

export const AdminRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!user || !isAdmin(user.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

export const PublicOnlyRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};
