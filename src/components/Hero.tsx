import { APP_VERSION } from '../lib/defaults';

export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <p className="eyebrow">Mesa de análisis · v{APP_VERSION}</p>
        <h1 id="hero-title" className="display">
          Tu crédito,
          <br />
          <em>sin letra pequeña.</em>
        </h1>
        <p className="hero-lede">
          Mira cuánto pagas de verdad, qué pasa si abonas a capital y cuánto aguanta tu bolsillo.
          <strong> Todo se calcula en tu navegador</strong>: sin cuentas, sin servidores, sin datos
          que se escapen.
        </p>
        <div className="hero-badges">
          <span className="badge badge--teal">Amortización exacta</span>
          <span className="badge badge--gold">Abonos y escenarios</span>
          <span className="badge">Costo efectivo · TIR</span>
          <span className="badge">Capacidad de pago</span>
        </div>
      </div>

      <div className="hero-art" aria-hidden="true">
        <svg viewBox="0 0 420 250" fill="none">
          <defs>
            <linearGradient
              id="hero-area"
              x1="40"
              y1="40"
              x2="380"
              y2="210"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#3E9C8F" stopOpacity="0.22" />
              <stop offset="1" stopColor="#3E9C8F" stopOpacity="0" />
            </linearGradient>
            <linearGradient
              id="hero-line"
              x1="40"
              y1="60"
              x2="380"
              y2="200"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#63C2B3" />
              <stop offset="1" stopColor="#3E9C8F" />
            </linearGradient>
          </defs>

          {[54, 98, 142, 186, 230].map((y) => (
            <line key={y} x1="40" y1={y} x2="390" y2={y} stroke="#2B3438" strokeDasharray="2 6" />
          ))}
          {[40, 110, 180, 250, 320, 390].map((x) => (
            <line key={x} x1={x} y1="40" x2={x} y2="230" stroke="#2B3438" strokeOpacity="0.45" />
          ))}

          <path
            d="M40 54 C 100 58, 120 72, 160 96 C 205 124, 220 150, 260 172 C 300 193, 330 202, 390 212"
            stroke="#C9A227"
            strokeWidth="1.6"
            strokeDasharray="5 5"
            opacity="0.8"
          />
          <path
            d="M40 54 C 100 58, 120 72, 160 96 C 205 124, 220 150, 260 172 C 300 193, 330 202, 390 212 L 390 230 L 40 230 Z"
            fill="url(#hero-area)"
          />
          <path
            d="M40 54 C 92 56, 118 66, 150 84 C 194 108, 212 128, 248 144 C 292 163, 330 170, 390 176"
            stroke="url(#hero-line)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="150" cy="84" r="4.5" fill="#3E9C8F" stroke="#121619" strokeWidth="2" />
          <circle cx="248" cy="144" r="4.5" fill="#3E9C8F" stroke="#121619" strokeWidth="2" />
          <circle cx="390" cy="176" r="5" fill="#63C2B3" stroke="#121619" strokeWidth="2" />

          <g fill="#98A29D" fontFamily="IBM Plex Mono, monospace" fontSize="9">
            <text x="40" y="40">
              SALDO
            </text>
            <text x="322" y="40">
              CON ABONOS
            </text>
            <text x="40" y="247">
              MES 1
            </text>
            <text x="352" y="247">
              MES 84
            </text>
          </g>
          <g fill="#C9A227" fontFamily="IBM Plex Mono, monospace" fontSize="9">
            <text x="250" y="52">
              SIN ABONOS
            </text>
          </g>
        </svg>
        <div className="hero-art-caption">Cada abono mueve la curva</div>
      </div>
    </section>
  );
}
