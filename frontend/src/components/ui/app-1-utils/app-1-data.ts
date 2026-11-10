import type { ChartConfig } from "@/components/ui/chart";

export const app1User = {
  name: "Alexander Wright",
  initials: "AW",
  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
};

export const app1ChartConfig = {
  opened: {
    label: "Opened",
    color: "var(--color-opened)",
  },
  completed: {
    label: "Completed",
    color: "var(--color-completed)",
  },
} satisfies ChartConfig;

export const app1Chart = [
  { week: "W1", opened: 45, completed: 32 },
  { week: "W2", opened: 52, completed: 41 },
  { week: "W3", opened: 48, completed: 46 },
  { week: "W4", opened: 61, completed: 55 },
  { week: "W5", opened: 55, completed: 58 },
  { week: "W6", opened: 67, completed: 62 },
  { week: "W7", opened: 70, completed: 69 },
  { week: "W8", opened: 64, completed: 72 },
];

export const app1Projects = [
  {
    id: "1",
    name: "Design System 2.0",
    description: "Component library overhaul with token support and auto-layout upgrades.",
    status: "In progress" as const,
    progress: 68,
    dueDate: "Nov 18",
    team: [
      { name: "Sarah Chen", initials: "SC", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150" },
      { name: "David Kim", initials: "DK", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150" },
    ],
  },
  {
    id: "2",
    name: "Billing Portal Rewrite",
    description: "Self-serve invoices, seats management, and multi-currency billing.",
    status: "In review" as const,
    progress: 92,
    dueDate: "Nov 22",
    team: [
      { name: "Alex Wright", initials: "AW", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150" },
    ],
  },
  {
    id: "3",
    name: "Mobile App V3",
    description: "Complete rebuild of iOS and Android apps using native navigation.",
    status: "Planning" as const,
    progress: 24,
    dueDate: "Dec 10",
    team: [
      { name: "Emily Watson", initials: "EW", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150" },
    ],
  },
];

export const app1Activity = [
  {
    id: "1",
    person: { name: "Sarah Chen", initials: "SC", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150" },
    action: "pushed 4 commits to feature/tokens",
    time: "12m ago",
  },
  {
    id: "2",
    person: { name: "David Kim", initials: "DK", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150" },
    action: "approved PR #481: Multi-currency checkout",
    time: "45m ago",
  },
  {
    id: "3",
    person: { name: "Alex Wright", initials: "AW", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150" },
    action: "created issue 'Webhook retry exponent is broken'",
    time: "2h ago",
  },
];
