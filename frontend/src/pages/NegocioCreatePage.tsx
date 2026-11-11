import { useSearchParams } from 'react-router-dom';
import { OpportunityFormPage } from '@/pages/OpportunityFormPage';
import { SaleFormPage } from '@/pages/SaleFormPage';
import { usePageTitle } from '@/hooks/usePageTitle';

type BusinessView = 'opportunities' | 'sales';

export const NegocioCreatePage = () => {
  usePageTitle('Nuevo negocio');
  const [searchParams] = useSearchParams();
  const view: BusinessView =
    searchParams.get('view') === 'sales' ? 'sales' : 'opportunities';

  return view === 'sales' ? <SaleFormPage /> : <OpportunityFormPage />;
};
