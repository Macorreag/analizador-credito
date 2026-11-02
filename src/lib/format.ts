const COP = new Intl.NumberFormat('es-CO', {
  maximumFractionDigits: 0,
});

const COP_ONE_DECIMAL = new Intl.NumberFormat('es-CO', {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
});

const NUMBER = new Intl.NumberFormat('es-CO', {
  maximumFractionDigits: 2,
});

/** "$1.234.567" (sin espacio duro, para que se lea igual en cualquier fuente). */
export function formatCOP(value: number): string {
  if (!Number.isFinite(value)) return '$0';
  const rounded = Math.round(value);
  const sign = rounded < 0 ? '-' : '';
  return `${sign}$${COP.format(Math.abs(rounded))}`;
}

/** "$1,2 M" / "$950 K" para ejes y chips. */
export function formatCompactCOP(value: number): string {
  if (!Number.isFinite(value)) return '$0';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000_000) {
    return `${sign}$${COP_ONE_DECIMAL.format(abs / 1_000_000_000)} mil M`;
  }
  if (abs >= 1_000_000) {
    return `${sign}$${COP_ONE_DECIMAL.format(abs / 1_000_000)} M`;
  }
  if (abs >= 1_000) {
    return `${sign}$${COP.format(abs / 1_000)} K`;
  }
  return `${sign}$${COP.format(abs)}`;
}

export function formatNumber(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

export function formatPct(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return '—';
  return `${new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value)}%`;
}

export function formatPctShort(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return `${NUMBER.format(value)}%`;
}

export function formatMonths(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const months = Math.round(value);
  return months === 1 ? '1 mes' : `${months} meses`;
}

export function formatYearsMonths(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const total = Math.max(0, Math.round(value));
  const years = Math.floor(total / 12);
  const months = total % 12;
  if (years === 0) return formatMonths(months);
  if (months === 0) return years === 1 ? '1 año' : `${years} años`;
  return `${years} ${years === 1 ? 'año' : 'años'} y ${months} ${months === 1 ? 'mes' : 'meses'}`;
}

export function formatSignedCOP(value: number): string {
  if (!Number.isFinite(value)) return '$0';
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${formatCOP(Math.abs(value))}`;
}

export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Fecha del pago del mes `month` (1 = primer pago). */
export function monthDate(startDate: string | null | undefined, month: number): Date | null {
  const base = parseIsoDate(startDate);
  if (!base) return null;
  return new Date(base.getFullYear(), base.getMonth() + Math.max(0, month - 1), 1);
}

export function formatMonthLabel(startDate: string | null | undefined, month: number): string {
  const date = monthDate(startDate, month);
  if (!date) return `Mes ${month}`;
  const label = date
    .toLocaleDateString('es-CO', { month: 'short', year: 'numeric' })
    .replace(/\./g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+de\s+/g, ' ')
    .trim();
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatDate(value: Date | null): string {
  if (!value) return '—';
  return value
    .toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
    .replace(/\./g, '')
    .replace(/\u00a0/g, ' ')
    .trim();
}

export function formatPercentFromFraction(fraction: number, digits = 1): string {
  return formatPct(fraction * 100, digits);
}
