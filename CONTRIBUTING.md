# Contribuir

Gracias por querer mejorar **Analizador de Crédito**. La app es pequeña a propósito: el cálculo es el núcleo y la transparencia es parte del producto.

## Antes de empezar

- Busca un issue existente o abre uno con la plantilla.
- Para cambios grandes, describe primero el problema y el enfoque.
- No incluyas datos personales reales (montos, ingresos, nombres, capturas de extractos) en issues, PRs ni pruebas.

## Entorno

Requisitos: Node.js 22+ y npm.

```bash
npm ci
npm run dev
```

No hay variables de entorno, claves ni servicios externos.

## Flujo

1. Crea una rama: `feat/...`, `fix/...`, `docs/...` o `chore/...`.
2. Haz el cambio más pequeño que resuelva el problema.
3. Añade o ajusta pruebas **proporcionadas** (ver abajo).
4. Ejecuta:

```bash
npm run format
npm run lint
npm run typecheck
npm test
npm run build
```

5. Abre el PR con la plantilla y explica el **por qué**, no solo el qué.

## Pruebas: suaves y adecuadas

La suite debe ser rápida y legible. No buscamos cobertura por fuerza bruta.

- **Sí:** casos límite relevantes, identidades contables, una muestra representativa de combinaciones (por ejemplo, 24), smoke de render y una interacción clave.
- **No:** matrices factoriales gigantes que duplican el mismo camino, snapshots frágiles de HTML, pruebas que dependen de la hora o de la red, ni datos personales.
- Si un caso descubre un bug, deja la prueba mínima que lo reproduce.
- Las pruebas financieras deben incluir el resultado esperado y, cuando aplique, la identidad que lo respalda.

## Cambios de cálculo

Un cambio en `src/lib/` requiere:

- Prueba que falle antes y pase después.
- Actualización de [`docs/metodologia.md`](docs/metodologia.md) si cambia una fórmula, un supuesto o una convención.
- Revisión de los límites y del texto de la app (los usuarios deben saber qué cambió).

## Estilo

- TypeScript estricto; evita `any` y las aserciones innecesarias.
- Prettier y ESLint son la fuente de verdad (`npm run format`, `npm run lint`).
- Componentes pequeños; la lógica financiera va en `src/lib/`, nunca en un componente.
- Español claro en la interfaz, sin jerga innecesaria. Los nombres de código pueden ser técnicos.
- Accesibilidad: etiquetas en inputs, foco visible, contraste, texto además de color, soporte de teclado en el gráfico.

## Commits

Usa mensajes concisos en imperativo, preferiblemente Conventional Commits:

```text
feat: agregar comparación de estrategias de abono
fix: corregir capitalización en gracia total
docs: documentar fórmula de TIR
```

## PR checklist

- [ ] El cambio tiene una justificación clara.
- [ ] Pasan formato, lint, tipos, tests y build.
- [ ] Añadí pruebas proporcionadas si cambia lógica.
- [ ] Actualicé la metodología si cambia una fórmula o supuesto.
- [ ] No hay secretos, datos personales ni dependencias innecesarias.
- [ ] La UI sigue siendo usable en móvil y con teclado.

## Seguridad

No abras issues públicos para vulnerabilidades. Usa [Security → Report a vulnerability](https://github.com/Macorreag/analizador-credito/security/advisories/new). Ver [SECURITY.md](SECURITY.md).

## Licencia

Al contribuir aceptas que tu aporte se publique bajo la licencia MIT del proyecto.
