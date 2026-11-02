import { useMemo, useState } from 'react';
import { computeLoan, type LoanAnalysis, type LoanConfig } from '../lib/credit';
import { formatCOP, formatMonths, formatPct } from '../lib/format';
import type { SavedScenario } from '../lib/scenarios';
import { MAX_SCENARIOS } from '../lib/scenarios';
import { Badge, Callout, Card, EmptyState, SectionHead } from './ui';
import { ArrowRightIcon, InfoIcon, LayersIcon, PlusIcon, TrashIcon } from './icons';

interface ComparisonEntry {
  id: string;
  name: string;
  meta: string;
  config: LoanConfig;
  analysis: LoanAnalysis;
  isCurrent: boolean;
  isReference: boolean;
}

export function ScenariosPanel({
  scenarios,
  config,
  analysis,
  baseline,
  onSave,
  onApply,
  onDelete,
  onNotify,
}: {
  scenarios: SavedScenario[];
  config: LoanConfig;
  analysis: LoanAnalysis;
  baseline: LoanAnalysis;
  onSave: (name: string) => boolean;
  onApply: (id: string) => void;
  onDelete: (id: string) => void;
  onNotify: (message: string) => void;
}) {
  const [name, setName] = useState('');

  const savedComparisons = useMemo(
    () =>
      scenarios.map((scenario) => {
        const scenarioAnalysis = computeLoan(scenario.config);
        return {
          ...scenario,
          analysis: scenarioAnalysis,
        };
      }),
    [scenarios],
  );

  const entries: ComparisonEntry[] = [
    {
      id: 'current',
      name: 'Plan actual',
      meta: `${formatCOP(config.principal)} · ${formatPct(config.annualRatePct, 2)} EA · ${config.termMonths} meses · ${
        config.extras.filter((extra) => extra.amount > 0).length
      } abono(s)`,
      config,
      analysis,
      isCurrent: true,
      isReference: false,
    },
    ...savedComparisons.map((scenario) => ({
      id: scenario.id,
      name: scenario.name,
      meta: `${formatCOP(scenario.config.principal)} · ${formatPct(scenario.config.annualRatePct, 2)} EA · ${
        scenario.config.termMonths
      } meses · ${scenario.config.extras.filter((extra) => extra.amount > 0).length} abono(s)`,
      config: scenario.config,
      analysis: scenario.analysis,
      isCurrent: false,
      isReference: false,
    })),
    {
      id: 'baseline',
      name: 'Sin abonos',
      meta: 'Referencia calculada con la estructura actual, sin abonos.',
      config: { ...config, extras: [] },
      analysis: baseline,
      isCurrent: false,
      isReference: true,
    },
  ];

  const maxInterest = Math.max(
    ...entries.map((entry) => (entry.analysis.ok ? entry.analysis.totalInterest : 0)),
    1,
  );
  const maxReached = scenarios.length >= MAX_SCENARIOS;

  function handleSave() {
    const finalName = name.trim() || `Plan ${scenarios.length + 2}`;
    const saved = onSave(finalName);
    if (saved) {
      setName('');
      onNotify(`Escenario “${finalName}” guardado en este navegador.`);
    } else {
      onNotify(`Máximo ${MAX_SCENARIOS} escenarios. Elimina uno para guardar otro.`);
    }
  }

  return (
    <div className="content-panel">
      <Card className="card--pad">
        <div className="card-head">
          <div>
            <div className="card-title">Guarda y compara planes</div>
            <div className="card-sub">
              Prueba un plazo distinto, negocia la tasa o cambia los abonos. Cada escenario queda en
              este navegador; nada se envía a un servidor.
            </div>
          </div>
          <Badge tone="teal">
            {scenarios.length}/{MAX_SCENARIOS} guardados
          </Badge>
        </div>
        <div className="scenario-form">
          <input
            className="input"
            placeholder={`Nombre del escenario (ej. Plan ${scenarios.length + 2})`}
            value={name}
            maxLength={60}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleSave();
              }
            }}
            aria-label="Nombre del escenario"
            disabled={maxReached}
          />
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={handleSave}
            disabled={maxReached}
          >
            <PlusIcon size={13} /> Guardar plan actual
          </button>
        </div>
        {maxReached ? (
          <p className="table-note">
            Llegaste al máximo de {MAX_SCENARIOS} escenarios. Elimina uno para liberar espacio.
          </p>
        ) : null}
      </Card>

      <section className="section" aria-labelledby="scenarios-title">
        <SectionHead
          kicker="01 · Comparación"
          title="Tus planes, lado a lado"
          description="El plan actual y la referencia sin abonos siempre están visibles."
          id="scenarios-title"
        />
        <Card>
          <div className="scenario-list" style={{ padding: 12 }}>
            {entries.map((entry) => (
              <div
                className={`scenario-row ${entry.isCurrent ? 'is-current' : ''}`.trim()}
                key={entry.id}
              >
                <div style={{ minWidth: 0 }}>
                  <div className="scenario-name">
                    {entry.name} {entry.isCurrent ? <Badge tone="gold">actual</Badge> : null}
                    {entry.isReference ? <Badge>referencia</Badge> : null}
                  </div>
                  <div className="scenario-meta">{entry.meta}</div>
                </div>
                <div className="scenario-stat">
                  <span>Interés</span>
                  {entry.analysis.ok ? (
                    <>
                      {formatCOP(entry.analysis.totalInterest)}
                      {!entry.isCurrent && !entry.isReference ? (
                        <em
                          className={
                            entry.analysis.totalInterest <= analysis.totalInterest
                              ? 'cell-teal'
                              : 'cell-rust'
                          }
                          style={{ display: 'block', fontSize: 8.5, fontStyle: 'normal' }}
                        >
                          {entry.analysis.totalInterest <= analysis.totalInterest ? '−' : '+'}
                          {formatCOP(
                            Math.abs(analysis.totalInterest - entry.analysis.totalInterest),
                          )}{' '}
                          vs actual
                        </em>
                      ) : null}
                    </>
                  ) : (
                    '—'
                  )}
                </div>
                <div className="scenario-stat">
                  <span>Costo total</span>
                  {entry.analysis.ok ? formatCOP(entry.analysis.totalCost) : '—'}
                </div>
                <div className="scenario-stat">
                  <span>Plazo</span>
                  {entry.analysis.ok ? formatMonths(entry.analysis.months) : '—'}
                </div>
                <div className="scenario-actions">
                  {!entry.isCurrent && !entry.isReference ? (
                    <>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => {
                          onApply(entry.id);
                          onNotify(`Escenario “${entry.name}” aplicado.`);
                        }}
                        disabled={!entry.analysis.ok}
                      >
                        Aplicar
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => {
                          onDelete(entry.id);
                          onNotify(`Escenario “${entry.name}” eliminado.`);
                        }}
                        aria-label={`Eliminar escenario ${entry.name}`}
                      >
                        <TrashIcon size={14} />
                      </button>
                    </>
                  ) : (
                    <span className="tiny">
                      {entry.isReference ? 'solo lectura' : 'en edición'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="section" aria-labelledby="scenario-bars-title">
        <SectionHead
          kicker="02 · Lectura rápida"
          title="Interés total por escenario"
          description="La barra más corta no siempre es la mejor: mira también la cuota y el plazo."
          id="scenario-bars-title"
        />
        <Card className="card--pad">
          <div className="compare-bars">
            {entries.map((entry) => {
              const value = entry.analysis.ok ? entry.analysis.totalInterest : 0;
              return (
                <div
                  className={`compare-row ${entry.isCurrent ? 'is-current' : ''}`.trim()}
                  key={`bar-${entry.id}`}
                >
                  <span className="compare-label" title={entry.name}>
                    {entry.name}
                  </span>
                  <span className="compare-track">
                    <span
                      className="compare-fill"
                      style={{ width: `${(value / maxInterest) * 100}%` }}
                    />
                  </span>
                  <span className="compare-value">{formatCOP(value)}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </section>

      {scenarios.length === 0 ? (
        <div style={{ marginTop: 18 }}>
          <EmptyState
            icon={<LayersIcon size={19} />}
            title="Aún no hay escenarios guardados"
            action={
              <button type="button" className="btn btn--gold btn--sm" onClick={handleSave}>
                <PlusIcon size={12} /> Guardar plan actual
              </button>
            }
          >
            Guarda el plan actual, cambia un parámetro y guarda otro. Comparar dos o tres planes
            evita decidir con una sola foto.
          </EmptyState>
        </div>
      ) : null}

      <div style={{ marginTop: 18 }}>
        <Callout tone="gold" title="Qué mirar al comparar" icon={<InfoIcon size={15} />}>
          Prioriza el <strong>costo total</strong> si puedes pagar la cuota; prioriza la{' '}
          <strong>cuota y la holgura</strong> si tu flujo es ajustado. Un plan con menos interés
          pero una cuota imposible no es un buen plan.
        </Callout>
      </div>

      <p className="table-note" style={{ marginTop: 16 }}>
        <ArrowRightIcon size={11} /> Los escenarios viven en <code>localStorage</code> de este
        navegador. Si borras datos del sitio, desaparecen.
      </p>
    </div>
  );
}
