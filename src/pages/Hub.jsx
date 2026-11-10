import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, fetchAllRows } from '../lib/supabaseClient';
import { EXPENSE_CATEGORIES, formatDate, formatMoney, lastNMonthsKarachi, plural, startOfMonthKarachi, todayKarachi, ymdKarachi } from '../lib/format';
import { daysUntil, expiringSoon, isCurrent } from '../lib/circle';

function Bars({ rows, format }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="hbars">
      {rows.map((r) => (
        <div key={r.label} title={`${r.label}: ${format(r.value)}`}>
          <div className="hbar-head"><span>{r.label}</span><span className="hbar-val">{format(r.value)}</span></div>
          <div className="bar" aria-hidden="true"><div className="bar-fill" style={{ width: `${(r.value / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

export default function Hub() {
  const [data, setData] = useState({ patients: [], appointments: [], expenses: [], members: [], logs: [], billings: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateFrom, setDateFrom] = useState(startOfMonthKarachi());
  const [dateTo, setDateTo] = useState(todayKarachi());

  useEffect(() => {
    document.title = 'Hub — ClinicPilot';
    (async () => {
      const [patients, appointments, expenses, members, logs, billings] = await Promise.all([
        fetchAllRows(() => supabase.from('patients').select('id, created_at').order('id')),
        fetchAllRows(() => supabase.from('appointments').select('id, procedure, status, scheduled_at').order('id')),
        fetchAllRows(() => supabase.from('expenses').select('id, category, amount, expense_date').order('id')),
        fetchAllRows(() => supabase.from('members').select('*').order('id')),
        fetchAllRows(() => supabase.from('service_log').select('id, service, date').order('id')),
        fetchAllRows(() => supabase.from('billings').select('id, grand_total, billing_date, payment_mode').order('id')),
      ]);
      const failed = [patients, appointments, expenses, members, logs, billings].find((r) => r.error);
      if (failed) setError(failed.error.message);
      setData({ patients: patients.data, appointments: appointments.data, expenses: expenses.data, members: members.data, logs: logs.data, billings: billings.data });
      setLoading(false);
    })();
  }, []);

  const inRange = (day) => day >= dateFrom && day <= dateTo;

  const period = useMemo(() => {
    const appts = data.appointments.map((a) => ({ ...a, day: ymdKarachi(a.scheduled_at) })).filter((a) => inRange(a.day));
    const expenses = data.expenses.filter((x) => inRange(x.expense_date));
    const logs = data.logs.filter((l) => inRange(l.date));
    const billings = data.billings.filter((b) => inRange(b.billing_date));
    return {
      appts, expenses, logs, billings,
      newPatients: data.patients.filter((p) => inRange(ymdKarachi(p.created_at))).length,
      spent: expenses.reduce((s, x) => s + (Number(x.amount) || 0), 0),
      fulfilled: appts.filter((a) => a.status === 'fulfilled').length,
      revenue: billings.reduce((s, b) => s + (Number(b.grand_total) || 0), 0),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, dateFrom, dateTo]);

  const dailyRows = useMemo(() => {
    const byDay = new Map();
    const row = (day) => {
      if (!byDay.has(day)) byDay.set(day, { day, booked: 0, fulfilled: 0, prestige: 0, spent: 0, revenue: 0 });
      return byDay.get(day);
    };
    for (const a of period.appts) { const r = row(a.day); r.booked += 1; if (a.status === 'fulfilled') r.fulfilled += 1; }
    for (const l of period.logs) row(l.date).prestige += 1;
    for (const x of period.expenses) row(x.expense_date).spent += Number(x.amount) || 0;
    for (const b of period.billings) row(b.billing_date).revenue += Number(b.grand_total) || 0;
    return [...byDay.values()].sort((a, b) => b.day.localeCompare(a.day));
  }, [period]);

  const procedureRows = useMemo(() => {
    const map = new Map();
    for (const a of period.appts) {
      const key = a.procedure || 'Not specified';
      if (!map.has(key)) map.set(key, { procedure: key, booked: 0, fulfilled: 0 });
      const r = map.get(key);
      r.booked += 1;
      if (a.status === 'fulfilled') r.fulfilled += 1;
    }
    return [...map.values()].sort((a, b) => b.booked - a.booked);
  }, [period]);

  const categoryRows = useMemo(() => {
    const totals = {};
    for (const x of period.expenses) totals[x.category] = (totals[x.category] || 0) + (Number(x.amount) || 0);
    return Object.entries(totals).map(([k, value]) => ({ label: EXPENSE_CATEGORIES[k] || k, value })).sort((a, b) => b.value - a.value);
  }, [period]);

  const monthRows = useMemo(() => lastNMonthsKarachi(3).map(({ yyyyMm, label }) => ({
    label,
    value: data.expenses.filter((x) => x.expense_date.startsWith(yyyyMm)).reduce((s, x) => s + (Number(x.amount) || 0), 0),
  })), [data.expenses]);

  const paymentModeRows = useMemo(() => {
    const totals = {};
    for (const b of period.billings) {
      const mode = b.payment_mode || 'Other';
      totals[mode] = (totals[mode] || 0) + (Number(b.grand_total) || 0);
    }
    return Object.entries(totals).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [period.billings]);

  const expiring = expiringSoon(data.members).slice(0, 5);
  const show = (v) => (loading ? '—' : v);

  return (
    <>
      <div className="page-head">
        <div><h1 className="page-title">Hub</h1><p className="page-sub">{formatDate(dateFrom)} to {formatDate(dateTo)}</p></div>
        <div className="toolbar" style={{ margin: 0 }}>
          <label className="small muted" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>From <input className="input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></label>
          <label className="small muted" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>To <input className="input" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></label>
        </div>
      </div>

      {error && <p className="form-error" role="alert">Some data couldn't load: {error}</p>}

      <div className="tiles">
        <div className="tile lead"><div className="tile-label">Revenue</div><div className="tile-value" style={{ fontSize: 26 }}>{show(formatMoney(period.revenue))}</div><div className="tile-sub">{period.billings.length} {period.billings.length === 1 ? 'invoice' : 'invoices'}</div></div>
        <div className="tile"><div className="tile-label">Expenses</div><div className="tile-value" style={{ fontSize: 26 }}>{show(formatMoney(period.spent))}</div></div>
        <div className="tile"><div className="tile-label">Appointments</div><div className="tile-value">{show(period.appts.length)}</div><div className="tile-sub">{show(period.fulfilled)} fulfilled</div></div>
        <div className="tile"><div className="tile-label">New Patients</div><div className="tile-value">{show(period.newPatients)}</div></div>
        <div className="tile"><div className="tile-label">Active Prestige</div><div className="tile-value">{show(data.members.filter(isCurrent).length)}</div></div>
      </div>

      <div className="stack">
        <section className="panel">
          <h2 className="panel-title">Daily breakdown</h2>
          {dailyRows.length === 0 ? <p className="muted">{loading ? 'Loading…' : 'No activity in this period.'}</p> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Revenue</th><th>Booked</th><th>Fulfilled</th><th>Prestige</th><th>Expenses</th></tr></thead>
                <tbody>
                  {dailyRows.map((r) => (
                    <tr key={r.day}>
                      <td className="mono small nowrap">{formatDate(r.day)}</td>
                      <td className="mono nowrap" style={{ fontWeight: 600, color: 'var(--accent)' }}>{r.revenue > 0 ? formatMoney(r.revenue) : <span className="muted">—</span>}</td>
                      <td className="mono">{r.booked}</td>
                      <td className="mono">{r.fulfilled}</td>
                      <td className="mono">{r.prestige}</td>
                      <td className="mono nowrap">{r.spent > 0 ? formatMoney(r.spent) : <span className="muted">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="two-col" style={{ marginBottom: 0 }}>
          <section className="panel">
            <h2 className="panel-title">Revenue by payment mode</h2>
            {paymentModeRows.length === 0 ? <p className="muted">{loading ? 'Loading…' : 'No revenue in this period.'}</p> : <Bars rows={paymentModeRows} format={formatMoney} />}
          </section>
          <section className="panel">
            <h2 className="panel-title">Expenses by category</h2>
            {categoryRows.length === 0 ? <p className="muted">{loading ? 'Loading…' : 'No expenses in this period.'}</p> : <Bars rows={categoryRows} format={formatMoney} />}
          </section>
        </div>

        <div className="two-col">
          <section className="panel">
            <h2 className="panel-title">Procedures</h2>
            {procedureRows.length === 0 ? <p className="muted">{loading ? 'Loading…' : 'No appointments in this period.'}</p> : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Procedure</th><th>Booked</th><th>Fulfilled</th></tr></thead>
                  <tbody>{procedureRows.map((r) => <tr key={r.procedure}><td>{r.procedure}</td><td className="mono">{r.booked}</td><td className="mono">{r.fulfilled}</td></tr>)}</tbody>
                </table>
              </div>
            )}
          </section>
          <section className="panel">
            <h2 className="panel-title">Expenses, last 3 months</h2>
            <Bars rows={monthRows} format={formatMoney} />
          </section>
          <section className="panel">
            <h2 className="panel-title">Prestige memberships expiring soon</h2>
            {expiring.length === 0 ? <p className="muted">{loading ? 'Loading…' : 'No memberships are expiring soon.'}</p> : expiring.map((m) => {
              const d = daysUntil(m.end_date);
              return (
                <Link key={m.id} className="list-row" to={`/prestige/members/${m.id}`}>
                  <span className="list-main"><span className="list-name">{m.name}</span> <span className="chip">{m.card_number}</span></span>
                  <span className="badge expiring">{d === 0 ? 'Today' : plural(d, 'day')}</span>
                </Link>
              );
            })}
          </section>
        </div>
      </div>
    </>
  );
}
