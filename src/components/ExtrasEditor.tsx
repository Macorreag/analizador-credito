import { useMemo, useState } from 'react';
import {
  computeLoan,
  type ExtraFrequency,
  type ExtraPayment,
  type LoanAnalysis,
  type LoanConfig,
} from '../lib/credit';
import { formatCOP, formatCompactCOP, formatMonths, formatMonthLabel } from '../lib/format';
import { Badge, EmptyState, Field, MoneyInput, Segmented } from './ui';
import { ArrowRightIcon, InfoIcon, PlusIcon, TrashIcon, XIcon } from './icons';

interface Draft {
  id: string | null;
  clientId: string;
  fromMonth: number;
  amount: number;
  frequency: ExtraFrequency;
  toMonth: number | null;
  isNew: boolean;
}

const FREQUENCY_LABEL: Record<ExtraFrequency, string> = {
  once: 'Único',
  monthly: 'Mensual',
  annual: 'Anual',
};

const FREQUENCY_SUFFIX: Record<ExtraFrequency, string> = {
  once: '',
  monthly: '/mes',
  annual: '/año',
};

function buildNewDraft(month: number, config: LoanConfig): Draft {
  const suggested = Math.min(
    5_000_000,
    Math.max(100_000, Math.round((config.principal * 0.01) / 10_000) * 10_000),
  );
  return {
    id: null,
    clientId: newExtraId(),
    fromMonth: Math.min(Math.max(1, month), config.termMonths),
    amount: suggested,
    frequency: 'once',
    toMonth: null,
    isNew: true,
  };
}

function newExtraId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `extra-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ExtrasEditor({
  config,
  analysis,
  onChange,
  onNotify,
  initialMonth,
}: {
  config: LoanConfig;
  analysis: LoanAnalysis;
  onChange: (extras: ExtraPayment[]) => void;
  onNotify: (message: string) => void;
  initialMonth?: number | null;
}) {
  const [draft, setDraft] = useState<Draft | null>(() =>
    initialMonth != null ? buildNewDraft(initialMonth, config) : null,
  );

  function openNew(month: number) {
    setDraft(buildNewDraft(month, config));
  }

  function openEdit(extra: ExtraPayment) {
    setDraft({
      id: extra.id,
      clientId: extra.id,
      fromMonth: extra.fromMonth,
      amount: extra.amount,
      frequency: extra.frequency,
      toMonth: extra.toMonth ?? null,
      isNew: false,
    });
  }

  const candidateExtras = useMemo<ExtraPayment[] | null>(() => {
    if (!draft) return null;
    const next: ExtraPayment = {
      id: draft.id ?? draft.clientId,
      amount: Math.max(0, draft.amount),
      fromMonth: Math.max(1, Math.round(draft.fromMonth)),
      frequency: draft.frequency,
      toMonth: draft.frequency === 'once' ? null : draft.toMonth,
    };
    if (next.amount <= 0) return config.extras.filter((extra) => extra.id !== draft.id);
    if (!draft.isNew && draft.id) {
      return config.extras.map((extra) => (extra.id === draft.id ? next : extra));
    }
    return [...config.extras, next];
  }, [draft, config.extras]);

  const preview = useMemo(() => {
    if (!candidateExtras) return null;
    return computeLoan({ ...config, extras: candidateExtras });
  }, [config, candidateExtras]);

  const previewErrors = preview?.issues.filter((issue) => issue.severity === 'error') ?? [];
  const previewSavings = preview?.ok ? analysis.totalInterest - preview.totalInterest : 0;
  const previewMonthsDelta = preview?.ok ? analysis.months - preview.months : 0;
  const draftAmountValid = draft != null && draft.amount > 0;
  const draftDateValid =
    draft != null &&
    draft.fromMonth >= 1 &&
    draft.fromMonth <= config.termMonths &&
    (draft.frequency === 'once' ||
      draft.toMonth == null ||
      (draft.toMonth >= draft.fromMonth && draft.toMonth <= config.termMonths));
  const canSave = Boolean(draft && draftAmountValid && draftDateValid && preview?.ok);

  function save() {
    if (!draft || !candidateExtras || !preview?.ok) return;
    onChange(candidateExtras);
    setDraft(null);
    onNotify(draft.isNew ? 'Abono agregado al plan.' : 'Abono actualizado.');
  }

  function remove(id: string) {
    onChange(config.extras.filter((extra) => extra.id !== id));
    if (draft?.id === id) setDraft(null);
    onNotify('Abono eliminado.');
  }

  const sortedExtras = [...config.extras].sort((a, b) => a.fromMonth - b.fromMonth);
  const maxAmount = Math.max(config.principal, 10_000_000);
  const maxToMonth = config.termMonths;
  const usedMonths = new Set(config.extras.map((extra) => extra.fromMonth));
  let nextFreeMonth = 1;
  while (usedMonths.has(nextFreeMonth) && nextFreeMonth < config.termMonths) {
    nextFreeMonth += 1;
  }

  return (
    <div className="card card--pad" id="abonos">
      <div className="card-head">
        <div>
          <div className="card-title">Abonos a capital</div>
          <div className="card-sub">
            Un abono es dinero extra que baja el saldo. Puede ser único, mensual o anual.
          </div>
        </div>
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={() => openNew(nextFreeMonth)}
        >
          <PlusIcon size={13} /> Agregar abono
        </button>
      </div>

      {sortedExtras.length === 0 && !draft ? (
        <EmptyState
          icon={<PlusIcon size={18} />}
          title="Todavía no hay abonos"
          action={
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => openNew(1)}>
              Crear el primero
            </button>
          }
        >
          Prueba con un abono único en el mes 12 o con 1% del capital cada mes. El gráfico y los
          indicadores se recalculan al instante.
        </EmptyState>
      ) : (
        <div className="extras-list">
          {sortedExtras.map((extra) => (
            <div
              className={`extra-chip ${extra.frequency !== 'once' ? 'is-recurring' : ''}`.trim()}
              key={extra.id}
            >
              <button type="button" className="extra-chip-main" onClick={() => openEdit(extra)}>
                {extra.frequency !== 'once' ? (
                  <span className="extra-tag">{FREQUENCY_LABEL[extra.frequency]}</span>
                ) : null}
                <span>
                  {extra.frequency === 'once'
                    ? `Mes ${extra.fromMonth}`
                    : `Desde mes ${extra.fromMonth}`}
                  {extra.toMonth != null && extra.frequency !== 'once' ? `–${extra.toMonth}` : ''} ·{' '}
                  <b>
                    {formatCompactCOP(extra.amount)}
                    {FREQUENCY_SUFFIX[extra.frequency]}
                  </b>
                </span>
              </button>
              <button
                type="button"
                className="extra-remove"
                onClick={() => remove(extra.id)}
                aria-label={`Eliminar abono de ${formatCOP(extra.amount)} en el mes ${extra.fromMonth}`}
              >
                <XIcon size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {draft ? (
        <div className="extra-form">
          <div className="extra-form-head">
            <div className="extra-form-title">
              {draft.isNew ? 'Nuevo abono' : 'Editar abono'}{' '}
              <Badge tone={draft.frequency === 'once' ? 'neutral' : 'teal'}>
                {FREQUENCY_LABEL[draft.frequency]}
              </Badge>
            </div>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setDraft(null)}
              aria-label="Cerrar editor"
            >
              <XIcon size={14} />
            </button>
          </div>

          <div className="extra-form-grid">
            <Field
              label={draft.frequency === 'once' ? 'Mes del abono' : 'Desde el mes'}
              htmlFor="extra-month"
              hint={formatMonthLabel(config.startDate, draft.fromMonth)}
            >
              <select
                id="extra-month"
                className="select"
                value={draft.fromMonth}
                onChange={(event) => setDraft({ ...draft, fromMonth: Number(event.target.value) })}
              >
                {Array.from({ length: config.termMonths }, (_, index) => index + 1).map((month) => (
                  <option key={month} value={month}>
                    Mes {month} · {formatMonthLabel(config.startDate, month)}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Frecuencia"
              hint="Los recurrentes se repiten hasta el final o hasta el mes que elijas."
            >
              <Segmented
                options={[
                  { value: 'once', label: 'Único' },
                  { value: 'monthly', label: 'Mensual' },
                  { value: 'annual', label: 'Anual' },
                ]}
                value={draft.frequency}
                onChange={(frequency) =>
                  setDraft({
                    ...draft,
                    frequency,
                    toMonth: frequency === 'once' ? null : draft.toMonth,
                  })
                }
                label="Frecuencia del abono"
              />
            </Field>
          </div>

          <div style={{ height: 12 }} />

          <Field
            label={draft.frequency === 'once' ? 'Monto del abono' : 'Monto por período'}
            htmlFor="extra-amount"
            hint="El abono se aplica después de la cuota del mes."
          >
            <MoneyInput
              id="extra-amount"
              value={draft.amount}
              onChange={(amount) => setDraft({ ...draft, amount: Math.max(0, amount) })}
              step={100_000}
              min={0}
              max={maxAmount}
              invalid={!draftAmountValid}
            />
            <div className="amount-chips">
              {[
                500_000,
                1_000_000,
                5_000_000,
                Math.round((config.principal * 0.1) / 10_000) * 10_000,
              ].map((amount, index) => (
                <button
                  key={`${amount}-${index}`}
                  type="button"
                  className="chip-btn"
                  onClick={() => setDraft({ ...draft, amount })}
                >
                  {index === 3 ? '10% capital' : formatCompactCOP(amount)}
                </button>
              ))}
            </div>
          </Field>

          {draft.frequency !== 'once' ? (
            <>
              <div style={{ height: 12 }} />
              <Field
                label="Hasta el mes"
                htmlFor="extra-to"
                hint="Déjalo en “hasta el final” si quieres mantenerlo."
              >
                <select
                  id="extra-to"
                  className="select"
                  value={draft.toMonth ?? ''}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      toMonth: event.target.value === '' ? null : Number(event.target.value),
                    })
                  }
                >
                  <option value="">Hasta el final</option>
                  {Array.from(
                    { length: Math.max(0, maxToMonth - draft.fromMonth + 1) },
                    (_, index) => draft.fromMonth + index,
                  ).map((month) => (
                    <option key={month} value={month}>
                      Mes {month} · {formatMonthLabel(config.startDate, month)}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          ) : null}

          {!draftDateValid ? (
            <div className="validation" style={{ marginTop: 12 }}>
              Revisa el mes: debe estar entre 1 y {config.termMonths}, y el mes final no puede ser
              anterior al inicial.
            </div>
          ) : null}

          {previewErrors.length > 0 ? (
            <div className="validation" style={{ marginTop: 12 }}>
              {previewErrors.slice(0, 3).map((issue) => (
                <div className="validation-item" key={`${issue.field}-${issue.message}`}>
                  {issue.message}
                </div>
              ))}
            </div>
          ) : null}

          {preview?.ok && draftAmountValid ? (
            <div className="preview">
              <InfoIcon size={15} style={{ marginTop: 1, flex: '0 0 auto' }} />
              <div>
                <span className="preview-label">Vista previa con este plan</span>
                {previewSavings >= 0 ? (
                  <>
                    Ahorras <b>{formatCOP(previewSavings)}</b> en intereses y el crédito termina en{' '}
                    <b>{formatMonths(preview.months)}</b>
                    {previewMonthsDelta > 0 ? ` (${previewMonthsDelta} meses menos)` : ''}.
                  </>
                ) : (
                  <>
                    Este cambio suma <b>{formatCOP(Math.abs(previewSavings))}</b> de intereses y
                    termina en <b>{formatMonths(preview.months)}</b>. Revisa el monto o el mes.
                  </>
                )}
                {preview.totalExtras > 0 ? (
                  <>
                    {' '}
                    Salida extra total: <b>{formatCOP(preview.totalExtras)}</b>.
                  </>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="extra-form-actions">
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={save}
              disabled={!canSave}
            >
              {draft.isNew ? 'Agregar abono' : 'Guardar cambios'} <ArrowRightIcon size={11} />
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setDraft(null)}>
              Cancelar
            </button>
            {!draft.isNew && draft.id ? (
              <button
                type="button"
                className="btn btn--danger btn--sm"
                onClick={() => remove(draft.id!)}
              >
                <TrashIcon size={12} /> Eliminar
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {config.extras.length > 0 ? (
        <p className="table-note">
          {config.strategy === 'reduce-term'
            ? 'Estrategia actual: mantener la cuota y acortar el plazo. Es la que más intereses ahorra.'
            : 'Estrategia actual: mantener el plazo y bajar la cuota. Útil para liberar flujo mensual.'}
        </p>
      ) : null}
    </div>
  );
}
