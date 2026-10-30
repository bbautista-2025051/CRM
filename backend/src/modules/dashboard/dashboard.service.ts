import { env } from '../../config/env';
import { prisma } from '../../config/prisma';

interface MonthlySalesRow {
  month: string;
  total: string;
  count: number;
}

const monthKeys = (count: number): string[] => {
  const now = new Date();
  const keys: string[] = [];
  for (let index = count - 1; index >= 0; index -= 1) {
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1),
    );
    keys.push(
      `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`,
    );
  }
  return keys;
};

export const getDashboard = async () => {
  const [
    companiesTotal,
    activeCompanies,
    clientsTotal,
    openOpportunities,
    openValueAgg,
    confirmedSales,
    wonOpportunities,
    lostOpportunities,
    salesByCurrencyRows,
    opportunitiesByStage,
    monthlyRows,
    clientsByCompanyRows,
    clientsWithoutCompany,
    companiesBySectorRows,
    companiesWithoutSector,
    recentActivity,
    recentOpportunities,
    recentSales,
  ] = await Promise.all([
    prisma.company.count(),
    prisma.company.count({ where: { status: 'ACTIVE' } }),
    prisma.client.count({ where: { status: 'ACTIVE' } }),
    prisma.opportunity.count({ where: { status: 'OPEN' } }),
    prisma.opportunity.aggregate({
      where: { status: 'OPEN' },
      _sum: { value: true },
    }),
    prisma.sale.count({ where: { status: 'CONFIRMED' } }),
    prisma.opportunity.count({ where: { status: 'WON' } }),
    prisma.opportunity.count({ where: { status: 'LOST' } }),
    prisma.sale.groupBy({
      by: ['currency'],
      where: { status: 'CONFIRMED' },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.opportunity.groupBy({
      by: ['stage'],
      _count: { _all: true },
      _sum: { value: true },
    }),
    prisma.$queryRaw<MonthlySalesRow[]>`
      SELECT
        to_char(date_trunc('month', sale_date), 'YYYY-MM') AS month,
        SUM(amount)::text AS total,
        COUNT(*)::int AS count
      FROM sales
      WHERE status = 'CONFIRMED'
        AND sale_date >= (date_trunc('month', CURRENT_DATE) - INTERVAL '5 months')
      GROUP BY 1
      ORDER BY 1
    `,
    prisma.client.groupBy({
      by: ['companyId'],
      where: { status: 'ACTIVE', companyId: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { companyId: 'desc' } },
      take: 7,
    }),
    prisma.client.count({ where: { status: 'ACTIVE', companyId: null } }),
    prisma.company.groupBy({
      by: ['sector'],
      where: { status: 'ACTIVE', sector: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { sector: 'desc' } },
      take: 6,
    }),
    prisma.company.count({ where: { status: 'ACTIVE', sector: null } }),
    prisma.activityLog.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    }),
    prisma.opportunity.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        company: { select: { id: true, name: true } },
        client: { select: { id: true, firstName: true, lastName: true } },
        owner: { select: { id: true, name: true } },
      },
    }),
    prisma.sale.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { id: true, firstName: true, lastName: true } },
        company: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true } },
      },
    }),
  ]);

  const companyIds = clientsByCompanyRows
    .map((row) => row.companyId)
    .filter((id): id is string => Boolean(id));

  const companies = companyIds.length
    ? await prisma.company.findMany({
        where: { id: { in: companyIds } },
        select: { id: true, name: true },
      })
    : [];
  const companyNameById = new Map(companies.map((company) => [company.id, company.name]));

  const monthMap = new Map(monthlyRows.map((row) => [row.month, row]));
  const monthlySales = monthKeys(6).map((month) => {
    const row = monthMap.get(month);
    return {
      month,
      total: row ? Number(row.total).toFixed(2) : '0.00',
      count: row?.count ?? 0,
    };
  });

  const salesByCurrency = salesByCurrencyRows
    .map((row) => ({
      currency: row.currency,
      total: Number(row._sum.amount ?? 0).toFixed(2),
      count: row._count._all,
    }))
    .sort((a, b) => a.currency.localeCompare(b.currency));

  const closedTotal = wonOpportunities + lostOpportunities;

  return {
    defaultCurrency: env.DEFAULT_CURRENCY,
    totals: {
      companies: companiesTotal,
      activeCompanies,
      clients: clientsTotal,
      openOpportunities,
      openValue: Number(openValueAgg._sum.value ?? 0).toFixed(2),
      confirmedSales,
      wonOpportunities,
      lostOpportunities,
      conversionRate:
        closedTotal > 0
          ? Number(((wonOpportunities / closedTotal) * 100).toFixed(1))
          : null,
      salesByCurrency,
    },
    charts: {
      monthlySales,
      opportunitiesByStage: opportunitiesByStage.map((row) => ({
        stage: row.stage,
        count: row._count._all,
        value: Number(row._sum.value ?? 0).toFixed(2),
      })),
      clientsByCompany: [
        ...clientsByCompanyRows.map((row) => ({
          companyId: row.companyId,
          company:
            (row.companyId ? companyNameById.get(row.companyId) : null) ??
            'Sin empresa',
          count: row._count._all,
        })),
        ...(clientsWithoutCompany > 0
          ? [{ companyId: null, company: 'Sin empresa', count: clientsWithoutCompany }]
          : []),
      ],
      companiesBySector: [
        ...companiesBySectorRows.map((row) => ({
          sector: row.sector ?? 'Sin sector',
          count: row._count._all,
        })),
        ...(companiesWithoutSector > 0
          ? [{ sector: 'Sin sector', count: companiesWithoutSector }]
          : []),
      ],
    },
    recentActivity,
    recentOpportunities,
    recentSales,
  };
};
