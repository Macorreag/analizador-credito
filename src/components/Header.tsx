import { REPOSITORY_URL } from '../lib/defaults';
import { GithubIcon, LogoMark, PrintIcon } from './icons';

export function Header({ onPrint }: { onPrint: () => void }) {
  return (
    <header className="topbar">
      <a className="brand" href="#resumen" aria-label="Analizador de Crédito — ir al resumen">
        <span className="brand-mark">
          <LogoMark size={28} />
        </span>
        <span className="brand-word">
          <span className="brand-name">crédito</span>
          <span className="brand-sub">analizador</span>
        </span>
      </a>

      <div className="topbar-actions">
        <span
          className="privacy-pill"
          title="Los cálculos ocurren en tu navegador. No hay backend ni analítica."
        >
          100% local
        </span>
        <a
          className="icon-btn"
          href={REPOSITORY_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Ver el código en GitHub"
          title="Código abierto en GitHub"
        >
          <GithubIcon size={16} />
        </a>
        <button type="button" className="btn btn--ghost btn--sm no-print" onClick={onPrint}>
          <PrintIcon size={14} />
          <span className="print-label">Imprimir</span>
        </button>
      </div>
    </header>
  );
}
