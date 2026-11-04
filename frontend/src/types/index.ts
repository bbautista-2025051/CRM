export type Role = 'ADMIN' | 'PROGRAMADOR' | 'VENDEDOR' | 'SUPERVISOR' | 'OPERACIONES';
export type UserStatus = 'ACTIVE' | 'INACTIVE';
export type ThemePreference = 'LIGHT' | 'DARK' | 'SYSTEM';
export type CompanyStatus = 'ACTIVE' | 'ARCHIVED';
export type ClientStatus = 'ACTIVE' | 'ARCHIVED';
export type OpportunityStage =
  | 'PROSPECTO'
  | 'CALIFICACION'
  | 'PROPUESTA'
  | 'NEGOCIACION'
  | 'GANADA'
  | 'PERDIDA';
export type OpportunityStatus = 'OPEN' | 'WON' | 'LOST';
export type SaleStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';
export type ProjectStatus = 'ACTIVE' | 'COMPLETED';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  avatarUrl: string | null;
  themePreference: ThemePreference;
  mustChangePassword: boolean;
  googleLinked: boolean;
  hasPassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface SessionPayload {
  user: PublicUser;
  csrfToken: string;
  expiresAt: string;
  rememberMe: boolean;
}

export interface GoogleStatus {
  enabled: boolean;
  clientId: string | null;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ListResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface Company {
  id: string;
  name: string;
  legalName: string | null;
  taxId: string | null;
  sector: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  status: CompanyStatus;
  notes: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    clients: number;
    opportunities: number;
    sales: number;
  };
}

export interface CompanyOption {
  id: string;
  name: string;
  sector: string | null;
}

export interface CompanyDetail extends Company {
  createdBy: { id: string; name: string; email: string } | null;
  clients: Client[];
  opportunities: Opportunity[];
  sales: Sale[];
}

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  jobTitle: string | null;
  companyId: string | null;
  status: ClientStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  company?: { id: string; name: string } | null;
  _count?: {
    opportunities: number;
    sales: number;
  };
}

export interface ClientOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  companyId: string | null;
  company: { name: string } | null;
}

export interface ClientDetail extends Client {
  company: Company | null;
  opportunities: Opportunity[];
  sales: Sale[];
}

export interface Opportunity {
  id: string;
  name: string;
  description: string | null;
  companyId: string | null;
  clientId: string | null;
  ownerId: string;
  value: string;
  probability: number;
  expectedCloseDate: string | null;
  stage: OpportunityStage;
  status: OpportunityStatus;
  wonAt: string | null;
  lostAt: string | null;
  createdAt: string;
  updatedAt: string;
  company?: { id: string; name: string } | null;
  client?: { id: string; firstName: string; lastName: string; email?: string } | null;
  owner?: { id: string; name: string; email?: string; avatarUrl?: string | null };
  sale?: {
    id: string;
    saleNumber: string;
    status: SaleStatus;
    amount?: string;
  } | null;
}

export interface Sale {
  id: string;
  saleNumber: string;
  companyId: string | null;
  clientId: string | null;
  opportunityId: string | null;
  ownerId: string;
  saleDate: string;
  amount: string;
  currency: string;
  status: SaleStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  company?: { id: string; name: string } | null;
  client?: { id: string; firstName: string; lastName: string; email?: string } | null;
  opportunity?: {
    id: string;
    name: string;
    stage?: OpportunityStage;
    status?: OpportunityStatus;
    value?: string;
    owner?: { id: string; name: string };
  } | null;
  owner?: { id: string; name: string; email?: string; avatarUrl?: string | null };
}

export interface SalesSummary {
  counts: Record<SaleStatus, number>;
  total: number;
  byCurrency: Array<{
    currency: string;
    confirmedTotal: string;
    confirmedCount: number;
  }>;
}

export interface ActivityLog {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  description: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: { id: string; name: string; avatarUrl: string | null } | null;
}
