# Seguridad

## Versiones soportadas

| Versión | Soporte |
| ------- | ------- |
| 1.x     | Sí      |
| < 1.0   | No      |

## Reportar una vulnerabilidad

**No abras un issue público.** Usa el reporte privado de GitHub:

[Security → Report a vulnerability](https://github.com/Macorreag/analizador-credito/security/advisories/new)

Incluye:

- Descripción del problema y su impacto.
- Pasos para reproducirlo (sin datos personales reales).
- Versión o commit afectado.
- Si aplica, una prueba de concepto mínima.

Recibirás acuse de recibo y una evaluación inicial. Los plazos dependen de la disponibilidad del mantenedor; se priorizan los problemas de integridad de datos, XSS, dependencias y despliegue.

## Alcance

La app es **estática y sin backend**. Son relevantes:

- XSS o inyección en la UI, CSV o exportaciones.
- Manipulación de la CSP o de la cadena de suministro (dependencias, Actions).
- Exposición de secretos o datos personales en el repositorio.
- Errores de cálculo que induzcan a decisiones financieras peligrosas (se tratan como bugs críticos).

Quedan fuera de alcance:

- Ingeniería social.
- Ataques que requieran control del dispositivo o del navegador del usuario.
- Limitaciones conocidas documentadas en [docs/metodologia.md](docs/metodologia.md).
- Reclamos sobre decisiones financieras tomadas con la herramienta.

## Prácticas del proyecto

- Sin secretos versionados; CI ejecuta un escaneo de patrones.
- Sin backend ni base de datos que comprometer.
- `localStorage` se sanea antes de usarse; el JSON es una frontera no confiable.
- CSP estricta en producción (`connect-src 'none'`, `object-src 'none'`).
- Dependabot y CodeQL configurados.
- Dependencias fijadas por `package-lock.json`.

## Divulgación

Se coordinará una divulgación responsable después de corregir el problema. Se acreditará a quien reporte si así lo desea.
