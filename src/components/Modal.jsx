import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// Native <dialog>: gives focus trapping and Esc to close for free.
export default function Modal({ title, onClose, children }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el.open) el.showModal();
    return () => { if (el.open) el.close(); };
  }, []);

  // Portal to <body> so a form inside this modal is never nested in the page's form.
  return createPortal(
    <dialog ref={ref} aria-label={title} onCancel={(e) => { e.preventDefault(); onClose(); }}>
      <div className="dlg-body">
        <h2 className="dlg-title" style={{ marginBottom: 16 }}>{title}</h2>
        {children}
      </div>
    </dialog>,
    document.body
  );
}
