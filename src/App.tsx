import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { analyzeAffordability, type AffordabilityInput } from './lib/affordability';
import { computeLoan, type ExtraPayment, type LoanConfig } from './lib/credit';
import { scheduleToCsv, downloadTextFile } from './lib/csv';
import {
  DEFAULT_AFFORDABILITY,
  DEFAULT_CONFIG,
  DEFAULT_USURY_EA_PCT,
  USURY_REFERENCE,
} from './lib/defaults';
import { abonoLadder, compareStrategies, compareSystems, rateTermGrid } from './lib/sensitivity';
import { buildLevers, type Lever } from './lib/levers';
import { MAX_SCENARIOS, type SavedScenario } from './lib/scenarios';
import {
  clearState,
  createInitialState,
  loadState,
  saveState,
  type PersistedState,
} from './lib/storage';
import { AffordabilityPanel } from './components/AffordabilityPanel';
import { AmortizationPanel } from './components/AmortizationPanel';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { MethodologyPanel } from './components/MethodologyPanel';
import { ParametersPanel } from './components/ParametersPanel';
import { ScenariosPanel } from './components/ScenariosPanel';
import { SensitivityPanel } from './components/SensitivityPanel';
import { SummaryPanel } from './components/SummaryPanel';
import { Tabs } from './components/Tabs';
import { isTabId, type TabId } from './components/tabsMeta';
import { Card, EmptyState } from './components/ui';
import { AlertIcon, CheckIcon } from './components/icons';

function readHash(): TabId {
  if (typeof window === 'undefined') return 'resumen';
  const value = window.location.hash.replace('#', '');
  return isTabId(value) ? value : 'resumen';
}

function cloneConfig(config: LoanConfig): LoanConfig {
  return {
    ...config,
    costs: { ...config.costs },
    extras: config.extras.map((extra) => ({ ...extra })),
  };
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

interface ToastState {
  id: number;
  message: string;
}

export default function App() {
  const [initial] = useState<PersistedState>(() => loadState() ?? createInitialState());
  const [config, setConfig] = useState<LoanConfig>(initial.config);
  const [affordability, setAffordability] = useState<AffordabilityInput>(initial.affordability);
  const [usuryEaPct, setUsuryEaPct] = useState(initial.usuryEaPct);
  const [scenarios, setScenarios] = useState<SavedScenario[]>(initial.scenarios);
  const [activeTab, setActiveTab] = useState<TabId>(() => readHash());
  const [paramsOpen, setParamsOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastId = useRef(0);

  const analysis = useMemo(() => computeLoan(config), [config]);
  const baseline = useMemo(() => computeLoan({ ...config, extras: [] }), [config]);
  const grid = useMemo(() => rateTermGrid(config), [config]);
  const ladder = useMemo(() => abonoLadder(config), [config]);
  const systems = useMemo(() => compareSystems(config), [config]);
  const strategies = useMemo(() => compareStrategies(config), [config]);
  const levers = useMemo(() => buildLevers(config, analysis), [config, analysis]);
  const affordabilityResult = useMemo(
    () => analyzeAffordability(config, analysis, affordability),
    [config, analysis, affordability],
  );

  const notify = useCallback((message: string) => {
    toastId.current += 1;
    setToast({ id: toastId.current, message });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      saveState({
        version: 1,
        config,
        affordability,
        usuryEaPct,
        scenarios,
      });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [config, affordability, usuryEaPct, scenarios]);

  useEffect(() => {
    const sync = () => setActiveTab(readHash());
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    return () => {
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('popstate', sync);
    };
  }, []);

  const navigate = useCallback((tab: TabId) => {
    setActiveTab(tab);
    if (readHash() !== tab) {
      window.history.pushState(null, '', `#${tab}`);
    }
    setParamsOpen(false);
  }, []);

  const updateConfig = useCallback((patch: Partial<LoanConfig>) => {
    setConfig((previous) => ({ ...previous, ...patch }));
  }, []);

  const updateCosts = useCallback((patch: Partial<LoanConfig['costs']>) => {
    setConfig((previous) => ({ ...previous, costs: { ...previous.costs, ...patch } }));
  }, []);

  const handleExtrasChange = useCallback((extras: ExtraPayment[]) => {
    setConfig((previous) => ({ ...previous, extras }));
  }, []);

  function resetConfig() {
    if (
      !window.confirm(
        '¿Restablecer el crédito a los valores iniciales? Se conservan tus escenarios y tu ingreso.',
      )
    ) {
      return;
    }
    setConfig(cloneConfig(DEFAULT_CONFIG));
    notify('Crédito restablecido a los valores iniciales.');
  }

  function applyLever(lever: Lever) {
    setConfig((previous) => ({ ...previous, ...lever.patch }));
    notify(`Palanca aplicada: ${lever.title}.`);
  }

  function applySystem(system: LoanConfig['system']) {
    updateConfig({ system });
    notify('Sistema de amortización actualizado.');
  }

  function applyStrategy(strategy: LoanConfig['strategy']) {
    updateConfig({ strategy });
    notify('Estrategia de abonos actualizada.');
  }

  function applyGrid(ratePct: number, termMonths: number) {
    setConfig((previous) => {
      const term = Math.max(1, Math.round(termMonths));
      const graceMonths = Math.min(previous.graceMonths, Math.max(0, term - 1));
      const extras = previous.extras
        .map((extra) => {
          const fromMonth = Math.min(extra.fromMonth, term);
          const toMonth = extra.toMonth == null ? null : Math.min(extra.toMonth, term);
          return { ...extra, fromMonth, toMonth };
        })
        .filter((extra) => extra.toMonth == null || extra.toMonth >= extra.fromMonth);
      return { ...previous, annualRatePct: ratePct, termMonths: term, graceMonths, extras };
    });
  }

  function applyLadder(monthlyExtra: number) {
    setConfig((previous) => ({
      ...previous,
      extras:
        monthlyExtra > 0
          ? [
              {
                id: newId(),
                amount: monthlyExtra,
                fromMonth: 1,
                frequency: 'monthly',
              },
            ]
          : [],
    }));
  }

  function applyMaxPrincipal(principal: number) {
    updateConfig({ principal: Math.max(0, Math.round(principal)) });
  }

  function saveScenario(name: string): boolean {
    if (scenarios.length >= MAX_SCENARIOS) return false;
    const scenario: SavedScenario = {
      id: newId(),
      name: name.trim().slice(0, 60) || `Plan ${scenarios.length + 2}`,
      createdAt: new Date().toISOString(),
      config: cloneConfig(config),
    };
    setScenarios((previous) => [scenario, ...previous].slice(0, MAX_SCENARIOS));
    return true;
  }

  function applyScenario(id: string) {
    const scenario = scenarios.find((item) => item.id === id);
    if (!scenario) return;
    setConfig(cloneConfig(scenario.config));
  }

  function deleteScenario(id: string) {
    setScenarios((previous) => previous.filter((item) => item.id !== id));
  }

  function clearLocalData() {
    if (
      !window.confirm(
        '¿Borrar el plan, el ingreso y los escenarios guardados en este navegador? Esta acción no se puede deshacer.',
      )
    ) {
      return;
    }
    clearState();
    const fresh = createInitialState();
    setConfig(fresh.config);
    setAffordability({ ...DEFAULT_AFFORDABILITY });
    setUsuryEaPct(DEFAULT_USURY_EA_PCT);
    setScenarios([]);
    setActiveTab('resumen');
    window.history.replaceState(null, '', '#resumen');
    notify('Datos locales borrados. Empezamos de nuevo.');
  }

  function exportCsv() {
    if (!analysis.ok) {
      notify('Corrige la configuración antes de exportar.');
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    downloadTextFile(scheduleToCsv(analysis, config), `credito-amortizacion-${today}.csv`);
    notify('CSV descargado. Se abre en Excel con separador y coma decimal.');
  }

  const invalidForTab = !analysis.ok && activeTab !== 'resumen' && activeTab !== 'metodologia';

  return (
    <>
      <a className="skip-link" href="#main">
        Saltar al análisis
      </a>
      <Header onPrint={() => window.print()} />
      <Hero />

      <main className="shell" id="main">
        <aside
          className={`sidebar ${paramsOpen ? 'is-open' : ''}`.trim()}
          aria-label="Parámetros del crédito"
        >
          <button
            type="button"
            className="params-toggle"
            aria-expanded={paramsOpen}
            aria-controls="params-body"
            onClick={() => setParamsOpen((value) => !value)}
          >
            <span>Parámetros del crédito</span>
            <span>{paramsOpen ? 'Cerrar' : 'Ajustar'}</span>
          </button>
          <div className="params-body" id="params-body">
            <ParametersPanel
              config={config}
              analysis={analysis}
              onChange={updateConfig}
              onCostsChange={updateCosts}
              onReset={resetConfig}
            />
          </div>
        </aside>

        <div className="content">
          <Tabs active={activeTab} onChange={navigate} />

          <div
            id={`panel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`tab-${activeTab}`}
            tabIndex={0}
          >
            {invalidForTab ? (
              <Card className="card--pad">
                <EmptyState
                  icon={<AlertIcon size={19} />}
                  title="Hay un error en los parámetros"
                  action={
                    <button
                      type="button"
                      className="btn btn--gold btn--sm"
                      onClick={() => {
                        setParamsOpen(true);
                        document
                          .getElementById('params-body')
                          ?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      Revisar parámetros
                    </button>
                  }
                >
                  {analysis.issues
                    .filter((issue) => issue.severity === 'error')
                    .map((issue) => issue.message)
                    .join(' ')}
                </EmptyState>
              </Card>
            ) : activeTab === 'resumen' ? (
              <SummaryPanel
                config={config}
                analysis={analysis}
                baseline={baseline}
                affordability={affordability}
                affordabilityResult={affordabilityResult}
                usuryEaPct={usuryEaPct}
                usuryPeriodLabel={USURY_REFERENCE.periodLabel}
                onUsuryChange={setUsuryEaPct}
                systems={systems}
                strategies={strategies}
                levers={levers}
                onApplyLever={applyLever}
                onApplySystem={applySystem}
                onApplyStrategy={applyStrategy}
                onNavigate={navigate}
                onEditExtras={() => navigate('amortizacion')}
                scenarios={scenarios}
              />
            ) : activeTab === 'amortizacion' ? (
              <AmortizationPanel
                config={config}
                analysis={analysis}
                baseline={baseline}
                onExtrasChange={handleExtrasChange}
                onNotify={notify}
                onCsv={exportCsv}
              />
            ) : activeTab === 'escenarios' ? (
              <ScenariosPanel
                scenarios={scenarios}
                config={config}
                analysis={analysis}
                baseline={baseline}
                onSave={saveScenario}
                onApply={applyScenario}
                onDelete={deleteScenario}
                onNotify={notify}
              />
            ) : activeTab === 'sensibilidad' ? (
              <SensitivityPanel
                config={config}
                analysis={analysis}
                grid={grid}
                ladder={ladder}
                affordability={affordability}
                affordabilityResult={affordabilityResult}
                onApplyGrid={applyGrid}
                onApplyLadder={applyLadder}
                onNavigate={navigate}
                onNotify={notify}
              />
            ) : activeTab === 'capacidad' ? (
              <AffordabilityPanel
                config={config}
                analysis={analysis}
                affordability={affordability}
                result={affordabilityResult}
                onChange={(patch) => setAffordability((previous) => ({ ...previous, ...patch }))}
                onApplyMaxPrincipal={applyMaxPrincipal}
                onNotify={notify}
              />
            ) : (
              <MethodologyPanel
                usuryEaPct={usuryEaPct}
                usuryPeriodLabel={USURY_REFERENCE.periodLabel}
                onUsuryChange={setUsuryEaPct}
                onClearData={clearLocalData}
              />
            )}
          </div>
        </div>
      </main>

      <Footer />

      {toast ? (
        <div className="toast" role="status" aria-live="polite" key={toast.id}>
          <CheckIcon size={15} style={{ color: 'var(--teal-bright)' }} />
          <span>{toast.message}</span>
        </div>
      ) : null}
    </>
  );
}
