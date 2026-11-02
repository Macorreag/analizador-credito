import { useState } from 'react';
import { formatCOP, formatCompactCOP } from '../../lib/format';
import { CHART_COLORS, buildTicks, clamp, niceMax } from './chartUtils';

export interface CompositionDatum {
  label: string;
  sublabel?: string;
  interest: number;
  principal: number;
  extra: number;
  other: number;
  total: number;
}

const WIDTH = 760;
const HEIGHT = 270;
const MARGIN = { top: 18, right: 14, bottom: 32, left: 62 };
const INNER_W = WIDTH - MARGIN.left - MARGIN.right;
const INNER_H = HEIGHT - MARGIN.top - MARGIN.bottom;

const SERIES = [
  { key: 'interest' as const, label: 'Interés', color: CHART_COLORS.rust },
  { key: 'principal' as const, label: 'Capital', color: CHART_COLORS.gold },
  { key: 'extra' as const, label: 'Abono', color: CHART_COLORS.tealBright },
  { key: 'other' as const, label: 'Otros costos', color: CHART_COLORS.steel },
];

export function CompositionChart({ data }: { data: CompositionDatum[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const yMax = niceMax(Math.max(...data.map((item) => item.total), 1));
  const yTicks = buildTicks(yMax, 4);
  const band = INNER_W / Math.max(data.length, 1);
  const barWidth = Math.max(3, Math.min(24, band * 0.62));

  const y = (value: number): number =>
    MARGIN.top + INNER_H - (clamp(value, 0, yMax) / yMax) * INNER_H;

  const labelEvery = data.length > 24 ? Math.ceil(data.length / 12) : data.length > 12 ? 2 : 1;

  const hoverDatum = hover != null ? data[hover] : null;
  const tooltipLeft =
    hover != null ? clamp(((MARGIN.left + band * (hover + 0.5)) / WIDTH) * 100, 18, 82) : 50;

  return (
    <div>
      <div className="chart-legend" aria-hidden="true">
        {SERIES.map((serie) => (
          <span className="legend-item" key={serie.key}>
            <span className="dot" style={{ color: serie.color }} /> {serie.label}
          </span>
        ))}
      </div>
      <div className="chart-wrap" style={{ marginTop: 10 }}>
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label="Composición de cada pago: interés, capital, abonos y otros costos."
          onPointerLeave={() => setHover(null)}
        >
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

          {data.map((item, index) => {
            const x = MARGIN.left + band * index + (band - barWidth) / 2;
            let offset = 0;
            const isHovered = hover === index;
            return (
              <g
                key={`${item.label}-${index}`}
                onPointerEnter={() => setHover(index)}
                style={{ cursor: 'default' }}
              >
                <rect
                  x={MARGIN.left + band * index}
                  y={MARGIN.top}
                  width={band}
                  height={INNER_H}
                  fill={isHovered ? 'rgba(255,255,255,0.035)' : 'transparent'}
                />
                {SERIES.map((serie) => {
                  const value = item[serie.key];
                  const height = (value / yMax) * INNER_H;
                  const rectY = MARGIN.top + INNER_H - offset - height;
                  offset += height;
                  if (value <= 0) return null;
                  return (
                    <rect
                      key={serie.key}
                      x={x}
                      y={rectY}
                      width={barWidth}
                      height={Math.max(0.7, height)}
                      fill={serie.color}
                      opacity={isHovered ? 1 : 0.82}
                      rx={1.5}
                    />
                  );
                })}
                {index % labelEvery === 0 || index === data.length - 1 ? (
                  <text
                    x={MARGIN.left + band * (index + 0.5)}
                    y={HEIGHT - 11}
                    textAnchor="middle"
                    className="chart-axis-label"
                  >
                    {item.label}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>

        {hoverDatum ? (
          <div
            className="chart-tooltip"
            style={{ left: `${tooltipLeft}%`, top: 4 }}
            aria-hidden="true"
          >
            <div className="chart-tooltip-head">
              <span>{hoverDatum.label}</span>
              <span>{hoverDatum.sublabel ?? ''}</span>
            </div>
            {SERIES.map((serie) => (
              <div className="chart-tooltip-row" key={serie.key}>
                <span>{serie.label}</span>
                <b>{formatCOP(hoverDatum[serie.key])}</b>
              </div>
            ))}
            <div className="chart-tooltip-row chart-tooltip-row--total">
              <span>Total del mes</span>
              <b>{formatCOP(hoverDatum.total)}</b>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
