import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { OpportunityDetailModal } from '@/components/opportunities/OpportunityDetailModal';
import { OpportunityFormModal } from '@/components/opportunities/OpportunityFormModal';
import { usePageTitle } from '@/hooks/usePageTitle';
import type { Opportunity } from '@/types';

export const NegocioOpportunityPage = () => {
  usePageTitle('Detalle de oportunidad');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [editing, setEditing] = useState<Opportunity | null>(null);

  if (!id) {
    return <Navigate to="/negocio?view=opportunities" replace />;
  }

  if (editing) {
    return (
      <OpportunityFormModal
        open
        inline
        opportunity={editing}
        onClose={() => setEditing(null)}
        onSaved={() => setEditing(null)}
      />
    );
  }

  return (
    <OpportunityDetailModal
      key={id}
      opportunityId={id}
      onClose={() => navigate('/negocio?view=opportunities')}
      onEdit={setEditing}
    />
  );
};
