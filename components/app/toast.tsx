'use client';

export default function Toast({ text }: { text: string | null }) {
  return (
    <div id="toast" className={text ? 'show' : ''} role="status" aria-live="polite">
      {text ?? ''}
    </div>
  );
}
