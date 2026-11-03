import type {
  ClientStatus,
  CompanyStatus,
  OpportunityStage,
  ProjectStatus,
  SaleStatus,
  TaskStatus,
  UserStatus,
} from '@/types';
import {
  CLIENT_STATUS_LABELS,
  COMPANY_STATUS_LABELS,
  PROJECT_STATUS_LABELS,
  SALE_STATUS_LABELS,
  SALE_STATUS_TONES,
  STAGE_LABELS,
  STAGE_TONES,
  TASK_STATUS_LABELS,
  USER_STATUS_LABELS,
} from '@/lib/labels';
import { Badge } from './Badge';

export const CompanyStatusBadge = ({ status }: { status: CompanyStatus }) => (
  <Badge tone={status === 'ACTIVE' ? 'success' : 'neutral'} dot>
    {COMPANY_STATUS_LABELS[status]}
  </Badge>
);

export const ClientStatusBadge = ({ status }: { status: ClientStatus }) => (
  <Badge tone={status === 'ACTIVE' ? 'success' : 'neutral'} dot>
    {CLIENT_STATUS_LABELS[status]}
  </Badge>
);

export const UserStatusBadge = ({ status }: { status: UserStatus }) => (
  <Badge tone={status === 'ACTIVE' ? 'success' : 'danger'} dot>
    {USER_STATUS_LABELS[status]}
  </Badge>
);

export const StageBadge = ({ stage }: { stage: OpportunityStage }) => (
  <span
    className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${STAGE_TONES[stage]}`}
  >
    {STAGE_LABELS[stage]}
  </span>
);

export const ProjectStatusBadge = ({ status }: { status: ProjectStatus }) => (
  <Badge tone={status === 'COMPLETED' ? 'success' : 'brand'} dot>
    {PROJECT_STATUS_LABELS[status]}
  </Badge>
);

export const TaskStatusBadge = ({ status }: { status: TaskStatus }) => (
  <Badge
    tone={status === 'COMPLETED' ? 'success' : status === 'IN_PROGRESS' ? 'info' : 'warning'}
    dot
  >
    {TASK_STATUS_LABELS[status]}
  </Badge>
);

export const SaleStatusBadge = ({ status }: { status: SaleStatus }) => (
  <span
    className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${SALE_STATUS_TONES[status]}`}
  >
    {SALE_STATUS_LABELS[status]}
  </span>
);
