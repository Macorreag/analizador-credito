import { computeLoan, type LoanAnalysis, type LoanConfig } from './credit';
import { formatMonthLabel } from './format';

function csvEscape(value: string): string {
  if (/[;"\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function csvNumber(value: number): string {
  if (!Number.isFinite(value)) return '0,00';
  return value.toFixed(2).replace('.', ',');
}

function csvInteger(value: number): string {
  return String(Math.round(value));
}

/**
 * CSV para Excel en español: BOM UTF-8, `sep=;` y coma decimal.
 * No incluye datos personales más allá de las cifras del plan.
 */
export function scheduleToCsv(analysis: LoanAnalysis, config: LoanConfig): string {
  const lines: string[] = [];
  lines.push('sep=;');
  lines.push(
    [
      'Mes',
      'Fecha',
      'Saldo inicial',
      'Interés',
      'Interés capitalizado',
      'Capital',
      'Seguro',
      'Comisión',
      'GMF',
      'Cuota',
      'Abono extra',
      'Pago total',
      'Saldo final',
    ]
      .map(csvEscape)
      .join(';'),
  );

  for (const row of analysis.rows) {
    lines.push(
      [
        csvInteger(row.month),
        csvEscape(formatMonthLabel(config.startDate, row.month)),
        csvNumber(row.openingBalance),
        csvNumber(row.interest),
        csvNumber(row.capitalizedInterest),
        csvNumber(row.principal),
        csvNumber(row.insurance),
        csvNumber(row.fee),
        csvNumber(row.gmf),
        csvNumber(row.payment),
        csvNumber(row.extra),
        csvNumber(row.total),
        csvNumber(row.balance),
      ].join(';'),
    );
  }

  lines.push('');
  lines.push(`Capital;${csvNumber(analysis.principal)}`);
  lines.push(`Intereses;${csvNumber(analysis.totalInterest)}`);
  lines.push(`Seguros;${csvNumber(analysis.totalInsurance)}`);
  lines.push(`Comisiones;${csvNumber(analysis.costBreakdown.fees)}`);
  lines.push(`GMF;${csvNumber(analysis.totalGmf)}`);
  lines.push(`Costo total;${csvNumber(analysis.totalCost)}`);
  lines.push(`Total pagado;${csvNumber(analysis.totalPaid)}`);
  lines.push(`Costo efectivo anual (TIR);${csvNumber(analysis.effectiveCostEaPct ?? 0)}`);
  lines.push(`Plazo real (meses);${csvInteger(analysis.months)}`);

  return `\uFEFF${lines.join('\r\n')}`;
}

/** Plan sin abonos de la misma configuración, útil para comparar en CSV. */
export function baselineCsv(config: LoanConfig): string {
  const baseline = computeLoan({ ...config, extras: [] });
  return scheduleToCsv(baseline, config);
}

export function downloadTextFile(
  content: string,
  filename: string,
  mime = 'text/csv;charset=utf-8',
): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
