import { Link } from 'react-router-dom';
import { Compass, LayoutDashboard } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { buttonStyles } from '@/components/ui/Button';

export const NotFoundPage = () => {
  usePageTitle('Página no encontrada');

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-elevated text-muted">
          <Compass className="h-6 w-6" />
        </span>
        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
          Error 404
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
          Página no encontrada
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          La ruta que buscas no existe o fue movida. Vuelve al panel para continuar
          trabajando.
        </p>
        <div className="mt-6 flex justify-center">
          <Link to="/dashboard" className={buttonStyles({ size: 'md' })}>
            <LayoutDashboard className="h-4 w-4" /> Ir al panel
          </Link>
        </div>
      </div>
    </div>
  );
};
