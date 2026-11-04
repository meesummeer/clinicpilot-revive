import { useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { formatDate, todayKarachi } from '../../lib/format';
import { EXPIRING_DAYS, byDateDesc, expiringSoon, isCurrent } from '../../lib/circle';
import { ExpiringList } from './parts';

export default function CircleOverview() {
  const { members, logs } = useOutletContext();
  useEffect(() => { document.title = 'Circle — ClinicPilot'; }, []);

  const month = todayKarachi().slice(0, 7);
  const expiringThisMonth = members.filter((m) => isCurrent(m) && (m.end_date || '').startsWith(month)).length;
  const tiles = [
    ['Total Members', members.length, 'lead'],
    ['Active Members', members.filter(isCurrent).length, ''],
    ['6-Month', members.filter((m) => m.plan === '6month').length, ''],
    ['Annual', members.filter((m) => m.plan === 'annual').length, ''],
    ['Expiring this month', expiringThisMonth, expiringThisMonth ? 'warn' : ''],
  ];
  const recent = [...logs].sort(byDateDesc).slice(0, 6);

  return (
    <>
      <div className="tiles">
        {tiles.map(([label, value, cls]) => <div key={label} className={`tile ${cls}`}><div className="tile-label">{label}</div><div className="tile-value">{value}</div></div>)}
      </div>
      <div className="two-col">
        <section className="panel"><h2 className="panel-title">Expiring in the next {EXPIRING_DAYS} days</h2><ExpiringList members={expiringSoon(members).slice(0, 6)} /></section>
        <section className="panel">
          <h2 className="panel-title">Recent services</h2>
          {recent.length === 0 ? <p className="muted">No services logged yet.</p> : recent.map((l) => {
            const m = members.find((x) => x.id === l.member_id);
            return (
              <Link className="list-row" key={l.id} to={`/circle/members/${l.member_id}`}>
                <span className="list-main"><span className="list-name">{m ? m.name : 'Unknown member'}</span><br /><span className="muted small">{l.service}</span></span>
                <span className="mono small muted nowrap">{formatDate(l.date)}</span>
              </Link>
            );
          })}
        </section>
      </div>
    </>
  );
}
