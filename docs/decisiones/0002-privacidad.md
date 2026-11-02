# ADR 0002 — Privacidad por diseño, sin backend

- **Estado:** aceptado
- **Fecha:** 2026-11-02

## Contexto

El análisis incluye ingreso, deudas y planes personales. Enviarlos a un servidor añadiría riesgo, costo y obligaciones de protección de datos sin necesidad.

## Decisión

La app es completamente estática. No hay API, cuentas, cookies, analytics ni fuentes externas. La persistencia es `localStorage` y se puede borrar. La CSP de producción bloquea conexiones.

## Consecuencias

- No se pueden compartir planes por URL sin exponer datos; se optó por no hacerlo.
- El usuario es dueño de sus datos y de su copia.
- El hosting (GitHub Pages) aplica sus propios logs; no son accesibles para el proyecto.
- No hay recuperación entre dispositivos; es un trade-off deliberado.
