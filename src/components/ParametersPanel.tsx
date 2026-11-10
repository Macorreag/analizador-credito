import { useState } from 'react';
import {
  eaFromMonthly,
  monthlyFromNominal,
  monthlyRateFromEA,
  type CostConfig,
  type ExtraCharge,
  type GraceType,
  type LoanAnalysis,
  type LoanConfig,
} from '../lib/credit';
import { formatCOP, formatPct } from '../lib/format';
import { Field, MoneyInput, NumberInput, Segmented } from './ui';
import { RefreshIcon, XIcon } from './icons';

type RateMode = 'ea' | 'monthly' | 'nominal';

const RATE_MODES: Array<{ value: RateMode; label: string }> = [
  { value: 'ea', label: 'EA' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'nominal', label: 'Nominal' },
];

const SYSTEM_HELP: Record<LoanConfig['system'], string> = {
  french: 'Cuota fija: pagas más interés al principio y menos capital.',
  german: 'Capital fijo: la cuota empieza alta y baja cada mes.',
  american: 'Solo intereses cada mes; el capital se paga al final.',
};

const GRACE_HELP: Record<GraceType, string> = {
  none: 'Sin meses de gracia: amortizas desde el primer pago.',
  'interest-only': 'Pagas solo intereses: el capital no baja durante la gracia.',
  total: 'No pagas intereses: se capitalizan y el saldo crece.',
};

export function ParametersPanel({
  config,
  analysis,
  onChange,
  onCostsChange,
  onReset,
}: {
  config: LoanConfig;
  analysis: LoanAnalysis;
  onChange: (patch: Partial<LoanConfig>) => void;
  onCostsChange: (patch: Partial<CostConfig>) => void;
  onReset: () => void;
}) {
  const [rateMode, setRateMode] = useState<RateMode>('ea');
  const monthly = monthlyRateFromEA(config.annualRatePct);
  const nominal = monthly * 12 * 100;
  const ea = config.annualRatePct;

  const rateValue =
    rateMode === 'ea'
      ? Number(ea.toFixed(2))
      : rateMode === 'monthly'
        ? Number((monthly * 100).toFixed(4))
        : Number(nominal.toFixed(2));

  const rateLabel =
    rateMode === 'ea'
      ? 'Tasa efectiva anual (EA)'
      : rateMode === 'monthly'
        ? 'Tasa periódica mensual'
        : 'Tasa nominal anual (NAMV)';

  const rateStep = rateMode === 'ea' ? 0.01 : rateMode === 'monthly' ? 0.0001 : 0.01;

  function handleRate(value: number) {
    if (rateMode === 'ea') {
      onChange({ annualRatePct: Math.max(0, value) });
    } else if (rateMode === 'monthly') {
      onChange({ annualRatePct: eaFromMonthly(Math.max(0, value) / 100) });
    } else {
      onChange({ annualRatePct: eaFromMonthly(monthlyFromNominal(Math.max(0, value))) });
    }
  }

  const errors = analysis.issues.filter((issue) => issue.severity === 'error');
  const warnings = analysis.issues.filter((issue) => issue.severity === 'warning');
  const hasError = (field: string) => errors.some((issue) => issue.field === field);
  const charges = config.costs.charges ?? [];
  const activeCosts = [
    config.costs.insuranceMonthlyPct > 0,
    config.costs.monthlyFee > 0,
    config.costs.originationPct > 0,
    config.costs.gmf,
    charges.length > 0,
  ].filter(Boolean).length;
  const [costsOpen, setCostsOpen] = useState(activeCosts > 0);

  function addCharge(label: string) {
    if (charges.length >= 20) return;
    const id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `charge-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const charge: ExtraCharge = {
      id,
      label,
      amount: 0,
      frequency: 'monthly',
      fromMonth: 1,
      toMonth: null,
    };
    onCostsChange({ charges: [...charges, charge] });
  }

  function updateCharge(id: string, patch: Partial<ExtraCharge>) {
    onCostsChange({
      charges: charges.map((charge) => (charge.id === id ? { ...charge, ...patch } : charge)),
    });
  }

  function removeCharge(id: string) {
    onCostsChange({ charges: charges.filter((charge) => charge.id !== id) });
  }

  function setGraceMonths(value: number) {
    const months = Math.max(0, Math.round(value));
    onChange({
      graceMonths: months,
      graceType: months > 0 && config.graceType === 'none' ? 'interest-only' : config.graceType,
    });
  }

  function setGraceType(value: GraceType) {
    onChange({
      graceType: value,
      graceMonths: value === 'none' ? 0 : config.graceMonths || 1,
    });
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <div className="panel-kicker">Parámetros</div>
          <div className="panel-title">El crédito</div>
        </div>
        <span className="badge">en vivo</span>
      </div>

      <div className="panel-section">
        <div className="panel-section-title">
          <span>Monto y plazo</span>
          <span className="num">01</span>
        </div>

        <Field
          label="Monto del crédito"
          htmlFor="principal"
          hint="El capital que te desembolsan, sin incluir seguros ni comisiones."
        >
          <MoneyInput
            id="principal"
            value={config.principal}
            onChange={(value) => onChange({ principal: Math.max(0, value) })}
            invalid={hasError('principal')}
            step={500_000}
          />
          <div className="chips" style={{ marginTop: 7 }}>
            {[30_000_000, 50_000_000, 100_000_000, 150_000_000].map((amount) => (
              <button
                key={amount}
                type="button"
                className="chip-btn"
                onClick={() => onChange({ principal: amount })}
              >
                {amount / 1_000_000}M
              </button>
            ))}
          </div>
        </Field>

        <div style={{ height: 12 }} />

        <Field label="Plazo total (meses)" htmlFor="term" hint="Incluye los meses de gracia.">
          <NumberInput
            id="term"
            value={config.termMonths}
            onChange={(value) => onChange({ termMonths: Math.max(1, Math.round(value)) })}
            min={1}
            max={600}
            step={1}
            invalid={hasError('termMonths')}
          />
          <div className="chips" style={{ marginTop: 7 }}>
            {[36, 60, 84, 120, 180].map((months) => (
              <button
                key={months}
                type="button"
                className="chip-btn"
                onClick={() => onChange({ termMonths: months })}
              >
                {months}m
              </button>
            ))}
          </div>
        </Field>
      </div>

      <div className="panel-section">
        <div className="panel-section-title">
          <span>Tasa</span>
          <span className="num">02</span>
        </div>
        <Field
          label={rateLabel}
          htmlFor="rate"
          action={
            <span className="muted" style={{ fontSize: 9 }}>
              {rateMode === 'monthly' ? '÷ 100' : rateMode === 'nominal' ? 'NAMV' : 'efectiva'}
            </span>
          }
          hint="La EA manda en Colombia. Cambia de unidad sin reescribir el número."
        >
          <Segmented
            options={RATE_MODES}
            value={rateMode}
            onChange={setRateMode}
            label="Unidad de la tasa"
          />
          <div style={{ height: 7 }} />
          <NumberInput
            id="rate"
            value={rateValue}
            onChange={handleRate}
            step={rateStep}
            min={0}
            suffix="%"
            invalid={hasError('annualRatePct')}
          />
        </Field>

        <dl className="rate-readout">
          <div>
            <dt>Mensual</dt>
            <dd>{formatPct(monthly * 100, 4)}</dd>
          </div>
          <div>
            <dt>Nominal anual</dt>
            <dd>{formatPct(nominal, 2)}</dd>
          </div>
          <div>
            <dt>Efectiva anual</dt>
            <dd>{formatPct(ea, 2)}</dd>
          </div>
          <div>
            <dt>EA + 2 pp</dt>
            <dd>{formatPct(ea + 2, 2)}</dd>
          </div>
        </dl>
      </div>

      <div className="panel-section">
        <div className="panel-section-title">
          <span>Estructura</span>
          <span className="num">03</span>
        </div>
        <Field label="Sistema de amortización" hint={SYSTEM_HELP[config.system]}>
          <Segmented
            options={[
              { value: 'french', label: 'Francés', title: 'Cuota fija' },
              { value: 'german', label: 'Alemán', title: 'Capital fijo' },
              { value: 'american', label: 'Americano', title: 'Interés + capital al final' },
            ]}
            value={config.system}
            onChange={(system) => onChange({ system })}
            label="Sistema de amortización"
          />
        </Field>

        <div style={{ height: 12 }} />

        <div className="field-row">
          <Field label="Meses de gracia" htmlFor="grace" hint={GRACE_HELP[config.graceType]}>
            <NumberInput
              id="grace"
              value={config.graceMonths}
              onChange={setGraceMonths}
              min={0}
              max={Math.max(0, config.termMonths - 1)}
              step={1}
              invalid={hasError('graceMonths')}
            />
          </Field>
          <Field label="Tipo de gracia" htmlFor="grace-type">
            <select
              id="grace-type"
              className="select"
              value={config.graceType}
              onChange={(event) => setGraceType(event.target.value as GraceType)}
            >
              <option value="none">Sin gracia</option>
              <option value="interest-only">Solo intereses</option>
              <option value="total">Gracia total</option>
            </select>
          </Field>
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-section-title">
          <span>Abonos</span>
          <span className="num">04</span>
        </div>
        <div className="choice-grid" role="radiogroup" aria-label="Estrategia de abonos">
          <button
            type="button"
            role="radio"
            aria-checked={config.strategy === 'reduce-term'}
            className={`choice ${config.strategy === 'reduce-term' ? 'is-active' : ''}`}
            onClick={() => onChange({ strategy: 'reduce-term' })}
          >
            <span className="choice-dot" aria-hidden="true" />
            <span>
              <span className="choice-title">Reducir plazo</span>
              <span className="choice-desc">Misma cuota, menos meses. Máximo ahorro.</span>
            </span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={config.strategy === 'reduce-payment'}
            className={`choice ${config.strategy === 'reduce-payment' ? 'is-active' : ''}`}
            onClick={() => onChange({ strategy: 'reduce-payment' })}
          >
            <span className="choice-dot" aria-hidden="true" />
            <span>
              <span className="choice-title">Reducir cuota</span>
              <span className="choice-desc">Mismo plazo, cuota más baja. Alivio mensual.</span>
            </span>
          </button>
        </div>
      </div>

      <details
        className="details"
        open={costsOpen}
        onToggle={(event) => setCostsOpen(event.currentTarget.open)}
      >
        <summary>
          <span>Costos, cargos y GMF</span>
          <span className="inline">
            {activeCosts > 0 ? <span className="badge badge--teal">{activeCosts}</span> : null}
          </span>
        </summary>
        <div className="details-body">
          <div className="field-row">
            <Field
              label="Seguro mensual"
              htmlFor="insurance"
              hint="% del saldo. Típico: 0,03%–0,1%."
            >
              <NumberInput
                id="insurance"
                value={config.costs.insuranceMonthlyPct}
                onChange={(value) => onCostsChange({ insuranceMonthlyPct: Math.max(0, value) })}
                min={0}
                max={5}
                step={0.01}
                suffix="%"
                invalid={hasError('costs')}
              />
            </Field>
            <Field
              label="Cargo fijo mensual"
              htmlFor="fee"
              hint="Cuota de manejo, administración u otro fijo."
            >
              <MoneyInput
                id="fee"
                value={config.costs.monthlyFee}
                onChange={(value) => onCostsChange({ monthlyFee: Math.max(0, value) })}
                step={1_000}
                invalid={hasError('costs')}
              />
            </Field>
          </div>
          <div style={{ height: 10 }} />
          <div className="field-row">
            <Field label="Comisión de apertura" htmlFor="origination" hint="% del capital.">
              <NumberInput
                id="origination"
                value={config.costs.originationPct}
                onChange={(value) => onCostsChange({ originationPct: Math.max(0, value) })}
                min={0}
                max={50}
                step={0.1}
                suffix="%"
                invalid={hasError('costs')}
              />
            </Field>
            <Field label="Primer pago" htmlFor="start-date" hint="Opcional, solo para fechas.">
              <input
                id="start-date"
                type="month"
                className="input"
                value={config.startDate ? config.startDate.slice(0, 7) : ''}
                onChange={(event) =>
                  onChange({ startDate: event.target.value ? `${event.target.value}-01` : null })
                }
              />
            </Field>
          </div>
          <label className="check-row">
            <input
              type="checkbox"
              checked={config.costs.gmf}
              onChange={(event) => onCostsChange({ gmf: event.target.checked })}
            />
            <span>
              Aplicar GMF (4 × 1.000)
              <small>0,4% sobre el desembolso y sobre cada pago.</small>
            </span>
          </label>

          <div className="charge-section">
            <div className="charge-section-head">
              <div>
                <div className="charge-section-title">
                  Cargos y notas <span className="badge">opcional</span>
                </div>
                <p className="field-hint">
                  Honorarios, mora, otros cargos o notas crédito. Se suman al pago del mes; usa un
                  valor negativo para una nota crédito.
                </p>
              </div>
            </div>

            <div className="charge-add-row">
              <select
                className="select charge-add"
                value=""
                onChange={(event) => {
                  if (event.target.value) addCharge(event.target.value);
                }}
                aria-label="Agregar un cargo o nota"
              >
                <option value="">+ Agregar concepto…</option>
                <option value="Honorarios">Honorarios</option>
                <option value="Interés de mora">Interés de mora</option>
                <option value="Otros cargos fijos">Otros cargos fijos</option>
                <option value="Nota crédito">Nota crédito</option>
                <option value="Cargo fijo">Cargo fijo</option>
              </select>
              <span className="tiny">{charges.length}/20</span>
            </div>

            {charges.length === 0 ? (
              <p className="tiny">Sin cargos adicionales.</p>
            ) : (
              <div className="charge-list">
                {charges.map((charge, index) => (
                  <div className="charge-row" key={charge.id}>
                    <div className="charge-row-head">
                      <input
                        className="input charge-label"
                        value={charge.label}
                        maxLength={60}
                        placeholder="Concepto"
                        onChange={(event) => updateCharge(charge.id, { label: event.target.value })}
                        aria-label={`Concepto del cargo ${index + 1}`}
                      />
                      <button
                        type="button"
                        className="icon-btn charge-remove"
                        onClick={() => removeCharge(charge.id)}
                        aria-label={`Eliminar ${charge.label || `cargo ${index + 1}`}`}
                      >
                        <XIcon size={12} />
                      </button>
                    </div>
                    <div className="charge-grid">
                      <label className="charge-field">
                        <span>Valor</span>
                        <NumberInput
                          value={charge.amount}
                          onChange={(value) => updateCharge(charge.id, { amount: value })}
                          step={1_000}
                          prefix="$"
                          aria-label={`Valor de ${charge.label || `cargo ${index + 1}`}`}
                        />
                      </label>
                      <label className="charge-field">
                        <span>Frecuencia</span>
                        <select
                          className="select"
                          value={charge.frequency}
                          onChange={(event) =>
                            updateCharge(charge.id, {
                              frequency: event.target.value as ExtraCharge['frequency'],
                              toMonth: event.target.value === 'once' ? null : charge.toMonth,
                            })
                          }
                          aria-label={`Frecuencia de ${charge.label || `cargo ${index + 1}`}`}
                        >
                          <option value="monthly">Mensual</option>
                          <option value="once">Único</option>
                        </select>
                      </label>
                      <label className="charge-field">
                        <span>Desde mes</span>
                        <NumberInput
                          value={charge.fromMonth}
                          onChange={(value) =>
                            updateCharge(charge.id, {
                              fromMonth: Math.max(
                                1,
                                Math.min(config.termMonths, Math.round(value)),
                              ),
                            })
                          }
                          min={1}
                          max={config.termMonths}
                          step={1}
                          aria-label={`Mes inicial de ${charge.label || `cargo ${index + 1}`}`}
                        />
                      </label>
                      {charge.frequency === 'monthly' ? (
                        <label className="charge-field">
                          <span>Hasta mes</span>
                          <NumberInput
                            value={charge.toMonth ?? 0}
                            onChange={(value) =>
                              updateCharge(charge.id, {
                                toMonth:
                                  value <= 0
                                    ? null
                                    : Math.max(
                                        charge.fromMonth,
                                        Math.min(config.termMonths, Math.round(value)),
                                      ),
                              })
                            }
                            min={charge.fromMonth}
                            max={config.termMonths}
                            step={1}
                            blankZero
                            placeholder="Fin"
                            aria-label={`Mes final de ${charge.label || `cargo ${index + 1}`}, vacío hasta el final`}
                          />
                        </label>
                      ) : (
                        <div className="charge-field charge-field--note">
                          <span>Alcance</span>
                          <em>Solo el mes {charge.fromMonth}</em>
                        </div>
                      )}
                    </div>
                    <p className={`charge-help ${charge.amount < 0 ? 'is-credit' : ''}`.trim()}>
                      {charge.amount < 0
                        ? 'Nota crédito: reduce el pago del mes.'
                        : charge.amount === 0
                          ? 'Define un valor para que tenga efecto.'
                          : 'Cargo: se suma al pago del mes.'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </details>

      {errors.length > 0 ? (
        <div className="panel-section" role="alert">
          <div className="validation">
            {errors.slice(0, 4).map((issue) => (
              <div className="validation-item" key={`${issue.field}-${issue.message}`}>
                {issue.message}
              </div>
            ))}
            {errors.length > 4 ? (
              <div className="validation-item">Y {errors.length - 4} error(es) más.</div>
            ) : null}
          </div>
        </div>
      ) : warnings.length > 0 ? (
        <div className="panel-section">
          <div className="validation validation--warning">
            {warnings.slice(0, 2).map((issue) => (
              <div className="validation-item" key={`${issue.field}-${issue.message}`}>
                {issue.message}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="panel-foot">
        <span>
          Cuota máx.
          <br />
          <b className="num" style={{ color: 'var(--gold-bright)', fontSize: 13 }}>
            {analysis.ok ? formatCOP(analysis.maxPayment) : '—'}
          </b>
        </span>
        <span style={{ textAlign: 'right' }}>
          Interés total
          <br />
          <b className="num" style={{ color: 'var(--text)', fontSize: 13 }}>
            {analysis.ok ? formatCOP(analysis.totalInterest) : '—'}
          </b>
        </span>
      </div>

      <div
        className="panel-section"
        style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}
      >
        <button type="button" className="btn btn--quiet" onClick={onReset}>
          <RefreshIcon size={12} /> Restablecer
        </button>
        <span className="tiny">Guardado en este navegador</span>
      </div>
    </div>
  );
}
