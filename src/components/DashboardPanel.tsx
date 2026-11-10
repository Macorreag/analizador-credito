import type { ReactNode } from 'react';
import type { AffordabilityInput, AffordabilityResult } from '../lib/affordability';
import { computeLoan, type LoanAnalysis, type LoanConfig } from '../lib/credit';
import { APP_VERSION } from '../lib/defaults';
import { formatCOP, formatMonths, formatPct, formatYearsMonths } from '../lib/format';
import type { Lever } from '../lib/levers';
import type { SavedScenario } from '../lib/scenarios';
import type {
  AbonoLadder,
  RateTermGrid,
  StrategyComparison,
  SystemComparisonRow,
} from '../lib/sensitivity';
import type { TabId } from './tabsMeta';
import { Badge, Card, EmptyState, NumberInput } from './ui';
import { BalanceChart } from './charts/BalanceChart';
import { DtiGauge } from './charts/DtiGauge';
import { RateTermHeatmap } from './charts/RateTermHeatmap';
import {
  AlertIcon,
  ArrowRightIcon,
  DownloadIcon,
  InfoIcon,
  PercentIcon,
  TargetIcon,
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
  systems: SystemComparisonRow[];
  strategies: StrategyComparison | null;
  levers: Lever[];
  grid: RateTermGrid;
  ladder: AbonoLadder;
  scenarios: SavedScenario[];
  onApplyLever: (lever: Lever) => void;
  onApplySystem: (system: LoanConfig['system']) => void;
  onApplyStrategy: (strategy: LoanConfig['strategy']) => void;
  onApplyLadder: (monthlyExtra: number) => void;
  onApplyGrid: (ratePct: number, termMonths: number) => void;
  onAffordabilityChange: (patch: Partial<AffordabilityInput>) => void;
  onNavigate: (tab: TabId) => void;
  onEditParams: () => void;
  onEditExtras: () => void;
  onCsv: () => void;
  onNotify: (message: string) => void;
}

const SYSTEM_LABEL: Record<LoanConfig['system'], string> = {
  french: 'Francés',
  german: 'Alemán',
  american: 'Americano',
};

function DashKpi({
  label,
  value,
  sub,
  tone = 'neutral',
  hero = false,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: 'neutral' | 'gold' | 'teal' | 'rust';
  hero?: boolean;
}) {
  return (
    <div className={`dash-kpi ${tone !== 'neutral' ? `dash-kpi--${tone}` : ''}`.trim()}>
      <div className="dash-kpi-label">{label}</div>
      <div className={`dash-kpi-value ${hero ? 'dash-kpi-value--hero' : ''}`.trim()}>{value}</div>
      <div className="dash-kpi-sub">{sub}</div>
    </div>
  );
}

function DashCard({
  span,
  kicker,
  title,
  action,
  children,
  className = '',
}: {
  span: 3 | 4 | 5 | 6 | 7 | 8 | 12;
  kicker: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={`dash-card dash-span-${span} ${className}`.trim()}>
      <div className="dash-card-head">
        <div>
          <div className="dash-kicker">{kicker}</div>
          <h2 className="dash-card-title">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

function DashMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="dash-metric">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

function StatusRow({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  tone: 'teal' | 'gold' | 'rust' | 'neutral';
}) {
  return (
    <div className="dash-status-row">
      <span className={`dash-status-icon dash-status-icon--${tone}`.trim()}>{icon}</span>
      <div>
        <div className="dash-status-label">{label}</div>
        <div className="dash-status-detail">{detail}</div>
      </div>
      <span className={`dash-status-value dash-status-value--${tone}`.trim()}>{value}</span>
    </div>
  );
}

export function DashboardPanel({
  config,
  analysis,
  baseline,
  affordability,
  affordabilityResult,
  usuryEaPct,
  usuryPeriodLabel,
  systems,
  strategies,
  levers,
  grid,
  ladder,
  scenarios,
  onApplyLever,
  onApplySystem,
  onApplyStrategy,
  onApplyLadder,
  onApplyGrid,
  onAffordabilityChange,
  onNavigate,
  onEditParams,
  onEditExtras,
  onCsv,
  onNotify,
}: Props) {
  if (!analysis.ok) {
    const errors = analysis.issues.filter((issue) => issue.severity === 'error');
    return (
      <div className="content-panel dashboard">
        <Card className="card--pad">
          <EmptyState
            icon={<AlertIcon size={19} />}
            title="Ajusta los parámetros para ver el panel"
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
            marcados en el panel de la izquierda.
          </EmptyState>
        </Card>
      </div>
    );
  }

  const effective = analysis.effectiveCostEaPct;
  const hasExtras = config.extras.some((extra) => extra.amount > 0);
  const extraSavings = baseline.totalInterest - analysis.totalInterest;
  const interestShare = (analysis.totalInterest / Math.max(analysis.totalPaid, 1)) * 100;
  const capitalShare = (analysis.principal / Math.max(analysis.totalPaid, 1)) * 100;
  const otherCost = analysis.totalCost - analysis.totalInterest;
  const otherShare = (otherCost / Math.max(analysis.totalPaid, 1)) * 100;
  const hasCharges = analysis.rows.some((row) => Math.abs(row.charges) > 0.005);
  const usuryMargin = usuryEaPct - config.annualRatePct;
  const usuryTone =
    usuryEaPct <= 0
      ? 'neutral'
      : config.annualRatePct > usuryEaPct
        ? 'rust'
        : config.annualRatePct > usuryEaPct * 0.8
          ? 'gold'
          : 'teal';
  const dtiTone =
    affordabilityResult.status === 'comfortable'
      ? 'teal'
      : affordabilityResult.status === 'tight'
        ? 'gold'
        : affordabilityResult.status === 'risky'
          ? 'rust'
          : 'neutral';
  const costTone =
    effective == null ? 'neutral' : effective > config.annualRatePct + 0.75 ? 'gold' : 'teal';
  const extrasCount = config.extras.filter((extra) => extra.amount > 0).length;
  const sortedExtras = [...config.extras]
    .filter((extra) => extra.amount > 0)
    .sort((a, b) => a.fromMonth - b.fromMonth);
  const topLevers = levers.slice(0, 3);
  const ladderRows = ladder.rows.filter((row) => row.monthlyExtra > 0).slice(0, 4);

  const savedScenarios = scenarios.slice(0, 3).map((scenario) => ({
    id: scenario.id,
    name: scenario.name,
    analysis: computeLoan(scenario.config),
    current: false,
  }));
  const scenarioEntries = [
    { id: 'baseline', name: 'Sin abonos', analysis: baseline, current: false },
    { id: 'current', name: 'Plan actual', analysis, current: true },
    ...savedScenarios,
  ];
  const maxScenarioInterest = Math.max(
    ...scenarioEntries.map((entry) => (entry.analysis.ok ? entry.analysis.totalInterest : 0)),
    1,
  );

  return (
    <div className="content-panel dashboard">
      <div className="dash-head">
        <div className="dash-head-main">
          <div className="eyebrow">Panel de control · v{APP_VERSION}</div>
          <h1 className="dash-title">Análisis del crédito</h1>
          <p className="dash-sub">
            Todos los números del plan en una sola vista. Cambia un parámetro y todo se recalcula en
            tu navegador.
          </p>
          <div className="dash-config">
            <span className="dash-config-item">
              <b>{formatCOP(config.principal)}</b> <span>capital</span>
            </span>
            <span className="dash-config-item">
              <b>{formatPct(config.annualRatePct, 2)} EA</b> <span>tasa</span>
            </span>
            <span className="dash-config-item">
              <b>{config.termMonths} meses</b> <span>plazo</span>
            </span>
            <span className="dash-config-item">
              <b>{SYSTEM_LABEL[config.system]}</b> <span>sistema</span>
            </span>
            <span className="dash-config-item">
              <b>{extrasCount}</b> <span>abonos</span>
            </span>
          </div>
        </div>
        <div className="dash-head-actions">
          <div className="dash-badges">
            <Badge tone={usuryTone === 'neutral' ? 'neutral' : usuryTone}>
              {usuryEaPct > 0
                ? usuryTone === 'rust'
                  ? 'Sobre usura'
                  : usuryTone === 'gold'
                    ? 'Cerca del techo'
                    : 'Dentro del techo'
                : 'Sin referencia de usura'}
            </Badge>
            <Badge tone={dtiTone === 'neutral' ? 'neutral' : dtiTone}>
              {affordabilityResult.dtiPct != null
                ? `DTI ${formatPct(affordabilityResult.dtiPct, 1)}`
                : 'Sin ingreso'}
            </Badge>
            <Badge tone={costTone === 'teal' ? 'teal' : costTone === 'gold' ? 'gold' : 'neutral'}>
              TIR {effective != null ? formatPct(effective, 2) : '—'}
            </Badge>
          </div>
          <div className="dash-buttons">
            <button type="button" className="btn btn--ghost btn--sm" onClick={onEditParams}>
              Editar plan
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={onCsv}>
              <DownloadIcon size={12} /> CSV
            </button>
          </div>
        </div>
      </div>

      <div className="dash-kpis">
        <DashKpi
          label="Costo total del crédito"
          value={formatCOP(analysis.totalCost)}
          sub={`${formatPct(analysis.costRatioPct, 1)} del capital`}
          tone="gold"
          hero
        />
        <DashKpi
          label="Cuota máxima"
          value={formatCOP(analysis.maxPayment)}
          sub={
            analysis.maxPayment !== analysis.firstPayment
              ? `Primer pago ${formatCOP(analysis.firstPayment)}`
              : 'Cuota regular del plan'
          }
          tone="gold"
        />
        <DashKpi
          label="Interés total"
          value={formatCOP(analysis.totalInterest)}
          sub={`${formatPct((analysis.totalInterest / analysis.principal) * 100, 1)} del capital`}
          tone="rust"
        />
        <DashKpi
          label="Plazo real"
          value={formatMonths(analysis.months)}
          sub={`${formatYearsMonths(analysis.months)} · programado ${config.termMonths}`}
        />
        <DashKpi
          label="Costo efectivo (TIR)"
          value={effective != null ? formatPct(effective, 2) : '—'}
          sub={`Tasa contractual ${formatPct(config.annualRatePct, 2)} EA`}
          tone={costTone === 'teal' ? 'teal' : costTone === 'gold' ? 'gold' : 'neutral'}
        />
        <DashKpi
          label="Ahorro con abonos"
          value={hasExtras ? `+${formatCOP(Math.max(0, extraSavings))}` : '$0'}
          sub={hasExtras ? 'vs. no abonar' : 'Aún sin abonos'}
          tone={hasExtras && extraSavings > 0 ? 'teal' : 'neutral'}
        />
      </div>

      <div className="dash-grid">
        <DashCard
          span={8}
          kicker="01 · Trayectoria"
          title="Saldo de la deuda"
          action={
            <button type="button" className="dash-link" onClick={() => onNavigate('amortizacion')}>
              Ver detalle <ArrowRightIcon size={10} />
            </button>
          }
        >
          <BalanceChart
            rows={analysis.rows}
            baselineRows={baseline.rows}
            principal={analysis.principal}
            startDate={config.startDate}
            extras={config.extras}
          />
        </DashCard>

        <DashCard
          span={4}
          kicker="02 · Costo"
          title="Composición del pago"
          action={<span className="badge">{formatPct(analysis.costRatioPct, 1)}</span>}
        >
          <div className="dash-cost-total">
            {formatCOP(analysis.totalPaid)}
            <span>total pagado · capital + costo</span>
          </div>
          <div
            className="dash-cost-bar"
            role="img"
            aria-label={`${formatPct(capitalShare, 1)} capital, ${formatPct(interestShare, 1)} intereses y ${formatPct(otherShare, 1)} otros costos.`}
          >
            <span style={{ width: `${capitalShare}%`, background: '#7E93A0' }} />
            <span style={{ width: `${interestShare}%`, background: '#C06A45' }} />
            <span style={{ width: `${otherShare}%`, background: '#C9A227' }} />
          </div>
          <div className="dash-cost-rows">
            <div className="dash-cost-row">
              <span className="dot" style={{ color: '#7E93A0' }} />
              <span>Capital</span>
              <b>{formatCOP(analysis.principal)}</b>
              <em>{formatPct(capitalShare, 1)}</em>
            </div>
            <div className="dash-cost-row">
              <span className="dot" style={{ color: '#C06A45' }} />
              <span>Intereses</span>
              <b>{formatCOP(analysis.totalInterest)}</b>
              <em>{formatPct(interestShare, 1)}</em>
            </div>
            <div className="dash-cost-row">
              <span className="dot" style={{ color: '#C9A227' }} />
              <span>Seguros</span>
              <b>{formatCOP(analysis.totalInsurance)}</b>
              <em>
                {formatPct((analysis.totalInsurance / Math.max(analysis.totalPaid, 1)) * 100, 1)}
              </em>
            </div>
            <div className="dash-cost-row">
              <span className="dot" style={{ color: '#8FA35A' }} />
              <span>Comisiones</span>
              <b>{formatCOP(analysis.costBreakdown.fees)}</b>
              <em>
                {formatPct(
                  (analysis.costBreakdown.fees / Math.max(analysis.totalPaid, 1)) * 100,
                  1,
                )}
              </em>
            </div>
            <div className="dash-cost-row">
              <span className="dot" style={{ color: '#5E7C8A' }} />
              <span>GMF</span>
              <b>{formatCOP(analysis.totalGmf)}</b>
              <em>{formatPct((analysis.totalGmf / Math.max(analysis.totalPaid, 1)) * 100, 1)}</em>
            </div>
            {hasCharges ? (
              <div className="dash-cost-row">
                <span className="dot" style={{ color: '#B58AC9' }} />
                <span>Cargos / notas</span>
                <b className={analysis.totalCharges < 0 ? 'cell-teal' : ''}>
                  {formatCOP(analysis.totalCharges)}
                </b>
                <em>
                  {formatPct((analysis.totalCharges / Math.max(analysis.totalPaid, 1)) * 100, 1)}
                </em>
              </div>
            ) : null}
          </div>
        </DashCard>

        <DashCard
          span={4}
          kicker="03 · Bolsillo"
          title="Capacidad de pago"
          action={
            <button type="button" className="dash-link" onClick={() => onNavigate('capacidad')}>
              Ajustar <ArrowRightIcon size={10} />
            </button>
          }
        >
          {affordabilityResult.monthlyIncome > 0 ? (
            <>
              <DtiGauge
                dtiPct={affordabilityResult.dtiPct}
                limitPct={affordabilityResult.maxDtiPct}
              />
              <div className="dash-mini-grid">
                <DashMetric
                  label="Cuota / ingreso"
                  value={formatPct(affordabilityResult.paymentSharePct ?? 0, 1)}
                />
                <DashMetric label="Holgura" value={formatCOP(affordabilityResult.headroom)} />
                <DashMetric
                  label="Capital máximo"
                  value={formatCOP(affordabilityResult.maxPrincipal)}
                />
                <DashMetric
                  label="Estrés +2 pp"
                  value={formatPct(affordabilityResult.stressDtiPct ?? 0, 1)}
                />
              </div>
            </>
          ) : (
            <div className="dash-capacity-empty">
              <label className="dash-field" htmlFor="dash-income">
                <span>Ingreso neto mensual</span>
                <NumberInput
                  id="dash-income"
                  prefix="$"
                  value={affordability.monthlyIncome}
                  onChange={(value) => onAffordabilityChange({ monthlyIncome: Math.max(0, value) })}
                  step={100_000}
                  min={0}
                  blankZero
                  placeholder="Ej. 5.500.000"
                  aria-label="Ingreso neto mensual para calcular capacidad de pago"
                />
              </label>
              <p className="dash-inline-note">
                Sin ingreso no hay DTI. El dato se queda en este navegador.
              </p>
              <button type="button" className="dash-link" onClick={() => onNavigate('capacidad')}>
                Calcular capacidad completa <ArrowRightIcon size={10} />
              </button>
            </div>
          )}
        </DashCard>

        <DashCard
          span={4}
          kicker="04 · Diagnóstico"
          title="Semáforo del plan"
          action={
            <button type="button" className="dash-link" onClick={() => onNavigate('metodologia')}>
              Referencias <ArrowRightIcon size={10} />
            </button>
          }
        >
          <div className="dash-status">
            <StatusRow
              icon={<PercentIcon size={13} />}
              label="Tasa vs. usura"
              value={
                usuryEaPct > 0
                  ? `${formatPct(config.annualRatePct, 2)} / ${formatPct(usuryEaPct, 2)}`
                  : '—'
              }
              detail={
                usuryEaPct > 0
                  ? usuryTone === 'rust'
                    ? `Supera el techo por ${formatPct(Math.abs(usuryMargin), 2)}`
                    : `Margen de ${formatPct(Math.max(0, usuryMargin), 2)}`
                  : 'Sin referencia editable'
              }
              tone={usuryTone === 'neutral' ? 'neutral' : usuryTone}
            />
            <StatusRow
              icon={<InfoIcon size={13} />}
              label="Costo real vs. tasa"
              value={effective != null ? formatPct(effective, 2) : '—'}
              detail={
                effective != null
                  ? effective > config.annualRatePct + 0.75
                    ? `Los costos suman ${formatPct(effective - config.annualRatePct, 2)}`
                    : 'Sin sobrecosto relevante'
                  : 'TIR no disponible'
              }
              tone={costTone === 'neutral' ? 'neutral' : costTone}
            />
            <StatusRow
              icon={<TrendDownIcon size={13} />}
              label="Abonos a capital"
              value={hasExtras ? formatCOP(analysis.totalExtras) : 'Sin abonos'}
              detail={
                hasExtras
                  ? `${formatCOP(Math.max(0, extraSavings))} de ahorro · ${formatMonths(analysis.months)} de plazo`
                  : 'Agrega un abono para ver el ahorro'
              }
              tone={hasExtras ? 'teal' : 'neutral'}
            />
          </div>
          <p className="dash-inline-note">
            Referencia de usura: {formatPct(usuryEaPct, 2)} EA · {usuryPeriodLabel}.
          </p>
        </DashCard>

        <DashCard
          span={4}
          kicker="05 · Mejoras"
          title="Palancas de ahorro"
          action={
            <button type="button" className="dash-link" onClick={() => onNavigate('sensibilidad')}>
              Ver todas <ArrowRightIcon size={10} />
            </button>
          }
        >
          {topLevers.length > 0 ? (
            <div className="dash-levers">
              {topLevers.map((lever) => (
                <div className="dash-lever" key={lever.id}>
                  <div className="dash-lever-main">
                    <div className="dash-lever-title">{lever.title}</div>
                    <div className={`dash-lever-meta ${lever.savings < 0 ? 'is-cost' : ''}`.trim()}>
                      {lever.savings >= 0
                        ? `+${formatCOP(lever.savings)} de ahorro`
                        : `${formatCOP(Math.abs(lever.savings))} más de interés`}
                      {lever.monthsDelta !== 0
                        ? ` · ${Math.abs(lever.monthsDelta)} ${lever.monthsDelta > 0 ? 'meses menos' : 'meses más'}`
                        : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="dash-icon-action"
                    onClick={() => onApplyLever(lever)}
                    aria-label={`Aplicar ${lever.title}`}
                    title={lever.applyLabel}
                  >
                    <ArrowRightIcon size={12} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="dash-inline-note">No hay palancas aplicables con esta configuración.</p>
          )}
        </DashCard>

        <DashCard
          span={4}
          kicker="06 · Abonos"
          title="Plan de abonos"
          action={
            <button type="button" className="dash-link" onClick={onEditExtras}>
              Editar <ArrowRightIcon size={10} />
            </button>
          }
        >
          {sortedExtras.length > 0 ? (
            <>
              <div className="dash-mini-grid">
                <DashMetric label="Abonos totales" value={formatCOP(analysis.totalExtras)} />
                <DashMetric label="Ahorro" value={formatCOP(Math.max(0, extraSavings))} />
              </div>
              <div className="dash-extra-list">
                {sortedExtras.slice(0, 4).map((extra) => (
                  <div className="dash-extra-row" key={extra.id}>
                    <span className="dash-extra-month">
                      {extra.frequency === 'once'
                        ? `Mes ${extra.fromMonth}`
                        : `Desde ${extra.fromMonth}`}
                    </span>
                    <span className="dash-extra-amount">{formatCOP(extra.amount)}</span>
                    <span className="badge">
                      {extra.frequency === 'once'
                        ? 'único'
                        : extra.frequency === 'monthly'
                          ? 'mensual'
                          : 'anual'}
                    </span>
                  </div>
                ))}
              </div>
              {sortedExtras.length > 4 ? (
                <p className="dash-inline-note">y {sortedExtras.length - 4} más en el editor.</p>
              ) : null}
            </>
          ) : (
            <div className="dash-empty">
              <p>Sin abonos. Un abono mensual del 1% del capital suele mover bastante la aguja.</p>
              <button type="button" className="btn btn--ghost btn--sm" onClick={onEditExtras}>
                Agregar el primero <ArrowRightIcon size={10} />
              </button>
            </div>
          )}
        </DashCard>

        <DashCard
          span={8}
          kicker="07 · Detalle"
          title="Primeros 8 pagos"
          action={
            <button type="button" className="dash-link" onClick={() => onNavigate('amortizacion')}>
              Tabla completa <ArrowRightIcon size={10} />
            </button>
          }
        >
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th scope="col">Mes</th>
                  <th scope="col">Cuota</th>
                  <th scope="col">Interés</th>
                  <th scope="col">Capital</th>
                  <th scope="col">Abono</th>
                  {hasCharges ? <th scope="col">Cargos</th> : null}
                  <th scope="col">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {analysis.rows.slice(0, 8).map((row) => (
                  <tr key={row.month} className={row.extra > 0 ? 'row-extra' : ''}>
                    <td>{row.month}</td>
                    <td>{formatCOP(row.payment)}</td>
                    <td className="cell-rust">{formatCOP(row.interest)}</td>
                    <td className="cell-gold">{formatCOP(row.principal)}</td>
                    <td className="cell-teal">{row.extra > 0 ? formatCOP(row.extra) : '—'}</td>
                    {hasCharges ? (
                      <td className={row.charges < 0 ? 'cell-teal' : 'cell-rust'}>
                        {formatCOP(row.charges)}
                      </td>
                    ) : null}
                    <td className="cell-strong">{formatCOP(row.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="dash-inline-note">
            La cuota incluye seguro, comisión{hasCharges ? ' y cargos' : ''}. El detalle completo
            incluye GMF y exportación CSV.
          </p>
        </DashCard>

        <DashCard
          span={4}
          kicker="08 · Escenarios"
          title="Comparar planes"
          action={
            <button type="button" className="dash-link" onClick={() => onNavigate('escenarios')}>
              Gestionar <ArrowRightIcon size={10} />
            </button>
          }
        >
          <div className="dash-compare">
            {scenarioEntries.map((entry) => {
              const value = entry.analysis.ok ? entry.analysis.totalInterest : 0;
              return (
                <div
                  className={`dash-compare-row ${entry.current ? 'is-current' : ''}`.trim()}
                  key={entry.id}
                >
                  <span className="dash-compare-label" title={entry.name}>
                    {entry.name}
                  </span>
                  <span className="dash-compare-track">
                    <span
                      className="dash-compare-fill"
                      style={{ width: `${(value / maxScenarioInterest) * 100}%` }}
                    />
                  </span>
                  <span className="dash-compare-value">{formatCOP(value)}</span>
                </div>
              );
            })}
          </div>
          <p className="dash-inline-note">
            {scenarios.length > 0
              ? `${scenarios.length} escenario(s) guardado(s).`
              : 'Guarda el plan actual y prueba otro plazo o tasa.'}
          </p>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => onNavigate('escenarios')}
          >
            Guardar escenario
          </button>
        </DashCard>

        <DashCard
          span={4}
          kicker="09 · Sensibilidad"
          title="Abono mensual"
          action={
            <button type="button" className="dash-link" onClick={() => onNavigate('sensibilidad')}>
              Ver más <ArrowRightIcon size={10} />
            </button>
          }
        >
          {ladderRows.length > 0 ? (
            <div className="dash-ladder">
              {ladderRows.map((row) => (
                <div className="dash-ladder-row" key={row.monthlyExtra}>
                  <div className="dash-ladder-main">
                    <b>{formatCOP(row.monthlyExtra)}/mes</b>
                    <span>
                      +{formatCOP(row.interestSaved)} · {row.monthsSaved} meses menos
                    </span>
                  </div>
                  <button
                    type="button"
                    className="dash-icon-action"
                    onClick={() => {
                      onApplyLadder(row.monthlyExtra);
                      onNotify(
                        `Plan de abonos reemplazado por ${formatCOP(row.monthlyExtra)} mensuales.`,
                      );
                    }}
                    aria-label={`Aplicar abono mensual de ${formatCOP(row.monthlyExtra)}`}
                    title="Reemplaza el plan de abonos actual"
                  >
                    <ArrowRightIcon size={12} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="dash-inline-note">Ajusta los parámetros para generar la escalera.</p>
          )}
          <p className="dash-inline-note">Reemplaza el plan de abonos actual.</p>
        </DashCard>

        <DashCard span={4} kicker="10 · Estructura" title="Sistemas">
          <div className="dash-systems">
            {systems.map((row) => {
              const isCurrent = row.system === config.system;
              return (
                <button
                  type="button"
                  key={row.system}
                  className={`dash-system-row ${isCurrent ? 'is-current' : ''}`.trim()}
                  onClick={() => onApplySystem(row.system)}
                  aria-pressed={isCurrent}
                >
                  <span className="dash-system-name">{row.label}</span>
                  <span className="dash-system-value">
                    {row.analysis.ok ? formatCOP(row.analysis.totalInterest) : '—'}
                  </span>
                  {isCurrent ? <Badge tone="gold">actual</Badge> : <ArrowRightIcon size={11} />}
                </button>
              );
            })}
          </div>
          <p className="dash-inline-note">
            Interés total sin abonos. El alemán exige más cuota inicial.
          </p>
        </DashCard>

        <DashCard span={4} kicker="11 · Abonos" title="Plazo vs. cuota">
          {strategies ? (
            <div className="dash-strategies">
              <button
                type="button"
                className={`dash-strategy-row ${config.strategy === 'reduce-term' ? 'is-current' : ''}`.trim()}
                onClick={() => onApplyStrategy('reduce-term')}
                aria-pressed={config.strategy === 'reduce-term'}
              >
                <span>
                  <b>Reducir plazo</b>
                  <small>{formatCOP(strategies.reduceTerm.totalInterest)} de interés</small>
                </span>
                <span className="dash-strategy-value">
                  {formatMonths(strategies.reduceTerm.months)}
                </span>
              </button>
              <button
                type="button"
                className={`dash-strategy-row ${config.strategy === 'reduce-payment' ? 'is-current' : ''}`.trim()}
                onClick={() => onApplyStrategy('reduce-payment')}
                aria-pressed={config.strategy === 'reduce-payment'}
              >
                <span>
                  <b>Reducir cuota</b>
                  <small>{formatCOP(strategies.reducePayment.maxPayment)} de cuota</small>
                </span>
                <span className="dash-strategy-value">
                  {formatCOP(strategies.monthlyPaymentRelief)}
                </span>
              </button>
            </div>
          ) : (
            <div className="dash-empty">
              <p>Agrega abonos para comparar el efecto de reducir plazo o cuota.</p>
              <button type="button" className="btn btn--ghost btn--sm" onClick={onEditExtras}>
                Configurar abonos <ArrowRightIcon size={10} />
              </button>
            </div>
          )}
        </DashCard>

        <DashCard
          span={8}
          kicker="12 · Sensibilidad"
          title="Mapa tasa × plazo"
          action={<span className="badge">sin abonos</span>}
        >
          <RateTermHeatmap
            grid={grid}
            onSelect={(rate, term) => {
              onApplyGrid(rate, term);
              onNotify(`Escenario aplicado: ${formatPct(rate, 2)} EA y ${term} meses.`);
            }}
          />
        </DashCard>
      </div>

      <div className="dash-foot">
        <InfoIcon size={13} />
        <p>
          Estimación con cuota mensual vencida y tasa fija. No es asesoría financiera ni una oferta.
          Verifica la tabla oficial de tu entidad. Todo se calcula en tu navegador.
        </p>
        <button type="button" className="dash-link" onClick={onEditParams}>
          Ajustar parámetros <TargetIcon size={10} />
        </button>
      </div>
    </div>
  );
}
