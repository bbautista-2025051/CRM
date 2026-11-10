import { useNavigate, useSearchParams } from 'react-router-dom';
import { OpportunityFormModal } from '@/components/opportunities/OpportunityFormModal';
import { SaleFormModal } from '@/components/sales/SaleFormModal';
import { usePageTitle } from '@/hooks/usePageTitle';

type BusinessView = 'opportunities' | 'sales';

export const NegocioCreatePage = () => {
  usePageTitle('Nuevo negocio');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const view: BusinessView =
    searchParams.get('view') === 'sales' ? 'sales' : 'opportunities';
  const companyId = searchParams.get('companyId') || undefined;
  const clientId = searchParams.get('clientId') || undefined;
  const opportunityId = searchParams.get('opportunityId') || undefined;
  const stageParam = searchParams.get('stage');
  const stage = stageParam ?? undefined;
  const returnToBusiness = () => {
    navigate(`/negocio?view=${view}`);
  };

  return view === 'sales' ? (
    <SaleFormModal
      open
      inline
      onClose={returnToBusiness}
      defaultCompanyId={companyId}
      defaultClientId={clientId}
      defaultOpportunityId={opportunityId}
    />
  ) : (
    <OpportunityFormModal
      open
      inline
      onClose={returnToBusiness}
      defaultCompanyId={companyId}
      defaultClientId={clientId}
      defaultStage={stage}
    />
  );
};
