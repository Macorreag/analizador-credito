import { APP_VERSION, REPOSITORY_URL, USURY_REFERENCE } from '../lib/defaults';
import { formatPct } from '../lib/format';
import { Badge, Callout, Card, Field, NumberInput, SectionHead } from './ui';
import { ExternalIcon, GithubIcon, InfoIcon, LockIcon, TrashIcon } from './icons';

const METHODOLOGY_URL = `${REPOSITORY_URL}/blob/main/docs/metodologia.md`;
const TESTING_URL = `${REPOSITORY_URL}/blob/main/CONTRIBUTING.md`;

export function MethodologyPanel({
  usuryEaPct,
  usuryPeriodLabel,
  onUsuryChange,
  onClearData,
}: {
  usuryEaPct: number;
  usuryPeriodLabel: string;
  onUsuryChange: (value: number) => void;
  onClearData: () => void;
}) {
  return (
    <div className="content-panel">
      <Card className="card--pad">
        <div className="card-head">
          <div>
            <div className="card-title">Cómo se calcula (y qué no)</div>
            <div className="card-sub">
              La transparencia también es una funcionalidad: puedes auditar el motor, las fórmulas y
              los supuestos.
            </div>
          </div>
          <Badge tone="gold">v{APP_VERSION} · MIT</Badge>
        </div>
        <Callout tone="neutral" title="Regla de oro" icon={<InfoIcon size={15} />}>
          Las cifras son una estimación matemática, no una liquidación oficial. Tu banco puede usar
          convenciones de redondeo, seguros o fechas distintas. Contrástalas con la tabla oficial.
        </Callout>
      </Card>

      <section className="section" aria-labelledby="method-what">
        <SectionHead
          kicker="01 · Alcance"
          title="Qué entra en el motor"
          description="Todo se calcula en el navegador con aritmética de punto flotante y se redondea solo al mostrar."
          id="method-what"
        />
        <div className="method-grid">
          <div className="method-block">
            <h3>Amortización</h3>
            <p>
              Sistemas <code>francés</code>, <code>alemán</code> y <code>americano</code>, con tasa
              fija, pagos mensuales vencidos, gracia con pago de intereses o gracia total con
              capitalización.
            </p>
          </div>
          <div className="method-block">
            <h3>Abonos</h3>
            <p>
              Abonos únicos, mensuales o anuales, desde un mes y hasta un mes. Estrategia de{' '}
              <code>reducir plazo</code> (misma cuota) o <code>reducir cuota</code> (mismo plazo).
            </p>
          </div>
          <div className="method-block">
            <h3>Costo real</h3>
            <p>
              Intereses, seguro de vida deudor, cuota de manejo, comisión de apertura y GMF. La TIR
              del flujo de caja se anualiza para obtener el costo efectivo anual.
            </p>
          </div>
          <div className="method-block">
            <h3>Capacidad y estrés</h3>
            <p>
              DTI sobre ingreso neto, capital máximo por bisección, estrés de tasa y de ingreso.
              Compara el rendimiento implícito de abonar contra una inversión alternativa.
            </p>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="method-formulas">
        <SectionHead
          kicker="02 · Fórmulas"
          title="La matemática, sin cajas negras"
          description="Si encuentras una diferencia, revisa primero estas convenciones."
          id="method-formulas"
        />
        <Card className="card--pad">
          <div className="method-grid">
            <div className="method-block">
              <h3>Tasa periódica</h3>
              <p>La EA se convierte a mensual con interés compuesto; la nominal, dividiendo.</p>
              <code className="formula">i = (1 + EA)^(1/12) − 1{'\n'}i = NAMV / 12</code>
            </div>
            <div className="method-block">
              <h3>Cuota francesa</h3>
              <p>Pago uniforme que extingue el saldo en n meses.</p>
              <code className="formula">R = P · i / (1 − (1 + i)^(−n))</code>
            </div>
            <div className="method-block">
              <h3>Sistema alemán</h3>
              <p>Capital constante; la cuota decrece porque el interés baja con el saldo.</p>
              <code className="formula">A = P / n{'\n'}Cuota_k = A + i · Saldo_(k−1)</code>
            </div>
            <div className="method-block">
              <h3>Costo efectivo (TIR)</h3>
              <p>Se resuelve por bisección el flujo neto: desembolso menos todos los pagos.</p>
              <code className="formula">
                0 = Flujo_0 + Σ Flujo_t / (1 + r)^t{'\n'}EA_real = (1 + r_mensual)^12 − 1
              </code>
            </div>
          </div>
          <p className="table-note">
            El interés se calcula sobre el saldo al inicio del mes. El seguro se calcula sobre ese
            mismo saldo; la cuota de manejo es fija. Los abonos se aplican después de la cuota del
            mes y se limitan al saldo pendiente.
          </p>
        </Card>
      </section>

      <section className="section" aria-labelledby="method-limits">
        <SectionHead
          kicker="03 · Límites"
          title="Lo que este modelo no hace"
          description="Un modelo honesto también declara sus bordes."
          id="method-limits"
        />
        <Card className="card--pad">
          <ul className="method-list">
            <li>
              No incluye impuestos distintos al GMF, notaría, registro, avalúos, seguros
              obligatorios adicionales ni penalidades por prepago. Ley 1555 de 2012 y las
              condiciones del contrato pueden cambiar el costo real.
            </li>
            <li>
              No modela tasa variable, UVR, pagos quincenales, cuotas crecientes, periodos de gracia
              con condiciones especiales ni créditos con garantía hipotecaria.
            </li>
            <li>
              No evalúa score, centrales de riesgo, estabilidad laboral, codeudores ni garantías. El
              DTI es una aproximación, no una aprobación.
            </li>
            <li>
              El GMF se modela como 0,4% del desembolso y de cada pago. En la práctica tiene
              exenciones y reglas de causación que pueden variar.
            </li>
            <li>
              La TIR supone pagos puntuales y completos. Un pago tardío o un incumplimiento cambia
              por completo el resultado.
            </li>
            <li>
              La referencia de usura es un valor editable con fecha. Las tasas se certifican
              mensualmente y cambian: verifica siempre la fuente oficial.
            </li>
          </ul>
        </Card>
      </section>

      <section className="section" aria-labelledby="method-usury">
        <SectionHead
          kicker="04 · Usura"
          title="El techo legal, con fecha"
          description="Para crédito de consumo, la tasa de usura es 1,5 veces el interés bancario corriente certificado por la Superfinanciera."
          id="method-usury"
        />
        <Card className="card--pad">
          <div className="split">
            <Field
              label="Tasa de usura de referencia"
              htmlFor="usury-method"
              hint={`Valor de referencia: ${USURY_REFERENCE.periodLabel}. Editable.`}
            >
              <NumberInput
                id="usury-method"
                value={usuryEaPct}
                onChange={(value) => onUsuryChange(Math.max(0, value))}
                step={0.01}
                min={0}
                max={1000}
                suffix="% EA"
              />
            </Field>
            <div className="method-block" style={{ alignSelf: 'end' }}>
              <p>
                Referencia usada: <strong>{formatPct(usuryEaPct, 2)} EA</strong> ({usuryPeriodLabel}
                ).{' '}
                <a
                  className="source-link"
                  href={USURY_REFERENCE.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {USURY_REFERENCE.sourceLabel} <ExternalIcon size={11} />
                </a>
              </p>
              <p className="tiny">
                Cobrar por encima de la usura es ilegal en Colombia. Si tu contrato la supera, busca
                asesoría y conserva la evidencia.
              </p>
            </div>
          </div>
        </Card>
      </section>

      <section className="section" aria-labelledby="method-privacy">
        <SectionHead
          kicker="05 · Privacidad"
          title="Nada sale de tu navegador"
          description="Sin cuentas, sin backend, sin analítica, sin cookies de terceros."
          id="method-privacy"
        />
        <div className="split">
          <Card className="card--pad">
            <div className="privacy-block">
              <LockIcon size={18} />
              <div>
                <h3>Qué guardamos</h3>
                <p>
                  Tu plan, tu ingreso declarado y los escenarios se guardan en{' '}
                  <code>localStorage</code> de este navegador para que no pierdas el trabajo. No se
                  envían a ningún servidor.
                </p>
              </div>
            </div>
            <div className="privacy-block">
              <LockIcon size={18} />
              <div>
                <h3>Qué no hacemos</h3>
                <p>
                  No pedimos nombre, cédula, correo ni teléfono. No usamos Google Analytics, píxeles
                  ni fuentes externas. La app no tiene peticiones de red después de cargar.
                </p>
              </div>
            </div>
            <div className="privacy-block">
              <LockIcon size={18} />
              <div>
                <h3>Tu control</h3>
                <p>
                  Puedes borrar todo lo guardado con un clic. El despliegue en GitHub Pages solo
                  registra las visitas que GitHub gestiona como hosting; no tenemos acceso a esos
                  datos.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="btn btn--danger btn--sm"
              onClick={onClearData}
              style={{ marginTop: 4 }}
            >
              <TrashIcon size={12} /> Borrar datos de este navegador
            </button>
          </Card>
          <Card className="card--pad">
            <div className="privacy-block">
              <GithubIcon size={18} />
              <div>
                <h3>Código abierto</h3>
                <p>
                  El código, las fórmulas y las pruebas están en GitHub. Si encuentras un error de
                  cálculo, abre un issue con el caso reproducible.
                </p>
                <p className="tiny">
                  <a href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer">
                    Repositorio <ExternalIcon size={10} />
                  </a>{' '}
                  ·{' '}
                  <a href={METHODOLOGY_URL} target="_blank" rel="noopener noreferrer">
                    Metodología extendida <ExternalIcon size={10} />
                  </a>{' '}
                  ·{' '}
                  <a href={TESTING_URL} target="_blank" rel="noopener noreferrer">
                    Cómo contribuir <ExternalIcon size={10} />
                  </a>
                </p>
              </div>
            </div>
            <div className="privacy-block">
              <InfoIcon size={18} />
              <div>
                <h3>Calidad</h3>
                <p>
                  El motor financiero es un módulo puro con pruebas automáticas: identidades
                  contables, tasas, gracia, sistemas, abonos, TIR y una matriz de escenarios. CI
                  ejecuta lint, tipos, pruebas y build en cada cambio.
                </p>
              </div>
            </div>
            <div className="privacy-block">
              <InfoIcon size={18} />
              <div>
                <h3>Licencia y aviso</h3>
                <p>
                  MIT. Uso informativo y educativo. No es asesoría financiera, legal ni tributaria,
                  ni una oferta de crédito. Las decisiones son tuyas.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <p className="table-note" style={{ marginTop: 22 }}>
        Versión {APP_VERSION} · Hecho con React, TypeScript y Vite · Sin backend · Sin cookies.
      </p>
    </div>
  );
}
