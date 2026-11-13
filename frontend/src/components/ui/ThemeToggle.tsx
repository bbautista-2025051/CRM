import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/providers/ThemeProvider';
import { cn } from '@/lib/cn';

export const ThemeToggle = ({ className }: { className?: string }) => {
  const { resolved, setPreference } = useTheme();
  const next = resolved === 'dark' ? 'LIGHT' : 'DARK';
  return (
    <button
      type="button"
      onClick={() => setPreference(next)}
      className={cn(
        'focus-ring flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-elevated hover:text-ink',
        className,
      )}
      aria-label={resolved === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      title={resolved === 'dark' ? 'Tema claro' : 'Tema oscuro'}
    >
      {resolved === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  );
};
