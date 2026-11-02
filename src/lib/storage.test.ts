import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG } from './defaults';
import {
  STORAGE_KEY,
  clearState,
  createInitialState,
  loadState,
  sanitizeConfig,
  sanitizeState,
  saveState,
} from './storage';

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    clear: () => map.clear(),
    key: () => null,
    length: 0,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('saneamiento de configuración', () => {
  it('devuelve los valores por defecto ante datos inválidos', () => {
    const config = sanitizeConfig(null);
    expect(config.principal).toBe(DEFAULT_CONFIG.principal);
    expect(config.system).toBe('french');
    expect(config.extras).toEqual([]);
  });

  it('recorta valores fuera de rango y tipos desconocidos', () => {
    const config = sanitizeConfig({
      principal: -5,
      annualRatePct: 5000,
      termMonths: 900,
      graceMonths: -3,
      system: 'hack',
      strategy: 'otra',
      graceType: 'rara',
      startDate: 'no-es-fecha',
      costs: { insuranceMonthlyPct: 20, monthlyFee: -1, originationPct: 90, gmf: 'sí' },
      extras: [
        { id: 'ok', amount: 1_000_000, fromMonth: 2, frequency: 'monthly', toMonth: 4 },
        { id: 'bad', amount: Number.NaN, fromMonth: 1, frequency: 'monthly' },
        { id: 'bad2', amount: 100, fromMonth: 1, frequency: 'semanal' },
      ],
    });
    expect(config.principal).toBe(0);
    expect(config.annualRatePct).toBe(1000);
    expect(config.termMonths).toBe(600);
    expect(config.graceMonths).toBe(0);
    expect(config.system).toBe('french');
    expect(config.strategy).toBe('reduce-term');
    expect(config.graceType).toBe('none');
    expect(config.startDate).toBeNull();
    expect(config.costs.insuranceMonthlyPct).toBe(5);
    expect(config.costs.monthlyFee).toBe(0);
    expect(config.costs.originationPct).toBe(50);
    expect(config.costs.gmf).toBe(false);
    expect(config.extras).toHaveLength(1);
    expect(config.extras[0].toMonth).toBe(4);
  });

  it('limita la cantidad de escenarios guardados', () => {
    const scenarios = Array.from({ length: 20 }, (_, index) => ({
      id: `s${index}`,
      name: `Escenario ${index}`,
      createdAt: '2026-11-01T00:00:00.000Z',
      config: {},
    }));
    const state = sanitizeState({ version: 1, scenarios });
    expect(state.scenarios).toHaveLength(8);
    expect(state.scenarios[0].config.principal).toBe(DEFAULT_CONFIG.principal);
  });
});

describe('persistencia local', () => {
  it('guarda y recupera el estado', () => {
    vi.stubGlobal('localStorage', memoryStorage());
    const state = createInitialState();
    state.config.principal = 45_000_000;
    state.scenarios.push({
      id: 's1',
      name: 'Mi plan',
      createdAt: '2026-11-01T00:00:00.000Z',
      config: { ...state.config },
    });
    expect(saveState(state)).toBe(true);
    const loaded = loadState();
    expect(loaded?.config.principal).toBe(45_000_000);
    expect(loaded?.scenarios).toHaveLength(1);
  });

  it('ignora JSON inválido o versiones desconocidas', () => {
    const storage = memoryStorage();
    vi.stubGlobal('localStorage', storage);
    storage.setItem(STORAGE_KEY, '{no-json');
    expect(loadState()).toBeNull();
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 99 }));
    expect(loadState()).toBeNull();
  });

  it('borra el estado sin fallar', () => {
    const storage = memoryStorage();
    vi.stubGlobal('localStorage', storage);
    const state = createInitialState();
    saveState(state);
    clearState();
    expect(loadState()).toBeNull();
  });

  it('tolera un almacenamiento bloqueado', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('bloqueado');
      },
      removeItem: () => {
        throw new Error('bloqueado');
      },
    });
    expect(loadState()).toBeNull();
    expect(saveState(createInitialState())).toBe(false);
    expect(() => clearState()).not.toThrow();
  });
});
