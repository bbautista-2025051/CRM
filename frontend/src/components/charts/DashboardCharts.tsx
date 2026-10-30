import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartNoAxesCombined, PieChart as PieIcon } from 'lucide-react';
import type { DashboardData, OpportunityStage } from '@/types';
import { formatCompactMoney, formatMoney, formatNumber } from '@/lib/format';
import { STAGE_BAR_COLORS, STAGE_LABELS, STAGE_ORDER } from '@/lib/labels';
import { EmptyState } from '@/components/ui/EmptyState';

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid rgb(var(--line))',
  background: 'rgb(var(--surface))',
  boxShadow: '0 12px 32px -12px rgb(15 23 42 / 0.22)',
  fontSize: 12,
  color: 'rgb(var(--ink))',
  padding: '10px 12px',
};

const monthLabel = (month: string): string => {
  const [year, monthNumber] = month.split('-').map(Number);
  if (!year || !monthNumber) return month;
  return new Intl.DateTimeFormat('es-CO', { month: 'short' }).format(
    new Date(year, monthNumber - 1, 1),
  );
};

export const RevenueChart = ({
  data,
  currency,
}: {
  data: DashboardData['charts']['monthlySales'];
  currency: string;
}) => {
  const hasData = data.some((item) => Number(item.total) > 0);
  if (!hasData) {
    return (
      <EmptyState
        icon={ChartNoAxesCombined}
        title="Aún no hay ingresos confirmados"
        description="Cuando confirmes ventas verás aquí la evolución de los últimos 6 meses."
        compact
      />
    );
  }

  const chartData = data.map((item) => ({
    ...item,
    label: monthLabel(item.month),
    revenue: Number(item.total),
  }));

  return (
    <div className="h-[286px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 8, left: -14, bottom: 0 }}>
          <defs>
            <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tickMargin={10} />
          <YAxis
            axisLine={false}
            tickLine={false}
            tickFormatter={(value: number) => formatCompactMoney(value, currency)}
            width={74}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ stroke: 'rgb(var(--brand))', strokeDasharray: '4 4', strokeOpacity: 0.5 }}
            formatter={(value) => [formatMoney(String(value), currency), 'Ingresos']}
            labelFormatter={(label) => `Mes: ${String(label)}`}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#2563eb"
            strokeWidth={2.5}
            fill="url(#revenue-fill)"
            activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export const StageChart = ({
  data,
}: {
  data: DashboardData['charts']['opportunitiesByStage'];
}) => {
  const byStage = new Map(data.map((item) => [item.stage, item]));
  const chartData = STAGE_ORDER.map((stage) => {
    const item = byStage.get(stage);
    return {
      stage,
      label: STAGE_LABELS[stage],
      count: item?.count ?? 0,
      value: item?.value ?? '0.00',
    };
  });
  const hasData = chartData.some((item) => item.count > 0);

  if (!hasData) {
    return (
      <EmptyState
        icon={ChartNoAxesCombined}
        title="Sin oportunidades todavía"
        description="Crea tu primera oportunidad para ver el embudo por etapa."
        compact
      />
    );
  }

  return (
    <div className="h-[286px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 12, left: 4, bottom: 0 }}
          barCategoryGap={10}
        >
          <CartesianGrid strokeDasharray="4 4" horizontal={false} />
          <XAxis type="number" axisLine={false} tickLine={false} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="label"
            axisLine={false}
            tickLine={false}
            width={82}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ fill: 'rgb(var(--muted) / 0.08)' }}
            formatter={(value, _name, item) => {
              const payload = item?.payload as { value?: string } | undefined;
              return [
                `${formatNumber(Number(value))} · ${formatMoney(payload?.value ?? '0')}`,
                'Oportunidades',
              ];
            }}
          />
          <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={22}>
            {chartData.map((item) => (
              <Cell key={item.stage} fill={STAGE_BAR_COLORS[item.stage as OpportunityStage]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const ClientsChart = ({
  data,
}: {
  data: DashboardData['charts']['clientsByCompany'];
}) => {
  if (data.length === 0) {
    return (
      <EmptyState
        icon={ChartNoAxesCombined}
        title="Sin clientes activos"
        description="Asocia clientes a empresas para ver su distribución."
        compact
      />
    );
  }

  const chartData = data.slice(0, 6).map((item) => ({
    name: item.company.length > 22 ? `${item.company.slice(0, 21)}…` : item.company,
    count: item.count,
  }));

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 4, bottom: 0 }}
          barCategoryGap={10}
        >
          <CartesianGrid strokeDasharray="4 4" horizontal={false} />
          <XAxis type="number" axisLine={false} tickLine={false} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="name"
            axisLine={false}
            tickLine={false}
            width={122}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ fill: 'rgb(var(--muted) / 0.08)' }}
            formatter={(value) => [formatNumber(Number(value)), 'Clientes']}
          />
          <Bar dataKey="count" fill="#0d9488" radius={[0, 6, 6, 0]} maxBarSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const SECTOR_COLORS = ['#2563eb', '#0d9488', '#6366f1', '#f59e0b', '#f43f5e', '#06b6d4', '#8b5cf6'];

export const SectorChart = ({
  data,
}: {
  data: DashboardData['charts']['companiesBySector'];
}) => {
  if (data.length === 0) {
    return (
      <EmptyState
        icon={PieIcon}
        title="Sin sectores registrados"
        description="Añade el sector a tus empresas para segmentar la cartera."
        compact
      />
    );
  }

  const total = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="h-[210px] w-[210px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="sector"
              innerRadius={56}
              outerRadius={86}
              paddingAngle={3}
              strokeWidth={0}
            >
              {data.map((item, index) => (
                <Cell key={item.sector} fill={SECTOR_COLORS[index % SECTOR_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value, name) => [
                `${formatNumber(Number(value))} (${formatNumber((Number(value) / Math.max(total, 1)) * 100, 0)}%)`,
                String(name),
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="w-full min-w-0 space-y-2">
        {data.slice(0, 6).map((item, index) => (
          <li key={item.sector} className="flex items-center gap-2 text-xs">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: SECTOR_COLORS[index % SECTOR_COLORS.length] }}
            />
            <span className="min-w-0 flex-1 truncate text-muted">{item.sector}</span>
            <span className="font-semibold text-ink">{item.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
