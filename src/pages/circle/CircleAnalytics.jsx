import { useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { plural } from '../../lib/format';
import { EXPIRING_DAYS, expiringSoon } from '../../lib/circle';
import { Chip, ExpiringList } from './parts';

export default function CircleAnalytics() {
  const { members, logs } = useOutletContext();
  useEffect(() => { document.title = 'Analytics — Prestige'; }, []);

  const counts = {}, perMember = {};
  for (const l of logs) {
    counts[l.service] = (counts[l.service] || 0) + 1;
    perMember[l.member_id] = (perMember[l.member_id] || 0) + 1;
  }
  const services = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = services.length ? services[0][1] : 1;
  const top = Object.entries(perMember)
    .map(([id, n]) => ({ m: members.find((x) => x.id === id), n }))
    .filter((x) => x.m)
    .sort((a, b) => b.n - a.n)
    .slice(0, 10);

  return (
    <>
      <p className="muted" style={{ margin: '0 0 16px' }}>{plural(logs.length, 'service')} logged across {plural(members.length, 'member')}.</p>
      <div className="two-col">
        <section className="panel" style={{ gridRow: 'span 2' }}>
          <h2 className="panel-title">Services used</h2>
          {services.length === 0 ? <p className="muted">No services logged yet.</p> : (
            <div className="hbars">
              {services.map(([name, n]) => (
                <div key={name} title={`${name}: ${n}`}>
                  <div className="hbar-head"><span>{name}</span><span className="hbar-val">{n}</span></div>
                  <div className="bar" aria-hidden="true"><div className="bar-fill" style={{ width: `${(n / max) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="panel">
          <h2 className="panel-title">Most active members</h2>
          {top.length === 0 ? <p className="muted">No activity yet.</p> : top.map(({ m, n }) => (
            <Link className="list-row" key={m.id} to={`/prestige/members/${m.id}`}>
              <span className="list-main"><span className="list-name">{m.name}</span> <Chip member={m} /></span>
              <span className="mono small nowrap">{plural(n, 'service')}</span>
            </Link>
          ))}
        </section>
        <section className="panel">
          <h2 className="panel-title">Expiring soon <span className="muted small" style={{ fontWeight: 500 }}>(next {EXPIRING_DAYS} days)</span></h2>
          <ExpiringList members={expiringSoon(members)} />
        </section>
      </div>
    </>
  );
}
