import {
  Activity,
  Archive,
  Ban,
  GitBranch,
  KeyRound,
  LogIn,
  LogOut,
  Pencil,
  PlusCircle,
  ShieldOff,
  Trash2,
} from 'lucide-react';
import type { ActivityLog } from '@/types';
import { ACTION_LABELS, ENTITY_LABELS } from '@/lib/labels';
import { formatDateTime, formatRelative } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';

const actionIcon = (action: string) => {
  switch (action) {
    case 'LOGIN':
      return LogIn;
    case 'LOGOUT':
      return LogOut;
    case 'CREATE':
      return PlusCircle;
    case 'UPDATE':
      return Pencil;
    case 'DELETE':
      return Trash2;
    case 'ARCHIVE':
      return Archive;
    case 'CANCEL':
      return Ban;
    case 'STAGE_CHANGE':
      return GitBranch;
    case 'PASSWORD_CHANGE':
    case 'PASSWORD_RESET':
      return KeyRound;
    case 'SESSION_REVOKE':
      return ShieldOff;
    default:
      return Activity;
  }
};

const actionTone = (action: string): string => {
  switch (action) {
    case 'CREATE':
      return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400';
    case 'DELETE':
    case 'CANCEL':
      return 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400';
    case 'ARCHIVE':
    case 'PASSWORD_CHANGE':
    case 'PASSWORD_RESET':
      return 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400';
    case 'LOGIN':
    case 'LOGOUT':
      return 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400';
    case 'STAGE_CHANGE':
      return 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400';
    default:
      return 'bg-elevated text-muted';
  }
};

export const ActivityRow = ({
  item,
  showEntity = true,
  showActor = true,
}: {
  item: ActivityLog;
  showEntity?: boolean;
  showActor?: boolean;
}) => {
  const Icon = actionIcon(item.action);
  return (
    <div className="flex gap-3 py-3.5">
      <span
        className={cn(
          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          actionTone(item.action),
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-[13px] font-medium leading-5 text-ink">{item.description}</p>
          {showEntity ? (
            <span className="rounded-md bg-elevated px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
              {ENTITY_LABELS[item.entityType] ?? item.entityType}
            </span>
          ) : null}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
          {showActor ? (
            <span className="inline-flex items-center gap-1.5">
              {item.user ? (
                <Avatar name={item.user.name} src={item.user.avatarUrl} size="xs" className="h-4 w-4 text-[7px]" />
              ) : null}
              {item.user?.name ?? 'Sistema'}
            </span>
          ) : null}
          {showActor ? <span className="text-muted/40">·</span> : null}
          <span title={formatDateTime(item.createdAt)}>{formatRelative(item.createdAt)}</span>
          <span className="text-muted/40">·</span>
          <span>{ACTION_LABELS[item.action] ?? item.action}</span>
        </div>
      </div>
    </div>
  );
};

export const ActivityFeed = ({
  items,
  compact = false,
}: {
  items: ActivityLog[];
  compact?: boolean;
}) => {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="Sin actividad reciente"
        description="Las acciones del equipo aparecerán aquí automáticamente."
        compact
      />
    );
  }

  return (
    <div className={cn('divide-y divide-line', compact && 'divide-line/60')}>
      {items.map((item) => (
        <ActivityRow key={item.id} item={item} />
      ))}
    </div>
  );
};
