# Privacidad

**Analizador de Crédito** fue diseñado para no necesitar tus datos.

## Qué datos recopila el proyecto

Ninguno. No hay backend, cuentas, formularios de contacto, analytics, píxeles ni cookies propias.

## Qué se guarda en tu dispositivo

En `localStorage`, bajo la clave `analizador-credito:v1`:

- El plan del crédito (monto, tasa, plazo, sistema, gracia, costos, abonos, fecha del primer pago).
- El ingreso neto y otras deudas que decidas ingresar para el análisis de capacidad.
- La tasa de usura de referencia que edites.
- Los escenarios que guardes (máximo 8).
- La pestaña activa no se guarda; el resto se guarda con un retraso de 350 ms.

Esta información **no se transmite**. Puedes borrarla desde **Método → Borrar datos de este navegador** o limpiando los datos del sitio en tu navegador.

## Terceros

- **GitHub Pages** aloja el sitio y puede registrar solicitudes HTTP (IP, user-agent, fecha) según sus políticas. El proyecto no tiene acceso a esos registros ni los usa para analítica.
- **Enlaces externos** (Superfinanciera, GitHub) solo se abren si haces clic. No se cargan recursos externos: fuentes, iconos y gráficos son locales.
- No hay Google Fonts, CDNs de JavaScript, ni servicios de analítica.

## Menores

La app no está dirigida a menores ni recopila datos de ninguna persona.

## Cambios

Si en el futuro se añadiera una función que implique red o datos personales, se documentará aquí y en la app antes de activarla. La versión actual (1.x) no lo hace.
