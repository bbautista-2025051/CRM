import { SalesPage } from '@/pages/SalesPage';
import { usePageTitle } from '@/hooks/usePageTitle';

export const NegocioPage = () => {
  usePageTitle('Negocio');

  return (
    <div className="space-y-5">
      <SalesPage />
    </div>
  );
};
