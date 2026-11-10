import { useSearchParams } from 'react-router-dom';
import { Target, Wallet } from 'lucide-react';
import { OpportunitiesPage } from '@/pages/OpportunitiesPage';
import { SalesPage } from '@/pages/SalesPage';
import { usePageTitle } from '@/hooks/usePageTitle';
import { cn } from '@/lib/cn';

type BusinessView = 'opportunities' | 'sales';

const views: Array<{
  value: BusinessView;
  label: string;
  icon: typeof Target;
}> = [
  { value: 'opportunities', label: 'Oportunidades', icon: Target },
  { value: 'sales', label: 'Ventas', icon: Wallet },
];

export const NegocioPage = () => {
  usePageTitle('Negocio');
  const [searchParams, setSearchParams] = useSearchParams();
  const view: BusinessView =
    searchParams.get('view') === 'sales' ? 'sales' : 'opportunities';

  const selectView = (nextView: BusinessView) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('view', nextView);
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted">
            Administra el pipeline comercial y las ventas desde un solo lugar.
          </p>
        </div>
        <div
          role="tablist"
          aria-label="Secciones de negocio"
          className="inline-flex w-fit rounded-lg border border-line bg-elevated/50 p-1"
        >
          {views.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              id={`business-tab-${value}`}
              type="button"
              role="tab"
              aria-selected={view === value}
              aria-controls="business-panel"
              onClick={() => selectView(value)}
              className={cn(
                'focus-ring inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition',
                view === value
                  ? 'bg-surface text-ink shadow-sm'
                  : 'text-muted hover:text-ink',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div
        id="business-panel"
        role="tabpanel"
        aria-labelledby={`business-tab-${view}`}
      >
        {view === 'sales' ? <SalesPage /> : <OpportunitiesPage />}
      </div>
    </div>
  );
};
