import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase, fetchAllRows } from '../lib/supabaseClient';
import { EXPENSE_CATEGORIES, formatDate, formatMoney, startOfMonthKarachi, todayKarachi } from '../lib/format';
import { toast } from '../components/Toast';
import Modal from '../components/Modal';

const categoryOptions = Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>);

function validAmount(value) {
  const n = Number(value);
  return n > 0 ? n : null;
}

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [dateFrom, setDateFrom] = useState(startOfMonthKarachi());
  const [dateTo, setDateTo] = useState(todayKarachi());
  const [editing, setEditing] = useState(null);

  const [category, setCategory] = useState('general');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayKarachi());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await fetchAllRows(() => supabase.from('expenses').select('*').order('expense_date', { ascending: false }).order('id'));
    setLoadError(error ? error.message : '');
    setExpenses(data);
    setLoading(false);
  }, []);

  useEffect(() => { document.title = 'Expenses — ClinicPilot'; load(); }, [load]);

  const inPeriod = useMemo(() => expenses.filter((x) => x.expense_date >= dateFrom && x.expense_date <= dateTo), [expenses, dateFrom, dateTo]);
  const totals = useMemo(() => {
    const byCat = {};
    let total = 0;
    for (const x of inPeriod) {
      const n = Number(x.amount) || 0;
      total += n;
      byCat[x.category] = (byCat[x.category] || 0) + n;
    }
    return { total, byCat };
  }, [inPeriod]);

  async function handleAdd(e) {
    e.preventDefault();
    const amt = validAmount(amount);
    if (!amt) { setFormError('Enter the expense amount.'); return; }
    if (!date) { setFormError('Enter the date.'); return; }
    setSaving(true);
    setFormError('');
    const { error } = await supabase.from('expenses').insert({ category, description: description.trim() || null, amount: amt, expense_date: date });
    setSaving(false);
    if (error) { setFormError(`Couldn't save: ${error.message}`); return; }
    setDescription('');
    setAmount('');
    toast('Expense added.');
    load();
  }

  return (
    <>
      <div className="page-head">
        <div><h1 className="page-title">Expenses</h1></div>
        <div className="toolbar" style={{ margin: 0 }}>
          <label className="small muted" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>From <input className="input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></label>
          <label className="small muted" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>To <input className="input" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></label>
        </div>
      </div>

      {loadError && <p className="form-error" role="alert">Couldn't load expenses: {loadError}</p>}

      <div className="tiles">
        <div className="tile lead"><div className="tile-label">Total</div><div className="tile-value" style={{ fontSize: 26 }}>{loading ? '—' : formatMoney(totals.total)}</div></div>
        {Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => (
          <div className="tile" key={k}><div className="tile-label">{v}</div><div className="tile-value" style={{ fontSize: 22 }}>{loading ? '—' : formatMoney(totals.byCat[k])}</div></div>
        ))}
      </div>

      <section className="panel" style={{ marginBottom: 18 }}>
        <h2 className="panel-title">Add expense</h2>
        <form onSubmit={handleAdd} noValidate>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, alignItems: 'end' }}>
            <div className="field"><label htmlFor="xCategory">Category</label><select className="input" id="xCategory" value={category} onChange={(e) => setCategory(e.target.value)}>{categoryOptions}</select></div>
            <div className="field"><label htmlFor="xDescription">Description</label><input className="input" id="xDescription" value={description} onChange={(e) => setDescription(e.target.value)} autoComplete="off" /></div>
            <div className="field"><label htmlFor="xAmount">Amount (Rs) <span className="req">*</span></label><input className="input mono" id="xAmount" type="number" min="0" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
            <div className="field"><label htmlFor="xDate">Date <span className="req">*</span></label><input className="input" id="xDate" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ height: 41 }}>{saving ? 'Adding…' : '+ Add expense'}</button>
          </div>
          {formError && <p className="form-error" role="alert" style={{ marginTop: 10 }}>{formError}</p>}
        </form>
      </section>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th>Actions</th></tr></thead>
          <tbody>
            {inPeriod.map((x) => (
              <tr key={x.id}>
                <td className="mono small nowrap">{formatDate(x.expense_date)}</td>
                <td className="nowrap">{EXPENSE_CATEGORIES[x.category] || x.category}</td>
                <td>{x.description || '—'}</td>
                <td className="mono nowrap">{formatMoney(x.amount)}</td>
                <td><button type="button" className="btn btn-sm" onClick={() => setEditing(x)}>Edit</button></td>
              </tr>
            ))}
            {!loading && inPeriod.length === 0 && <tr><td colSpan={5}><div className="empty">No expenses in this period.</div></td></tr>}
          </tbody>
        </table>
      </div>

      {editing && <EditExpense expense={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </>
  );
}

function EditExpense({ expense, onClose, onSaved }) {
  const [category, setCategory] = useState(expense.category);
  const [description, setDescription] = useState(expense.description || '');
  const [amount, setAmount] = useState(String(expense.amount ?? ''));
  const [date, setDate] = useState(expense.expense_date);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave(e) {
    e.preventDefault();
    const amt = validAmount(amount);
    if (!amt) { setError('Enter the expense amount.'); return; }
    if (!date) { setError('Enter the date.'); return; }
    setSaving(true);
    setError('');
    const { error: err } = await supabase.from('expenses').update({ category, description: description.trim() || null, amount: amt, expense_date: date }).eq('id', expense.id);
    setSaving(false);
    if (err) { setError(`Couldn't save: ${err.message}`); return; }
    toast('Expense updated.');
    onSaved();
  }

  async function handleDelete() {
    if (!window.confirm(`Delete this ${formatMoney(expense.amount)} expense? This can't be undone.`)) return;
    setSaving(true);
    const { error: err } = await supabase.from('expenses').delete().eq('id', expense.id);
    setSaving(false);
    if (err) { setError(`Couldn't delete: ${err.message}`); return; }
    toast('Expense deleted.');
    onSaved();
  }

  return (
    <Modal title="Edit expense" onClose={onClose}>
      <form onSubmit={handleSave} noValidate>
        <div className="form-grid">
          <div className="field"><label htmlFor="eCategory">Category</label><select className="input" id="eCategory" value={category} onChange={(e) => setCategory(e.target.value)}>{categoryOptions}</select></div>
          <div className="field"><label htmlFor="eDate">Date</label><input className="input" id="eDate" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="field"><label htmlFor="eAmount">Amount (Rs)</label><input className="input mono" id="eAmount" type="number" min="0" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div className="field"><label htmlFor="eDescription">Description</label><input className="input" id="eDescription" value={description} onChange={(e) => setDescription(e.target.value)} autoComplete="off" /></div>
        </div>
        {error && <p className="form-error" role="alert" style={{ marginTop: 12 }}>{error}</p>}
        <div className="dlg-foot">
          <button type="button" className="btn btn-danger" style={{ marginRight: 'auto' }} onClick={handleDelete} disabled={saving}>Delete</button>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
        </div>
      </form>
    </Modal>
  );
}
