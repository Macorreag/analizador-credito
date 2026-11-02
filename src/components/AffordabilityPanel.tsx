import { useMemo } from 'react';
import type { AffordabilityInput, AffordabilityResult } from '../lib/affordability';
import { computeLoan, type LoanAnalysis, type LoanConfig } from '../lib/credit';
import { formatCOP, formatPct } from '../lib/format';
import { DtiGauge } from './charts/DtiGauge';
import {
  Badge,
  Callout,
  Card,
  EmptyState,
  Field,
  Kpi,
  MoneyInput,
  NumberInput,
  SectionHead,
  Segmented,
} from './ui';
import { ArrowRightIcon, InfoIcon, LockIcon, ScalesIcon, TargetIcon, WalletIcon } from './icons';

const DTI_OPTIONS = ['30', '35', '40', '50'] as const;
const STRESS_OPTIONS = ['100', '200', '400'] as const;

function statusCopy(result: AffordabilityResult): {
  tone: 'teal' | 'gold' | 'rust';
  title: string;
  body: string;
} {
  if (result.status === 'comfortable') {
    return {
      tone: 'teal',
      title: 'La cuota cabe con holgura',
      body: 'Tu deuda total queda por debajo del 75% del límite que elegiste. Aun así, mantén un colchón para imprevistos y evita financiar gastos corrientes con deuda.',
    };
  }
  if (result.status === 'tight') {
    return {
      tone: 'gold',
      title: 'Cabe, pero queda ajustado',
      body: 'Estás cerca del límite de endeudamiento. Si la tasa sube o tus ingresos bajan, el margen desaparece. Un plazo mayor o un monto menor te darían aire.',
    };
  }
  return {
    tone: 'rust',
    title: 'La cuota compromete tu presupuesto',
    body: 'La deuda total supera el límite que elegiste. Antes de firmar, reduce el monto, alarga el plazo, elimina otras deudas o busca un ingreso adicional. Un crédito que no cabe no se arregla con optimismo.',
  };
}

export function AffordabilityPanel({
  config,
  analysis,
  affordability,
  result,
  onChange,
  onApplyMaxPrincipal,
  onNotify,
}: {
  config: LoanConfig;
  analysis: LoanAnalysis;
  affordability: AffordabilityInput;
  result: AffordabilityResult;
  onChange: (patch: Partial<AffordabilityInput>) => void;
  onApplyMaxPrincipal: (principal: number) => void;
  onNotify: (message: string) => void;
}) {
  const hasIncome = result.monthlyIncome > 0;
  const status = statusCopy(result);
  const stressPp = affordability.stressBps / 100;

  const stressRows = useMemo(() => {
    const base = {
      label: 'Hoy',
      rate: config.annualRatePct,
      income: result.monthlyIncome,
      loan: analysis,
    };
    const rateStress = computeLoan({ ...config, annualRatePct: config.annualRatePct + stressPp });
    const severeStress = computeLoan({ ...config, annualRatePct: config.annualRatePct + 4 });
    return [
      base,
      {
        label: `Tasa +${stressPp.toFixed(1)} pp`,
        rate: config.annualRatePct + stressPp,
        income: result.monthlyIncome,
        loan: rateStress,
      },
      {
        label: 'Tasa +4 pp',
        rate: config.annualRatePct + 4,
        income: result.monthlyIncome,
        loan: severeStress,
      },
      {
        label: 'Ingreso −20%',
        rate: config.annualRatePct,
        income: result.monthlyIncome * 0.8,
        loan: analysis,
      },
      {
        label: `Ingreso −20% +${stressPp.toFixed(1)} pp`,
        rate: config.annualRatePct + stressPp,
        income: result.monthlyIncome * 0.8,
        loan: rateStress,
      },
    ];
  }, [analysis, config, result.monthlyIncome, stressPp]);

  return (
    <div className="content-panel">
      <Card className="card--pad">
        <div className="card-head">
          <div>
            <div className="card-title">Tu bolsillo también decide</div>
            <div className="card-sub">
              Un crédito barato puede ser impagable si la cuota se come tu ingreso. Estos datos no
              salen de tu navegador.
            </div>
          </div>
          <Badge tone="teal">
            <LockIcon size={11} /> 100% local
          </Badge>
        </div>

        <div className="split">
          <Field
            label="Ingreso neto mensual"
            htmlFor="income"
            hint="El dinero que recibes después de descuentos, no el bruto."
          >
            <MoneyInput
              id="income"
              value={affordability.monthlyIncome}
              onChange={(value) => onChange({ monthlyIncome: Math.max(0, value) })}
              step={100_000}
              placeholder="Ej. 5.500.000"
            />
          </Field>
          <Field
            label="Otras deudas mensuales"
            htmlFor="other-debt"
            hint="Cuotas de tarjetas, otros créditos, obligaciones fijas."
          >
            <MoneyInput
              id="other-debt"
              value={affordability.otherMonthlyDebt}
              onChange={(value) => onChange({ otherMonthlyDebt: Math.max(0, value) })}
              step={50_000}
              placeholder="0"
            />
          </Field>
        </div>

        <div style={{ height: 14 }} />

        <div className="split">
          <Field
            label="Límite de deuda / ingreso"
            hint="La banca suele mirar 30%–40% para consumo."
          >
            <Segmented
              options={DTI_OPTIONS.map((value) => ({ value, label: `${value}%` }))}
              value={String(Math.round(affordability.maxDtiPct))}
              onChange={(value) => onChange({ maxDtiPct: Number(value) })}
              label="Límite de deuda sobre ingreso"
            />
          </Field>
          <Field
            label="Estrés de tasa"
            hint="Cuánto sube la cuota si la tasa aumenta; úsalo como prueba de resistencia."
          >
            <Segmented
              options={STRESS_OPTIONS.map((value) => ({
                value,
                label: `+${Number(value) / 100} pp`,
              }))}
              value={String(affordability.stressBps)}
              onChange={(value) => onChange({ stressBps: Number(value) })}
              label="Estrés de tasa"
            />
          </Field>
        </div>

        <div style={{ height: 14 }} />

        <Field
          label="Rentabilidad alternativa de tu dinero"
          htmlFor="investment"
          hint="Opcional. Si guardas el dinero en vez de abonar, ¿qué rendimiento esperas? Después de impuestos."
        >
          <NumberInput
            id="investment"
            value={affordability.investmentEaPct}
            onChange={(value) => onChange({ investmentEaPct: Math.max(0, value) })}
            step={0.1}
            min={0}
            max={1000}
            suffix="% EA"
          />
        </Field>
      </Card>

      {!hasIncome ? (
        <div style={{ marginTop: 18 }}>
          <EmptyState
            icon={<ScalesIcon size={19} />}
            title="Falta tu ingreso"
            action={
              <button
                type="button"
                className="btn btn--gold btn--sm"
                onClick={() => document.getElementById('income')?.focus()}
              >
                <WalletIcon size={12} /> Ingresar mi ingreso
              </button>
            }
          >
            Sin ingreso no hay DTI ni capacidad. Ingresa el valor neto mensual para ver si la cuota
            del crédito cabe en tu presupuesto.
          </EmptyState>
        </div>
      ) : (
        <>
          <section className="section" aria-labelledby="capacity-title">
            <SectionHead
              kicker="01 · Diagnóstico"
              title="Cuánto pesa la deuda"
              description="DTI = (cuota del crédito + otras deudas) / ingreso neto. Incluye seguros y comisiones."
              id="capacity-title"
            />
            <Card className="card--pad">
              <DtiGauge dtiPct={result.dtiPct} limitPct={result.maxDtiPct} />
              <div className="lineage" style={{ marginTop: 16 }}>
                <span>
                  <span className="dot dot--teal" /> Cuota del crédito:{' '}
                  <b>{formatCOP(result.basePayment)}</b>
                </span>
                <span>
                  <span className="dot dot--gold" /> Otras deudas:{' '}
                  <b>{formatCOP(result.otherMonthlyDebt)}</b>
                </span>
                <span>
                  <span className="dot dot--steel" /> Ingreso:{' '}
                  <b>{formatCOP(result.monthlyIncome)}</b>
                </span>
              </div>
              <div className="kpi-grid">
                <Kpi
                  label="Cuota / ingreso"
                  value={formatPct(result.paymentSharePct ?? 0, 1)}
                  sub={`La cuota sola, sin otras deudas`}
                  tone="gold"
                />
                <Kpi
                  label="Capacidad disponible"
                  value={formatCOP(result.capacity)}
                  sub={`Con DTI máximo de ${formatPct(result.maxDtiPct, 0)}`}
                />
                <Kpi
                  label="Capital máximo"
                  value={formatCOP(result.maxPrincipal)}
                  sub="Misma tasa y plazo, sin abonos"
                  tone="teal"
                />
                <Kpi
                  label="Holgura mensual"
                  value={formatCOP(result.headroom)}
                  sub={result.headroom >= 0 ? 'Después de la cuota' : 'Falta para caber'}
                  tone={result.headroom >= 0 ? 'teal' : 'rust'}
                />
              </div>

              <div style={{ marginTop: 14 }}>
                <Callout tone={status.tone} title={status.title}>
                  {status.body}
                </Callout>
              </div>

              {result.maxPrincipal > 0 && result.maxPrincipal !== config.principal ? (
                <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 12 }}>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => {
                      onApplyMaxPrincipal(result.maxPrincipal);
                      onNotify(
                        `Monto ajustado al capital máximo: ${formatCOP(result.maxPrincipal)}.`,
                      );
                    }}
                  >
                    <TargetIcon size={12} /> Usar capital máximo <ArrowRightIcon size={11} />
                  </button>
                </div>
              ) : null}
            </Card>
          </section>

          <section className="section" aria-labelledby="stress-title">
            <SectionHead
              kicker="02 · Resistencia"
              title="Si el viento sopla en contra"
              description="La misma deuda con una tasa más alta o un ingreso menor. La holgura es lo que queda después de la cuota."
              id="stress-title"
            />
            <Card>
              <div className="table-scroll" style={{ maxHeight: 'none' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">Escenario</th>
                      <th scope="col">Cuota</th>
                      <th scope="col">Ingreso</th>
                      <th scope="col">DTI</th>
                      <th scope="col">Holgura</th>
                      <th scope="col">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stressRows.map((row) => {
                      const payment = row.loan.ok ? row.loan.maxPayment : 0;
                      const dti =
                        row.income > 0
                          ? ((payment + result.otherMonthlyDebt) / row.income) * 100
                          : null;
                      const headroom =
                        row.income > 0
                          ? (row.income * result.maxDtiPct) / 100 -
                            result.otherMonthlyDebt -
                            payment
                          : null;
                      const isWorst = row.label.includes('Ingreso') && row.label.includes('pp');
                      return (
                        <tr key={row.label} className={isWorst ? 'row-extra' : ''}>
                          <td className="cell-strong">{row.label}</td>
                          <td>{formatCOP(payment)}</td>
                          <td>{formatCOP(row.income)}</td>
                          <td>{dti != null ? formatPct(dti, 1) : '—'}</td>
                          <td
                            className={headroom != null && headroom < 0 ? 'cell-rust' : 'cell-teal'}
                          >
                            {headroom != null ? formatCOP(headroom) : '—'}
                          </td>
                          <td>
                            <Badge tone={dti != null && dti > result.maxDtiPct ? 'rust' : 'teal'}>
                              {dti != null && dti > result.maxDtiPct ? 'no cabe' : 'cabe'}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="table-note">
                Los escenarios de ingreso suponen que tus otras deudas no cambian. Si tu ingreso es
                variable, usa el promedio de los últimos 6–12 meses y no el mejor mes.
              </p>
            </Card>
          </section>

          <section className="section" aria-labelledby="invest-title">
            <SectionHead
              kicker="03 · Decisión"
              title="Abonar o invertir"
              description="El abono a capital tiene un rendimiento implícito igual a la tasa del crédito. Compáralo con tu alternativa después de impuestos."
              id="invest-title"
            />
            <Card className="card--pad">
              <div className="split">
                <div className="invest-threshold">
                  <span className="invest-label">Rendimiento implícito del abono</span>
                  <strong className="invest-value">
                    {formatPct(result.prepaymentReturnEaPct, 2)} EA
                  </strong>
                  <span className="invest-note">
                    Es libre de riesgo y no paga impuestos: es tu umbral.
                  </span>
                </div>
                <div>
                  {result.investAdvice === 'unknown' ? (
                    <Callout tone="neutral" title="Falta tu alternativa">
                      Ingresa arriba la rentabilidad que esperas de tu dinero para comparar. Si no
                      la sabes, usa una tasa de un CDT o cuenta de alto rendimiento como referencia.
                    </Callout>
                  ) : (
                    <Callout
                      tone={result.investAdvice === 'prepay' ? 'teal' : 'gold'}
                      title={
                        result.investAdvice === 'prepay'
                          ? 'Abonar es la mejor opción matemática'
                          : result.investAdvice === 'invest'
                            ? 'Invertir puede ser mejor'
                            : 'Están casi empatados'
                      }
                    >
                      Tu alternativa rinde{' '}
                      <strong>{formatPct(affordability.investmentEaPct, 2)} EA</strong>. La
                      diferencia es{' '}
                      <strong>
                        {formatPct(
                          Math.abs(affordability.investmentEaPct - result.prepaymentReturnEaPct),
                          2,
                        )}
                      </strong>
                      . Antes de decidir, descuenta comisiones e impuestos de la inversión y valora
                      la liquidez: abonar no se deshace.
                    </Callout>
                  )}
                </div>
              </div>
              <p className="table-note">
                <InfoIcon size={11} /> El cálculo de DTI y capital máximo usa la cuota regular sin
                abonos. Tu capacidad real también depende de gastos básicos que no pedimos aquí.
              </p>
            </Card>
          </section>
        </>
      )}

      <div className="split" style={{ marginTop: 24 }}>
        <Callout tone="gold" title="Qué no mide este análisis" icon={<InfoIcon size={15} />}>
          No evalúa tu historial crediticio, estabilidad laboral, codeudores, garantías ni el score
          de las centrales. Una entidad puede rechazarte o aprobarte con condiciones distintas.
        </Callout>
        <Callout tone="teal" title="Privacidad por diseño" icon={<LockIcon size={15} />}>
          El ingreso y las deudas se guardan solo en tu navegador. No hay backend, cookies de
          terceros ni analítica. Puedes borrar todo desde la pestaña <strong>Método</strong>.
        </Callout>
      </div>
    </div>
  );
}
