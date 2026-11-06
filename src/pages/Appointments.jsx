import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, fetchAllRows } from '../lib/supabaseClient';
import { APPOINTMENT_STATUS, formatDate, formatTime, plural, toWhatsAppNumber, todayKarachi, ymdKarachi } from '../lib/format';
import AppointmentForm from '../components/AppointmentForm';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_FMT = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const MAX_IN_CELL = 3;
const pad = (n) => String(n).padStart(2, '0');

export default function Appointments() {
  const today = todayKarachi();
  const [cursor, setCursor] = useState({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) });
  const [selected, setSelected] = useState(today);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null); // null closed, 'new', or a row

  const load = useCallback(async () => {
    setLoading(true);
    const start = new Date(`${cursor.y}-${pad(cursor.m)}-01T00:00:00+05:00`);
    const next = cursor.m === 12 ? { y: cursor.y + 1, m: 1 } : { y: cursor.y, m: cursor.m + 1 };
    const end = new Date(`${next.y}-${pad(next.m)}-01T00:00:00+05:00`);
    const { data, error: err } = await fetchAllRows(() => supabase
      .from('appointments')
      .select('*, patients(name, mr_no, phone)')
      .gte('scheduled_at', start.toISOString())
      .lt('scheduled_at', end.toISOString())
      .order('scheduled_at')
      .order('id'));
    setError(err ? err.message : '');
    setAppointments(data);
    setLoading(false);
  }, [cursor]);

  useEffect(() => { document.title = 'Appointments — ClinicPilot'; }, []);
  useEffect(() => { load(); }, [load]);

  const byDay = useMemo(() => {
    const map = new Map();
    for (const a of appointments) {
      const day = ymdKarachi(a.scheduled_at);
      if (!map.has(day)) map.set(day, []);
      map.get(day).push(a);
    }
    return map;
  }, [appointments]);

  const cells = useMemo(() => {
    const blanks = new Date(Date.UTC(cursor.y, cursor.m - 1, 1)).getUTCDay();
    const days = new Date(Date.UTC(cursor.y, cursor.m, 0)).getUTCDate();
    return [...Array(blanks).fill(null), ...Array.from({ length: days }, (_, i) => `${cursor.y}-${pad(cursor.m)}-${pad(i + 1)}`)];
  }, [cursor]);

  function changeMonth(delta) {
    const idx = cursor.y * 12 + (cursor.m - 1) + delta;
    const next = { y: Math.floor(idx / 12), m: idx % 12 + 1 };
    setCursor(next);
    const key = `${next.y}-${pad(next.m)}`;
    setSelected(today.startsWith(key) ? today : `${key}-01`);
  }

  const dayList = byDay.get(selected) || [];

  return (
    <>
      <div className="page-head">
        <div><h1 className="page-title">Appointments</h1></div>
        <button type="button" className="btn btn-primary" onClick={() => setModal('new')}>+ New appointment</button>
      </div>

      <section className="panel" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div className="month-nav">
            <button type="button" className="btn btn-sm" aria-label="Previous month" onClick={() => changeMonth(-1)}>←</button>
            <h2 className="month-title">{MONTH_FMT.format(new Date(Date.UTC(cursor.y, cursor.m - 1, 1)))}</h2>
            <button type="button" className="btn btn-sm" aria-label="Next month" onClick={() => changeMonth(1)}>→</button>
          </div>
          <div className="legend">{Object.entries(APPOINTMENT_STATUS).map(([k, v]) => <span key={k} className={`badge ${k}`}>{v}</span>)}</div>
        </div>
        {error && <p className="form-error" role="alert">Couldn't load appointments: {error}</p>}
        <div className="cal-labels" aria-hidden="true">{DAY_LABELS.map((d) => <div key={d}>{d}</div>)}</div>
        <div className="cal-grid">
          {cells.map((day, i) => {
            if (!day) return <div key={`b${i}`} className="cal-cell blank" />;
            const list = byDay.get(day) || [];
            const classes = ['cal-cell', day === selected && 'selected', day === today && 'today'].filter(Boolean).join(' ');
            const isToday = day === today;
            return (
              <div key={day} className={classes} onClick={() => setSelected(day)}>
                <button type="button" className="cal-date" aria-label={`${formatDate(day)}, ${plural(list.length, 'appointment')}`} aria-pressed={day === selected}>{Number(day.slice(8))}</button>
                {list.length > 0 && <span className="cal-count" aria-hidden="true">{list.length}</span>}
                {isToday ? (
                  /* Today: show status dots instead of name pills to save space */
                  <div className="cal-today-dots">
                    {list.slice(0, 6).map((a) => (
                      <span key={a.id} className={`cal-dot ${a.status}`} title={`${formatTime(a.scheduled_at)} ${a.patients?.name}`} />
                    ))}
                    {list.length > 6 && <span className="cal-more">+{list.length - 6}</span>}
                  </div>
                ) : (
                  <>
                    {list.slice(0, MAX_IN_CELL).map((a) => (
                      <button type="button" key={a.id} className={`cal-appt ${a.status}`} title={`${formatTime(a.scheduled_at)} ${a.patients?.name} · ${APPOINTMENT_STATUS[a.status]}`} onClick={(e) => { e.stopPropagation(); setSelected(day); setModal(a); }}>
                        <span>{formatTime(a.scheduled_at).replace(' ', '').toLowerCase()} {a.patients?.name}</span>
                      </button>
                    ))}
                    {list.length > MAX_IN_CELL && <span className="cal-more">+{list.length - MAX_IN_CELL} more</span>}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <h2 className="panel-title">{formatDate(selected)} <span className="muted small" style={{ fontWeight: 500 }}>({plural(dayList.length, 'appointment')})</span></h2>
        {loading ? <p className="muted">Loading…</p> : dayList.length === 0 ? <p className="muted">Nothing booked on this day.</p> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Time</th><th>Patient</th><th>Procedure</th><th>Doctor</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {dayList.map((a) => {
                  const wa = toWhatsAppNumber(a.patients?.phone);
                  return (
                    <tr key={a.id}>
                      <td className="mono small nowrap">{formatTime(a.scheduled_at)}</td>
                      <td><Link className="link-plain" to={`/patients/${a.patient_id}`}>{a.patients?.name}</Link><br /><span className="muted small mono">MR #{a.patients?.mr_no}</span></td>
                      <td>{a.procedure || '—'}{a.notes && <><br /><span className="muted small pre-wrap">{a.notes}</span></>}</td>
                      <td>{a.doctor || '—'}</td>
                      <td><span className={`badge ${a.status}`}>{APPOINTMENT_STATUS[a.status]}</span></td>
                      <td>
                        <div className="actions">
                          <button type="button" className="btn btn-sm" onClick={() => setModal(a)}>Edit</button>
                          {wa && <a className="btn btn-sm" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">WhatsApp</a>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modal && (
        <AppointmentForm
          appt={modal === 'new' ? null : modal}
          presetDate={selected}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </>
  );
}
