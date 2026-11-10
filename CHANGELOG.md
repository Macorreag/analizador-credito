# Changelog

Todos los cambios relevantes se documentan aquí. El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el versionado [SemVer](https://semver.org/lang/es/).

## [Unreleased]

## [1.2.0] — 2026-11-10

### Añadido

- Cargos y notas opcionales por concepto: cargo fijo, honorarios, interés de mora, otros cargos y notas crédito.
- Frecuencia mensual o única, con mes inicial y mes final opcional.
- Importes negativos para notas crédito, con efecto en la cuota, el costo total, la TIR, la tabla y el CSV.
- Columna “Cargos” en la tabla de amortización y en el detalle del dashboard.
- Los cargos se integran en la sección de costos existente, plegada por defecto para no sobrecargar la interfaz.

### Cambiado

- “Cuota de manejo” pasa a llamarse **Cargo fijo mensual** en la interfaz, manteniendo el mismo campo del motor.
- La sección de costos ahora se llama **Costos, cargos y GMF**.
- El CSV incluye la columna y el total de **Cargos**.
- La metodología documenta el nuevo modelo de cargos y notas.

## [1.1.0] — 2026-11-08

### Añadido

- Nueva vista inicial tipo **dashboard**: KPIs, costo, capacidad, semáforo, palancas, abonos, tabla, escenarios, escalera de abonos, sistemas y mapa tasa × plazo en una sola página.
- Barra de contexto del plan con capital, tasa, plazo, sistema y abonos, y acciones rápidas de edición/exportación.
- Entrada rápida de ingreso mensual desde la tarjeta de capacidad.
- Accesos directos desde cada tarjeta al detalle correspondiente.

### Cambiado

- La pestaña “Resumen” pasa a llamarse **Dashboard**.
- Se eliminó el hero editorial para priorizar los datos y reducir el desplazamiento inicial.
- El panel de parámetros se compactó en ancho para dar más espacio al tablero.

## [1.0.1] — 2026-11-02

### Cambiado

- Valores de ejemplo neutros por defecto (sin publicar un plan personal concreto).
- Matriz de sensibilidad con formato de moneda es-CO.
- Estado de “abonos sin efecto” cuando un abono no cambia el resultado.

### Corregido

- La base de GitHub Pages se aplica también en `vite preview`.
- `minimatch` fijado a una versión sin la vulnerabilidad moderada; `npm audit` limpio.
- Actualización de acciones de GitHub (checkout, setup-node, configure-pages, upload/deploy-pages).

## [1.0.0] — 2026-11-02

### Añadido

- Motor de amortización en TypeScript con sistemas francés, alemán y americano.
- Conversión entre EA, NAMV y tasa periódica mensual.
- Periodos de gracia con pago de intereses o capitalización total.
- Abonos únicos, mensuales y anuales, con estrategias de reducción de plazo o de cuota.
- Seguro de vida deudor, cuota de manejo, comisión de apertura y GMF configurables.
- Costo efectivo anual por TIR y comparación con la tasa contractual.
- Análisis de capacidad de pago: DTI, capital máximo, estrés de tasa e ingreso.
- Comparación de sistemas, estrategias y escenarios guardados.
- Grilla de sensibilidad tasa × plazo y escalera de abonos.
- Palancas de mejora cuantificadas y comparación abonar vs. invertir.
- Gráficos SVG propios con tooltips, teclado y tabla de respaldo.
- Exportación CSV compatible con Excel en español.
- Persistencia local versionada, saneada y borrable.
- Interfaz responsive con identidad editorial, fuentes self-hosted y modo impresión.
- Documentación de metodología, arquitectura, privacidad y seguridad.
- CI con formato, lint, tipos, pruebas, build y escaneo de secretos.
- Despliegue en GitHub Pages con Actions y OIDC.
- CodeQL y Dependabot.

### Seguridad

- Sin backend, sin analytics, sin CDNs ni fuentes externas.
- CSP estricta en producción.
- Escaneo de secretos en CI.

### Pruebas

- Suite de motor, helpers, almacenamiento, CSV, formato y smoke de UI.
- Muestra representativa de combinaciones para identidades contables.
- Prueba de interacción ligera con jsdom.

[Unreleased]: https://github.com/Macorreag/analizador-credito/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/Macorreag/analizador-credito/releases/tag/v1.2.0
[1.1.0]: https://github.com/Macorreag/analizador-credito/releases/tag/v1.1.0
[1.0.1]: https://github.com/Macorreag/analizador-credito/releases/tag/v1.0.1
[1.0.0]: https://github.com/Macorreag/analizador-credito/releases/tag/v1.0.0
