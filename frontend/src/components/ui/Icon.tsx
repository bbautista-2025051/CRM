import type { LucideIcon } from 'lucide-react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Ban,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  Compass,
  Download,
  Eye,
  EyeOff,
  FolderKanban,
  Grid,
  Heart,
  LayoutDashboard,
  Link,
  ListChecks,
  Lock,
  LogOut,
  Mail,
  Map,
  MessageCircle,
  Minus,
  Moon,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ServerCrash,
  Settings,
  ShieldCheck,
  Star,
  Sun,
  Target,
  Trash2,
  Unlink,
  Upload,
  User,
  UserPlus,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Mapa de nombres (estilo kebab-case) a iconos de lucide-react. Mantener este
 * mapa explícito permite que el bundler elimine los iconos que no se usan.
 */
const customIcons = {
  'alert-circle': AlertCircle,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  ban: Ban,
  'building-2': Building2,
  calendar: Calendar,
  check: Check,
  'check-circle-2': CheckCircle2,
  'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  circle: Circle,
  clock: Clock,
  compass: Compass,
  download: Download,
  edit: Pencil,
  eye: Eye,
  'eye-off': EyeOff,
  'folder-kanban': FolderKanban,
  grid: Grid,
  heart: Heart,
  layout: LayoutDashboard,
  link: Link,
  'list-checks': ListChecks,
  'lock-2': Lock,
  'log-out': LogOut,
  mail: Mail,
  map: Map,
  'message-circle': MessageCircle,
  minus: Minus,
  moon: Moon,
  pencil: Pencil,
  plus: Plus,
  'refresh-cw': RefreshCw,
  search: Search,
  'server-crash': ServerCrash,
  settings: Settings,
  'shield-check': ShieldCheck,
  star: Star,
  sun: Sun,
  target: Target,
  trash: Trash2,
  unlink: Unlink,
  upload: Upload,
  user: User,
  'user-plus': UserPlus,
  'user-round': UserRound,
  users: Users,
  x: X,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof customIcons;

export const Icon = ({
  name,
  size = 18,
  className,
  strokeWidth = 1.75,
}: {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) => {
  const Component = customIcons[name] ?? Circle;
  return (
    <Component
      size={size}
      strokeWidth={strokeWidth}
      className={cn('shrink-0', className)}
      aria-hidden="true"
    />
  );
};

export { customIcons };
