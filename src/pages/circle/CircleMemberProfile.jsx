import { useEffect } from 'react';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { formatDate, plural, todayKarachi } from '../../lib/format';
import { byDateDesc, daysBetween, daysUntil, displayStatus, planOf } from '../../lib/circle';
import { toast } from '../../components/Toast';
import { Chip, LogTable, StatusBadge, Tracker } from './parts';
import { useDeleteLog } from './useDeleteLog';

export default function CircleMemberProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { members, logs, reload, openEditMember } = useOutletContext();
  const deleteLog = useDeleteLog(reload);
  const m = members.find((x) => x.id === id);

  useEffect(() => { if (m) document.title = `${m.name} — Prestige`; }, [m]);

  if (!m) return <><Link className="back" to="/prestige/members">← Members</Link><div className="panel empty">This member doesn't exist or has been deleted.</div></>;

  const entries = logs.filter((l) => l.member_id === m.id).sort(byDateDesc);

  async function handleDelete() {
    const n = entries.length;
    if (!window.confirm(`Delete ${m.name}? This permanently removes ${m.card_number} and ${n} service log ${n === 1 ? 'entry' : 'entries'}. To stop a membership but keep its history, set the status to Paused or Expired instead.`)) return;
    const { error } = await supabase.from('members').delete().eq('id', m.id);
    if (error) { toast(`Couldn't delete: ${error.message}`, true); return; }
    toast(`${m.name} deleted.`);
    await reload();
    navigate('/prestige/members');
  }

  let termPct = 0, termNote = '';
  if (m.start_date && m.end_date) {
    const span = daysBetween(m.start_date, m.end_date) || 1;
    termPct = Math.max(0, Math.min(100, (daysBetween(m.start_date, todayKarachi()) / span) * 100));
    const left = daysUntil(m.end_date);
    termNote = left < 0 ? `Ended ${plural(-left, 'day')} ago` : left === 0 ? 'Ends today' : `${plural(left, 'day')} left`;
  }

  return (
    <>
      <Link className="back" to="/prestige/members">← Members</Link>
      <section className="member-card">
        <div className="mc-top">
          <div>
            <h2 className="mc-name">{m.name}</h2>
            <div className="mc-tags"><Chip member={m} /> <StatusBadge member={m} /></div>
          </div>
          <div className="mc-actions">
            <Link className="btn btn-primary" to={`/prestige/log?member=${m.id}`}>Log service</Link>
            <button type="button" className="btn" onClick={() => openEditMember(m)}>Edit</button>
            <button type="button" className="btn btn-danger" onClick={handleDelete}>Delete</button>
          </div>
        </div>
        <div className="mc-facts">
          <div><div className="fact-label">Plan</div><div className="fact-value">{planOf(m).label}</div></div>
          <div><div className="fact-label">Phone</div><div className="fact-value mono">{m.phone ? <a href={`tel:${m.phone}`}>{m.phone}</a> : '—'}</div></div>
          <div><div className="fact-label">Email</div><div className="fact-value">{m.email ? <a href={`mailto:${m.email}`}>{m.email}</a> : '—'}</div></div>
          <div><div className="fact-label">Start</div><div className="fact-value mono">{formatDate(m.start_date)}</div></div>
          <div><div className="fact-label">End</div><div className="fact-value mono">{formatDate(m.end_date)}</div></div>
        </div>
        {termNote && (
          <div className="term">
            <div className="term-labels"><span>Membership term</span><span>{displayStatus(m) === 'paused' ? 'Paused · ' : ''}{termNote}</span></div>
            <div className="bar" aria-hidden="true"><div className="bar-fill" style={{ width: `${termPct}%` }} /></div>
          </div>
        )}
        {m.notes && <div className="term"><div className="fact-label">Notes</div><div className="pre-wrap">{m.notes}</div></div>}
      </section>
      <div className="two-col">
        <section className="panel"><h2 className="panel-title">Remaining services</h2><Tracker member={m} logs={logs} /></section>
        <section className="panel">
          <h2 className="panel-title">Service log <span className="muted small" style={{ fontWeight: 500 }}>({entries.length})</span></h2>
          {entries.length ? <LogTable entries={entries} onDelete={deleteLog} /> : <p className="muted">No services logged yet.</p>}
        </section>
      </div>
    </>
  );
}
