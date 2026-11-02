import { useMemo } from 'react';
import type { AffordabilityInput, AffordabilityResult } from '../lib/affordability';
import { computeLoan, type LoanAnalysis, type LoanConfig } from '../lib/credit';
import { formatCOP, formatMonths, formatNumber, formatPct } from '../lib/format';
import type { AbonoLadder, RateTermGrid } from '../lib/sensitivity';
import { RateTermHeatmap } from './charts/RateTermHeatmap';
import { Badge, Callout, Card, SectionHead } from './ui';
import { ArrowRightIcon, InfoIcon, PercentIcon, SparkIcon } from './icons';
import type { TabId } from './tabsMeta';

export function SensitivityPanel({
  config,
  analysis,
  grid,
  ladder,
  affordability,
  affordabilityResult,
  onApplyGrid,
  onApplyLadder,
  onNavigate,
  onNotify,
}: {
  config: LoanConfig;
  analysis: LoanAnalysis;
  grid: RateTermGrid;
  ladder: AbonoLadder;
  affordability: AffordabilityInput;
  affordabilityResult: AffordabilityResult;
  onApplyGrid: (ratePct: number, termMonths: number) => void;
  onApplyLadder: (monthlyExtra: number) => void;
  onNavigate: (tab: TabId) => void;
  onNotify: (message: string) => void;
}) {
  const stress = useMemo(
    () =>
      [0, 1, 2, 4].map((pp) => ({
        pp,
        rate: config.annualRatePct + pp,
        analysis: computeLoan({ ...config, annualRatePct: config.annualRatePct + pp }),
      })),
    [config],
  );

  const hasIncome = affordabilityResult.monthlyIncome > 0;
  const maxLadderSaving = Math.max(...ladder.rows.map((row) => row.interestSaved), 1);
  const selectedStress = affordability.stressBps / 100;

  return (
    <div className="content-panel">
      <Card className="card--pad">
        <div className="card-head">
          <div>
            <div className="card-title">Qué mueve la aguja</div>
            <div className="card-sub">
              Tres lecturas para decidir con evidencia: tasa y plazo, abonos mensuales y resistencia
              a una subida de tasa.
            </div>
          </div>
          <Badge tone="teal">
            <SparkIcon size={11} /> Simulación
          </Badge>
        </div>
        <Callout tone="neutral" title="Esto no es una predicción" icon={<InfoIcon size={15} />}>
          La sensibilidad muestra cuánto pesa cada variable{' '}
          <strong>si todo lo demás queda igual</strong>. Sirve para negociar y priorizar, no para
          adivinar el futuro.
        </Callout>
      </Card>

      <section className="section" aria-labelledby="heat-title">
        <SectionHead
          kicker="01 · Tasa × plazo"
          title="El mapa del interés"
          description="Cada celda es el interés total del crédito sin abonos. Toca una para aplicarla al plan."
          id="heat-title"
          actions={
            <span className="badge badge--gold">
              <PercentIcon size={10} /> tasa actual {formatPct(config.annualRatePct, 2)} EA
            </span>
          }
        />
        <Card className="card--pad">
          <RateTermHeatmap
            grid={grid}
            onSelect={(rate, term) => {
              onApplyGrid(rate, term);
              onNotify(`Escenario aplicado: ${formatPct(rate, 2)} EA y ${term} meses.`);
            }}
          />
        </Card>
      </section>

      <section className="section" aria-labelledby="ladder-title">
        <SectionHead
          kicker="02 · Abono mensual"
          title="La escalera de abonos"
          description="Un abono mensual extra, desde el mes 1, reemplazando tu plan actual de abonos. Mira el ahorro marginal de cada escalón."
          id="ladder-title"
        />
        <Card className="card--pad">
          {ladder.rows.length === 0 ? (
            <p className="table-note">No se pudo calcular la escalera con esta configuración.</p>
          ) : (
            <div className="table-scroll" style={{ maxHeight: 'none' }}>
              <table className="ladder-table">
                <caption className="sr-only">
                  Ahorro de intereses con distintos abonos mensuales recurrentes.
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Abono mensual</th>
                    <th scope="col">Interés total</th>
                    <th scope="col">Ahorro</th>
                    <th scope="col">Plazo</th>
                    <th scope="col">Meses menos</th>
                    <th scope="col">Por peso abonado</th>
                    <th scope="col">
                      <span className="sr-only">Acción</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ladder.rows.map((row) => (
                    <tr
                      key={row.monthlyExtra}
                      className={row.monthlyExtra === 0 ? 'is-base-row' : ''}
                    >
                      <td>{row.monthlyExtra === 0 ? 'Sin abono' : formatCOP(row.monthlyExtra)}</td>
                      <td>{formatCOP(row.analysis.totalInterest)}</td>
                      <td className="cell-teal">
                        {row.interestSaved > 0 ? `+${formatCOP(row.interestSaved)}` : '—'}
                        <span className="ladder-bar" aria-hidden="true">
                          <span className="ladder-track">
                            <span
                              className="ladder-fill"
                              style={{ width: `${(row.interestSaved / maxLadderSaving) * 100}%` }}
                            />
                          </span>
                        </span>
                      </td>
                      <td>{formatMonths(row.analysis.months)}</td>
                      <td>{row.monthsSaved > 0 ? `${row.monthsSaved}` : '—'}</td>
                      <td>{row.totalExtra > 0 ? `×${formatNumber(row.savedPerExtra, 2)}` : '—'}</td>
                      <td>
                        {row.monthlyExtra > 0 ? (
                          <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            onClick={() => {
                              onApplyLadder(row.monthlyExtra);
                              onNotify(
                                `Plan de abonos reemplazado por ${formatCOP(row.monthlyExtra)} mensuales.`,
                              );
                            }}
                          >
                            Usar <ArrowRightIcon size={10} />
                          </button>
                        ) : (
                          <span className="tiny">actual</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="table-note">
            “Por peso abonado” es el ahorro nominal de intereses por cada peso extra. Puede superar
            1× porque un peso abonado hoy evita intereses durante muchos meses.
          </p>
        </Card>
      </section>

      <section className="section" aria-labelledby="stress-title">
        <SectionHead
          kicker="03 · Estrés"
          title="Si la tasa sube"
          description="Tu cuota y tu DTI con la misma deuda, pero a tasas más altas. Un colchón de 2 puntos es una prueba razonable."
          id="stress-title"
        />
        <Card>
          <div className="table-scroll" style={{ maxHeight: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Escenario</th>
                  <th scope="col">Tasa EA</th>
                  <th scope="col">Cuota máxima</th>
                  <th scope="col">Δ cuota</th>
                  {hasIncome ? <th scope="col">DTI</th> : null}
                  <th scope="col">Interés total</th>
                </tr>
              </thead>
              <tbody>
                {stress.map((row) => (
                  <tr key={row.pp} className={selectedStress === row.pp ? 'row-extra' : ''}>
                    <td>
                      {row.pp === 0 ? (
                        <span className="cell-strong">Hoy</span>
                      ) : (
                        <>
                          +{row.pp} pp{' '}
                          {selectedStress === row.pp ? <Badge tone="teal">tu estrés</Badge> : null}
                        </>
                      )}
                    </td>
                    <td>{formatPct(row.rate, 2)}</td>
                    <td className="cell-strong">{formatCOP(row.analysis.maxPayment)}</td>
                    <td className={row.pp === 0 ? 'cell-muted' : 'cell-rust'}>
                      {row.pp === 0
                        ? '—'
                        : `+${formatCOP(row.analysis.maxPayment - analysis.maxPayment)}`}
                    </td>
                    {hasIncome ? (
                      <td>
                        {formatPct(
                          ((row.analysis.maxPayment + affordabilityResult.otherMonthlyDebt) /
                            affordabilityResult.monthlyIncome) *
                            100,
                          1,
                        )}
                      </td>
                    ) : null}
                    <td>{formatCOP(row.analysis.totalInterest)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <p className="table-note">
          El estrés solo mueve la tasa. Si quieres probar una caída de ingresos o un cambio de
          empleo, usa la pestaña <strong>Capacidad</strong> y baja el ingreso.
        </p>
      </section>

      <div style={{ marginTop: 18 }}>
        <Callout
          tone={affordabilityResult.investAdvice === 'prepay' ? 'teal' : 'gold'}
          title="Abonar o invertir, en una línea"
          icon={<InfoIcon size={15} />}
        >
          Abonar rinde implícitamente <strong>{formatPct(analysis.annualRatePct, 2)} EA</strong>{' '}
          libre de riesgo. Tu alternativa declarada rinde{' '}
          <strong>
            {affordability.investmentEaPct > 0
              ? formatPct(affordability.investmentEaPct, 2)
              : 'sin dato'}
          </strong>
          .
          <button type="button" className="btn btn--quiet" onClick={() => onNavigate('capacidad')}>
            Ajustar en Capacidad <ArrowRightIcon size={10} />
          </button>
        </Callout>
      </div>
    </div>
  );
}
