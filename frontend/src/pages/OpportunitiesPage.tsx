import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Columns3,
  Eye,
  Handshake,
  LayoutList,
  MoreHorizontal,
  Pencil,
  Plus,
  Target,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  useCompanyOptions,
  useOpportunityStages,
  useUserOptions,
} from '@/hooks/queries';
import { opportunitiesApi } from '@/lib/endpoints';
import { canManageOpportunity } from '@/lib/permissions';
import { formatDate, formatMoney, formatNumber } from '@/lib/format';
import {
  STAGE_BAR_COLORS,
  STAGE_ORDER,
} from '@/lib/labels';
import { cn } from '@/lib/cn';
import { useToast } from '@/providers/ToastProvider';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { Input, Select } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { StageBadge } from '@/components/ui/StatusBadges';
import {
  Dropdown,
  DropdownItem,
  DropdownSeparator,
} from '@/components/ui/Dropdown';
import type { OpportunityStage } from '@/types';

type ViewMode = 'table' | 'board';

export const OpportunitiesPage = () => {
  usePageTitle('Negocio');
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const companies = useCompanyOptions('', true);
  const users = useUserOptions(user?.role === 'ADMIN');
  const stages = useOpportunityStages();

  const createRequested = searchParams.get('create') === '1';
  const openRequested = searchParams.get('open');
  const companyParam = searchParams.get('companyId') ?? '';
  const clientParam = searchParams.get('clientId') ?? '';

  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('');
  const [status, setStatus] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [companyId, setCompanyId] = useState(companyParam);
  const [page, setPage] = useState(1);
  const [view, setView] = useState<ViewMode>('table');
  const [addingStage, setAddingStage] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const boardScrollRef = useRef<HTMLDivElement>(null);
  const debouncedSearch = useDebouncedValue(search, 300);
  const createStage = useMutation({
    mutationFn: () => opportunitiesApi.createStage(newStageName.trim()),
    onSuccess: (response) => {
      success('Etapa agregada', `${response.data.label} ya est├í disponible.`);
      setNewStageName('');
      setAddingStage(false);
      void queryClient.invalidateQueries({ queryKey: ['opportunities', 'stages'] });
    },
    onError: (error) => {
      toastError(
        'No se pudo agregar la etapa',
        error instanceof Error ? error.message : 'Int├®ntalo de nuevo.',
      );
    },
  });

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, stage, status, ownerId, companyId, view]);

  useEffect(() => {
    if (view !== 'board' || !addingStage) return;
    const container = boardScrollRef.current;
    container?.scrollTo({ left: container.scrollWidth, behavior: 'smooth' });
  }, [view, addingStage]);

  const cancelAddStage = () => {
    setAddingStage(false);
    setNewStageName('');
  };

  useEffect(() => {
    if (!createRequested && !openRequested) return;
    if (createRequested) {
      const params = new URLSearchParams({ view: 'opportunities' });
      if (companyParam) params.set('companyId', companyParam);
      if (clientParam) params.set('clientId', clientParam);
      navigate(`/negocio/nuevo?${params.toString()}`, { replace: true });
      return;
    }
    if (openRequested) {
      navigate(`/negocio/oportunidad/${openRequested}`, { replace: true });
      return;
    }
    const next = new URLSearchParams(searchParams);
    next.delete('create');
    next.delete('open');
    next.delete('companyId');
    next.delete('clientId');
    setSearchParams(next, { replace: true });
    // Solo se ejecuta cuando la URL trae una acci├│n puntual.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createRequested, openRequested, companyParam, clientParam]);

  const query = useQuery({
    queryKey: [
      'opportunities',
      'list',
      { page: view === 'board' ? 1 : page, view, search: debouncedSearch, stage, status, ownerId, companyId },
    ],
    queryFn: () =>
      opportunitiesApi.list({
        page: view === 'board' ? 1 : page,
        pageSize: view === 'board' ? 100 : 15,
        search: debouncedSearch || undefined,
        stage: stage || undefined,
        status: status || undefined,
        ownerId: ownerId || undefined,
        companyId: companyId || undefined,
        sortBy: view === 'board' ? 'value' : 'createdAt',
        sortOrder: view === 'board' ? 'desc' : 'desc',
      }),
  });

  const openCreate = (initialStage?: OpportunityStage) => {
    const params = new URLSearchParams({ view: 'opportunities' });
    if (companyId) params.set('companyId', companyId);
    if (initialStage) params.set('stage', initialStage);
    navigate(`/negocio/nuevo?${params.toString()}`);
  };

  const clearFilters = () => {
    setSearch('');
    setStage('');
    setStatus('');
    setOwnerId('');
    setCompanyId('');
  };

  const opportunities = query.data?.data ?? [];
  const meta = query.data?.meta;
  const hasFilters = Boolean(debouncedSearch || stage || status || ownerId || companyId);
  const stageOptions = stages.data ?? STAGE_ORDER.map((value) => ({
    value,
    label:
      value === 'NEGOCIACION'
        ? 'Negociaci├│n'
        : value === 'GANADA'
          ? 'Ganada'
          : 'Perdida',
    isCustom: false,
  }));
  const stageLabel = (value: OpportunityStage) =>
    stageOptions.find((option) => option.value === value)?.label ?? value;

  const boardColumns = stageOptions.map((option) => ({
    stage: option.value,
    label: option.label,
    items: opportunities.filter((item) => item.stage === option.value),
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Oportunidades"
        description="Da seguimiento a tu pipeline y visualiza cada etapa del proceso comercial."
        actions={
          <>
            <div className="inline-flex rounded-lg border border-line bg-elevated/50 p-0.5">
              <button
                type="button"
                onClick={() => setView('table')}
                className={cn(
                  'focus-ring inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium transition',
                  view === 'table' ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
                )}
                aria-pressed={view === 'table'}
              >
                <LayoutList className="h-4 w-4" /> Tabla
              </button>
              <button
                type="button"
                onClick={() => setView('board')}
                className={cn(
                  'focus-ring inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium transition',
                  view === 'board' ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
                )}
                aria-pressed={view === 'board'}
              >
                <Columns3 className="h-4 w-4" /> Kanban
              </button>
            </div>
            <Button onClick={() => openCreate()} leftIcon={<Plus className="h-4 w-4" />}>
              Nueva oportunidad
            </Button>
          </> 
        }
      />

      {addingStage && view !== 'board' ? (
        <Card className="p-4">
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              if (newStageName.trim()) createStage.mutate();
            }}
          >
            <label className="flex-1 space-y-1.5 text-sm font-medium text-ink">
              Nueva etapa
              <Input
                autoFocus
                maxLength={60}
                value={newStageName}
                onChange={(event) => setNewStageName(event.target.value)}
                placeholder="Ej. Revisi├│n legal"
                required
              />
            </label>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={cancelAddStage}>
                Cancelar
              </Button>
              <Button
                type="submit"
                loading={createStage.isPending}
                disabled={!newStageName.trim()}
              >
                Guardar etapa
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-4 xl:flex-row xl:items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por nombre, empresa o clienteÔÇª"
            className="xl:w-72"
          />
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <Select
              aria-label="Filtrar por etapa"
              value={stage}
              onChange={(event) => {
                const next = event.target.value;
                if (next === '__new_stage__') {
                  setStage('');
                  setAddingStage(true);
                  return;
                }
                setStage(next);
              }}
              className="w-auto min-w-[140px]"
            >
              <option value="">Todas las etapas</option>
              {stageOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
              {user?.role === 'ADMIN' ? (
                <option value="__new_stage__">+ Agregar nueva etapa</option>
              ) : null}
            </Select>
            <Select
              aria-label="Filtrar por estado"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="w-auto min-w-[130px]"
            >
              <option value="">Todos los estados</option>
              <option value="OPEN">Abiertas</option>
              <option value="WON">Ganadas</option>
              <option value="LOST">Perdidas</option>
            </Select>
            <Select
              aria-label="Filtrar por empresa"
              value={companyId}
              onChange={(event) => setCompanyId(event.target.value)}
              className="w-auto min-w-[170px]"
            >
              <option value="">Todas las empresas</option>
              {companies.data?.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </Select>
            {user?.role === 'ADMIN' ? (
              <Select
                aria-label="Filtrar por responsable"
                value={ownerId}
                onChange={(event) => setOwnerId(event.target.value)}
                className="w-auto min-w-[160px]"
              >
                <option value="">Todos los responsables</option>
                {users.data?.data.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </Select>
            ) : null}
            {hasFilters ? (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            ) : null}
            <span className="ml-auto text-xs text-muted">
              {meta ? `${formatNumber(meta.total)} oportunidades` : ''}
            </span>
          </div>
        </div>

        {query.isLoading ? (
          <TableSkeleton rows={8} columns={6} />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : opportunities.length === 0 ? (
          <EmptyState
            icon={Target}
            title={hasFilters ? 'No encontramos oportunidades' : 'Tu pipeline est├í vac├¡o'}
            description={
              hasFilters
                ? 'Prueba con otros filtros o limpia la b├║squeda.'
                : 'Crea tu primera oportunidad para empezar a medir el embudo comercial.'
            }
            action={
              hasFilters ? (
                <Button variant="secondary" size="sm" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              ) : (
                <Button size="sm" onClick={() => openCreate()} leftIcon={<Plus className="h-4 w-4" />}>
                  Nueva oportunidad
                </Button>
              )
            }
          />
        ) : view === 'table' ? (
          <>
            <div className="table-wrap">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Oportunidad</th>
                    <th>Cliente</th>
                    <th>Responsable</th>
                    <th>Etapa</th>
                    <th className="text-right">Importe</th>
                    <th className="text-center">Prob.</th>
                    <th>Cierre</th>
                    <th className="w-12 text-right">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {opportunities.map((opportunity) => {
                    const manageable = canManageOpportunity(
                      user?.role,
                      user?.id,
                      opportunity.ownerId,
                    );
                    return (
                      <tr key={opportunity.id}>
                        <td>
                          <button
                            type="button"
                            onClick={() => navigate(`/negocio/oportunidad/${opportunity.id}`)}
                            className="group block max-w-[260px] text-left"
                          >
                            <span className="block truncate font-medium text-ink group-hover:text-brand-strong dark:group-hover:text-brand">
                              {opportunity.name}
                            </span>
                            <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted">
                              <Building2 className="h-3 w-3 shrink-0" />
                              {opportunity.company?.name ?? 'Sin empresa'}
                            </span>
                          </button>
                        </td>
                        <td className="max-w-[180px] truncate text-xs text-muted">
                          {opportunity.client
                            ? `${opportunity.client.firstName} ${opportunity.client.lastName}`
                            : 'ÔÇö'}
                        </td>
                        <td>
                          <span className="inline-flex items-center gap-2 text-xs text-muted">
                            {opportunity.owner ? (
                              <Avatar name={opportunity.owner.name} size="xs" />
                            ) : null}
                            {opportunity.owner?.name ?? 'ÔÇö'}
                          </span>
                        </td>
                        <td>
                          <StageBadge
                            stage={opportunity.stage}
                            label={stageLabel(opportunity.stage)}
                          />
                        </td>
                        <td className="whitespace-nowrap text-right font-medium text-ink">
                          {formatMoney(opportunity.value)}
                        </td>
                        <td className="text-center text-xs tabular-nums text-muted">
                          {opportunity.probability}%
                        </td>
                        <td className="whitespace-nowrap text-xs text-muted">
                          {formatDate(opportunity.expectedCloseDate)}
                        </td>
                        <td className="text-right">
                          <Dropdown
                            trigger={({ toggle }) => (
                              <button
                                type="button"
                                onClick={toggle}
                                className="focus-ring rounded-lg p-1.5 text-muted transition hover:bg-elevated hover:text-ink"
                                aria-label={`Acciones para ${opportunity.name}`}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            )}
                          >
                            {(close) => (
                              <>
                                <DropdownItem
                                  icon={<Eye className="h-4 w-4" />}
                                  onClick={() => {
                                    close();
                                    navigate(`/negocio/oportunidad/${opportunity.id}`);
                                  }}
                                >
                                  Ver detalle
                                </DropdownItem>
                                {manageable ? (
                                  <DropdownItem
                                    icon={<Pencil className="h-4 w-4" />}
                                    onClick={() => {
                                      close();
                                      navigate(`/negocio/oportunidad/${opportunity.id}/editar`);
                                    }}
                                  >
                                    Editar
                                  </DropdownItem>
                                ) : null}
                                {opportunity.stage === 'GANADA' &&
                                !opportunity.sale &&
                                manageable ? (
                                  <>
                                    <DropdownSeparator />
                                    <DropdownItem
                                      icon={<Handshake className="h-4 w-4" />}
                                      onClick={() => {
                                        close();
                                        navigate(`/negocio/nuevo?view=sales&opportunityId=${opportunity.id}`);
                                      }}
                                    >
                                      Registrar venta
                                    </DropdownItem>
                                  </>
                                ) : null}
                              </>
                            )}
                          </Dropdown>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {meta ? <Pagination meta={meta} onPageChange={setPage} /> : null}
          </>
        ) : (
          <div className="scrollbar-thin overflow-x-auto p-4" ref={boardScrollRef}>
            <div className="flex min-w-max gap-3">
              {boardColumns.map((column) => (
                <section
                  key={column.stage}
                  className="w-[272px] shrink-0 rounded-xl border border-line bg-elevated/30"
                  aria-label={column.label}
                >
                  <header className="flex items-center gap-2 border-b border-line px-3 py-2.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor: STAGE_BAR_COLORS[column.stage] ?? '#64748b',
                      }}
                    />
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-ink">
                      {column.label}
                    </h2>
                    <span className="rounded-full bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-muted ring-1 ring-inset ring-line">
                      {column.items.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => openCreate(column.stage)}
                      className="focus-ring ml-auto rounded-md p-1 text-muted transition hover:bg-surface hover:text-ink"
                      aria-label={`Nueva oportunidad en ${column.label}`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </header>
                  <div className="space-y-2 p-2.5">
                    {column.items.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-line px-3 py-6 text-center text-[11px] text-muted">
                        Sin oportunidades
                      </p>
                    ) : (
                      column.items.map((opportunity) => (
                        <button
                          key={opportunity.id}
                          type="button"
                          onClick={() => navigate(`/negocio/oportunidad/${opportunity.id}`)}
                          className="focus-ring w-full rounded-lg border border-line bg-surface p-3 text-left shadow-sm transition hover:border-brand/40 hover:shadow-card"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="line-clamp-2 text-[13px] font-semibold leading-5 text-ink">
                              {opportunity.name}
                            </p>
                            <Badge tone="neutral">{opportunity.probability}%</Badge>
                          </div>
                          <p className="mt-1 flex items-center gap-1 truncate text-[11px] text-muted">
                            <Building2 className="h-3 w-3 shrink-0" />
                            {opportunity.company?.name ?? 'Sin empresa'}
                          </p>
                          <p className="mt-2 text-sm font-semibold text-ink">
                            {formatMoney(opportunity.value)}
                          </p>
                          <div className="mt-2 flex items-center justify-between gap-2 border-t border-line/70 pt-2">
                            <span className="flex min-w-0 items-center gap-1.5 text-[10px] text-muted">
                              {opportunity.owner ? (
                                <Avatar name={opportunity.owner.name} size="xs" className="h-5 w-5 text-[8px]" />
                              ) : null}
                              <span className="truncate">
                                {opportunity.owner?.name ?? 'Sin responsable'}
                              </span>
                            </span>
                            <span className="shrink-0 text-[10px] text-muted">
                              {formatDate(opportunity.expectedCloseDate)}
                            </span>
                          </div>
                          {opportunity.sale ? (
                            <p className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                              <Handshake className="h-3 w-3" /> {opportunity.sale.saleNumber}
                            </p>
                          ) : null}
                        </button>
                      ))
                    )}
                  </div>
                </section>
              ))}
              {user?.role === 'ADMIN' ? (
                <section
                  className="w-[272px] shrink-0 rounded-xl border border-dashed border-line bg-elevated/20"
                  aria-label="Agregar nueva etapa"
                >
                  <header className="flex items-center gap-2 border-b border-dashed border-line px-3 py-2.5">
                    <span className="h-2 w-2 rounded-full border border-dashed border-muted/60" />
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Nueva etapa
                    </h2>
                  </header>
                  <div className="p-2.5">
                    {addingStage ? (
                      <form
                        className="space-y-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          if (newStageName.trim()) createStage.mutate();
                        }}
                      >
                        <Input
                          autoFocus
                          maxLength={60}
                          value={newStageName}
                          onChange={(event) => setNewStageName(event.target.value)}
                          placeholder="Ej. Revisi├│n legal"
                          aria-label="Nombre de la nueva etapa"
                          required
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="flex-1"
                            onClick={cancelAddStage}
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="submit"
                            size="sm"
                            className="flex-1"
                            loading={createStage.isPending}
                            disabled={!newStageName.trim()}
                          >
                            Crear
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAddingStage(true)}
                        className="focus-ring flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-line px-3 py-6 text-[12px] font-medium text-muted transition hover:border-brand/40 hover:bg-surface hover:text-ink"
                      >
                        <Plus className="h-4 w-4" /> Agregar etapa
                      </button>
                    )}
                  </div>
                </section>
              ) : null}
            </div>
            {meta && meta.total > 100 ? (
              <p className="mt-3 text-center text-[11px] text-muted">
                Mostrando las primeras 100 oportunidades. Usa los filtros para acotar el
                tablero.
              </p>
            ) : null}
            <p className="mt-3 text-center text-[11px] text-muted">
              {
                stageOptions.filter(
                  ({ value }) => value !== 'GANADA' && value !== 'PERDIDA',
                ).length
              }{' '}
              etapas abiertas ┬À Haz clic en una tarjeta para ver el detalle.
            </p>
          </div>
        )}
      </Card>

    </div>
  );
};
