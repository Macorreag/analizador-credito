import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import App from './App';
import { AffordabilityPanel } from './components/AffordabilityPanel';
import { AmortizationPanel } from './components/AmortizationPanel';
import { MethodologyPanel } from './components/MethodologyPanel';
import { ParametersPanel } from './components/ParametersPanel';
import { ScenariosPanel } from './components/ScenariosPanel';
import { SensitivityPanel } from './components/SensitivityPanel';
import { analyzeAffordability } from './lib/affordability';
import { computeLoan, type LoanConfig } from './lib/credit';
import { DEFAULT_AFFORDABILITY, DEFAULT_USURY_EA_PCT } from './lib/defaults';
import { abonoLadder, compareStrategies, compareSystems, rateTermGrid } from './lib/sensitivity';

const config: LoanConfig = {
  principal: 60_000_000,
  annualRatePct: 19.5,
  termMonths: 72,
  graceMonths: 0,
  graceType: 'none',
  system: 'french',
  strategy: 'reduce-term',
  extras: [{ id: 'e1', amount: 1_000_000, fromMonth: 12, frequency: 'once' }],
  costs: { insuranceMonthlyPct: 0.05, monthlyFee: 8_000, originationPct: 1, gmf: true },
  startDate: '2026-11-01',
};

const analysis = computeLoan(config);
const baseline = computeLoan({ ...config, extras: [] });
const affordability = { ...DEFAULT_AFFORDABILITY, monthlyIncome: 8_000_000, investmentEaPct: 12 };
const affordabilityResult = analyzeAffordability(config, analysis, affordability);

describe('render de la aplicación', () => {
  it('renderiza la vista inicial sin errores de ejecución', () => {
    const html = renderToString(<App />);
    expect(html).toContain('Análisis del crédito');
    expect(html).toContain('Panel de control');
    expect(html).toContain('Costo total del crédito');
    expect(html).toContain('Primeros 8 pagos');
    expect(html).toContain('Mapa tasa × plazo');
    expect(html).toContain('Parámetros');
    expect(html.length).toBeGreaterThan(20_000);
  });

  it('renderiza el panel de parámetros', () => {
    const html = renderToString(
      <ParametersPanel
        config={config}
        analysis={analysis}
        onChange={() => undefined}
        onCostsChange={() => undefined}
        onReset={() => undefined}
      />,
    );
    expect(html).toContain('El crédito');
    expect(html).toContain('Tasa efectiva anual');
    expect(html).toContain('Abonos');
    expect(html).toContain('Cargos y notas');
  });

  it('renderiza la amortización con gráficos y tabla', () => {
    const html = renderToString(
      <AmortizationPanel
        config={config}
        analysis={analysis}
        baseline={baseline}
        onExtrasChange={() => undefined}
        onNotify={() => undefined}
        onCsv={() => undefined}
      />,
    );
    expect(html).toContain('Saldo de la deuda');
    expect(html).toContain('Tabla de amortización');
    expect(html).toContain('Abonos a capital');
  });

  it('renderiza escenarios, sensibilidad, capacidad y método', () => {
    const scenariosHtml = renderToString(
      <ScenariosPanel
        scenarios={[]}
        config={config}
        analysis={analysis}
        baseline={baseline}
        onSave={() => true}
        onApply={() => undefined}
        onDelete={() => undefined}
        onNotify={() => undefined}
      />,
    );
    expect(scenariosHtml).toContain('Guarda y compara planes');

    const sensitivityHtml = renderToString(
      <SensitivityPanel
        config={config}
        analysis={analysis}
        grid={rateTermGrid(config)}
        ladder={abonoLadder(config)}
        affordability={affordability}
        affordabilityResult={affordabilityResult}
        onApplyGrid={() => undefined}
        onApplyLadder={() => undefined}
        onNavigate={() => undefined}
        onNotify={() => undefined}
      />,
    );
    expect(sensitivityHtml).toContain('El mapa del interés');
    expect(sensitivityHtml).toContain('escalera de abonos');

    const affordabilityHtml = renderToString(
      <AffordabilityPanel
        config={config}
        analysis={analysis}
        affordability={affordability}
        result={affordabilityResult}
        onChange={() => undefined}
        onApplyMaxPrincipal={() => undefined}
        onNotify={() => undefined}
      />,
    );
    expect(affordabilityHtml).toContain('Tu bolsillo también decide');
    expect(affordabilityHtml).toContain('Resistencia');

    const methodHtml = renderToString(
      <MethodologyPanel
        usuryEaPct={DEFAULT_USURY_EA_PCT}
        usuryPeriodLabel="noviembre de 2026"
        onUsuryChange={() => undefined}
        onClearData={() => undefined}
      />,
    );
    expect(methodHtml).toContain('La matemática');
    expect(methodHtml).toContain('Nada sale de tu navegador');
  });

  it('calcula las comparaciones que alimentan los paneles', () => {
    expect(compareSystems(config)).toHaveLength(3);
    expect(compareStrategies(config)).not.toBeNull();
  });
});
