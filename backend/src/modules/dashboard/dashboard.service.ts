import { Prisma } from '@prisma/client';
import { env } from '../../config/env';
import { prisma } from '../../config/prisma';

interface MonthlySalesRow {
  month: string;
  total: string;
  count: number;
}

interface DashboardFilters {
  role?: 'ADMIN' | 'VENDEDOR';
  userId?: string;
  month?: string | number;
  year?: string | number;
}

const normalizeYear = (value?: string | number): number => {
  const numeric = Number(value ?? new Date().getUTCFullYear());
  return Number.isFinite(numeric) ? numeric : new Date().getUTCFullYear();
};

const normalizeMonth = (value?: string | number): number | null => {
  if (value === undefined || value === null || value === '' || value === 'all') return null;
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 1 || numeric > 12) return null;
  return numeric;
};

const monthKeys = (year: number, selectedMonth?: number | null): string[] => {
  if (selectedMonth) {
    return [`${year}-${String(selectedMonth).padStart(2, '0')}`];
  }

  const keys: string[] = [];
  for (let month = 1; month <= 12; month += 1) {
    keys.push(`${year}-${String(month).padStart(2, '0')}`);
  }
  return keys;
};

const buildDateRange = (year: number, month?: number | null) => {
  if (month) {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));
    return { start, end };
  }

  return {
    start: new Date(Date.UTC(year, 0, 1)),
    end: new Date(Date.UTC(year + 1, 0, 1)),
  };
};

const buildSalesWhere = (
  ownerIds: string[],
  selectedYear: number,
  selectedMonth: number | null,
) => {
  const dateRange = buildDateRange(selectedYear, selectedMonth);
  const where: Record<string, unknown> = {
    status: 'CONFIRMED',
    saleDate: { gte: dateRange.start, lt: dateRange.end },
    ...(ownerIds.length ? { ownerId: { in: ownerIds } } : {}),
  };
  return where;
};

const buildOwnerScope = async (filters: DashboardFilters) => {
  const userIds = new Set<string>();

  if (filters.userId) {
    userIds.add(filters.userId);
  } else if (filters.role) {
    const users = await prisma.user.findMany({
      where: { role: filters.role },
      select: { id: true },
    });
    users.forEach((user) => userIds.add(user.id));
  }

  return Array.from(userIds);
};

export const getDashboard = async (filters: DashboardFilters = {}) => {
  const year = normalizeYear(filters.year);
  const month = normalizeMonth(filters.month);
  const ownerIds = await buildOwnerScope(filters);
  const salesDateRange = buildDateRange(year, month);
  const ownerScope = ownerIds.length ? { ownerId: { in: ownerIds } } : {};
  const activityScope = ownerIds.length
    ? { userId: { in: ownerIds } }
    : filters.userId
      ? { userId: filters.userId }
      : {};

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
    prisma.company.count({
      where: filters.userId ? { createdById: filters.userId } : filters.role ? { createdById: { not: null } } : undefined,
    }),
    prisma.company.count({
      where: {
        status: 'ACTIVE',
        ...(filters.userId ? { createdById: filters.userId } : filters.role ? { createdById: { not: null } } : {}),
      },
    }),
    prisma.client.count({ where: { status: 'ACTIVE' } }),
    prisma.opportunity.count({
      where: {
        status: 'OPEN',
        ...ownerScope,
      },
    }),
    prisma.opportunity.aggregate({
      where: {
        status: 'OPEN',
        ...ownerScope,
      },
      _sum: { value: true },
    }),
    prisma.sale.count({
      where: {
        status: 'CONFIRMED',
        saleDate: { gte: salesDateRange.start, lt: salesDateRange.end },
        ...ownerScope,
      },
    }),
    prisma.opportunity.count({
      where: {
        status: 'WON',
        ...(month || year ? { wonAt: { gte: salesDateRange.start, lt: salesDateRange.end } } : {}),
        ...ownerScope,
      },
    }),
    prisma.opportunity.count({
      where: {
        status: 'LOST',
        ...(month || year ? { lostAt: { gte: salesDateRange.start, lt: salesDateRange.end } } : {}),
        ...ownerScope,
      },
    }),
    prisma.sale.groupBy({
      by: ['currency'],
      where: {
        status: 'CONFIRMED',
        saleDate: { gte: salesDateRange.start, lt: salesDateRange.end },
        ...ownerScope,
      },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.opportunity.groupBy({
      by: ['stage'],
      where: {
        ...ownerScope,
        ...(month || year ? { createdAt: { gte: salesDateRange.start, lt: salesDateRange.end } } : {}),
      },
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
        AND currency = ${env.DEFAULT_CURRENCY}
        AND sale_date >= ${salesDateRange.start.toISOString().slice(0, 10)}::date
        AND sale_date < ${salesDateRange.end.toISOString().slice(0, 10)}::date
        ${
          ownerIds.length
            ? Prisma.sql`AND owner_id IN (${Prisma.join(
                ownerIds.map((id) => Prisma.sql`${id}::uuid`),
              )})`
            : Prisma.empty
        }
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
      where: activityScope,
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    }),
    prisma.opportunity.findMany({
      take: 5,
      where: {
        ...ownerScope,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        company: { select: { id: true, name: true } },
        client: { select: { id: true, firstName: true, lastName: true } },
        owner: { select: { id: true, name: true } },
      },
    }),
    prisma.sale.findMany({
      take: 5,
      where: {
        ...ownerScope,
      },
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
  const monthlySales = monthKeys(year, month).map((monthKey) => {
    const row = monthMap.get(monthKey);
    return {
      month: monthKey,
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
            (row.companyId ? companyNameById.get(row.companyId) : null) ?? 'Sin empresa',
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
