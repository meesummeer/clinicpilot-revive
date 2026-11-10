import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { supabase, fetchAllRows } from '../../lib/supabaseClient';
import { cardNum } from '../../lib/circle';
import { toast } from '../../components/Toast';
import MemberForm from './MemberForm';

/* ── QR Scanner Modal ─────────────────────────────────────────────────── */
function QrScannerModal({ members, onClose, onFound }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const [status, setStatus] = useState('Starting camera…');
  const [found, setFound] = useState(null); // matched member or null

  useEffect(() => {
    let stopped = false;

    // Load jsQR (fallback for browsers without BarcodeDetector)
    function loadJsQR() {
      return new Promise((resolve) => {
        if (window.jsQR) { resolve(); return; }
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jsqr/1.4.0/jsQR.min.js';
        s.onload = resolve;
        s.onerror = resolve; // continue even if CDN fails
        document.head.appendChild(s);
      });
    }

    async function start() {
      if (!('BarcodeDetector' in window)) await loadJsQR();
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (stopped) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setStatus('Point at a Prestige card barcode or QR code');
          scan();
        }
      } catch (err) {
        setStatus(`Camera error: ${err.message}`);
      }
    }

    function scan() {
      if (stopped || !videoRef.current) return;
      const video = videoRef.current;
      if (video.readyState < 2) { rafRef.current = requestAnimationFrame(scan); return; }

      // Try native BarcodeDetector first (Chrome/Edge/Android)
      if ('BarcodeDetector' in window) {
        // eslint-disable-next-line no-undef
        const detector = new BarcodeDetector({ formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'data_matrix'] });
        const tick = () => {
          if (stopped) return;
          detector.detect(video).then((codes) => {
            if (codes.length > 0) handleCode(codes[0].rawValue);
            else rafRef.current = requestAnimationFrame(tick);
          }).catch(() => { rafRef.current = requestAnimationFrame(tick); });
        };
        tick();
      } else {
        // Fallback: jsQR via canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const jsQR = window.jsQR;
        if (!jsQR) { setStatus('QR library not loaded. Please refresh and try again.'); return; }
        const tick = () => {
          if (stopped) return;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0);
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const result = jsQR(img.data, img.width, img.height);
          if (result) handleCode(result.data);
          else rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      }
    }

    function handleCode(raw) {
      if (stopped) return;
      // raw value may be just the card_number (e.g. "RC-012") or a full URL with it
      const trimmed = raw.trim();
      // try exact match on card_number, then partial
      const member = members.find((m) => m.card_number === trimmed)
        || members.find((m) => trimmed.includes(m.card_number));
      if (member) {
        setFound(member);
        setStatus(`Found: ${member.name} (${member.card_number})`);
      } else {
        setStatus(`Code "${trimmed}" doesn't match any Prestige member. Try again.`);
        setTimeout(() => { if (!stopped) { setStatus('Point at a Prestige card barcode or QR code'); scan(); } }, 2000);
      }
    }

    start();

    return () => {
      stopped = true;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [members]);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Scan Prestige card" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-head">
          <h2 className="modal-title">Scan Prestige Card</h2>
          <button type="button" className="modal-close" aria-label="Close" onClick={onClose}>✕</button>
        </div>
        <div style={{ background: '#000', borderRadius: 8, overflow: 'hidden', aspectRatio: '4/3', position: 'relative' }}>
          <video ref={videoRef} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          {/* scan crosshair overlay */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{ width: 200, height: 200, border: '2px solid var(--accent)', borderRadius: 8, boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)' }} />
          </div>
        </div>
        <p className="muted small" style={{ marginTop: 10, textAlign: 'center', minHeight: 32 }}>{status}</p>
        {found && (
          <div style={{ marginTop: 8, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn" onClick={() => { setFound(null); setStatus('Point at a Prestige card barcode or QR code'); }}>Scan again</button>
            <button type="button" className="btn btn-primary" onClick={() => onFound(found)}>Open {found.name}'s profile →</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Layout ───────────────────────────────────────────────────────────── */
export default function CircleLayout({ session }) {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [memberForm, setMemberForm] = useState(null); // null closed, 'new', or a member
  const [scanning, setScanning] = useState(false);

  const reload = useCallback(async () => {
    const [m, l] = await Promise.all([
      fetchAllRows(() => supabase.from('members').select('*').order('id')),
      fetchAllRows(() => supabase.from('service_log').select('*').order('id')),
    ]);
    const err = m.error || l.error;
    setError(err ? err.message : '');
    const sorted = [...m.data].sort((a, b) => cardNum(a) - cardNum(b));
    setMembers(sorted);
    setLogs(l.data);
    setLoaded(true);
    return sorted;
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const context = {
    members, logs, reload, session,
    openAddMember: () => setMemberForm('new'),
    openEditMember: (m) => setMemberForm(m),
  };

  const tabClass = ({ isActive }) => (isActive ? 'active' : '');

  function handleScanned(member) {
    setScanning(false);
    navigate(`/prestige/members/${member.id}`);
    toast(`Loaded ${member.name} (${member.card_number})`);
  }

  return (
    <>
      <div className="page-head">
        <div><h1 className="page-title">Prestige</h1><p className="page-sub">Revive Prestige membership</p></div>
        <div className="mc-actions">
          <button type="button" className="btn" onClick={() => setScanning(true)} title="Scan a Prestige card to load a member profile">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: 16, height: 16, marginRight: 5, verticalAlign: 'middle' }}>
              <rect x="3" y="3" width="5" height="5" rx="1" /><rect x="16" y="3" width="5" height="5" rx="1" /><rect x="3" y="16" width="5" height="5" rx="1" />
              <path d="M21 16h-3v3M21 13v.01M13 3v.01M13 8v3h3M13 13h.01M16 13h3v3M13 16v3M3 12h3M3 9v3" />
            </svg>
            Scan Card
          </button>
          <button type="button" className="btn" onClick={async () => { await reload(); toast('Data refreshed.'); }}>Refresh</button>
          <button type="button" className="btn btn-primary" onClick={() => setMemberForm('new')}>+ Add member</button>
        </div>
      </div>
      <nav className="subnav" aria-label="Prestige">
        <NavLink to="/prestige" end className={tabClass}>Overview</NavLink>
        <NavLink to="/prestige/members" className={tabClass}>Members</NavLink>
        <NavLink to="/prestige/log" className={tabClass}>Service Log</NavLink>
        <NavLink to="/prestige/analytics" className={tabClass}>Analytics</NavLink>
      </nav>
      {error && <p className="form-error" role="alert" style={{ marginBottom: 12 }}>Couldn't load Prestige data: {error}</p>}
      {loaded ? <Outlet context={context} /> : <div className="empty">Loading…</div>}
      {scanning && (
        <QrScannerModal
          members={members}
          onClose={() => setScanning(false)}
          onFound={handleScanned}
        />
      )}
      {memberForm && (
        <MemberForm
          member={memberForm === 'new' ? null : memberForm}
          reload={reload}
          onClose={() => setMemberForm(null)}
          onSaved={(saved, isNew) => {
            setMemberForm(null);
            toast(isNew ? `Added ${saved.name} as ${saved.card_number}.` : 'Member updated.');
            if (isNew) navigate(`/prestige/members/${saved.id}`);
          }}
        />
      )}
    </>
  );
}
