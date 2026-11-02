import { formatCOP, formatPct } from '../../lib/format';

interface DonutDatum {
  label: string;
  value: number;
  color: string;
}

export function CostDonut({
  principal,
  interest,
  insurance,
  fees,
  gmf,
}: {
  principal: number;
  interest: number;
  insurance: number;
  fees: number;
  gmf: number;
}) {
  const data: DonutDatum[] = [
    { label: 'Capital', value: principal, color: '#7E93A0' },
    { label: 'Intereses', value: interest, color: '#C06A45' },
    { label: 'Seguros', value: insurance, color: '#C9A227' },
    { label: 'Comisiones', value: fees, color: '#8FA35A' },
    { label: 'GMF', value: gmf, color: '#5E7C8A' },
  ].filter((item) => item.value > 0);
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="donut-layout">
      <div className="donut-figure">
        <svg
          viewBox="0 0 200 200"
          role="img"
          aria-label={`Distribución de ${formatCOP(total)} pagados entre capital, intereses y costos.`}
        >
          <circle cx="100" cy="100" r={radius} fill="none" stroke="#2B3438" strokeWidth="22" />
          {data.map((item) => {
            const fraction = item.value / total;
            const length = Math.max(0, circumference * fraction - 2.2);
            const dashOffset = -offset;
            offset += circumference * fraction;
            return (
              <circle
                key={item.label}
                cx="100"
                cy="100"
                r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth="22"
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={dashOffset}
                transform="rotate(-90 100 100)"
              />
            );
          })}
          <text
            x="100"
            y="92"
            textAnchor="middle"
            fill="#98A29D"
            fontFamily="IBM Plex Mono, monospace"
            fontSize="8"
          >
            TOTAL PAGADO
          </text>
          <text
            x="100"
            y="112"
            textAnchor="middle"
            fill="#F1EFE8"
            fontFamily="Fraunces Variable, serif"
            fontSize="18"
            fontWeight="600"
          >
            {formatCOP(total).replace(/\s/g, '')}
          </text>
          <text
            x="100"
            y="128"
            textAnchor="middle"
            fill="#98A29D"
            fontFamily="IBM Plex Mono, monospace"
            fontSize="7"
          >
            capital + costo
          </text>
        </svg>
      </div>
      <ul className="donut-legend">
        {data.map((item) => (
          <li key={item.label}>
            <span className="dot" style={{ color: item.color }} />
            <span className="donut-label">{item.label}</span>
            <span className="donut-value num">{formatCOP(item.value)}</span>
            <span className="donut-pct num">{formatPct((item.value / total) * 100, 1)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
