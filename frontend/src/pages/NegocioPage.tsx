import { useSearchParams } from 'react-router-dom';
import { Wallet, Settings } from 'lucide-react';
import { SalesPage } from '@/pages/SalesPage';
import { SaleStatusManager } from '@/components/sales/SaleStatusManager';
import { usePageTitle } from '@/hooks/usePageTitle';
import { cn } from '@/lib/cn';
import { isAdmin } from '@/lib/permissions';
import { useAuth } from '@/providers/AuthProvider';

type BusinessView = 'sales' | 'statuses';

const views: Array<{
  value: BusinessView;
  label: string;
  icon: typeof Wallet;
  adminOnly?: boolean;
}> = [
  { value: 'sales', label: 'Ventas', icon: Wallet },
  { value: 'statuses', label: 'Estados', icon: Settings, adminOnly: true },
];

export const NegocioPage = () => {
  usePageTitle('Negocio');
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const view: BusinessView =
    (searchParams.get('view') as BusinessView) === 'statuses' &&
    isAdmin(user?.role)
      ? 'statuses'
      : 'sales';

  const selectView = (nextView: BusinessView) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('view', nextView);
    setSearchParams(nextParams, { replace: true });
  };

  const adminViews = views.filter((v) => !v.adminOnly || isAdmin(user?.role));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted">
            Administra las ventas y los estados disponibles desde un solo lugar.
          </p>
        </div>
        <div
          role="tablist"
          aria-label="Secciones de negocio"
          className="inline-flex w-fit rounded-lg border border-line bg-elevated/50 p-1"
        >
          {adminViews.map(({ value, label, icon: Icon }) => (
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
        {view === 'sales' ? <SalesPage /> : <SaleStatusManager />}
      </div>
    </div>
  );
};
