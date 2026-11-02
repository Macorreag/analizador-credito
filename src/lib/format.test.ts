import { describe, expect, it } from 'vitest';
import {
  formatCOP,
  formatCompactCOP,
  formatMonthLabel,
  formatMonths,
  formatPct,
  formatSignedCOP,
  formatYearsMonths,
} from './format';

describe('formato es-CO', () => {
  it('formatea pesos sin decimales', () => {
    expect(formatCOP(90_000_000)).toBe('$90.000.000');
    expect(formatCOP(1_234.56)).toBe('$1.235');
    expect(formatCOP(Number.NaN)).toBe('$0');
    expect(formatSignedCOP(-1_500_000)).toBe('−$1.500.000');
  });

  it('usa compactos legibles para ejes', () => {
    expect(formatCompactCOP(90_000_000)).toBe('$90 M');
    expect(formatCompactCOP(1_500_000_000)).toBe('$1,5 mil M');
    expect(formatCompactCOP(950_000)).toBe('$950 K');
  });

  it('formatea porcentajes y meses en español', () => {
    expect(formatPct(22.0912)).toBe('22,09%');
    expect(formatMonths(84)).toBe('84 meses');
    expect(formatMonths(1)).toBe('1 mes');
    expect(formatYearsMonths(84)).toBe('7 años');
    expect(formatYearsMonths(86)).toBe('7 años y 2 meses');
  });

  it('mapea los meses a fechas legibles', () => {
    expect(formatMonthLabel(null, 3)).toBe('Mes 3');
    expect(formatMonthLabel('2026-11-01', 1).toLowerCase()).toContain('nov');
    expect(formatMonthLabel('2026-11-01', 3).toLowerCase()).toContain('ene');
    expect(formatMonthLabel('2026-11-01', 3)).toContain('2027');
  });
});
