import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarDays,
  ExternalLink,
  Globe2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  UsersRound,
  Wallet,
  Target,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';
import { Avatar } from '@/components/ui/Avatar';
import { CompanyStatusBadge } from '@/components/ui/StatusBadges';
import { companiesApi, unwrap } from '@/lib/endpoints';
import { formatDate, formatNumber } from '@/lib/format';
import type { CompanyDetail } from '@/types';

/** Encabezado centrado del wireframe exacto de Proyecto: NOMBRE / SECTOR / ESTADO */
const SheetHeader = ({
  name,
  sector,
  taxId,
}: {
  name: string;
  sector: string;
  taxId: string;
}) => (
  <header className="px-4 text-center">
    <h2 className="font-display text-[22px] font-bold tracking-[-0.02em] text-ink">{name}</h2>
    <p className="mt-1 font-display text-[16px] font-semibold tracking-[-0.01em] text-ink">
      {sector}
    </p>
    <p className="mt-1 metric text-[15px] font-semibold text-ink">{taxId}</p>
  </header>
);

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="px-4 py-2.5">
    <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</p>
    <div className="mt-1 text-sm text-ink">{children}</div>
  </div>
);

const RowInline = ({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: any;
  children: React.ReactNode;
}) => (
  <div className="flex items-center gap-3 px-4 py-2.5">
    {Icon ? <Icon className="h-4 w-4 shrink-0 text-muted" /> : null}
    <div className="min-w-0 flex-1">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</p>
      <div className="mt-0.5 text-sm text-ink">{children}</div>
    </div>
  </div>
);

export const CompanyDetailModal = ({
  open,
  onClose,
  companyId,
  onEdit,
}: {
  open: boolean;
  onClose: () => void;
  companyId: string | null;
  onEdit?: (company: CompanyDetail) => void;
}) => {
  const navigate = useNavigate();

  const query = useQuery({
    queryKey: ['companies', 'detail', companyId],
    queryFn: async () => unwrap(await companiesApi.get(companyId as string)),
    enabled: open && Boolean(companyId),
  });

  const company = query.data;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      fullWindow
      title="Detalle de la empresa"
      description="Ficha comercial y datos generales de la empresa."
      footer={
        <div className="flex w-full items-center justify-between">
          <div>
            {company && onEdit ? (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Pencil className="h-4 w-4" />}
                onClick={() => {
                  onClose();
                  onEdit(company);
                }}
              >
                Editar
              </Button>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {company ? (
              <Button
                variant="primary"
                size="sm"
                rightIcon={<ExternalLink className="h-4 w-4" />}
                onClick={() => {
                  onClose();
                  navigate(`/companies/${company.id}`);
                }}
              >
                Ver página completa
              </Button>
            ) : null}
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      }
    >
      {query.isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-6 w-6 text-brand" label="Cargando empresa" />
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : company ? (
        <div className="space-y-5">
          {/* Encabezado centrado del wireframe */}
          <SheetHeader
            name={company.name}
            sector={company.sector ?? 'Sin sector definido'}
            taxId={company.taxId ? `NIT / Tax ID: ${company.taxId}` : 'Sin identificación fiscal'}
          />

          <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            {/* Columna izquierda: ficha idéntica al wireframe de proyectos */}
            <div className="h-fit rounded-xl border border-line bg-elevated/20">
              <div className="divide-y divide-line">
                <RowInline label="Creado por">
                  {company.createdBy ? (
                    <span className="mt-0.5 flex items-center gap-2">
                      <Avatar
                        name={company.createdBy.name}
                        size="xs"
                      />
                      <span className="truncate font-medium">{company.createdBy.name}</span>
                    </span>
                  ) : (
                    'Sistema / No asignado'
                  )}
                </RowInline>

                <Row label="Razón Social">
                  <span className="font-medium">{company.legalName || company.name}</span>
                </Row>

                <Row label="Sector">{company.sector || 'Sin sector especificado'}</Row>

                <RowInline label="Estado">
                  <CompanyStatusBadge status={company.status} />
                </RowInline>

                <RowInline label="Teléfono" icon={Phone}>
                  {company.phone ? (
                    <a href={`tel:${company.phone}`} className="hover:underline">
                      {company.phone}
                    </a>
                  ) : (
                    'Sin teléfono'
                  )}
                </RowInline>

                <RowInline label="Correo de contacto" icon={Mail}>
                  {company.email ? (
                    <a href={`mailto:${company.email}`} className="text-brand hover:underline">
                      {company.email}
                    </a>
                  ) : (
                    'Sin correo electrónico'
                  )}
                </RowInline>

                <RowInline label="Sitio Web" icon={Globe2}>
                  {company.website ? (
                    <a
                      href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-brand hover:underline"
                    >
                      {company.website}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    'Sin sitio web'
                  )}
                </RowInline>

                <RowInline label="Dirección" icon={MapPin}>
                  {company.address || 'Sin dirección registrada'}
                </RowInline>

                <RowInline label="Fecha de Registro" icon={CalendarDays}>
                  {formatDate(company.createdAt)}
                </RowInline>
              </div>
            </div>

            {/* Columna derecha: métricas, notas y resumen comercial */}
            <div className="space-y-5">
              {/* Resumen de cartera */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-line bg-elevated/20 p-3.5 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-muted">
                    <UsersRound className="h-4 w-4" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider">Clientes</span>
                  </div>
                  <p className="metric mt-1 text-2xl font-bold text-ink">
                    {formatNumber(company.clients?.length ?? company._count?.clients ?? 0)}
                  </p>
                </div>

                <div className="rounded-xl border border-line bg-elevated/20 p-3.5 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-muted">
                    <Target className="h-4 w-4" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider">Oportunidades</span>
                  </div>
                  <p className="metric mt-1 text-2xl font-bold text-ink">
                    {formatNumber(company.opportunities?.length ?? company._count?.opportunities ?? 0)}
                  </p>
                </div>

                <div className="rounded-xl border border-line bg-elevated/20 p-3.5 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-muted">
                    <Wallet className="h-4 w-4" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider">Ventas</span>
                  </div>
                  <p className="metric mt-1 text-2xl font-bold text-ink">
                    {formatNumber(company.sales?.length ?? company._count?.sales ?? 0)}
                  </p>
                </div>
              </div>

              {/* Ficha de Notas / Observaciones */}
              <div className="rounded-xl border border-line bg-elevated/20 p-4">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted">
                  Notas de la empresa
                </p>
                <div className="mt-2 text-sm leading-6 text-ink">
                  {company.notes ? (
                    <p className="whitespace-pre-line">{company.notes}</p>
                  ) : (
                    <p className="text-xs italic text-muted">
                      No hay notas registradas para esta empresa. Puedes agregar información relevante editándola.
                    </p>
                  )}
                </div>
              </div>

              {/* Listado de contactos / clientes asociados */}
              <div className="rounded-xl border border-line bg-elevated/20">
                <div className="flex items-center justify-between border-b border-line px-4 py-3">
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted">
                    Contactos principales ({company.clients?.length ?? 0})
                  </p>
                </div>
                {!company.clients?.length ? (
                  <p className="px-4 py-6 text-center text-[13px] leading-5 text-muted">
                    Sin clientes o contactos vinculados directamente.
                  </p>
                ) : (
                  <ul className="max-h-[260px] divide-y divide-line overflow-y-auto">
                    {company.clients.map((client) => (
                      <li key={client.id} className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={`${client.firstName} ${client.lastName}`} size="xs" />
                          <div>
                            <p className="text-xs font-semibold text-ink">
                              {client.firstName} {client.lastName}
                            </p>
                            <p className="text-[11px] text-muted">
                              {client.jobTitle || 'Sin cargo'} · {client.email}
                            </p>
                          </div>
                        </div>
                        {client.phone ? (
                          <span className="text-xs text-muted">{client.phone}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
};
