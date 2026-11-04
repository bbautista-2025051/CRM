import { api, buildQuery } from './api';
import type {
  ActivityLog,
  Client,
  ClientDetail,
  ClientOption,
  Company,
  CompanyDetail,
  CompanyOption,
  DashboardData,
  GoogleStatus,
  ListResponse,
  Opportunity,
  ProfileResponse,
  ProjectComment,
  ProjectDetail,
  ProjectFile,
  ProjectListResponse,
  ProjectTask,
  PublicUser,
  Sale,
  SalesSummary,
  SessionPayload,
  TeamOverview,
  ThemePreference,
  UserSession,
} from '@/types';

interface DataEnvelope<T> {
  data: T;
  message?: string;
}

const unwrap = <T>(response: DataEnvelope<T>): T => response.data;

export const authApi = {
  me: () => api.get<DataEnvelope<SessionPayload>>('/api/auth/me', { skipAuthEvent: true }),
  login: (payload: { email: string; password: string; rememberMe: boolean }) =>
    api.post<DataEnvelope<SessionPayload>>('/api/auth/login', payload),
  loginWithGoogle: (credential: string) =>
    api.post<DataEnvelope<SessionPayload>>('/api/auth/google', { credential }),
  googleStatus: () => api.get<DataEnvelope<GoogleStatus>>('/api/auth/google/status'),
  logout: () => api.post<void>('/api/auth/logout'),
  changePassword: (payload: { currentPassword: string; newPassword: string }) =>
    api.post<DataEnvelope<{ user: PublicUser }>>('/api/auth/password', payload),
};

export const dashboardApi = {
  summary: (params: {
    role?: string;
    userId?: string;
    month?: string;
    year?: string | number;
  } = {}) => api.get<DataEnvelope<DashboardData>>(`/api/dashboard/summary${buildQuery(params)}`),
};

export const companiesApi = {
  list: (params: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    sector?: string;
    sortBy?: string;
    sortOrder?: string;
  }) => api.get<ListResponse<Company>>(`/api/companies${buildQuery(params)}`),
  get: (id: string) => api.get<DataEnvelope<CompanyDetail>>(`/api/companies/${id}`),
  options: (search?: string, limit = 50) =>
    api.get<DataEnvelope<CompanyOption[]>>(
      `/api/companies/options${buildQuery({ search, limit })}`,
    ),
  sectors: () => api.get<DataEnvelope<string[]>>('/api/companies/sectors'),
  create: (payload: Record<string, unknown>) =>
    api.post<DataEnvelope<Company>>('/api/companies', payload),
  update: (id: string, payload: Record<string, unknown>) =>
    api.patch<DataEnvelope<Company>>(`/api/companies/${id}`, payload),
  archive: (id: string) =>
    api.delete<DataEnvelope<Company> & { message: string }>(`/api/companies/${id}`),
};

export const clientsApi = {
  list: (params: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    companyId?: string;
    sortBy?: string;
    sortOrder?: string;
  }) => api.get<ListResponse<Client>>(`/api/clients${buildQuery(params)}`),
  get: (id: string) => api.get<DataEnvelope<ClientDetail>>(`/api/clients/${id}`),
  options: (params: { search?: string; companyId?: string; limit?: number } = {}) =>
    api.get<DataEnvelope<ClientOption[]>>(
      `/api/clients/options${buildQuery({ limit: 50, ...params })}`,
    ),
  create: (payload: Record<string, unknown>) =>
    api.post<DataEnvelope<Client>>('/api/clients', payload),
  update: (id: string, payload: Record<string, unknown>) =>
    api.patch<DataEnvelope<Client>>(`/api/clients/${id}`, payload),
  archive: (id: string) =>
    api.delete<DataEnvelope<Client> & { message: string }>(`/api/clients/${id}`),
};

export const opportunitiesApi = {
  list: (params: {
    page?: number;
    pageSize?: number;
    search?: string;
    stage?: string;
    status?: string;
    ownerId?: string;
    companyId?: string;
    clientId?: string;
    expectedCloseFrom?: string;
    expectedCloseTo?: string;
    sortBy?: string;
    sortOrder?: string;
  }) => api.get<ListResponse<Opportunity>>(`/api/opportunities${buildQuery(params)}`),
  get: (id: string) => api.get<DataEnvelope<Opportunity>>(`/api/opportunities/${id}`),
  create: (payload: Record<string, unknown>) =>
    api.post<DataEnvelope<Opportunity>>('/api/opportunities', payload),
  update: (id: string, payload: Record<string, unknown>) =>
    api.patch<DataEnvelope<Opportunity>>(`/api/opportunities/${id}`, payload),
  remove: (id: string) => api.delete<void>(`/api/opportunities/${id}`),
};

export const salesApi = {
  list: (params: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    ownerId?: string;
    clientId?: string;
    companyId?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: string;
    sortOrder?: string;
  }) => api.get<ListResponse<Sale>>(`/api/sales${buildQuery(params)}`),
  get: (id: string) => api.get<DataEnvelope<Sale>>(`/api/sales/${id}`),
  summary: (params: { dateFrom?: string; dateTo?: string } = {}) =>
    api.get<DataEnvelope<SalesSummary>>(`/api/sales/summary${buildQuery(params)}`),
  create: (payload: Record<string, unknown>) =>
    api.post<DataEnvelope<Sale>>('/api/sales', payload),
  update: (id: string, payload: Record<string, unknown>) =>
    api.patch<DataEnvelope<Sale>>(`/api/sales/${id}`, payload),
  confirm: (id: string) =>
    api.patch<DataEnvelope<Sale>>(`/api/sales/${id}`, { status: 'CONFIRMED' }),
  cancel: (id: string) =>
    api.post<DataEnvelope<Sale> & { message: string }>(`/api/sales/${id}/cancel`),
};

export const projectsApi = {
  list: (params: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    companyId?: string;
    managerId?: string;
    sortBy?: string;
    sortOrder?: string;
  }) => api.get<ProjectListResponse>(`/api/projects${buildQuery(params)}`),
  get: (id: string) => api.get<DataEnvelope<ProjectDetail>>(`/api/projects/${id}`),
  create: (payload: Record<string, unknown>) =>
    api.post<DataEnvelope<ProjectDetail>>('/api/projects', payload),
  update: (id: string, payload: Record<string, unknown>) =>
    api.patch<DataEnvelope<ProjectDetail>>(`/api/projects/${id}`, payload),
  remove: (id: string) => api.delete<void>(`/api/projects/${id}`),
  createTask: (projectId: string, payload: Record<string, unknown>) =>
    api.post<DataEnvelope<ProjectTask>>(`/api/projects/${projectId}/tasks`, payload),
  updateTask: (projectId: string, taskId: string, payload: Record<string, unknown>) =>
    api.patch<DataEnvelope<ProjectTask>>(`/api/projects/${projectId}/tasks/${taskId}`, payload),
  removeTask: (projectId: string, taskId: string) =>
    api.delete<void>(`/api/projects/${projectId}/tasks/${taskId}`),
  listFiles: (projectId: string) =>
    api.get<DataEnvelope<ProjectFile[]>>(`/api/projects/${projectId}/files`),
  listComments: (projectId: string) =>
    api.get<DataEnvelope<ProjectComment[]>>(`/api/projects/${projectId}/comments`),
  createComment: (projectId: string, body: string, fileIds: string[] = []) =>
    api.post<DataEnvelope<ProjectComment>>(`/api/projects/${projectId}/comments`, {
      body,
      fileIds,
    }),
  uploadFile: (projectId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<DataEnvelope<ProjectFile>>(`/api/projects/${projectId}/files`, form);
  },
  removeFile: (projectId: string, fileId: string) =>
    api.delete<void>(`/api/projects/${projectId}/files/${fileId}`),
};

export const teamApi = {
  overview: (params: { projectId?: string; status?: string; search?: string } = {}) =>
    api.get<DataEnvelope<TeamOverview>>(`/api/team/overview${buildQuery(params)}`),

  createTask: (projectId: string, payload: Record<string, unknown>) =>
    api.post<DataEnvelope<ProjectTask>>(`/api/team/${projectId}/tasks`, payload),

  updateTask: (projectId: string, taskId: string, payload: Record<string, unknown>) =>
    api.patch<DataEnvelope<ProjectTask>>(
      `/api/team/${projectId}/tasks/${taskId}`,
      payload,
    ),

  deleteTask: (projectId: string, taskId: string) =>
    api.delete<void>(`/api/team/${projectId}/tasks/${taskId}`),

  getTask: (taskId: string) =>
    api.get<DataEnvelope<ProjectTask>>(`/api/team/tasks/${taskId}`),
};

export const usersApi = {
  list: (params: {
    page?: number;
    pageSize?: number;
    search?: string;
    role?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
  }) => api.get<ListResponse<PublicUser>>(`/api/users${buildQuery(params)}`),
  get: (id: string) => api.get<DataEnvelope<PublicUser>>(`/api/users/${id}`),
  create: (payload: Record<string, unknown>) =>
    api.post<DataEnvelope<PublicUser>>('/api/users', payload),
  update: (id: string, payload: Record<string, unknown>) =>
    api.patch<DataEnvelope<PublicUser>>(`/api/users/${id}`, payload),
  resetPassword: (id: string, newPassword: string) =>
    api.post<void>(`/api/users/${id}/reset-password`, { newPassword }),
};

export const settingsApi = {
  profile: () => api.get<DataEnvelope<ProfileResponse>>('/api/settings/profile'),
  updateProfile: (name: string) =>
    api.patch<DataEnvelope<{ user: PublicUser }> & { message: string }>(
      '/api/settings/profile',
      { name },
    ),
  updatePreferences: (themePreference: ThemePreference) =>
    api.patch<DataEnvelope<{ user: PublicUser }>>('/api/settings/preferences', {
      themePreference,
    }),
  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append('avatar', file);
    return api.post<DataEnvelope<{ user: PublicUser }> & { message: string }>(
      '/api/settings/avatar',
      form,
    );
  },
  deleteAvatar: () =>
    api.delete<DataEnvelope<{ user: PublicUser }> & { message: string }>(
      '/api/settings/avatar',
    ),
  linkGoogle: (credential: string) =>
    api.post<DataEnvelope<{ user: PublicUser }> & { message: string }>(
      '/api/settings/google/link',
      { credential },
    ),
  unlinkGoogle: () =>
    api.post<DataEnvelope<{ user: PublicUser }> & { message: string }>(
      '/api/settings/google/unlink',
    ),
  sessions: () => api.get<DataEnvelope<UserSession[]>>('/api/settings/sessions'),
  revokeOtherSessions: () =>
    api.post<DataEnvelope<{ revoked: number }> & { message: string }>(
      '/api/settings/sessions/revoke-others',
    ),
};

export const activityApi = {
  list: (params: { entityType?: string; entityId?: string; limit?: number } = {}) =>
    api.get<DataEnvelope<ActivityLog[]>>(`/api/activity${buildQuery({ limit: 50, ...params })}`),
};

export { unwrap };
