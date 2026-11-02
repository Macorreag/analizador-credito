<p align="center">
  <img src="docs/assets/portada.png" alt="Analizador de Crédito: tu crédito, sin letra pequeña" width="100%" />
</p>

<h1 align="center">Analizador de Crédito</h1>

<p align="center">
  Amortización, abonos a capital, costo efectivo y capacidad de pago.<br />
  Una app estática, <strong>100% local</strong> y de código abierto para entender lo que realmente pagas.
</p>

<p align="center">
  <a href="https://macorreag.github.io/analizador-credito/"><strong>Ver la app en vivo →</strong></a>
</p>

<p align="center">
  <a href="https://github.com/Macorreag/analizador-credito/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/Macorreag/analizador-credito/actions/workflows/ci.yml/badge.svg" /></a>
  <a href="https://github.com/Macorreag/analizador-credito/actions/workflows/deploy.yml"><img alt="Deploy" src="https://github.com/Macorreag/analizador-credito/actions/workflows/deploy.yml/badge.svg" /></a>
  <img alt="License MIT" src="https://img.shields.io/badge/license-MIT-C9A227" />
  <img alt="React 19" src="https://img.shields.io/badge/React-19-3E9C8F" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3E9C8F" />
  <img alt="100% local" src="https://img.shields.io/badge/datos-100%25%20local-C9A227" />
</p>

---

## Qué es

**Analizador de Crédito** no es solo un simulador de cuota. Es una mesa de análisis para responder preguntas que la cuota esconde:

- ¿Cuánto voy a pagar **de verdad**, incluyendo seguros, comisiones y GMF?
- ¿Cuánto ahorro si abono a capital, y cuánto tiempo me quito?
- ¿Me conviene **reducir plazo** o **reducir cuota**?
- ¿La tasa que me ofrecen está cerca del techo legal?
- ¿La cuota cabe en mi ingreso, y qué pasa si la tasa sube?
- ¿Abonar o invertir? ¿Cuál es el umbral matemático?

La app corre en el navegador, sin backend, sin cuentas y sin analítica. Tus cifras se quedan en tu dispositivo.

## Lo que puedes hacer

| Módulo                | Qué resuelve                                                                                                                       |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Resumen ejecutivo** | Costo total, costo efectivo (TIR), reparto entre capital/interés/costos, veredictos de usura y DTI, palancas de mejora.            |
| **Amortización**      | Tabla mes a mes, gráfico de saldo vs. plan sin abonos, composición de cada pago y exportación CSV.                                 |
| **Abonos**            | Abonos únicos, mensuales o anuales; desde/hasta un mes; vista previa del ahorro antes de guardar; clic en el gráfico para simular. |
| **Escenarios**        | Guarda hasta 8 planes en el navegador y compáralos lado a lado (interés, costo, plazo).                                            |
| **Sensibilidad**      | Mapa de calor tasa × plazo, escalera de abonos mensuales y prueba de estrés de tasa/ingreso.                                       |
| **Capacidad**         | DTI, cuota/ingreso, capital máximo financiable, estrés de tasa e ingreso, y comparación abonar vs. invertir.                       |
| **Método**            | Fórmulas, supuestos, límites, fuente de usura y borrado de datos locales.                                                          |

### Motor financiero

- Sistemas **francés** (cuota fija), **alemán** (capital fijo) y **americano** (interés periódico + capital al final).
- Conversión entre **EA**, **tasa nominal anual (NAMV)** y **tasa periódica mensual**.
- **Gracia** con pago de intereses o gracia total con capitalización.
- Estrategias de abono: **reducir plazo** (misma cuota) y **reducir cuota** (mismo plazo).
- Costos: seguro de vida deudor (% del saldo), cuota de manejo, comisión de apertura y **GMF 4×1.000**.
- **TIR** del flujo real para estimar el costo efectivo anual.
- Comparación de sistemas, estrategias, palancas y escenarios.

Las fórmulas y los límites están documentados en [docs/metodologia.md](docs/metodologia.md).

## Inicio rápido

Requisitos: **Node.js 22+** y npm.

```bash
git clone https://github.com/Macorreag/analizador-credito.git
cd analizador-credito
npm ci
npm run dev
```

Abre `http://localhost:5173`. No hay variables de entorno ni claves.

Para probar el build de producción:

```bash
npm run build
npm run preview
```

> El build usa la base `/analizador-credito/` porque GitHub Pages sirve el proyecto en un subdirectorio. Para un dominio propio, cambia `base` en `vite.config.ts` a `/`.

## Scripts

| Comando                | Qué hace                                           |
| ---------------------- | -------------------------------------------------- |
| `npm run dev`          | Servidor de desarrollo con HMR.                    |
| `npm run build`        | Typecheck + build de producción en `dist/`.        |
| `npm run preview`      | Sirve el build localmente.                         |
| `npm test`             | Pruebas del motor, helpers y smoke de UI (Vitest). |
| `npm run test:watch`   | Pruebas en modo interactivo.                       |
| `npm run typecheck`    | TypeScript estricto, sin emitir.                   |
| `npm run lint`         | ESLint 10 (flat config).                           |
| `npm run format`       | Prettier.                                          |
| `npm run format:check` | Verifica formato sin escribir.                     |

## Arquitectura

```text
src/
├── lib/                    # Núcleo puro, sin React ni DOM
│   ├── credit.ts           # Motor de amortización, TIR, validación
│   ├── affordability.ts    # DTI, capital máximo, estrés
│   ├── sensitivity.ts      # Grilla tasa × plazo, escalera, sistemas
│   ├── levers.ts           # Palancas de mejora cuantificadas
│   ├── storage.ts          # Persistencia local versionada y saneada
│   ├── csv.ts              # Exportación compatible con Excel es-CO
│   └── format.ts           # Formato de moneda, tasas, fechas
├── components/             # UI y gráficos SVG sin librerías de charts
├── styles/                 # Tokens, base, layout y componentes
├── App.tsx                 # Estado, composición y persistencia
└── main.tsx                # Entrada + fuentes self-hosted
```

Decisiones clave en [docs/arquitectura.md](docs/arquitectura.md) y en `docs/decisiones/`.

- **Motor puro**: toda la matemática vive en `src/lib/credit.ts`; se puede probar sin navegador y reutilizar.
- **Sin dependencias de gráficos**: SVG propio, tooltips accesibles y tablas de respaldo.
- **Persistencia explícita**: `localStorage` versionado, saneado y con borrado de un clic.
- **Privacidad por diseño**: sin fetch, sin cookies, sin analytics, sin fuentes externas. CSP estricta en producción.

## Privacidad y seguridad

- **No hay backend.** Los cálculos ocurren en el navegador.
- **No se piden** nombre, cédula, correo ni teléfono.
- **No hay** Google Analytics, píxeles, cookies de terceros ni peticiones a CDNs.
- Las fuentes se sirven desde el propio bundle (`@fontsource`).
- `localStorage` guarda el plan y el ingreso declarado **solo en tu dispositivo**. Se puede borrar desde **Método → Borrar datos de este navegador**.
- En producción se inyecta una **CSP** que bloquea conexiones (`connect-src 'none'`), objetos, formularios y bases externas.
- El repositorio se revisa con **secret scan**, **CodeQL** y **Dependabot**. No hay claves ni archivos `.env`.

Más detalle en [PRIVACY.md](PRIVACY.md) y [SECURITY.md](SECURITY.md).

## Pruebas

```bash
npm test
```

La suite es deliberadamente **proporcionada, no exhaustiva por fuerza bruta**:

- Casos unitarios de tasas, sistemas, gracia, abonos, costos, TIR y validación.
- Una muestra representativa de 24 combinaciones para verificar identidades contables (capital, extras, costo, GMF).
- Helpers de capacidad, sensibilidad, palancas, almacenamiento, CSV y formato.
- Smoke de render y una prueba de interacción con `jsdom` (navegación, abono, cambio de monto, capacidad, método).

CI ejecuta `format:check`, `lint`, `typecheck`, `test` y `build` en cada push y pull request.

## Despliegue en GitHub Pages

El workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) construye y publica `dist/` con GitHub Actions y OIDC (sin secretos). Se dispara con cada push a `main` o manualmente desde **Actions → Deploy GitHub Pages → Run workflow**.

Pasos para un fork:

1. Activa **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Ajusta `base` en `vite.config.ts` si el repo tiene otro nombre.
3. Haz push a `main`.

## Límites

Esta herramienta es **informativa y educativa**. No es asesoría financiera, legal ni tributaria, ni una oferta de crédito. No modela tasa variable, UVR, pagos quincenales, impuestos distintos al GMF, penalidades por prepago ni condiciones específicas de cada entidad. Verifica siempre la tabla oficial y el contrato.

La referencia de usura es **editable** y tiene fecha. En Colombia se certifica mensualmente: consulta la [Superfinanciera](https://www.superfinanciera.gov.co/publicaciones/10116173/superfinanciera-certifica-el-interes-bancario-corriente/).

## Contribuir

Las contribuciones son bienvenidas. Lee [CONTRIBUTING.md](CONTRIBUTING.md) y el [código de conducta](CODE_OF_CONDUCT.md). Para cambios de cálculo, incluye una prueba y actualiza la metodología.

- Reporta errores con la plantilla de issue.
- Para vulnerabilidades, usa **Security → Report a vulnerability**; no abras un issue público.
- No incluyas datos personales reales en issues, capturas ni pruebas.

## Licencia

[MIT](LICENSE) © 2026 Miller Correa.

Hecho para entender, no para vender.
