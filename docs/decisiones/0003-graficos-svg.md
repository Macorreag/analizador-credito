# ADR 0003 — Gráficos SVG propios

- **Estado:** aceptado
- **Fecha:** 2026-11-02

## Contexto

Recharts funcionaba, pero añadía peso, dependencias y estilos difíciles de controlar. La app necesita tres visualizaciones simples y accesibles.

## Decisión

Implementar los gráficos con SVG y CSS propios: saldo, composición, barras de costo y mapa de calor HTML.

## Consecuencias

- Bundle más pequeño y control total del diseño.
- Tooltips, teclado y tablas de respaldo se implementan a medida.
- Más código de UI que mantener; se compensa con componentes pequeños y sin estado global.
