import { APP_VERSION, REPOSITORY_URL } from '../lib/defaults';
import { GithubIcon } from './icons';

export function Footer() {
  return (
    <footer className="footer">
      <p>
        Herramienta informativa de análisis. No es asesoría financiera ni una oferta de crédito.
        Verifica siempre la tabla oficial y el contrato de tu entidad.
      </p>
      <div className="footer-meta">
        <span>v{APP_VERSION} · MIT</span>
        <a href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer">
          <span className="inline">
            <GithubIcon size={12} /> Código abierto
          </span>
        </a>
        <span>Sin cookies · sin analítica</span>
      </div>
    </footer>
  );
}
