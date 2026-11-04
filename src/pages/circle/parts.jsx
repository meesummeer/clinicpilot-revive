import { Link } from 'react-router-dom';
import { formatDate, plural } from '../../lib/format';
import { STATUS_LABEL, daysUntil, displayStatus, planOf, trackerFor } from '../../lib/circle';

export const Chip = ({ member }) => <span className="chip">{member.card_number || '—'}</span>;

export function StatusBadge({ member }) {
  const s = displayStatus(member);
  return <span className={`badge ${s}`}>{STATUS_LABEL[s]}</span>;
}

export function Tracker({ member, logs }) {
  return (
    <div className="tracker">
      {trackerFor(member, logs).map((s) => {
        if (s.total === null) {
          return (
            <div className="tr-item" key={s.name}>
              <div className="tr-head"><span className="tr-name">{s.label}</span><span className="tr-count">Used {s.used} · Unlimited</span></div>
              <div className="bar unlimited" aria-hidden="true" />
            </div>
          );
        }
        const full = s.used >= s.total;
        return (
          <div className={`tr-item ${full ? 'full' : ''}`} key={s.name}>
            <div className="tr-head">
              <span className="tr-name">{s.label}</span>
              <span className="tr-count">Used {s.used} of {s.total} · {full ? 'Fully used' : `${s.total - s.used} left`}</span>
            </div>
            <div className="bar" role="progressbar" aria-label={s.label} aria-valuemin={0} aria-valuemax={s.total} aria-valuenow={Math.min(s.used, s.total)}>
              <div className="bar-fill" style={{ width: `${Math.min(100, (s.used / s.total) * 100)}%` }} />
            </div>
          </div>
        );
      })}
      {planOf(member).perks.map((p) => <div className="perk" key={p}><b>Perk</b> {p}</div>)}
    </div>
  );
}

export function ExpiringList({ members }) {
  if (!members.length) return <p className="muted">No memberships are expiring soon.</p>;
  return members.map((m) => {
    const d = daysUntil(m.end_date);
    return (
      <Link className="list-row" key={m.id} to={`/circle/members/${m.id}`}>
        <span className="list-main"><span className="list-name">{m.name}</span> <Chip member={m} /><br /><span className="muted small">Ends {formatDate(m.end_date)}</span></span>
        <span className="badge expiring">{d === 0 ? 'Today' : plural(d, 'day')}</span>
      </Link>
    );
  });
}

export function LogTable({ entries, members, onDelete }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Date</th>{members && <th>Member</th>}<th>Service</th><th>Logged by</th><th><span className="muted">Actions</span></th></tr></thead>
        <tbody>
          {entries.map((l) => {
            const m = members?.find((x) => x.id === l.member_id);
            return (
              <tr key={l.id}>
                <td className="mono small nowrap">{formatDate(l.date)}</td>
                {members && <td>{m ? <Link className="link-plain" to={`/circle/members/${m.id}`}>{m.name}</Link> : 'Unknown'}</td>}
                <td>{l.service}{l.notes && <><br /><span className="muted small pre-wrap">{l.notes}</span></>}</td>
                <td className="small">{l.logged_by || '—'}</td>
                <td><button type="button" className="btn btn-sm btn-danger" aria-label={`Delete ${l.service} entry from ${formatDate(l.date)}`} onClick={() => onDelete(l)}>Delete</button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
