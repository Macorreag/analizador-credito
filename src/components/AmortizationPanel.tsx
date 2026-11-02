import { useMemo, useState } from 'react';
import type { ExtraPayment, LoanAnalysis, LoanConfig, PaymentRow } from '../lib/credit';
import { formatCOP, formatMonths, formatMonthLabel, formatPct } from '../lib/format';
import { BalanceChart } from './charts/BalanceChart';
import { CompositionChart, type CompositionDatum } from './charts/CompositionChart';
import { ExtrasEditor } from './ExtrasEditor';
import { Badge, Card, SectionHead } from './ui';
import { DownloadIcon, InfoIcon, TableIcon } from './icons';

type ChartView = 'saldo' | 'composicion';
type Range = '12' | '24' | '36' | 'all';

function buildComposition(
  rows: PaymentRow[],
  range: Range,
  startDate: string | null,
): CompositionDatum[] {
  const base = range === 'all' ? rows : rows.slice(0, Number(range));
  if (range === 'all' && rows.length > 48) {
    const grouped: CompositionDatum[] = [];
    for (let start = 0; start < rows.length; start += 12) {
      const chunk = rows.slice(start, start + 12);
      const interest = chunk.reduce((sum, row) => sum + row.interest, 0);
      const principal = chunk.reduce((sum, row) => sum + row.principal, 0);
      const extra = chunk.reduce((sum, row) => sum + row.extra, 0);
      const other = chunk.reduce((sum, row) => sum + row.insurance + row.fee + row.gmf, 0);
      grouped.push({
        label: `Año ${grouped.length + 1}`,
        sublabel: `${formatMonthLabel(startDate, start + 1)} – ${formatMonthLabel(startDate, Math.min(start + 12, rows.length))}`,
        interest,
        principal,
        extra,
        other,
        total: interest + principal + extra + other,
      });
    }
    return grouped;
  }

  return base.map((row) => ({
    label: `M${row.month}`,
    sublabel: formatMonthLabel(startDate, row.month),
    interest: row.interest,
    principal: row.principal,
    extra: row.extra,
    other: row.insurance + row.fee + row.gmf,
    total: row.total,
  }));
}

export function AmortizationPanel({
  config,
  analysis,
  baseline,
  onExtrasChange,
  onNotify,
  onCsv,
}: {
  config: LoanConfig;
  analysis: LoanAnalysis;
  baseline: LoanAnalysis;
  onExtrasChange: (extras: ExtraPayment[]) => void;
  onNotify: (message: string) => void;
  onCsv: () => void;
}) {
  const [view, setView] = useState<ChartView>('saldo');
  const [range, setRange] = useState<Range>('24');
  const [editorRequest, setEditorRequest] = useState<{ month: number; requestId: number } | null>(
    null,
  );

  const composition = useMemo(
    () => buildComposition(analysis.rows, range, config.startDate),
    [analysis.rows, range, config.startDate],
  );

  const hasInsurance = analysis.rows.some((row) => row.insurance > 0);
  const hasFees = analysis.rows.some((row) => row.fee > 0);
  const hasGmf = analysis.rows.some((row) => row.gmf > 0);
  const extrasSavings = baseline.totalInterest - analysis.totalInterest;

  function handleMonthFromChart(month: number) {
    const row = analysis.rows[month - 1];
    if (!row) {
      onNotify('Ese mes queda después de saldar el crédito: elige un mes con saldo pendiente.');
      return;
    }
    setEditorRequest((previous) => ({
      month,
      requestId: (previous?.requestId ?? 0) + 1,
    }));
    window.requestAnimationFrame(() => {
      document.getElementById('abonos')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  return (
    <div className="content-panel">
      <Card className="chart-card">
        <div className="chart-top">
          <div>
            <div className="chart-title">
              {view === 'saldo' ? 'Saldo de la deuda, mes a mes' : 'Composición de cada pago'}
            </div>
            <div className="chart-sub">
              {view === 'saldo'
                ? 'La línea dorada es el plan sin abonos; la verde, tu plan actual.'
                : 'Cuánto de cada pago va a intereses, capital, abonos y costos.'}
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            {view === 'composicion' ? (
              <select
                className="select"
                value={range}
                onChange={(event) => setRange(event.target.value as Range)}
                aria-label="Rango de meses a mostrar"
                style={{ width: 'auto', padding: '5px 7px', fontSize: 10 }}
              >
                <option value="12">12 meses</option>
                <option value="24">24 meses</option>
                <option value="36">36 meses</option>
                <option value="all">Todo el crédito</option>
              </select>
            ) : null}
            <div className="chart-toggle" role="group" aria-label="Vista del gráfico">
              <button
                type="button"
                aria-pressed={view === 'saldo'}
                onClick={() => setView('saldo')}
              >
                Saldo
              </button>
              <button
                type="button"
                aria-pressed={view === 'composicion'}
                onClick={() => setView('composicion')}
              >
                Composición
              </button>
            </div>
          </div>
        </div>

        {view === 'saldo' ? (
          <BalanceChart
            rows={analysis.rows}
            baselineRows={baseline.rows}
            principal={analysis.principal}
            startDate={config.startDate}
            extras={config.extras}
            onMonthClick={handleMonthFromChart}
          />
        ) : (
          <CompositionChart data={composition} />
        )}

        {analysis.totalExtras > 0 ? (
          <div className="chart-legend" style={{ marginTop: 10 }}>
            <span className="legend-item">
              Abonos aplicados: <b>{formatCOP(analysis.totalExtras)}</b>
            </span>
            <span className="legend-item">
              Terminas en <b>{formatMonths(analysis.months)}</b> en vez de{' '}
              {formatMonths(baseline.months)}
            </span>
          </div>
        ) : null}
      </Card>

      <div style={{ height: 16 }} />

      <ExtrasEditor
        key={editorRequest ? `editor-${editorRequest.requestId}` : 'editor'}
        config={config}
        analysis={analysis}
        onChange={onExtrasChange}
        onNotify={onNotify}
        initialMonth={editorRequest?.month ?? null}
      />

      <section className="section" aria-labelledby="tabla-title">
        <SectionHead
          kicker="02 · El detalle"
          title="Tabla de amortización"
          description="Cada fila es un pago. Descarga el CSV para abrirlo en Excel o cruzar los datos."
          id="tabla-title"
          actions={
            <button type="button" className="btn btn--ghost btn--sm" onClick={onCsv}>
              <DownloadIcon size={13} /> Descargar CSV
            </button>
          }
        />
        <Card>
          <div className="table-scroll">
            <table className="data-table">
              <caption className="sr-only">
                Tabla de amortización con cuota, interés, capital, seguros, comisiones, GMF, abonos
                y saldo final por mes.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Mes</th>
                  <th scope="col">Cuota</th>
                  <th scope="col">Interés</th>
                  <th scope="col">Capital</th>
                  {hasInsurance ? <th scope="col">Seguro</th> : null}
                  {hasFees ? <th scope="col">Comisión</th> : null}
                  {hasGmf ? <th scope="col">GMF</th> : null}
                  <th scope="col">Abono</th>
                  <th scope="col">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {analysis.rows.map((row) => (
                  <tr
                    key={row.month}
                    className={`${row.extra > 0 ? 'row-extra' : ''} ${
                      row.month <= (config.graceType === 'none' ? 0 : config.graceMonths)
                        ? 'row-grace'
                        : ''
                    }`.trim()}
                  >
                    <td>
                      <span className="cell-strong">{row.month}</span>
                      {config.startDate ? (
                        <>
                          {' '}
                          <span className="cell-date">
                            {formatMonthLabel(config.startDate, row.month)}
                          </span>
                        </>
                      ) : null}
                      {row.month <= (config.graceType === 'none' ? 0 : config.graceMonths) ? (
                        <span className="badge" style={{ marginLeft: 5 }}>
                          {config.graceType === 'total' ? 'capitaliza' : 'gracia'}
                        </span>
                      ) : null}
                    </td>
                    <td className="cell-strong">{formatCOP(row.payment)}</td>
                    <td className="cell-rust">{formatCOP(row.interest)}</td>
                    <td className="cell-gold">{formatCOP(row.principal)}</td>
                    {hasInsurance ? (
                      <td className="cell-muted">{formatCOP(row.insurance)}</td>
                    ) : null}
                    {hasFees ? <td className="cell-muted">{formatCOP(row.fee)}</td> : null}
                    {hasGmf ? <td className="cell-muted">{formatCOP(row.gmf)}</td> : null}
                    <td className="cell-teal">{row.extra > 0 ? formatCOP(row.extra) : '—'}</td>
                    <td>{formatCOP(row.balance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>Total</td>
                  <td>{formatCOP(analysis.totalRegularPayments)}</td>
                  <td>{formatCOP(analysis.totalInterest)}</td>
                  <td>{formatCOP(analysis.totalPrincipalPaid)}</td>
                  {hasInsurance ? <td>{formatCOP(analysis.totalInsurance)}</td> : null}
                  {hasFees ? (
                    <td>{formatCOP(analysis.costBreakdown.fees - analysis.originationFee)}</td>
                  ) : null}
                  {hasGmf ? <td>{formatCOP(analysis.totalGmf)}</td> : null}
                  <td>{formatCOP(analysis.totalExtras)}</td>
                  <td>$0</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
        <p className="table-note">
          <InfoIcon size={11} /> Los abonos se aplican después de la cuota del mes. El total pagado
          incluye la comisión de apertura y el GMF del desembolso, que no aparecen como fila
          mensual.
          {extrasSavings > 0 ? (
            <>
              {' '}
              Tu plan ahorra <b>{formatCOP(extrasSavings)}</b> en intereses frente a no abonar.
            </>
          ) : null}
        </p>
        <div className="inline" style={{ marginTop: 8, gap: 8 }}>
          <Badge tone={analysis.fullyAmortized ? 'teal' : 'rust'}>
            {analysis.fullyAmortized ? 'Crédito saldado' : 'Saldo pendiente'}
          </Badge>
          <Badge>{formatMonths(analysis.months)}</Badge>
          {analysis.effectiveCostEaPct != null ? (
            <Badge tone="gold">Costo real {formatPct(analysis.effectiveCostEaPct, 2)} EA</Badge>
          ) : null}
        </div>
        <p className="table-note">
          <TableIcon size={11} /> Cifras calculadas con precisión completa y redondeadas solo para
          mostrar. Puede haber diferencias de pesos frente a la tabla del banco por redondeos o
          convenciones de seguro.
        </p>
      </section>
    </div>
  );
}
