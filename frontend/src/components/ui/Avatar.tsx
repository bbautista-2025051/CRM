import { useState } from 'react';
import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';

const sizes = {
  xs: 'h-7 w-7 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-20 w-20 text-2xl',
} as const;

const tones = [
  'bg-blue-600',
  'bg-teal-600',
  'bg-indigo-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-cyan-700',
  'bg-violet-600',
];

const toneFor = (name: string): string => {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) % 997;
  }
  return tones[hash % tones.length];
};

export const Avatar = ({
  name,
  src,
  size = 'md',
  className,
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof sizes;
  className?: string;
}) => {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white ring-1 ring-black/5',
        sizes[size],
        !showImage && toneFor(name),
        className,
      )}
      aria-hidden={showImage || undefined}
      title={name}
    >
      {showImage ? (
        <img
          src={src ?? undefined}
          alt={name}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        initials(name)
      )}
    </span>
  );
};
