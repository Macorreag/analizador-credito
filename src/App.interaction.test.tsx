// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, '', '/');
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  act(() => {
    root.render(<App />);
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function buttonByText(text: string): HTMLButtonElement {
  const button = [...container.querySelectorAll('button')].find((candidate) =>
    candidate.textContent?.includes(text),
  );
  if (!button) throw new Error(`No se encontró el botón “${text}”`);
  return button;
}

function setInputValue(element: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('interacción ligera', () => {
  it('carga el resumen sin errores de consola', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(container.textContent).toContain('Análisis del crédito');
    expect(container.textContent).toContain('Costo total del crédito');
    expect(container.textContent).toContain('Cuota máxima');
    expect(container.textContent).toContain('Primeros 8 pagos');
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('navega a la amortización y agrega un abono', () => {
    act(() => buttonByText('Amortización').click());
    expect(container.textContent).toContain('Tabla de amortización');
    expect(container.textContent).toContain('Abonos a capital');

    act(() => buttonByText('Agregar abono').click());
    expect(container.textContent).toContain('Nuevo abono');

    act(() => {
      const form = container.querySelector('.extra-form');
      const submit = form?.querySelector<HTMLButtonElement>('.btn--primary');
      submit?.click();
    });

    expect(container.textContent).toContain('Abono agregado');
    expect(container.textContent).toContain('Mes 1');
  });

  it('usa el dashboard para ingresar el ingreso y calcular el DTI', () => {
    const income = container.querySelector<HTMLInputElement>('#dash-income');
    expect(income).not.toBeNull();
    act(() => {
      if (income) setInputValue(income, '8000000');
    });
    expect(container.textContent).toContain('DTI');
    expect(container.textContent).toContain('Capital máximo');
    expect(container.textContent).toContain('Cuota / ingreso');
  });

  it('cambia el monto y lo refleja en el resumen', () => {
    const principal = container.querySelector<HTMLInputElement>('#principal');
    expect(principal).not.toBeNull();
    act(() => {
      if (principal) setInputValue(principal, '45000000');
    });
    expect(container.textContent).toContain('$45.000.000');
  });

  it('evalúa la capacidad de pago con un ingreso', () => {
    act(() => buttonByText('Capacidad').click());
    expect(container.textContent).toContain('Tu bolsillo también decide');

    const income = container.querySelector<HTMLInputElement>('#income');
    expect(income).not.toBeNull();
    act(() => {
      if (income) setInputValue(income, '8000000');
    });
    expect(container.textContent).toContain('del ingreso');
    expect(container.textContent).toContain('Capital máximo');
  });

  it('abre la metodología y muestra la política de privacidad', () => {
    act(() => buttonByText('Método').click());
    expect(container.textContent).toContain('Nada sale de tu navegador');
    expect(container.textContent).toContain('Borrar datos de este navegador');
  });
});
