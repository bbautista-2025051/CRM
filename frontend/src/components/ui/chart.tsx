import * as React from 'react';
import { ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/cn';

export interface ChartConfigItem {
  label?: React.ReactNode;
  icon?: React.ComponentType;
  color?: string;
  theme?: Record<string, string>;
}

export type ChartConfig = Record<string, ChartConfigItem>;

const ChartContext = React.createContext<{ config: ChartConfig } | null>(null);

export function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error('useChart must be used within a <ChartContainer />');
  }
  return context;
}

export const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> & {
    config: ChartConfig;
    children: React.ComponentProps<typeof ResponsiveContainer>['children'];
  }
>(({ id, className, children, config, ...props }, ref) => {
  const chartId = React.useId();
  const idValue = id || chartId.replace(/:/g, '');

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={idValue}
        ref={ref}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-line/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-line [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-line",
          className,
        )}
        {...props}
      >
        <ChartStyle id={idValue} config={config} />
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
});
ChartContainer.displayName = 'ChartContainer';

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(
    ([, configItem]) => configItem.theme || configItem.color,
  );

  if (!colorConfig.length) {
    return null;
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(config)
          .map(([key, item]) => {
            const color = item.color || item.theme?.light;
            return color ? `[data-chart="${id}"] { --color-${key}: ${color}; }` : '';
          })
          .join('\n'),
      }}
    />
  );
};

export const ChartTooltip = () => {
  return null;
};

export const ChartTooltipContent = ({
  active,
  payload,
  label,
  className,
}: any) => {
  const { config } = useChart();

  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div
      className={cn(
        'grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-line bg-surface p-2.5 text-xs shadow-md',
        className,
      )}
    >
      {label && <div className="font-medium text-ink">{label}</div>}
      <div className="grid gap-1">
        {payload.map((item: any, index: number) => {
          const key = item.dataKey || item.name;
          const conf = config[key];
          return (
            <div
              key={index}
              className="flex w-full items-center justify-between gap-2 text-ink"
            >
              <div className="flex items-center gap-1.5 text-muted">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: item.color || item.fill || conf?.color,
                  }}
                />
                <span>{conf?.label || item.name || key}</span>
              </div>
              <span className="font-mono font-medium tabular-nums text-ink">
                {item.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const ChartLegend = () => null;

export const ChartLegendContent = ({ payload, className }: any) => {
  const { config } = useChart();

  if (!payload?.length) {
    return null;
  }

  return (
    <div className={cn('flex items-center justify-center gap-4 pt-2', className)}>
      {payload.map((item: any, index: number) => {
        const key = item.dataKey || item.value;
        const conf = config[key];
        return (
          <div key={index} className="flex items-center gap-1.5 text-xs text-muted">
            <div
              className="h-2 w-2 rounded-full"
              style={{
                backgroundColor: item.color || conf?.color,
              }}
            />
            <span>{conf?.label || item.value || key}</span>
          </div>
        );
      })}
    </div>
  );
};
