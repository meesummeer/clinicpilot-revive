import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase, fetchAllRows } from '../lib/supabaseClient';
import { formatDate, formatMoney, todayKarachi, startOfMonthKarachi } from '../lib/format';
import { toast } from '../components/Toast';
import Modal from '../components/Modal';

// ── constants ────────────────────────────────────────────────────────────────

const STATUSES = ['PAID', 'UNPAID', 'DUE_THIS_MONTH', 'DISPUTED'];

const STATUS_META = {
  PAID:           { label: 'Paid',           color: 'var(--teal)',   bg: 'rgba(45,138,138,.15)' },
  UNPAID:         { label: 'Unpaid',         color: '#e07b3f',       bg: 'rgba(224,123,63,.15)' },
  DUE_THIS_MONTH: { label: 'Due This Month', color: '#d4a017',       bg: 'rgba(212,160,23,.15)' },
  DISPUTED:       { label: 'Disputed',       color: '#c0556a',       bg: 'rgba(192,85,106,.15)' },
};

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.UNPAID;
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 600, letterSpacing: '.4px',
      color: m.color, background: m.bg, border: `1px solid ${m.color}44`,
    }}>
      {m.label}
    </span>
  );
}

function fmt(n) { return 'Rs ' + (Number(n) || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 }); }

// ── analytics cards ──────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '18px 20px',
      borderLeft: accent ? `3px solid ${accent}` : undefined,
    }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg)' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── add / edit bill modal ────────────────────────────────────────────────────

function BillModal({ bill, vendors, selectedVendorId, onClose, onSaved }) {
  const isEdit = !!bill?.id;
  const [vendorId, setVendorId] = useState(bill?.vendor_id || selectedVendorId || vendors[0]?.id || '');
  const [invoiceId, setInvoiceId] = useState(bill?.invoice_id || '');
  const [billDate, setBillDate] = useState(bill?.bill_date || todayKarachi());
  const [items, setItems] = useState(bill?.items || '');
  const [amount, setAmount] = useState(bill?.amount != null ? String(bill.amount) : '');
  const [status, setStatus] = useState(bill?.status || 'UNPAID');
  const [notes, setNotes] = useState(bill?.notes || '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!items.trim()) { setErr('Enter item description.'); return; }
    if (!billDate) { setErr('Enter bill date.'); return; }
    const amt = Number(amount);
    if (!amt || amt <= 0) { setErr('Enter a valid amount.'); return; }
    setSaving(true); setErr('');
    const payload = {
      vendor_id: vendorId, invoice_id: invoiceId.trim() || null,
      bill_date: billDate, items: items.trim(),
      amount: amt, status, notes: notes.trim() || null,
    };
    const { error } = isEdit
      ? await supabase.from('vendor_bills').update(payload).eq('id', bill.id)
      : await supabase.from('vendor_bills').insert(payload);
    setSaving(false);
    if (error) { setErr(error.message); return; }
    toast(isEdit ? 'Bill updated.' : 'Bill added.');
    onSaved();
  }

  const inp = {
    background: 'var(--input-bg)', border: '1px solid var(--border)',
    borderRadius: 6, padding: '8px 10px', color: 'var(--fg)', width: '100%', fontSize: 13,
  };
  const lbl = { fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.5px' };

  return (
    <Modal title={isEdit ? 'Edit Bill' : 'Add Bill'} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={lbl}>Vendor</label>
          <select value={vendorId} onChange={e => setVendorId(e.target.value)} style={inp} required>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={lbl}>Invoice ID</label>
            <input style={inp} value={invoiceId} onChange={e => setInvoiceId(e.target.value)} placeholder="Optional" />
          </div>
          <div>
            <label style={lbl}>Bill Date</label>
            <input type="date" style={inp} value={billDate} onChange={e => setBillDate(e.target.value)} required />
          </div>
        </div>
        <div>
          <label style={lbl}>Items</label>
          <input style={inp} value={items} onChange={e => setItems(e.target.value)} placeholder="e.g. 2 Botox + 5 MesoPDRN" required />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={lbl}>Amount (Rs)</label>
            <input type="number" style={inp} value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" min="1" required />
          </div>
          <div>
            <label style={lbl}>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} style={inp}>
              {STATUSES.map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={lbl}>Notes</label>
          <input style={inp} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Check no., payment ref, etc." />
        </div>
        {err && <p style={{ color: '#e07b3f', fontSize: 12, margin: 0 }}>{err}</p>}
        <button type="submit" disabled={saving} style={{
          background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 7,
          padding: '10px 0', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
        }}>
          {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Bill'}
        </button>
      </form>
    </Modal>
  );
}

// ── add vendor modal ─────────────────────────────────────────────────────────

function VendorModal({ onClose, onSaved }) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const inp = { background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', color: 'var(--fg)', width: '100%', fontSize: 13 };
  const lbl = { fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.5px' };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) { setErr('Enter vendor name.'); return; }
    setSaving(true); setErr('');
    const { error } = await supabase.from('vendors').insert({ name: name.trim() });
    setSaving(false);
    if (error) { setErr(error.message); return; }
    toast('Vendor added.');
    onSaved();
  }

  return (
    <Modal title="Add Vendor" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={lbl}>Vendor Name</label>
          <input style={inp} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ahmed Khan" required autoFocus />
        </div>
        {err && <p style={{ color: '#e07b3f', fontSize: 12, margin: 0 }}>{err}</p>}
        <button type="submit" disabled={saving} style={{
          background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 7,
          padding: '10px 0', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
        }}>
          {saving ? 'Saving…' : 'Add Vendor'}
        </button>
      </form>
    </Modal>
  );
}

// ── main page ────────────────────────────────────────────────────────────────

export default function VendorTracker() {
  const [vendors, setVendors] = useState([]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [selectedVendor, setSelectedVendor] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const [showBillModal, setShowBillModal] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [editingBill, setEditingBill] = useState(null);

  const load = useCallback(async () => {
    const [{ data: vs, error: ve }, { data: bs, error: be }] = await Promise.all([
      fetchAllRows(() => supabase.from('vendors').select('*').order('name')),
      fetchAllRows(() => supabase.from('vendor_bills').select('*').order('bill_date', { ascending: false })),
    ]);
    if (ve || be) { setLoadError((ve || be).message); }
    setVendors(vs || []);
    setBills(bs || []);
    setLoading(false);
  }, []);

  useEffect(() => { document.title = 'Vendors — ClinicPilot'; load(); }, [load]);

  // ── derived ────────────────────────────────────────────────────────────────

  const thisMonth = todayKarachi().slice(0, 7); // "2026-11"

  const vendorMap = useMemo(() => Object.fromEntries(vendors.map(v => [v.id, v.name])), [vendors]);

  const filtered = useMemo(() => bills.filter(b => {
    if (selectedVendor !== 'ALL' && b.vendor_id !== selectedVendor) return false;
    if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(b.items || '').toLowerCase().includes(q) &&
          !(b.invoice_id || '').toLowerCase().includes(q) &&
          !(vendorMap[b.vendor_id] || '').toLowerCase().includes(q)) return false;
    }
    return true;
  }), [bills, selectedVendor, statusFilter, search, vendorMap]);

  // stats computed over ALL bills (not just filtered)
  const stats = useMemo(() => {
    let totalUnpaid = 0, totalPaid = 0, paidThisMonth = 0, dueThisMonth = 0, disputed = 0;
    for (const b of bills) {
      const amt = Number(b.amount) || 0;
      if (b.status === 'UNPAID') totalUnpaid += amt;
      if (b.status === 'PAID') {
        totalPaid += amt;
        if ((b.bill_date || '').startsWith(thisMonth)) paidThisMonth += amt;
      }
      if (b.status === 'DUE_THIS_MONTH') dueThisMonth += amt;
      if (b.status === 'DISPUTED') disputed += amt;
    }
    return { totalUnpaid, totalPaid, paidThisMonth, dueThisMonth, disputed };
  }, [bills, thisMonth]);

  // per-vendor summary (for selected vendor)
  const vendorStats = useMemo(() => {
    const subset = selectedVendor === 'ALL' ? bills : bills.filter(b => b.vendor_id === selectedVendor);
    let unpaid = 0, paid = 0;
    for (const b of subset) {
      if (b.status === 'UNPAID' || b.status === 'DUE_THIS_MONTH') unpaid += Number(b.amount) || 0;
      if (b.status === 'PAID') paid += Number(b.amount) || 0;
    }
    return { unpaid, paid };
  }, [bills, selectedVendor]);

  async function quickStatus(bill, newStatus) {
    const { error } = await supabase.from('vendor_bills').update({ status: newStatus }).eq('id', bill.id);
    if (error) { toast('Error: ' + error.message); return; }
    toast(`Marked ${STATUS_META[newStatus].label}.`);
    setBills(prev => prev.map(b => b.id === bill.id ? { ...b, status: newStatus } : b));
  }

  async function deleteBill(bill) {
    if (!confirm(`Delete this bill (${bill.items})?`)) return;
    const { error } = await supabase.from('vendor_bills').delete().eq('id', bill.id);
    if (error) { toast('Error: ' + error.message); return; }
    toast('Bill deleted.');
    setBills(prev => prev.filter(b => b.id !== bill.id));
  }

  function afterSave() {
    setShowBillModal(false);
    setShowVendorModal(false);
    setEditingBill(null);
    load();
  }

  // ── styles ──────────────────────────────────────────────────────────────────

  const selStyle = {
    background: 'var(--input-bg)', border: '1px solid var(--border)',
    borderRadius: 7, padding: '7px 12px', color: 'var(--fg)', fontSize: 13, cursor: 'pointer',
  };
  const btnPrimary = {
    background: 'var(--teal)', color: '#fff', border: 'none',
    borderRadius: 7, padding: '8px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer',
  };
  const btnGhost = {
    background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)',
    borderRadius: 7, padding: '8px 14px', fontWeight: 500, fontSize: 12, cursor: 'pointer',
  };

  // ── render ──────────────────────────────────────────────────────────────────

  if (loading) return <div style={{ padding: 40, color: 'var(--muted)' }}>Loading vendors…</div>;
  if (loadError) return <div style={{ padding: 40, color: '#e07b3f' }}>Error: {loadError}</div>;

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Vendor Tracker</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>Bills, payments, and outstanding balances across all vendors</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btnGhost} onClick={() => setShowVendorModal(true)}>+ Add Vendor</button>
          <button style={btnPrimary} onClick={() => { setEditingBill(null); setShowBillModal(true); }}>+ Add Bill</button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard label="Total Unpaid" value={fmt(stats.totalUnpaid)} accent="#e07b3f" />
        <StatCard label="Due This Month" value={fmt(stats.dueThisMonth)} accent="#d4a017" />
        <StatCard label="Paid This Month" value={fmt(stats.paidThisMonth)} sub="bills dated this month" accent="var(--teal)" />
        <StatCard label="Total Paid (All Time)" value={fmt(stats.totalPaid)} />
        <StatCard label="Disputed" value={fmt(stats.disputed)} accent="#c0556a" />
      </div>

      {/* Vendor selector */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <button
          onClick={() => setSelectedVendor('ALL')}
          style={{ ...btnGhost, ...(selectedVendor === 'ALL' ? { borderColor: 'var(--teal)', color: 'var(--teal)', background: 'rgba(45,138,138,.08)' } : {}) }}
        >
          All Vendors
        </button>
        {vendors.map(v => (
          <button
            key={v.id}
            onClick={() => setSelectedVendor(v.id)}
            style={{ ...btnGhost, ...(selectedVendor === v.id ? { borderColor: 'var(--teal)', color: 'var(--teal)', background: 'rgba(45,138,138,.08)' } : {}) }}
          >
            {v.name}
          </button>
        ))}
      </div>

      {/* Vendor summary bar */}
      {selectedVendor !== 'ALL' && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 20px', marginBottom: 16, display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <div><span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Outstanding</span><div style={{ fontWeight: 700, color: '#e07b3f' }}>{fmt(vendorStats.unpaid)}</div></div>
          <div><span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Total Paid</span><div style={{ fontWeight: 700, color: 'var(--teal)' }}>{fmt(vendorStats.paid)}</div></div>
          <div><span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Bills</span><div style={{ fontWeight: 700 }}>{bills.filter(b => b.vendor_id === selectedVendor).length}</div></div>
        </div>
      )}

      {/* Filters row */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search items, invoice ID…"
          style={{ ...selStyle, flex: '1 1 180px', minWidth: 160 }}
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selStyle}>
          <option value="ALL">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
        </select>
        <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 4 }}>{filtered.length} bills</span>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,.12)' }}>
                {['Vendor', 'Date', 'Invoice', 'Items', 'Amount', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ padding: '32px 14px', textAlign: 'center', color: 'var(--muted)' }}>No bills found.</td></tr>
              )}
              {filtered.map((b, i) => (
                <tr key={b.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.018)' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 500, whiteSpace: 'nowrap' }}>{vendorMap[b.vendor_id] || '—'}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{formatDate(b.bill_date)}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--muted)', whiteSpace: 'nowrap', fontSize: 11 }}>{b.invoice_id || '—'}</td>
                  <td style={{ padding: '10px 14px', maxWidth: 260 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={b.items}>{b.items}</div>
                    {b.notes && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{b.notes}</div>}
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 600, whiteSpace: 'nowrap' }}>{fmt(b.amount)}</td>
                  <td style={{ padding: '10px 14px' }}><StatusBadge status={b.status} /></td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {b.status !== 'PAID' && (
                        <button onClick={() => quickStatus(b, 'PAID')} style={{ ...btnGhost, padding: '3px 8px', fontSize: 11, borderColor: 'var(--teal)', color: 'var(--teal)' }}>✓ Paid</button>
                      )}
                      {b.status !== 'DUE_THIS_MONTH' && b.status !== 'PAID' && (
                        <button onClick={() => quickStatus(b, 'DUE_THIS_MONTH')} style={{ ...btnGhost, padding: '3px 8px', fontSize: 11, borderColor: '#d4a017', color: '#d4a017' }}>Due</button>
                      )}
                      {b.status !== 'DISPUTED' && (
                        <button onClick={() => quickStatus(b, 'DISPUTED')} style={{ ...btnGhost, padding: '3px 8px', fontSize: 11, borderColor: '#c0556a', color: '#c0556a' }}>Dispute</button>
                      )}
                      <button onClick={() => { setEditingBill(b); setShowBillModal(true); }} style={{ ...btnGhost, padding: '3px 8px', fontSize: 11 }}>Edit</button>
                      <button onClick={() => deleteBill(b)} style={{ ...btnGhost, padding: '3px 8px', fontSize: 11, borderColor: '#c0556a', color: '#c0556a' }}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showBillModal && (
        <BillModal
          bill={editingBill}
          vendors={vendors}
          selectedVendorId={selectedVendor !== 'ALL' ? selectedVendor : undefined}
          onClose={() => { setShowBillModal(false); setEditingBill(null); }}
          onSaved={afterSave}
        />
      )}
      {showVendorModal && (
        <VendorModal onClose={() => setShowVendorModal(false)} onSaved={afterSave} />
      )}
    </div>
  );
}
