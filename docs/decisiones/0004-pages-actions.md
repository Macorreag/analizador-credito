# ADR 0004 — GitHub Pages con Actions y OIDC

- **Estado:** aceptado
- **Fecha:** 2026-11-02

## Contexto

Se necesita publicar sin servidores ni secretos, con despliegues reproducibles y auditoría.

## Decisión

Construir en CI y publicar con `actions/configure-pages`, `upload-pages-artifact` y `deploy-pages`, usando el entorno `github-pages` y OIDC. El repositorio no guarda tokens.

## Consecuencias

- Cada push a `main` despliega la versión construida y probada.
- No se necesita rama `gh-pages` ni credenciales.
- La configuración de Pages debe estar en “GitHub Actions” (se hace una vez).
