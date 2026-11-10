# Metodología

Este documento describe cómo calcula **Analizador de Crédito**. El objetivo es que cualquier persona pueda reproducir las cifras, cuestionarlas y encontrar errores.

> Resumen: pagos mensuales vencidos, tasa fija, interés sobre saldo insoluto, abonos después de la cuota del mes y costo efectivo calculado como TIR. Todo se computa sin redondear; el redondeo es solo de presentación.

## 1. Notación

| Símbolo | Significado                               |
| ------- | ----------------------------------------- |
| `P`     | Capital desembolsado (monto del crédito). |
| `EA`    | Tasa efectiva anual, en porcentaje.       |
| `i`     | Tasa periódica mensual, en decimal.       |
| `n`     | Plazo total en meses, incluyendo gracia.  |
| `g`     | Meses de gracia.                          |
| `R`     | Cuota regular mensual.                    |
| `S_k`   | Saldo al final del mes `k`.               |

## 2. Conversión de tasas

La fuente de verdad interna es la **tasa efectiva anual**. Las demás se derivan:

```text
i   = (1 + EA/100)^(1/12) − 1          // EA → mensual
EA  = ((1 + i)^12 − 1) × 100            // mensual → EA
i   = NAMV/100/12                       // nominal anual mes vencido → mensual
NAMV = i × 12 × 100
```

Ejemplo: `EA = 22,09%` → `i = 1,6771%` mensual. La tasa nominal **no** es la tasa efectiva: dividir la nominal entre 12 ignora la capitalización.

## 3. Sistemas de amortización

### 3.1 Francés (cuota fija)

```text
R = P · i / (1 − (1 + i)^(−n))
```

Si `i = 0`, `R = P / n`. Cada mes:

```text
interés_k   = S_(k−1) · i
capital_k   = min(S_(k−1), R − interés_k)
cuota_k     = interés_k + capital_k
S_k         = S_(k−1) − capital_k
```

La última cuota se ajusta al saldo remanente.

### 3.2 Alemán (capital fijo)

```text
A = P / n
interés_k = S_(k−1) · i
cuota_k   = A + interés_k
S_k       = S_(k−1) − A
```

La cuota decrece porque el interés se calcula sobre un saldo cada vez menor. El total de intereses suele ser menor que en el francés, a cambio de una cuota inicial más alta.

### 3.3 Americano

Durante el plazo se pagan solo intereses; el capital se paga en la última cuota:

```text
cuota_k   = S_(k−1) · i          para k < n
cuota_n   = S_(n−1) · i + S_(n−1)
```

Los abonos reducen el saldo y, por tanto, el interés y el pago final.

## 4. Periodos de gracia

`n` es el plazo **total**; la amortización ocurre en `n − g` meses.

- **Solo intereses:** durante la gracia se paga `interés_k` y el capital no baja. Al terminar, se amortiza el saldo en `n − g` meses.
- **Gracia total:** el interés no se paga; se **capitaliza**. `S_k = S_(k−1) + interés_k`. Al terminar, se amortiza el nuevo saldo en `n − g` meses. Cuesta más que la gracia con pago de intereses.
- **Sin gracia:** `g = 0`.

Si `g ≥ n`, la configuración es inválida.

## 5. Abonos a capital

Un abono es una salida de caja adicional que reduce el saldo **después** de la cuota regular del mes.

Frecuencias:

- `once`: solo en `fromMonth`.
- `monthly`: desde `fromMonth` hasta `toMonth` (o el final).
- `annual`: en `fromMonth`, `fromMonth + 12`, `fromMonth + 24`, …

El abono se limita al saldo disponible: si el abono supera el saldo, el crédito termina ese mes y no se genera saldo negativo.

### 5.1 Reducir plazo (`reduce-term`)

Se conserva la cuota y el abono acorta la vida del crédito. Es la estrategia que maximiza el ahorro de intereses.

- Francés: `R` se mantiene fija; el saldo se extingue antes.
- Alemán: se mantiene el capital programado `A`; el plazo se acorta.
- Americano: el abono reduce el saldo y el pago final; el plazo solo se acorta si el abono salda todo.

### 5.2 Reducir cuota (`reduce-payment`)

Se conserva el plazo. Después de cada abono se recalcula la cuota para amortizar el saldo restante en los meses que quedan.

- Francés: nueva `R = PMT(S_k, i, meses_restantes)`.
- Alemán: nuevo `A = S_k / meses_restantes`.
- Americano: la cuota es interés puro; el abono reduce el pago final.

En la práctica, reducir plazo ahorra más intereses; reducir cuota libera flujo mensual. La app muestra ambos efectos.

## 6. Costos

| Costo                        | Modelo                                                |
| ---------------------------- | ----------------------------------------------------- |
| Seguro de vida deudor        | `saldo_inicial_mes × tasa_seguro_mensual`             |
| Cargo fijo (cuota de manejo) | Valor fijo por mes.                                   |
| Comisión de apertura         | `P × % / 100`, pagada al desembolso.                  |
| GMF (4×1.000)                | `0,4%` del desembolso y de cada pago (cuota + abono). |

El seguro se calcula sobre el saldo al **inicio** del mes, antes de la amortización, que es una convención habitual. La comisión de apertura no se financia: se resta del desembolso neto.

Los **cargos y notas opcionales** son una lista de conceptos (honorarios, interés de mora, otros cargos fijos, notas crédito). Cada uno tiene un importe, una frecuencia (`mensual` o `único`) y un rango de meses. Se suman a la cuota y al flujo de caja; un importe negativo reduce el pago y el costo. No recalculan el capital por sí mismos. La mora se modela como un valor fijo estimado: no depende de días de atraso ni de una tasa de mora.

> El GMF tiene exenciones y reglas de causación. Aquí se modela como aproximación configurable y desactivable.

## 7. Costo efectivo anual (TIR)

Se construye el flujo de caja real:

```text
Flujo_0 = P − comisión_apertura − GMF_desembolso
Flujo_k = −(cuota_k + abono_k + GMF_k)     para k = 1..n
```

Se resuelve `r` mensual por bisección:

```text
0 = Σ Flujo_t / (1 + r)^t
EA_real = (1 + r)^12 − 1
```

Si no hay cambio de signo o el desembolso neto no es positivo, el resultado es `null`. Sin costos, la TIR coincide con la EA contractual (salvo redondeo numérico).

Esto **no es el CAT oficial**: el CAT incluye otros conceptos, impuestos y metodologías de cada entidad. Se etiqueta como “costo efectivo” para no confundirlo.

## 8. Capacidad de pago

```text
cuota_total       = cuota máxima regular + otras deudas
DTI               = cuota_total / ingreso_neto_mensual × 100
capacidad         = ingreso × DTI_máximo / 100 − otras_deudas
holgura           = capacidad − cuota_regular
capital_máximo    = bisección: máximo P tal que cuota_regular(P) ≤ capacidad
```

El cálculo de `capital_máximo` usa la misma tasa, plazo y costos, **sin abonos voluntarios**, porque la entidad evalúa la cuota contractual. La bisección se detiene a 70 iteraciones o cuando el capital converge al peso.

Estrés:

- Tasa +1, +2 y +4 puntos porcentuales (EA).
- Ingreso −20%.
- Combinación de ambos.

No se modelan gastos básicos, score, historial ni estabilidad laboral. El DTI es una aproximación, no una aprobación.

## 9. Sensibilidad y palancas

- **Grilla tasa × plazo:** 5 tasas alrededor de la actual (±2 y ±4 pp) y 5 plazos (±12 y ±24 meses), sin abonos, para aislar el efecto de tasa y plazo.
- **Escalera de abonos:** abono mensual del 0%, 0,25%, 0,5%, 1% y 2% del capital, desde el mes 1. Muestra ahorro, meses menos y ahorro por peso abonado.
- **Palancas:** tasa −1 pp, abono mensual del 1%, sistema alemán, eliminación de costos y plazo +12 meses. Cada una se calcula contra el plan actual y se aplica con un clic.

## 10. Tasa de usura

Para crédito de consumo en Colombia, la tasa de usura es **1,5 veces el interés bancario corriente** certificado por la Superfinanciera. Para vivienda aplican reglas distintas y la referencia de esta app no debe usarse como si fuera la misma. La app incluye una referencia editable con fecha (noviembre de 2026: **28,34% EA**) y advierte si la tasa del crédito la supera o se acerca.

La referencia **no se actualiza sola**; el valor oficial cambia cada mes. Verifica siempre la fuente:

- [Superfinanciera — Interés bancario corriente](https://www.superfinanciera.gov.co/publicaciones/10116173/superfinanciera-certifica-el-interes-bancario-corriente/)

Cobrar por encima de la usura es ilegal en Colombia. La app no constituye asesoría legal.

## 11. Precisión y redondeo

- Los cálculos usan números de punto flotante de doble precisión y **no redondean** pagos intermedios.
- La tabla y los KPIs redondean a pesos; el CSV exporta dos decimales con coma decimal.
- Por eso puede haber diferencias de unos pesos frente a la tabla del banco, que suele redondear cada cuota.
- El saldo se considera cero cuando `|saldo| ≤ 0,005`.

## 12. Validaciones

- Monto > 0; tasa entre 0% y 1.000% EA; plazo entre 1 y 600 meses.
- Gracia < plazo; abonos dentro del plazo; montos no negativos.
- Seguro ≤ 5% mensual; apertura ≤ 50%; advertencias por valores inusuales.
- Cargos y notas: máximo 20 conceptos, importes finitos, mes inicial/final dentro del plazo; los negativos se aceptan como notas crédito.
- Si hay errores, el motor devuelve `ok: false`, lista de issues y no calcula la tabla.

## 13. Pruebas

La suite (`npm test`) cubre:

- Identidades contables: `capital_pagado + abonos = P + interés_capitalizado`, `costo = total_pagado − P`, suma de filas = totales.
- Casos unitarios por sistema, gracia, costos, TIR y validación.
- Una muestra representativa de 24 combinaciones (no una explosión factorial).
- Capacidad, sensibilidad, palancas, storage y CSV.
- Smoke de render y una prueba de interacción ligera con `jsdom`.

## 14. Limitaciones

No se modelan: tasa variable, UVR, pagos quincenales, cuotas crecientes, seguros obligatorios distintos, impuestos diferentes al GMF, penalidades por prepago, notaría/registro, avalúos, codeudores, garantías, score ni comportamiento de pago. Los resultados son una estimación educativa.
