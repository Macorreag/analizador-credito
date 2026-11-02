import { useRef } from 'react';
import { TAB_IDS, type TabId } from './tabsMeta';

const TAB_LABELS: Record<TabId, { label: string; index: string }> = {
  resumen: { label: 'Resumen', index: '01' },
  amortizacion: { label: 'Amortización', index: '02' },
  escenarios: { label: 'Escenarios', index: '03' },
  sensibilidad: { label: 'Sensibilidad', index: '04' },
  capacidad: { label: 'Capacidad', index: '05' },
  metodologia: { label: 'Método', index: '06' },
};

export function Tabs({ active, onChange }: { active: TabId; onChange: (tab: TabId) => void }) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function moveFocus(currentIndex: number, direction: 1 | -1) {
    const nextIndex = (currentIndex + direction + TAB_IDS.length) % TAB_IDS.length;
    const next = TAB_IDS[nextIndex];
    onChange(next);
    window.requestAnimationFrame(() => refs.current[nextIndex]?.focus());
  }

  return (
    <nav className="tabs" role="tablist" aria-label="Secciones del análisis">
      {TAB_IDS.map((tab, index) => {
        const meta = TAB_LABELS[tab];
        return (
          <button
            key={tab}
            ref={(node) => {
              refs.current[index] = node;
            }}
            id={`tab-${tab}`}
            type="button"
            role="tab"
            className="tab"
            aria-selected={active === tab}
            aria-controls={`panel-${tab}`}
            tabIndex={active === tab ? 0 : -1}
            onClick={() => onChange(tab)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight') {
                event.preventDefault();
                moveFocus(index, 1);
              } else if (event.key === 'ArrowLeft') {
                event.preventDefault();
                moveFocus(index, -1);
              } else if (event.key === 'Home') {
                event.preventDefault();
                onChange(TAB_IDS[0]);
                refs.current[0]?.focus();
              } else if (event.key === 'End') {
                event.preventDefault();
                onChange(TAB_IDS[TAB_IDS.length - 1]);
                refs.current[TAB_IDS.length - 1]?.focus();
              }
            }}
          >
            <span className="tab-index">{meta.index}</span>
            {meta.label}
          </button>
        );
      })}
    </nav>
  );
}
