import { useEffect, useMemo, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { formatDate, todayKarachi } from '../../lib/format';
import { byDateDesc, displayStatus, planOf, trackerFor } from '../../lib/circle';
import { toast } from '../../components/Toast';
import { Chip, LogTable, StatusBadge, Tracker } from './parts';
import { useDeleteLog } from './useDeleteLog';

function storedLoggedBy(session) {
  try {
    const saved = localStorage.getItem('cp_logged_by');
    if (saved) return saved;
  } catch { /* optional convenience */ }
  return (session?.user?.email || '').split('@')[0];
}

export default function CircleServiceLog() {
  const { members, logs, reload, session } = useOutletContext();
  const deleteLog = useDeleteLog(reload);
  const [params] = useSearchParams();
  const [memberId, setMemberId] = useState(params.get('member'));
  const [search, setSearch] = useState('');
  const [active, setActive] = useState(0);
  const [service, setService] = useState('');
  const [date, setDate] = useState(todayKarachi());
  const [by, setBy] = useState(() => storedLoggedBy(session));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { document.title = 'Service Log — Circle'; }, []);

  const member = members.find((m) => m.id === memberId) || null;
  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return members.filter((m) => (m.name || '').toLowerCase().includes(q) || (m.card_number || '').toLowerCase().includes(q)).slice(0, 8);
  }, [members, search]);

  function pick(id) {
    setMemberId(id);
    setSearch('');
    setService('');
    setActive(0);
    setError('');
  }

  function handleKey(e) {
    if (e.key === 'ArrowDown' && results.length) { e.preventDefault(); setActive((active + 1) % results.length); }
    else if (e.key === 'ArrowUp' && results.length) { e.preventDefault(); setActive((active - 1 + results.length) % results.length); }
    else if (e.key === 'Enter') { e.preventDefault(); if (results[active]) pick(results[active].id); }
  }

  let notice = '';
  if (member) {
    if (displayStatus(member) === 'paused') notice = `${member.name}'s membership is paused.`;
    else if (member.status === 'expired') notice = `${member.name}'s membership is marked as expired.`;
    else if (date && ((member.start_date && date < member.start_date) || (member.end_date && date > member.end_date))) {
      notice = `This date is outside the membership term (${formatDate(member.start_date)} to ${formatDate(member.end_date)}).`;
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!member) { setError('Choose a member.'); return; }
    if (!service) { setError('Choose a service.'); return; }
    if (!date) { setError('Enter the date.'); return; }
    if (date > todayKarachi()) { setError('The date can\'t be in the future.'); return; }
    if (!by.trim()) { setError('Enter who is logging this.'); return; }
    setSaving(true);
    setError('');
    const { error: err } = await supabase.from('service_log').insert({
      id: crypto.randomUUID(), member_id: member.id, service, date, notes: notes.trim(), logged_by: by.trim(),
    });
    setSaving(false);
    if (err) { setError(`Couldn't save: ${err.message}. The entry was not recorded.`); return; }
    try { localStorage.setItem('cp_logged_by', by.trim()); } catch { /* optional convenience */ }
    setService('');
    setNotes('');
    toast(`Logged ${service} for ${member.name}.`);
    await reload();
  }

  const recent = [...(member ? logs.filter((l) => l.member_id === member.id) : logs)].sort(byDateDesc).slice(0, 12);

  return (
    <div className="log-layout">
      <section className="panel">
        <form className="log-form" onSubmit={handleSave} noValidate>
          <div className="field">
            <label htmlFor="logSearch">Member <span className="req">*</span></label>
            {member ? (
              <div className="picked">
                <span className="picked-who"><Chip member={member} /> <strong>{member.name}</strong> <span className="muted small">{planOf(member).label}</span> <StatusBadge member={member} /></span>
                <button type="button" className="btn btn-sm" onClick={() => { setMemberId(null); setService(''); }}>Change</button>
              </div>
            ) : (
              <div className="combo">
                <input className="input" id="logSearch" role="combobox" aria-expanded={Boolean(search.trim())} aria-controls="logResults" aria-autocomplete="list" autoComplete="off" placeholder="Search by name or card number" value={search} onChange={(e) => { setSearch(e.target.value); setActive(0); }} onKeyDown={handleKey} />
                {search.trim() && (
                  <ul className="combo-list" id="logResults" role="listbox">
                    {results.length === 0 && <li className="combo-empty">No matching members.</li>}
                    {results.map((r, i) => (
                      <li key={r.id} className="combo-opt" role="option" aria-selected={i === active} onMouseDown={(e) => { e.preventDefault(); pick(r.id); }}>
                        <Chip member={r} /> <span>{r.name}</span> <span className="muted small" style={{ marginLeft: 'auto' }}>{planOf(r).label}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          <div className="field">
            <label htmlFor="logService">Service <span className="req">*</span></label>
            <select className="input" id="logService" disabled={!member} value={service} onChange={(e) => setService(e.target.value)}>
              <option value="">{member ? 'Select a service…' : 'Choose a member first'}</option>
              {member && trackerFor(member, logs).map((s) => {
                const full = s.total !== null && s.used >= s.total;
                const note = s.total === null ? 'unlimited' : full ? 'fully used' : `${s.total - s.used} left`;
                return <option key={s.name} value={s.name} disabled={full}>{s.label} ({note})</option>;
              })}
            </select>
          </div>
          <div className="form-grid">
            <div className="field"><label htmlFor="logDate">Date <span className="req">*</span></label><input className="input" id="logDate" type="date" max={todayKarachi()} value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div className="field"><label htmlFor="logBy">Logged by <span className="req">*</span></label><input className="input" id="logBy" autoComplete="off" value={by} onChange={(e) => setBy(e.target.value)} /></div>
          </div>
          <div className="field"><label htmlFor="logNotes">Notes</label><textarea className="input" id="logNotes" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          {notice && <div className="notice">{notice} You can still save this entry.</div>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <div><button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save entry'}</button></div>
        </form>
      </section>
      <div className="stack">
        {member && <section className="panel"><h2 className="panel-title">{member.name}: remaining services</h2><Tracker member={member} logs={logs} /></section>}
        <section className="panel">
          <h2 className="panel-title">{member ? 'Their recent entries' : 'Recent entries'}</h2>
          {recent.length ? <LogTable entries={recent} members={member ? null : members} onDelete={deleteLog} /> : <p className="muted">Nothing logged yet.</p>}
        </section>
      </div>
    </div>
  );
}
