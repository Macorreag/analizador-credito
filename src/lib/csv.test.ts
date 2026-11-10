import { describe, expect, it } from 'vitest';
import { scheduleToCsv } from './csv';
import { computeLoan, type LoanConfig } from './credit';

const config: LoanConfig = {
  principal: 10_000_000,
  annualRatePct: 18,
  termMonths: 12,
  graceMonths: 0,
  graceType: 'none',
  system: 'french',
  strategy: 'reduce-term',
  extras: [{ id: 'e1', amount: 500_000, fromMonth: 3, frequency: 'once' }],
  costs: { insuranceMonthlyPct: 0.05, monthlyFee: 5_000, originationPct: 1, gmf: true },
  startDate: '2026-11-01',
};

describe('exportación CSV', () => {
  it('incluye BOM, separador y encabezados', () => {
    const analysis = computeLoan(config);
    const csv = scheduleToCsv(analysis, config);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('sep=;');
    expect(csv).toContain('Mes;Fecha;Saldo inicial');
    expect(csv).toContain('Interés');
    expect(csv).toContain('Abono extra');
  });

  it('exporta una fila por mes y usa coma decimal', () => {
    const analysis = computeLoan(config);
    const csv = scheduleToCsv(analysis, config);
    const lines = csv.split('\r\n');
    const dataLines = lines.filter((line) => /^\d+;/.test(line));
    expect(dataLines).toHaveLength(analysis.months);
    expect(dataLines[0]).toMatch(/;\d+,\d{2};/);
  });

  it('incluye totales y costo efectivo', () => {
    const analysis = computeLoan(config);
    const csv = scheduleToCsv(analysis, config);
    expect(csv).toContain(`Costo total;${analysis.totalCost.toFixed(2).replace('.', ',')}`);
    expect(csv).toContain('Costo efectivo anual (TIR)');
    expect(csv).toContain('Plazo real (meses)');
  });

  it('incluye cargos y notas opcionales', () => {
    const analysis = computeLoan({
      ...config,
      costs: {
        ...config.costs,
        charges: [
          {
            id: 'honorarios',
            label: 'Honorarios',
            amount: 50_000,
            frequency: 'monthly',
            fromMonth: 1,
            toMonth: null,
          },
        ],
      },
    });
    const csv = scheduleToCsv(analysis, config);
    expect(csv.split('\r\n')[1]).toContain('Cargos');
    expect(csv).toContain('Cargos;');
    expect(csv).toContain('50000,00');
  });

  it('escapa celdas con punto y coma o comillas', () => {
    const analysis = computeLoan(config);
    const csv = scheduleToCsv(analysis, { ...config, startDate: null });
    expect(csv).toContain('Mes 1');
    expect(csv).not.toContain('"Mes 1"');
  });
});
