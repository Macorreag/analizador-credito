# Arquitectura

## Principios

1. **El cálculo es el producto.** La matemática vive en un módulo puro y probado; la UI es una capa de presentación.
2. **Privacidad por diseño.** No hay backend, red ni telemetría. Todo ocurre en el navegador.
3. **Transparencia.** Fórmulas, supuestos, límites y fuente de usura están visibles en la app y en `docs/metodologia.md`.
4. **Cero dependencias innecesarias.** React + Vite + fuentes self-hosted. Gráficos SVG propios; sin librería de charts.

## Capas

```text
┌─────────────────────────────────────────────┐
│ App.tsx                                     │
│ estado, persistencia, navegación por tabs   │
└───────────────┬─────────────────────────────┘
                │ props / callbacks
┌───────────────▼─────────────────────────────┐
│ components/                                 │
│ paneles, editor de abonos, tablas, gráficos │
└───────────────┬─────────────────────────────┘
                │ funciones puras
┌───────────────▼─────────────────────────────┐
│ lib/                                        │
│ credit · affordability · sensitivity ·     │
│ levers · storage · csv · format             │
└─────────────────────────────────────────────┘
```

- `src/lib/credit.ts` no importa React ni toca el DOM. Recibe `LoanConfig` y devuelve `LoanAnalysis`.
- `affordability.ts` y `sensitivity.ts` se construyen sobre `computeLoan`; no duplican fórmulas.
- `storage.ts` sanea datos desconocidos antes de exponerlos: el `localStorage` es una frontera no confiable.
- `components/` no calcula finanzas; solo formatea y presenta. `DashboardPanel` compone el tablero inicial con una grilla de 12 columnas y enlaza al detalle.

## Flujo de datos

```text
config (estado) ──► computeLoan ──► analysis ──► KPIs, tabla, gráficos
      │                 │
      │                 └──► baseline (sin abonos)
      │
      ├──► analyzeAffordability ──► DTI, capacidad, estrés
      ├──► rateTermGrid / abonoLadder / compareSystems / compareStrategies
      └──► buildLevers
```

Cada cambio de un parámetro recalcula el análisis completo con `useMemo`. El motor es barato (máximo 600 filas) y determinista.

## Persistencia

- Clave: `analizador-credito:v1`.
- Se guarda con debounce de 350 ms: configuración, ingreso declarado, usura de referencia y escenarios.
- `sanitizeState` recorta tipos, rangos, longitudes y claves desconocidas. Nunca se confía en el JSON almacenado.
- “Borrar datos” elimina la clave y restablece el estado.

## Gráficos

- SVG con `viewBox` responsive; sin canvas ni librerías.
- Tooltip HTML posicionado sobre el SVG; `pointer-events: none`.
- Navegación por teclado en el gráfico de saldo (flechas, Enter, Escape).
- Tabla de amortización completa como alternativa accesible.
- Colores con contraste suficiente y texto además de color.

## Seguridad

- CSP inyectada solo en build: `default-src 'self'`, `connect-src 'none'`, `object-src 'none'`, `form-action 'none'`.
- Sin `dangerouslySetInnerHTML`.
- React escapa todo el contenido dinámico.
- CSV generado con valores numéricos y etiquetas de fecha controladas; sin celdas arbitrarias del usuario.
- Sin secretos: no hay `.env`, tokens ni claves. El despliegue usa OIDC de GitHub Actions.

## Build y despliegue

- Vite 7 (compatible con ARM64; Vite 8/rolldown fallaba en el entorno de desarrollo).
- `base: '/analizador-credito/'` en producción.
- GitHub Actions: CI (formato, lint, tipos, tests, build, secret scan) y deploy a Pages con `actions/deploy-pages`.
- El artifact es estático; no hay runtime de servidor.
