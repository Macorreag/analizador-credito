import type { AffordabilityInput, AffordabilityResult } from '../lib/affordability';
import type { LoanAnalysis, LoanConfig } from '../lib/credit';
import { formatCOP, formatMonths, formatNumber, formatPct, formatYearsMonths } from '../lib/format';
import type { Lever } from '../lib/levers';
import type { SavedScenario } from '../lib/scenarios';
import type { StrategyComparison, SystemComparisonRow } from '../lib/sensitivity';
import type { TabId } from './tabsMeta';
import { Badge, Callout, Card, EmptyState, Kpi, SectionHead } from './ui';
import { CostDonut } from './charts/CostDonut';
import {
  AlertIcon,
  ArrowRightIcon,
  CheckIcon,
  InfoIcon,
  LayersIcon,
  PercentIcon,
  ScalesIcon,
  SparkIcon,
  TrendDownIcon,
} from './icons';

interface Props {
  config: LoanConfig;
  analysis: LoanAnalysis;
  baseline: LoanAnalysis;
  affordability: AffordabilityInput;
  affordabilityResult: AffordabilityResult;
  usuryEaPct: number;
  usuryPeriodLabel: string;
  onUsuryChange: (value: number) => void;
  systems: SystemComparisonRow[];
  strategies: StrategyComparison | null;
  levers: Lever[];
  onApplyLever: (lever: Lever) => void;
  onApplySystem: (system: LoanConfig['system']) => void;
  onApplyStrategy: (strategy: LoanConfig['strategy']) => void;
  onNavigate: (tab: TabId) => void;
  onEditExtras: () => void;
  scenarios: SavedScenario[];
}

function costShare(analysis: LoanAnalysis): number {
  return analysis.totalPaid > 0 ? (analysis.totalCost / analysis.totalPaid) * 100 : 0;
}

export function SummaryPanel({
  config,
  analysis,
  baseline,
  affordability,
  affordabilityResult,
  usuryEaPct,
  usuryPeriodLabel,
  onUsuryChange,
  systems,
  strategies,
  levers,
  onApplyLever,
  onApplySystem,
  onApplyStrategy,
  onNavigate,
  onEditExtras,
  scenarios,
}: Props) {
  if (!analysis.ok) {
    const errors = analysis.issues.filter((issue) => issue.severity === 'error');
    return (
      <div className="content-panel">
        <Card className="card--pad">
          <EmptyState
            icon={<AlertIcon size={19} />}
            title="Ajusta los parámetros para ver el análisis"
            action={
              <div className="validation" style={{ textAlign: 'left' }}>
                {errors.map((issue) => (
                  <div className="validation-item" key={`${issue.field}-${issue.message}`}>
                    {issue.message}
                  </div>
                ))}
              </div>
            }
          >
            El motor necesita un monto, un plazo y una tasa válidos. Los campos con error están
            marcados en rojo en el panel de la izquierda.
          </EmptyState>
        </Card>
      </div>
    );
  }

  const interestShare = (analysis.totalInterest / Math.max(analysis.totalPaid, 1)) * 100;
  const capitalShare = (analysis.principal / Math.max(analysis.totalPaid, 1)) * 100;
  const otherCost = analysis.totalCost - analysis.totalInterest;
  const otherShare = (otherCost / Math.max(analysis.totalPaid, 1)) * 100;
  const extraSavings = baseline.totalInterest - analysis.totalInterest;
  const hasExtras = config.extras.some((extra) => extra.amount > 0);
  const usuryMargin = usuryEaPct - config.annualRatePct;
  const usuryTone =
    usuryEaPct <= 0
      ? 'neutral'
      : config.annualRatePct > usuryEaPct
        ? 'rust'
        : config.annualRatePct > usuryEaPct * 0.8
          ? 'gold'
          : 'teal';
  const dti = affordabilityResult.dtiPct;
  const dtiTone =
    affordabilityResult.status === 'comfortable'
      ? 'teal'
      : affordabilityResult.status === 'tight'
        ? 'gold'
        : affordabilityResult.status === 'risky'
          ? 'rust'
          : 'neutral';
  const effective = analysis.effectiveCostEaPct;
  const costTone =
    effective == null ? 'neutral' : effective > config.annualRatePct + 0.75 ? 'gold' : 'teal';
  const topLevers = levers.slice(0, 4);

  return (
    <div className="content-panel">
      <div className="cost-hero">
        <div className="cost-hero-head">
          <div>
            <div className="eyebrow" style={{ marginBottom: 4 }}>
              Costo total del crédito
            </div>
            <div className="cost-value">
              {formatCOP(analysis.totalCost)}
              <span> COP</span>
            </div>
            <p className="cost-sub">
              <strong>{formatPct(analysis.costRatioPct, 1)}</strong> sobre el capital ·{' '}
              <strong>{formatPct(costShare(analysis), 1)}</strong> de todo lo que pagarás
            </p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' }}>
            {hasExtras && extraSavings > 0 ? (
              <Badge tone="teal">
                <TrendDownIcon size={11} /> Ahorras {formatCOP(extraSavings)}
              </Badge>
            ) : (
              <Badge tone="gold">Sin abonos todavía</Badge>
            )}
            <Badge tone={costTone === 'teal' ? 'teal' : 'gold'}>
              TIR {effective != null ? formatPct(effective, 2) : '—'}
            </Badge>
          </div>
        </div>

        <div
          className="composition-bar"
          role="img"
          aria-label={`Del total pagado, ${formatPct(capitalShare, 1)} es capital, ${formatPct(interestShare, 1)} intereses y ${formatPct(otherShare, 1)} otros costos.`}
        >
          <span style={{ width: `${capitalShare}%`, background: '#7E93A0' }} />
          <span style={{ width: `${interestShare}%`, background: '#C06A45' }} />
          <span style={{ width: `${otherShare}%`, background: '#C9A227' }} />
        </div>
        <div className="composition-legend">
          <span className="legend-item">
            <span className="dot" style={{ color: '#7E93A0' }} /> Capital{' '}
            <b>{formatCOP(analysis.principal)}</b>
          </span>
          <span className="legend-item">
            <span className="dot" style={{ color: '#C06A45' }} /> Intereses{' '}
            <b>{formatCOP(analysis.totalInterest)}</b>
          </span>
          <span className="legend-item">
            <span className="dot" style={{ color: '#C9A227' }} /> Seguros, comisiones y GMF{' '}
            <b>{formatCOP(otherCost)}</b>
          </span>
        </div>

        <div className="kpi-grid">
          <Kpi
            label="Cuota máxima"
            value={formatCOP(analysis.maxPayment)}
            sub={
              analysis.maxPayment !== analysis.firstPayment
                ? `Primer pago: ${formatCOP(analysis.firstPayment)}`
                : 'Cuota regular del plan'
            }
            tone="gold"
          />
          <Kpi
            label="Plazo real"
            value={formatMonths(analysis.months)}
            sub={`${formatYearsMonths(analysis.months)} · programado: ${config.termMonths}`}
          />
          <Kpi
            label="Interés total"
            value={formatCOP(analysis.totalInterest)}
            sub={`${formatPct((analysis.totalInterest / analysis.principal) * 100, 1)} del capital`}
            tone="rust"
          />
          <Kpi
            label="Costo efectivo anual"
            value={effective != null ? formatPct(effective, 2) : '—'}
            sub={
              effective != null
                ? `Tasa contractual: ${formatPct(config.annualRatePct, 2)} EA`
                : 'No se pudo calcular la TIR'
            }
            tone={costTone === 'teal' ? 'teal' : 'gold'}
          />
        </div>
      </div>

      <div className="verdict-grid">
        <div className={`verdict verdict--${usuryTone === 'neutral' ? '' : usuryTone}`.trim()}>
          <div className="verdict-head">
            <PercentIcon size={14} style={{ color: 'var(--gold)' }} />
            <span className="verdict-title">Tasa vs. usura</span>
          </div>
          <div className="verdict-value">
            {usuryEaPct > 0 ? `${formatPct(config.annualRatePct, 2)} EA` : 'Sin referencia'}
          </div>
          {usuryEaPct > 0 ? (
            usuryTone === 'rust' ? (
              <p className="verdict-body">
                <b>Supera el techo de referencia</b> por {formatPct(Math.abs(usuryMargin), 2)}. En
                Colombia cobrar por encima de la usura es ilegal: revisa el contrato y busca
                asesoría.
              </p>
            ) : usuryTone === 'gold' ? (
              <p className="verdict-body">
                Estás a <b>{formatPct(Math.max(0, usuryMargin), 2)}</b> del techo de referencia.
                Negocia antes de firmar.
              </p>
            ) : (
              <p className="verdict-body">
                Dentro del techo de referencia ({formatPct(usuryEaPct, 2)} EA, {usuryPeriodLabel}).
                Margen: <b>{formatPct(Math.max(0, usuryMargin), 2)}</b>.
              </p>
            )
          ) : (
            <p className="verdict-body">Ingresa una tasa de usura de referencia para comparar.</p>
          )}
          <label className="mini-field">
            <span>Usura ref.</span>
            <input
              type="number"
              className="mini-input"
              value={usuryEaPct}
              min={0}
              max={1000}
              step={0.01}
              onChange={(event) => onUsuryChange(Math.max(0, Number(event.target.value) || 0))}
              aria-label="Tasa de usura de referencia, efectiva anual"
            />
            <span>% EA</span>
          </label>
          <span className="tiny">Referencia {usuryPeriodLabel}. Editable.</span>
        </div>

        <div className={`verdict verdict--${dtiTone === 'neutral' ? '' : dtiTone}`.trim()}>
          <div className="verdict-head">
            <ScalesIcon size={14} style={{ color: 'var(--teal)' }} />
            <span className="verdict-title">Cuota vs. ingreso</span>
          </div>
          <div className="verdict-value">{dti != null ? formatPct(dti, 1) : 'Sin ingreso'}</div>
          {dti != null ? (
            <p className="verdict-body">
              Cuota de <b>{formatCOP(affordabilityResult.basePayment)}</b> sobre{' '}
              <b>{formatCOP(affordabilityResult.monthlyIncome)}</b> de ingreso. Límite elegido:{' '}
              {formatPct(affordabilityResult.maxDtiPct, 0)}.{' '}
              {affordabilityResult.headroom >= 0 ? (
                <>
                  Holgura: <b>{formatCOP(affordabilityResult.headroom)}</b>.
                </>
              ) : (
                <>
                  Faltan <b>{formatCOP(Math.abs(affordabilityResult.headroom))}</b> para caber.
                </>
              )}
            </p>
          ) : (
            <p className="verdict-body">
              Aún no cruzas la cuota con tu ingreso. Es la otra mitad del análisis: un crédito
              barato puede seguir siendo impagable.
            </p>
          )}
          <button
            type="button"
            className="btn btn--quiet"
            onClick={() => onNavigate('capacidad')}
            style={{ alignSelf: 'flex-start' }}
          >
            {dti != null ? 'Ajustar capacidad' : 'Evaluar mi capacidad'}{' '}
            <ArrowRightIcon size={11} />
          </button>
        </div>

        <div className={`verdict verdict--${costTone === 'neutral' ? '' : costTone}`.trim()}>
          <div className="verdict-head">
            <InfoIcon size={14} style={{ color: 'var(--muted-strong)' }} />
            <span className="verdict-title">Tasa vs. costo real</span>
          </div>
          <div className="verdict-value">
            {effective != null ? formatPct(effective, 2) : '—'} EA
          </div>
          <p className="verdict-body">
            {effective == null ? (
              'No se pudo resolver la TIR con estos flujos.'
            ) : effective > config.annualRatePct + 0.75 ? (
              <>
                Los seguros y comisiones elevan tu costo real{' '}
                <b>{formatPct(effective - config.annualRatePct, 2)}</b> por encima de la tasa.
                Pregunta por el costo efectivo, no solo por la cuota.
              </>
            ) : (
              <>
                Tu costo real está en línea con la tasa ({formatPct(config.annualRatePct, 2)} EA).
                Si agregas seguros o comisiones, esta cifra sube.
              </>
            )}
          </p>
        </div>
      </div>

      <section className="section" aria-labelledby="reparto-title">
        <SectionHead
          kicker="01 · El reparto"
          title="¿A dónde va cada peso?"
          description="No todo lo que pagas es capital: una parte se queda en intereses y otra en costos."
          id="reparto-title"
        />
        <div className="split">
          <Card className="card--pad">
            <CostDonut
              principal={analysis.principal}
              interest={analysis.totalInterest}
              insurance={analysis.totalInsurance}
              fees={analysis.costBreakdown.fees}
              gmf={analysis.totalGmf}
            />
          </Card>
          <Card className="card--pad">
            <div className="insight-list">
              <div className="insight">
                <span className="insight-label">Por cada peso prestado</span>
                <strong className="insight-value">
                  {formatNumber(analysis.totalPaid / Math.max(analysis.principal, 1), 2)}×
                </strong>
                <span className="insight-note">es lo que terminas pagando en total.</span>
              </div>
              <div className="insight">
                <span className="insight-label">Interés promedio al mes</span>
                <strong className="insight-value">
                  {formatCOP(analysis.totalInterest / Math.max(analysis.months, 1))}
                </strong>
                <span className="insight-note">
                  durante {formatMonths(analysis.months)} de vida del crédito.
                </span>
              </div>
              <div className="insight">
                <span className="insight-label">Si no haces abonos</span>
                <strong className="insight-value">{formatCOP(baseline.totalInterest)}</strong>
                <span className="insight-note">
                  de intereses y {formatMonths(baseline.months)} de plazo.
                  {hasExtras && extraSavings > 0 ? (
                    <>
                      {' '}
                      Tu plan ahorra <b>{formatCOP(extraSavings)}</b>.
                    </>
                  ) : null}
                </span>
              </div>
              <Callout tone="teal" title="La cuota no es el costo" icon={<InfoIcon size={15} />}>
                Dos créditos con la misma cuota pueden costar muy distinto según el plazo, la tasa y
                los seguros. Compara siempre el <strong>costo efectivo anual</strong>.
              </Callout>
            </div>
          </Card>
        </div>
      </section>

      <section className="section" aria-labelledby="levers-title">
        <SectionHead
          kicker="02 · Palancas"
          title="Dónde está el dinero que puedes recuperar"
          description="Cada palanca se calcula contra tu plan actual. Aplícala para simular el cambio; no mueve dinero real."
          id="levers-title"
          actions={
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => onNavigate('sensibilidad')}
            >
              <SparkIcon size={13} /> Ver sensibilidad
            </button>
          }
        />
        {topLevers.length === 0 ? (
          <Callout tone="gold" title="No hay palancas aplicables">
            Tu configuración ya está en un punto extremo. Cambia la tasa, el plazo o los costos para
            explorar alternativas.
          </Callout>
        ) : (
          <div className="lever-grid">
            {topLevers.map((lever) => {
              const saved = lever.savings;
              return (
                <div className={`lever lever--${lever.tone}`.trim()} key={lever.id}>
                  <div className="lever-top">
                    <span className="lever-title">{lever.title}</span>
                    <Badge tone={lever.tone === 'save' ? 'teal' : 'gold'}>
                      {lever.tone === 'save' ? 'Ahorro' : 'Trade-off'}
                    </Badge>
                  </div>
                  <p className="lever-desc">{lever.description}</p>
                  <div className="lever-metric">
                    <span
                      className={`lever-savings ${saved < 0 ? 'lever-savings--cost' : ''}`.trim()}
                    >
                      {saved >= 0 ? `+${formatCOP(saved)}` : `−${formatCOP(Math.abs(saved))}`}
                    </span>
                    <span className="lever-delta">
                      {saved >= 0 ? 'de interés' : 'de interés extra'}
                      {lever.monthsDelta !== 0 ? (
                        <>
                          {' '}
                          · <b>{Math.abs(lever.monthsDelta)}</b>{' '}
                          {lever.monthsDelta > 0 ? 'meses menos' : 'meses más'}
                        </>
                      ) : null}
                    </span>
                  </div>
                  {Math.abs(lever.paymentIncrease) >= 100 ? (
                    <span className="lever-delta">
                      Cuota {lever.paymentIncrease > 0 ? 'sube' : 'baja'}{' '}
                      <b>{formatCOP(Math.abs(lever.paymentIncrease))}</b>
                    </span>
                  ) : null}
                  <div className="lever-actions">
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => onApplyLever(lever)}
                    >
                      {lever.applyLabel} <ArrowRightIcon size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="section" aria-labelledby="systems-title">
        <SectionHead
          kicker="03 · Estructura"
          title="El mismo crédito, tres formas de pagarlo"
          description="Comparación sin abonos para aislar el efecto del sistema de amortización."
          id="systems-title"
        />
        <div className="split-3">
          {systems.map((row) => {
            const isCurrent = row.system === config.system;
            return (
              <button
                key={row.system}
                type="button"
                className={`system-card ${isCurrent ? 'is-current' : ''}`.trim()}
                aria-pressed={isCurrent}
                onClick={() => onApplySystem(row.system)}
              >
                <span className="system-card-top">
                  <span className="system-name">{row.label}</span>
                  {isCurrent ? (
                    <Badge tone="gold">En uso</Badge>
                  ) : (
                    <span className="tiny">Aplicar</span>
                  )}
                </span>
                <span className="system-stat">
                  <span>Interés total</span>
                  <b>{row.analysis.ok ? formatCOP(row.analysis.totalInterest) : '—'}</b>
                </span>
                <span className="system-stat">
                  <span>Cuota inicial</span>
                  <b>{row.analysis.ok ? formatCOP(row.analysis.firstPayment) : '—'}</b>
                </span>
                <span className="system-stat">
                  <span>Total pagado</span>
                  <b>{row.analysis.ok ? formatCOP(row.analysis.totalPaid) : '—'}</b>
                </span>
              </button>
            );
          })}
        </div>
        {config.system !== 'german' &&
        systems.find((row) => row.system === 'german')?.analysis.ok ? (
          <p className="table-note">
            <LayersIcon size={11} /> El sistema alemán suele ahorrar intereses, pero exige una cuota
            inicial más alta. Úsalo si tu flujo aguanta el arranque.
          </p>
        ) : null}
      </section>

      {strategies && hasExtras ? (
        <section className="section" aria-labelledby="strategy-title">
          <SectionHead
            kicker="04 · Abonos"
            title="Reducir plazo o reducir cuota"
            description="Con los mismos abonos, la estrategia cambia el resultado. No hay una correcta: depende de tu prioridad."
            id="strategy-title"
          />
          <div className="strategy-compare">
            <div
              className={`strategy-card ${config.strategy === 'reduce-term' ? 'is-current' : ''}`.trim()}
            >
              <span className="strategy-head">
                <span className="strategy-name">Reducir plazo</span>
                {config.strategy === 'reduce-term' ? <Badge tone="gold">En uso</Badge> : null}
              </span>
              <span className="strategy-metric">
                {formatCOP(strategies.reduceTerm.totalInterest)}
              </span>
              <span className="strategy-note">
                interés total · terminas en {formatMonths(strategies.reduceTerm.months)}
              </span>
              <span className="strategy-delta">
                Ahorras <b>{formatCOP(strategies.extraInterestSaved)}</b> más que reduciendo cuota.
              </span>
              {config.strategy !== 'reduce-term' ? (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => onApplyStrategy('reduce-term')}
                >
                  Cambiar a plazo <ArrowRightIcon size={11} />
                </button>
              ) : null}
            </div>
            <div
              className={`strategy-card ${config.strategy === 'reduce-payment' ? 'is-current' : ''}`.trim()}
            >
              <span className="strategy-head">
                <span className="strategy-name">Reducir cuota</span>
                {config.strategy === 'reduce-payment' ? <Badge tone="gold">En uso</Badge> : null}
              </span>
              <span className="strategy-metric">
                {formatCOP(strategies.reducePayment.maxPayment)}
              </span>
              <span className="strategy-note">
                cuota después del abono · terminas en{' '}
                {formatMonths(strategies.reducePayment.months)}
              </span>
              <span className="strategy-delta">
                Liberas <b>{formatCOP(strategies.monthlyPaymentRelief)}</b> al mes frente a reducir
                plazo.
              </span>
              {config.strategy !== 'reduce-payment' ? (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => onApplyStrategy('reduce-payment')}
                >
                  Cambiar a cuota <ArrowRightIcon size={11} />
                </button>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <section className="section" aria-labelledby="invest-title">
        <SectionHead
          kicker="05 · Decisión"
          title="Abonar o invertir"
          description="Abonar a capital tiene un rendimiento implícito: te ahorra exactamente la tasa del crédito, libre de riesgo y sin impuestos."
          id="invest-title"
        />
        <div className="invest-card">
          <div className="invest-threshold">
            <span className="invest-label">Umbral de indiferencia</span>
            <strong className="invest-value">{formatPct(config.annualRatePct, 2)} EA</strong>
            <span className="invest-note">
              Si tu inversión rinde más que esto <em>después de impuestos</em>, invertir puede ser
              mejor. Si rinde menos, abonar gana.
            </span>
          </div>
          {affordabilityResult.investAdvice === 'unknown' ? (
            <Callout tone="neutral" title="Ponle número a tu alternativa">
              En la pestaña <strong>Capacidad</strong> puedes ingresar la rentabilidad esperada de
              tu inversión alternativa y comparar el umbral con tu realidad.
            </Callout>
          ) : (
            <Callout
              tone={affordabilityResult.investAdvice === 'prepay' ? 'teal' : 'gold'}
              title={
                affordabilityResult.investAdvice === 'prepay'
                  ? 'Con tus supuestos, abonar gana'
                  : affordabilityResult.investAdvice === 'invest'
                    ? 'Con tus supuestos, invertir gana'
                    : 'Están prácticamente empatados'
              }
            >
              Tu alternativa rinde <strong>{formatPct(affordability.investmentEaPct, 2)} EA</strong>{' '}
              y el crédito cuesta <strong>{formatPct(config.annualRatePct, 2)} EA</strong>. Recuerda
              que abonar también compra tranquilidad y reduce el riesgo de impago; invertir trae
              volatilidad, comisiones e impuestos.
            </Callout>
          )}
        </div>
      </section>

      {scenarios.length > 0 ? (
        <section className="section" aria-labelledby="saved-title">
          <SectionHead
            kicker="06 · Memoria"
            title={`Tienes ${scenarios.length} ${scenarios.length === 1 ? 'escenario guardado' : 'escenarios guardados'}`}
            description="Compáralos lado a lado o vuelve a cualquiera con un clic."
            id="saved-title"
            actions={
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => onNavigate('escenarios')}
              >
                Ver escenarios <ArrowRightIcon size={11} />
              </button>
            }
          />
          <div className="scenario-strip">
            {scenarios.slice(0, 3).map((scenario) => (
              <div className="scenario-mini" key={scenario.id}>
                <span className="scenario-mini-name">{scenario.name}</span>
                <span className="scenario-mini-meta">
                  {formatCOP(scenario.config.principal)} ·{' '}
                  {formatPct(scenario.config.annualRatePct, 2)} EA
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="disclaimer-box">
        <InfoIcon size={15} />
        <p>
          Cálculo con cuota mensual vencida y tasa fija. No incluye impuestos distintos al GMF,
          penalidades por prepago, cobros no informados ni variaciones de tasa. La referencia de
          usura es editable y puede estar desactualizada: verifica el valor vigente en la
          Superfinanciera. Esto no es asesoría financiera.
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 18 }}>
        <button type="button" className="btn btn--quiet" onClick={onEditExtras}>
          <CheckIcon size={12} /> Agregar o editar abonos en la tabla
        </button>
      </div>
    </div>
  );
}
