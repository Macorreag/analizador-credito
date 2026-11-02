import { formatCOP, formatCompactCOP, formatPct } from '../../lib/format';
import type { RateTermGrid } from '../../lib/sensitivity';
import { mixColor } from './chartUtils';

const TEAL: [number, number, number] = [62, 156, 143];
const GOLD: [number, number, number] = [201, 162, 39];
const RUST: [number, number, number] = [192, 106, 69];

function heatStyle(value: number, min: number, max: number) {
  const t = max > min ? (value - min) / (max - min) : 0;
  const color = t <= 0.5 ? mixColor(TEAL, GOLD, t * 2) : mixColor(GOLD, RUST, (t - 0.5) * 2);
  return {
    backgroundColor: `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${0.1 + t * 0.24})`,
    borderColor: `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${0.28 + t * 0.32})`,
  };
}

export function RateTermHeatmap({
  grid,
  onSelect,
}: {
  grid: RateTermGrid;
  onSelect: (ratePct: number, termMonths: number) => void;
}) {
  if (grid.rates.length === 0 || grid.terms.length === 0) {
    return <p className="table-note">Ajusta los parámetros para generar la matriz.</p>;
  }

  return (
    <div>
      <div className="heatmap-scroll">
        <table className="heatmap">
          <caption className="sr-only">
            Interés total según tasa efectiva anual y plazo. Menos es mejor. Haz clic en una celda
            para aplicar ese escenario.
          </caption>
          <thead>
            <tr>
              <th scope="col">Tasa EA</th>
              {grid.terms.map((term) => (
                <th scope="col" key={term}>
                  {term} m
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.rates.map((rate) => (
              <tr key={rate}>
                <th scope="row">{formatPct(rate, 2)}</th>
                {grid.terms.map((term) => {
                  const cell = grid.cells.find(
                    (candidate) => candidate.ratePct === rate && candidate.termMonths === term,
                  );
                  const value = cell?.analysis?.totalInterest;
                  const style =
                    value != null && grid.maxInterest > grid.minInterest
                      ? heatStyle(value, grid.minInterest, grid.maxInterest)
                      : undefined;
                  return (
                    <td key={term}>
                      <button
                        type="button"
                        className={`heat-cell ${cell?.isBase ? 'is-base' : ''}`.trim()}
                        style={style}
                        disabled={!cell?.analysis}
                        onClick={() => {
                          if (cell?.analysis) onSelect(rate, term);
                        }}
                        title={
                          cell?.analysis
                            ? `Tasa ${formatPct(rate, 2)} EA, plazo ${term} meses: interés ${formatCOP(cell.analysis.totalInterest)}, cuota inicial ${formatCOP(cell.analysis.firstPayment)}.`
                            : 'Combinación no válida'
                        }
                        aria-label={
                          cell?.analysis
                            ? `Tasa ${formatPct(rate, 2)} efectiva anual, plazo ${term} meses. Interés total ${formatCOP(cell.analysis.totalInterest)}.`
                            : `Sin datos para ${rate}% y ${term} meses`
                        }
                      >
                        <span>{value != null ? formatCompactCOP(value) : '—'}</span>
                        {cell?.isBase ? <small>base</small> : null}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="heat-legend">
        <span>Menor interés</span>
        <span className="heat-gradient" aria-hidden="true" />
        <span>Mayor interés</span>
        <span style={{ marginLeft: 'auto' }}>Cifras sin abonos · clic para aplicar</span>
      </div>
    </div>
  );
}
