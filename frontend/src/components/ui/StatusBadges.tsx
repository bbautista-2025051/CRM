import type {
  ClientStatus,
  CompanyStatus,
  OpportunityStage,
  SaleStatus,
  UserStatus,
} from '@/types';
import {
  CLIENT_STATUS_LABELS,
  COMPANY_STATUS_LABELS,
  SALE_STATUS_LABELS,
  SALE_STATUS_TONES,
  STAGE_LABELS,
  STAGE_TONES,
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

export const SaleStatusBadge = ({ status }: { status: SaleStatus }) => (
  <span
    className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${SALE_STATUS_TONES[status]}`}
  >
    {SALE_STATUS_LABELS[status]}
  </span>
);
