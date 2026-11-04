import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { formatDate, plural } from '../../lib/format';
import { STATUS_LABEL, displayStatus, planOf } from '../../lib/circle';
import { Chip, StatusBadge } from './parts';

export default function CircleMembers() {
  const { members, openEditMember } = useOutletContext();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [plan, setPlan] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => { document.title = 'Members — Circle'; }, []);

  const rows = useMemo(() => {
    const text = q.trim().toLowerCase();
    const digits = text.replace(/\D/g, '');
    return members.filter((m) =>
      (!plan || m.plan === plan)
      && (!status || displayStatus(m) === status)
      && (!text || (m.name || '').toLowerCase().includes(text) || (digits && (m.phone || '').replace(/\D/g, '').includes(digits))));
  }, [members, q, plan, status]);

  return (
    <>
      <div className="toolbar">
        <input className="input search" type="search" aria-label="Search by name or phone" placeholder="Search by name or phone" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" aria-label="Filter by plan" value={plan} onChange={(e) => setPlan(e.target.value)}>
          <option value="">All plans</option><option value="6month">6-Month</option><option value="annual">Annual</option>
        </select>
        <select className="input" aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <p className="muted small" style={{ margin: '0 0 8px' }}>{rows.length === members.length ? plural(members.length, 'member') : `${rows.length} of ${members.length} members`}</p>
      <div className="table-wrap">
        <table className="members-table">
          <thead><tr><th>Card No</th><th>Name</th><th>Phone</th><th>Plan</th><th>Start</th><th>End</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id} className="row-link" onClick={(e) => { if (!e.target.closest('a, button')) navigate(`/circle/members/${m.id}`); }}>
                <td><Chip member={m} /></td>
                <td className="td-name"><Link to={`/circle/members/${m.id}`}>{m.name}</Link></td>
                <td className="mono small nowrap">{m.phone}</td>
                <td className="nowrap">{planOf(m).label}</td>
                <td className="mono small nowrap">{formatDate(m.start_date)}</td>
                <td className="mono small nowrap">{formatDate(m.end_date)}</td>
                <td><StatusBadge member={m} /></td>
                <td>
                  <div className="actions">
                    <Link className="btn btn-sm" to={`/circle/log?member=${m.id}`} aria-label={`Log service for ${m.name}`}>Log</Link>
                    <button type="button" className="btn btn-sm" aria-label={`Edit ${m.name}`} onClick={() => openEditMember(m)}>Edit</button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8}><div className="empty">{members.length ? 'No members match these filters.' : 'No members yet. Add the first one to issue card RC-001.'}</div></td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
