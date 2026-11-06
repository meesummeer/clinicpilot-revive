import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { supabase, fetchAllRows } from '../../lib/supabaseClient';
import { cardNum } from '../../lib/circle';
import { toast } from '../../components/Toast';
import MemberForm from './MemberForm';

export default function CircleLayout({ session }) {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [memberForm, setMemberForm] = useState(null); // null closed, 'new', or a member

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

  return (
    <>
      <div className="page-head">
        <div><h1 className="page-title">Prestige</h1><p className="page-sub">Revive Prestige membership</p></div>
        <div className="mc-actions">
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
      {error && <p className="form-error" role="alert" style={{ marginBottom: 12 }}>Couldn't load Circle data: {error}</p>}
      {loaded ? <Outlet context={context} /> : <div className="empty">Loading…</div>}
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
