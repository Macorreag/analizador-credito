# ADR 0001 — Motor financiero puro y testeable

- **Estado:** aceptado
- **Fecha:** 2026-11-02

## Contexto

La app original era un HTML con React por CDN y Babel standalone. La lógica de amortización estaba mezclada con el componente y no tenía pruebas.

## Decisión

Extraer toda la matemática a `src/lib/credit.ts`, sin React ni DOM. La UI consume `computeLoan(config)` y los helpers derivados.

## Consecuencias

- Se puede probar con Vitest en Node, sin navegador.
- Las identidades contables son verificables.
- Cambiar la UI no arriesga el cálculo.
- Requiere disciplina: los componentes no deben duplicar fórmulas.
