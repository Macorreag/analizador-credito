import { useMemo, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { ExtraPayment, PaymentRow } from '../../lib/credit';
import { formatCOP, formatCompactCOP, formatMonthLabel } from '../../lib/format';
import { CHART_COLORS, areaPath, buildTicks, clamp, linePath, niceMax } from './chartUtils';

const WIDTH = 760;
const HEIGHT = 300;
const MARGIN = { top: 18, right: 18, bottom: 34, left: 62 };
const INNER_W = WIDTH - MARGIN.left - MARGIN.right;
const INNER_H = HEIGHT - MARGIN.top - MARGIN.bottom;

export function BalanceChart({
  rows,
  baselineRows,
  principal,
  startDate,
  extras,
  onMonthClick,
}: {
  rows: PaymentRow[];
  baselineRows: PaymentRow[];
  principal: number;
  startDate: string | null;
  extras: ExtraPayment[];
  onMonthClick?: (month: number) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const maxMonths = Math.max(rows.length, baselineRows.length, 1);
  const maxBalance = Math.max(
    principal,
    ...rows.map((row) => row.balance),
    ...baselineRows.map((row) => row.balance),
    1,
  );
  const yMax = niceMax(maxBalance);
  const yTicks = buildTicks(yMax, 4);

  const x = (month: number): number => {
    if (maxMonths === 1) return MARGIN.left + INNER_W / 2;
    return MARGIN.left + ((month - 1) / (maxMonths - 1)) * INNER_W;
  };
  const y = (value: number): number =>
    MARGIN.top + INNER_H - (clamp(value, 0, yMax) / yMax) * INNER_H;

  const currentPoints = rows.map((row) => [x(row.month), y(row.balance)] as [number, number]);
  const basePoints = baselineRows.map((row) => [x(row.month), y(row.balance)] as [number, number]);

  const xTicks = useMemo(() => {
    if (maxMonths <= 8) return Array.from({ length: maxMonths }, (_, index) => index + 1);
    return [
      ...new Set(
        Array.from({ length: 7 }, (_, index) => Math.round(1 + ((maxMonths - 1) * index) / 6)),
      ),
    ];
  }, [maxMonths]);

  const markers = useMemo(() => {
    const map = new Map<number, 'once' | 'recurring'>();
    for (const extra of extras) {
      if (extra.amount <= 0) continue;
      const month = Math.max(1, Math.round(extra.fromMonth));
      if (month > rows.length) continue;
      const type = extra.frequency === 'once' ? 'once' : 'recurring';
      const current = map.get(month);
      if (current !== 'once') map.set(month, type);
    }
    return [...map.entries()];
  }, [extras, rows.length]);

  function monthFromPointer(event: ReactPointerEvent<SVGSVGElement>): number {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * WIDTH;
    const ratio = clamp((px - MARGIN.left) / INNER_W, 0, 1);
    return clamp(Math.round(ratio * (maxMonths - 1)) + 1, 1, maxMonths);
  }

  const hoverRow = hover != null ? rows[hover - 1] : null;
  const hoverBase = hover != null ? baselineRows[hover - 1] : null;
  const tooltipLeft = hover != null ? clamp((x(hover) / WIDTH) * 100, 16, 84) : 50;

  return (
    <div>
      <div className="chart-legend" aria-hidden="true">
        <span className="legend-item">
          <span className="dot dot--gold" /> Sin abonos
        </span>
        <span className="legend-item">
          <span className="dot dot--teal" /> Con tu plan
        </span>
        {markers.length > 0 ? (
          <span className="legend-item">
            <span
              className="dot dot--teal"
              style={{ boxShadow: '0 0 0 3px rgba(62,156,143,.15)' }}
            />{' '}
            Abono
          </span>
        ) : null}
      </div>
      <div className="chart-wrap" style={{ marginTop: 10 }}>
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          tabIndex={onMonthClick ? 0 : -1}
          aria-label={
            onMonthClick
              ? `Saldo del crédito mes a mes. Con tu plan termina en ${rows.length} meses; sin abonos, en ${baselineRows.length}. Usa las flechas para explorar y Enter para simular un abono.`
              : `Saldo del crédito mes a mes. Con tu plan termina en ${rows.length} meses; sin abonos, en ${baselineRows.length}.`
          }
          style={{ cursor: onMonthClick ? 'pointer' : 'default' }}
          onPointerMove={(event) => setHover(monthFromPointer(event))}
          onPointerLeave={() => setHover(null)}
          onClick={() => {
            if (hover != null && onMonthClick) onMonthClick(hover);
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
              event.preventDefault();
              const direction = event.key === 'ArrowRight' ? 1 : -1;
              setHover((current) => clamp((current ?? 1) + direction, 1, maxMonths));
            } else if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              if (hover != null && onMonthClick) onMonthClick(hover);
            } else if (event.key === 'Escape') {
              setHover(null);
            }
          }}
          onBlur={() => setHover(null)}
        >
          <defs>
            <linearGradient id="balance-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.teal} stopOpacity="0.24" />
              <stop offset="100%" stopColor={CHART_COLORS.teal} stopOpacity="0" />
            </linearGradient>
          </defs>

          {yTicks.map((tick) => (
            <g key={`y-${tick}`}>
              <line
                x1={MARGIN.left}
                y1={y(tick)}
                x2={WIDTH - MARGIN.right}
                y2={y(tick)}
                className="chart-grid-line"
              />
              <text
                x={MARGIN.left - 9}
                y={y(tick) + 3}
                textAnchor="end"
                className="chart-axis-label"
              >
                {tick === 0 ? '$0' : formatCompactCOP(tick)}
              </text>
            </g>
          ))}

          {xTicks.map((month) => (
            <g key={`x-${month}`}>
              <line
                x1={x(month)}
                y1={MARGIN.top}
                x2={x(month)}
                y2={MARGIN.top + INNER_H}
                stroke={CHART_COLORS.line}
                strokeOpacity="0.45"
              />
              <text x={x(month)} y={HEIGHT - 12} textAnchor="middle" className="chart-axis-label">
                {month}
              </text>
            </g>
          ))}
          <text
            x={WIDTH - MARGIN.right}
            y={HEIGHT - 1}
            textAnchor="end"
            className="chart-axis-title"
          >
            Mes
          </text>

          <path d={areaPath(currentPoints, MARGIN.top + INNER_H)} fill="url(#balance-fill)" />
          <path
            d={linePath(basePoints)}
            className="chart-line chart-line--base"
            stroke={CHART_COLORS.gold}
          />
          <path
            d={linePath(currentPoints)}
            className="chart-line"
            stroke={CHART_COLORS.tealBright}
          />

          {markers.map(([month, type]) => {
            const row = rows[month - 1];
            if (!row) return null;
            return (
              <circle
                key={`marker-${month}`}
                cx={x(month)}
                cy={y(row.balance)}
                r={type === 'once' ? 5 : 6}
                fill={type === 'once' ? CHART_COLORS.tealBright : CHART_COLORS.bg}
                stroke={type === 'once' ? CHART_COLORS.bg : CHART_COLORS.tealBright}
                strokeWidth="2.2"
              />
            );
          })}

          {hover != null && hoverRow ? (
            <g>
              <line
                x1={x(hover)}
                y1={MARGIN.top}
                x2={x(hover)}
                y2={MARGIN.top + INNER_H}
                className="chart-cursor"
              />
              <circle
                cx={x(hover)}
                cy={y(hoverRow.balance)}
                r="5"
                fill={CHART_COLORS.tealBright}
                stroke={CHART_COLORS.bg}
                strokeWidth="2"
              />
              {hoverBase ? (
                <circle
                  cx={x(hover)}
                  cy={y(hoverBase.balance)}
                  r="4"
                  fill={CHART_COLORS.gold}
                  stroke={CHART_COLORS.bg}
                  strokeWidth="2"
                />
              ) : null}
            </g>
          ) : null}
        </svg>

        {hover != null && hoverRow ? (
          <div
            className="chart-tooltip"
            style={{ left: `${tooltipLeft}%`, top: 4 }}
            aria-hidden="true"
          >
            <div className="chart-tooltip-head">
              <span>Mes {hover}</span>
              <span>{startDate ? formatMonthLabel(startDate, hover) : 'Pago'}</span>
            </div>
            <div className="chart-tooltip-row">
              <span>Con tu plan</span>
              <b>{formatCOP(hoverRow.balance)}</b>
            </div>
            {hoverBase ? (
              <div className="chart-tooltip-row">
                <span>Sin abonos</span>
                <b>{formatCOP(hoverBase.balance)}</b>
              </div>
            ) : null}
            {hoverRow.extra > 0 ? (
              <div className="chart-tooltip-row">
                <span>Abono del mes</span>
                <b className="cell-teal">{formatCOP(hoverRow.extra)}</b>
              </div>
            ) : null}
            <div className="chart-tooltip-row chart-tooltip-row--total">
              <span>Diferencia</span>
              <b>{formatCOP((hoverBase?.balance ?? 0) - hoverRow.balance)}</b>
            </div>
          </div>
        ) : null}
      </div>
      {onMonthClick ? (
        <p className="chart-hint">
          <strong>Haz clic en cualquier mes</strong> (o usa las flechas y Enter) para simular un
          abono en ese punto.
        </p>
      ) : null}
    </div>
  );
}
