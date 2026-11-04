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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 className="dlg-title" style={{ margin: 0 }}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#9ca3af', padding: '4px', borderRadius: 6, lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#374151'}
            onMouseLeave={e => e.currentTarget.style.color = '#9ca3af'}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 4l12 12M16 4L4 16" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </dialog>,
    document.body
  );
}
