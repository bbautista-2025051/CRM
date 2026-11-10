import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import {
  AdminRoute,
  ProtectedRoute,
  PublicOnlyRoute,
} from '@/components/layout/RouteGuards';
import { AppShell } from '@/components/layout/AppShell';
import { Spinner } from '@/components/ui/Spinner';

/**
 * Las páginas se cargan de forma diferida para que el paquete inicial solo
 * incluya el armazón de la aplicación, la autenticación y los guards.
 */
const LoginPage = lazy(() =>
  import('@/pages/LoginPage').then((module) => ({ default: module.LoginPage })),
);
const DashboardPage = lazy(() =>
  import('@/pages/DashboardPage').then((module) => ({ default: module.DashboardPage })),
);
const CompaniesPage = lazy(() =>
  import('@/pages/CompaniesPage').then((module) => ({ default: module.CompaniesPage })),
);
const CompanyDetailPage = lazy(() =>
  import('@/pages/CompanyDetailPage').then((module) => ({
    default: module.CompanyDetailPage,
  })),
);
const ClientsPage = lazy(() =>
  import('@/pages/ClientsPage').then((module) => ({ default: module.ClientsPage })),
);
const ClientDetailPage = lazy(() =>
  import('@/pages/ClientDetailPage').then((module) => ({
    default: module.ClientDetailPage,
  })),
);
const NegocioPage = lazy(() =>
  import('@/pages/NegocioPage').then((module) => ({ default: module.NegocioPage })),
);
const NegocioCreatePage = lazy(() =>
  import('@/pages/NegocioCreatePage').then((module) => ({
    default: module.NegocioCreatePage,
  })),
);
const NegocioOpportunityPage = lazy(() =>
  import('@/pages/NegocioOpportunityPage').then((module) => ({
    default: module.NegocioOpportunityPage,
  })),
);
const UsersPage = lazy(() =>
  import('@/pages/UsersPage').then((module) => ({ default: module.UsersPage })),
);
const SettingsPage = lazy(() =>
  import('@/pages/SettingsPage').then((module) => ({ default: module.SettingsPage })),
);
const ActivityPage = lazy(() =>
  import('@/pages/ActivityPage').then((module) => ({ default: module.ActivityPage })),
);
const ProjectsPage = lazy(() =>
  import('@/pages/ProjectsPage').then((module) => ({ default: module.ProjectsPage })),
);
const TeamPage = lazy(() =>
  import('@/pages/TeamPage').then((module) => ({ default: module.TeamPage })),
);
const TaskDetailPage = lazy(() =>
  import('@/pages/TaskDetailPage').then((module) => ({ default: module.TaskDetailPage })),
);
const NotFoundPage = lazy(() =>
  import('@/pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })),
);

const LegacyBusinessRedirect = ({
  view,
}: {
  view: 'opportunities' | 'sales';
}) => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  searchParams.set('view', view);
  const query = searchParams.toString();

  return (
    <Navigate
      to={{ pathname: '/negocio', search: query ? `?${query}` : '' }}
      replace
    />
  );
};

const RouteFallback = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <Spinner className="h-6 w-6 text-brand" label="Cargando página" />
  </div>
);

export const App = () => (
  <Suspense fallback={<RouteFallback />}>
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="companies" element={<CompaniesPage />} />
          <Route path="companies/:id" element={<CompanyDetailPage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="clients/:id" element={<ClientDetailPage />} />
          <Route path="negocio/nuevo" element={<NegocioCreatePage />} />
          <Route
            path="negocio/oportunidad/:id"
            element={<NegocioOpportunityPage />}
          />
          <Route path="negocio" element={<NegocioPage />} />
          <Route
            path="opportunities"
            element={<LegacyBusinessRedirect view="opportunities" />}
          />
          <Route path="sales" element={<LegacyBusinessRedirect view="sales" />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="team" element={<TeamPage />} />
          <Route path="team/task/:taskId" element={<TaskDetailPage />} />
          <Route
            path="users"
            element={
              <AdminRoute>
                <UsersPage />
              </AdminRoute>
            }
          />
          <Route path="activity" element={<ActivityPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  </Suspense>
);
