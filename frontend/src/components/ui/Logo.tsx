import { cn } from '@/lib/cn';
import { brand } from '@/config/brand';

export const LogoMark = ({ className }: { className?: string }) => {
  if (brand.logoUrl) {
    return (
      <img
        src={brand.logoUrl}
        alt={`${brand.company} logo`}
        className={cn('h-9 w-9 rounded-xl object-contain', className)}
      />
    );
  }
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn('h-9 w-9 shrink-0 rounded-xl shadow-sm', className)}
      aria-hidden
    >
      <defs>
        <linearGradient id="nexo-logo-gradient" x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563EB" />
          <stop offset="1" stopColor="#0D9488" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#nexo-logo-gradient)" />
      <path d="M18 46V18h7l14 18V18h7v28h-7L25 28v18h-7Z" fill="white" />
    </svg>
  );
};

export const Logo = ({
  className,
  wordmarkClassName,
  compact = false,
  dark = false,
}: {
  className?: string;
  wordmarkClassName?: string;
  compact?: boolean;
  dark?: boolean;
}) => (
  <span className={cn('inline-flex items-center gap-2.5', className)}>
    <LogoMark />
    {compact ? null : (
      <span className={cn('leading-none', wordmarkClassName)}>
        <span
          className={cn(
            'block text-[17px] font-semibold tracking-tight',
            dark ? 'text-white' : 'text-ink',
          )}
        >
          {brand.company}
          <span className="text-brand">.</span>
        </span>
        <span
          className={cn(
            'mt-1 block text-[9px] font-semibold uppercase tracking-[0.22em]',
            dark ? 'text-white/50' : 'text-muted',
          )}
        >
          CRM
        </span>
      </span>
    )}
  </span>
);
