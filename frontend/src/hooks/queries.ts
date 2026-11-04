import { useQuery } from '@tanstack/react-query';
import {
  authApi,
  clientsApi,
  companiesApi,
  settingsApi,
  usersApi,
  unwrap,
} from '@/lib/endpoints';
import { useAuth } from '@/providers/AuthProvider';

export const useGoogleStatus = () =>
  useQuery({
    queryKey: ['auth', 'google-status'],
    queryFn: async () => unwrap(await authApi.googleStatus()),
    staleTime: 5 * 60_000,
  });

export const useCompanyOptions = (search = '', enabled = true) =>
  useQuery({
    queryKey: ['companies', 'options', search],
    queryFn: async () => unwrap(await companiesApi.options(search, 100)),
    enabled,
    staleTime: 60_000,
  });

export const useSectors = () =>
  useQuery({
    queryKey: ['companies', 'sectors'],
    queryFn: async () => unwrap(await companiesApi.sectors()),
    staleTime: 5 * 60_000,
  });

export const useClientOptions = (
  params: { search?: string; companyId?: string } = {},
  enabled = true,
) =>
  useQuery({
    queryKey: ['clients', 'options', params.search ?? '', params.companyId ?? ''],
    queryFn: async () => unwrap(await clientsApi.options({ limit: 100, ...params })),
    enabled,
    staleTime: 60_000,
  });

export const useUserOptions = (enabled = true) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['users', 'options'],
    queryFn: async () =>
      usersApi.list({ pageSize: 100, status: 'ACTIVE', sortBy: 'name', sortOrder: 'asc' }),
    enabled: enabled && (user?.role === 'ADMIN' || user?.role === 'OPERACIONES'),
    staleTime: 60_000,
  });
};

export const useProfile = () =>
  useQuery({
    queryKey: ['settings', 'profile'],
    queryFn: async () => unwrap(await settingsApi.profile()),
  });

export const useSessions = () =>
  useQuery({
    queryKey: ['settings', 'sessions'],
    queryFn: async () => unwrap(await settingsApi.sessions()),
  });
