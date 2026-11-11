import { useNavigate, useParams } from 'react-router-dom';
import { OpportunityDetailPage } from '@/pages/OpportunityDetailPage';
import { usePageTitle } from '@/hooks/usePageTitle';

export const NegocioOpportunityPage = () => {
  usePageTitle('Detalle de oportunidad');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) {
    navigate('/negocio?view=opportunities', { replace: true });
    return null;
  }

  return <OpportunityDetailPage />;
};
