export type Role = 'ADMIN' | 'PROGRAMADOR' | 'VENDEDOR' | 'PREVENTA' | 'GERENTE' | 'SUPERVISOR' | 'OPERACIONES';
export type UserStatus = 'ACTIVE' | 'INACTIVE';
export type ThemePreference = 'LIGHT' | 'DARK' | 'SYSTEM';
export type CompanyStatus = 'ACTIVE' | 'ARCHIVED';
export type ClientStatus = 'ACTIVE' | 'ARCHIVED';
export type OpportunityStage =
  | 'NEGOCIACION'
  | 'GANADA'
  | 'PERDIDA'
  | (string & {});
export interface OpportunityStageOption {
  value: OpportunityStage;
  label: string;
  isCustom: boolean;
}
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
  /**
   * Token de respaldo que solo devuelve el login. Se usa cuando el navegador
   * bloquea la cookie de sesión (cookies de terceros en incógnito o Safari).
   */
  sessionToken?: string;
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
  _count?: { clients: number; opportunities: number; sales: number };
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
  _count?: { opportunities: number; sales: number };
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
  stageLabel?: string;
  status: OpportunityStatus;
  wonAt: string | null;
  lostAt: string | null;
  createdAt: string;
  updatedAt: string;
  company?: { id: string; name: string } | null;
  client?: { id: string; firstName: string; lastName: string; email?: string } | null;
  owner?: { id: string; name: string; email?: string; avatarUrl?: string | null };
  sale?: { id: string; saleNumber: string; status: SaleStatus; amount?: string } | null;
  project?: { id: string; number: number | null } | null;
}

export interface OpportunityComment {
  id: string;
  opportunityId: string;
  authorId: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
  author?: { id: string; name: string; avatarUrl: string | null } | null;
  files?: OpportunityFile[];
}

export interface OpportunityFile {
  id: string;
  opportunityId: string;
  commentId: string | null;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  uploadedById: string | null;
  createdAt: string;
  uploadedBy?: { id: string; name: string; avatarUrl: string | null } | null;
}

export interface SaleComment {
  id: string;
  saleId: string;
  authorId: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
  author?: { id: string; name: string; avatarUrl: string | null } | null;
  files?: SaleFile[];
}

export interface SaleFile {
  id: string;
  saleId: string;
  commentId: string | null;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  uploadedById: string | null;
  createdAt: string;
  updatedAt: string;
  uploadedBy?: { id: string; name: string; avatarUrl: string | null } | null;
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
  comments?: SaleComment[];
  files?: SaleFile[];
}

export interface SalesSummary {
  counts: Record<SaleStatus, number>;
  total: number;
  byCurrency: Array<{ currency: string; confirmedTotal: string; confirmedCount: number }>;
}

export interface DashboardData {
  defaultCurrency: string;
  totals: {
    companies: number;
    activeCompanies: number;
    clients: number;
    openOpportunities: number;
    openValue: string;
    confirmedSales: number;
    wonOpportunities: number;
    lostOpportunities: number;
    conversionRate: number | null;
    salesByCurrency: Array<{ currency: string; total: string; count: number }>;
  };
  charts: {
    monthlySales: Array<{ month: string; total: string; count: number }>;
    opportunitiesByStage: Array<{
      stage: OpportunityStage;
      label: string;
      count: number;
      value: string;
    }>;
    clientsByCompany: Array<{ companyId: string | null; company: string; count: number }>;
    companiesBySector: Array<{ sector: string; count: number }>;
  };
  recentActivity: ActivityLog[];
  recentOpportunities: Opportunity[];
  recentSales: Sale[];
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

export interface ProjectTask {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  assigneeId: string;
  status: TaskStatus;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  assignee?: { id: string; name: string; email?: string; avatarUrl: string | null; role?: Role } | null;
}

export interface ProjectTaskCounts {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  progress: number;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  opportunityId: string | null;
  companyId: string | null;
  managerId: string | null;
  phone: string | null;
  status: ProjectStatus;
  number?: number | null;
  amount?: string | null;
  currency: string;
  preSales?: string | null;
  solution?: string | null;
  startDate: string | null;
  dueDate: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  company?: { id: string; name: string } | null;
  manager?: { id: string; name: string; email?: string; avatarUrl: string | null } | null;
  taskCounts: ProjectTaskCounts;
}

export interface ProjectDetail extends Project {
  tasks: ProjectTask[];
}

export interface ProjectComment {
  id: string;
  projectId: string;
  authorId: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
  author?: { id: string; name: string; avatarUrl: string | null } | null;
  files?: ProjectFile[];
}

export interface CompanyComment {
  id: string;
  companyId: string;
  authorId: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
  author?: { id: string; name: string; avatarUrl: string | null } | null;
  files?: CompanyFile[];
}

export interface CompanyFile {
  id: string;
  companyId: string;
  commentId?: string | null;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  uploadedById: string;
  createdAt: string;
  uploadedBy?: { id: string; name: string; avatarUrl: string | null };
}

export interface ProjectListResponse {
  data: Project[];
  meta: PaginationMeta;
  counts: { ACTIVE: number; COMPLETED: number; total: number };
}

export interface ProjectFile {
  id: string;
  projectId: string;
  commentId?: string | null;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  uploadedById: string;
  createdAt: string;
  uploadedBy?: { id: string; name: string; avatarUrl: string | null };
}

export interface TeamOverview {
  projects: Array<{
    id: string;
    name: string;
    description: string | null;
    status: ProjectStatus;
    startDate: string | null;
    dueDate: string | null;
    manager: { id: string; name: string; avatarUrl: string | null } | null;
    progress: number;
    taskCounts: ProjectTaskCounts;
    members: Array<{
      user: { id: string; name: string; email: string; avatarUrl: string | null; role: Role; status: UserStatus };
      tasks: Array<{ id: string; title: string; status: TaskStatus; dueDate: string | null }>;
      taskCounts: Omit<ProjectTaskCounts, 'progress'>;
      progress: number;
    }>;
  }>;
  summary: {
    members: number;
    projects: number;
    activeProjects: number;
    completedProjects: number;
    totalTasks: number;
    pendingTasks: number;
    inProgressTasks: number;
    completedTasks: number;
    overallProgress: number;
  };
}

export interface ProfileResponse {
  user: PublicUser;
  googleEnabled: boolean;
  googleClientId: string | null;
  session: { expiresAt: string; rememberMe: boolean };
}

export interface UserSession {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  rememberMe: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  current: boolean;
}
