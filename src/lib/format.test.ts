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
    expect(formatCOP(60_000_000)).toBe('$60.000.000');
    expect(formatCOP(1_234.56)).toBe('$1.235');
    expect(formatCOP(Number.NaN)).toBe('$0');
    expect(formatSignedCOP(-1_500_000)).toBe('−$1.500.000');
  });

  it('usa compactos legibles para ejes', () => {
    expect(formatCompactCOP(60_000_000)).toBe('$60 M');
    expect(formatCompactCOP(1_500_000_000)).toBe('$1,5 mil M');
    expect(formatCompactCOP(950_000)).toBe('$950 K');
  });

  it('formatea porcentajes y meses en español', () => {
    expect(formatPct(19.5123)).toBe('19,51%');
    expect(formatMonths(72)).toBe('72 meses');
    expect(formatMonths(1)).toBe('1 mes');
    expect(formatYearsMonths(72)).toBe('6 años');
    expect(formatYearsMonths(74)).toBe('6 años y 2 meses');
  });

  it('mapea los meses a fechas legibles', () => {
    expect(formatMonthLabel(null, 3)).toBe('Mes 3');
    expect(formatMonthLabel('2026-11-01', 1).toLowerCase()).toContain('nov');
    expect(formatMonthLabel('2026-11-01', 3).toLowerCase()).toContain('ene');
    expect(formatMonthLabel('2026-11-01', 3)).toContain('2027');
  });
});
