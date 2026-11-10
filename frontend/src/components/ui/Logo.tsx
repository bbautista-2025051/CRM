import { cn } from '@/lib/cn';
import { brand } from '@/config/brand';

export const LogoMark = ({ className }: { className?: string }) => {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn('h-9 w-9 shrink-0 rounded-xl shadow-sm', className)}
      role="img"
      aria-label={`${brand.company} logo`}
      focusable="false"
    >
      <defs>
        <linearGradient id="softplus-logo-gradient" x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563EB" />
          <stop offset="1" stopColor="#1291F8" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#softplus-logo-gradient)" />
      <path
        d="M14 39.5a11 11 0 0 1 11-11 13 13 0 0 1 25.2 3.2A8.2 8.2 0 0 1 49 48H25a8.5 8.5 0 0 1-11-8.5Z"
        fill="none"
        stroke="white"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
      />
      <path d="M34 34v12m-6-6h12" stroke="white" strokeLinecap="round" strokeWidth="3" />
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
    {compact ? (
      <LogoMark />
    ) : (
      <img
        src={brand.logoUrl || '/login-brand.png'}
        alt={`${brand.company} logo`}
        className={cn(
          'h-9 w-auto max-w-[150px] object-contain',
          dark && 'brightness-0 invert',
          wordmarkClassName,
        )}
      />
    )}
  </span>
);
