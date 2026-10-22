'use client';

import { useEffect } from 'react';
import type { ReactNode } from 'react';

export default function Sheet({
  title,
  node,
  foot,
  onClose
}: {
  title: string;
  node: ReactNode;
  foot?: ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="sheet-back open"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-head">
          <div className="sheet-title">{title}</div>
          <button className="sheet-close" onClick={onClose} aria-label="Закрыть" type="button">
            ✕
          </button>
        </div>
        <div className="sheet-body">{node}</div>
        {foot ? <div className="sheet-foot">{foot}</div> : null}
      </div>
    </div>
  );
}
