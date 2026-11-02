import { formatPct } from '../../lib/format';

export function DtiGauge({
  dtiPct,
  limitPct,
  label = 'DTI total',
}: {
  dtiPct: number | null;
  limitPct: number;
  label?: string;
}) {
  if (dtiPct == null) {
    return (
      <p className="table-note">
        Ingresa tu ingreso mensual para calcular cuánto de él se lleva la deuda.
      </p>
    );
  }

  const scaleMax = Math.max(60, limitPct + 10, dtiPct + 5);
  const marker = (Math.min(dtiPct, scaleMax) / scaleMax) * 100;
  const limit = (Math.min(limitPct, scaleMax) / scaleMax) * 100;

  return (
    <div className="gauge">
      <div className="gauge-head">
        <div>
          <span className="eyebrow">{label}</span>
          <div className="gauge-value">
            {formatPct(dtiPct, 1)} <span>del ingreso</span>
          </div>
        </div>
        <span
          className={`badge ${dtiPct > limitPct ? 'badge--rust' : dtiPct > limitPct * 0.75 ? 'badge--gold' : 'badge--teal'}`}
        >
          {dtiPct > limitPct
            ? 'sobre el límite'
            : dtiPct > limitPct * 0.75
              ? 'ajustado'
              : 'con holgura'}
        </span>
      </div>
      <div
        className="gauge-track"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(dtiPct * 10) / 10}
        aria-label={`Deuda total sobre ingreso: ${formatPct(dtiPct, 1)}. Límite elegido: ${formatPct(limitPct, 1)}.`}
      >
        <span className="gauge-limit" style={{ left: `${limit}%` }} aria-hidden="true" />
        <span className="gauge-marker" style={{ left: `${marker}%` }} aria-hidden="true" />
      </div>
      <div className="gauge-labels">
        <span>0%</span>
        <span>{formatPct(limitPct, 0)} límite</span>
        <span>{formatPct(scaleMax, 0)}</span>
      </div>
    </div>
  );
}
