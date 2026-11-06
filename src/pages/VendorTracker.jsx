import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase, fetchAllRows } from '../lib/supabaseClient';
import { formatDate, formatMoney, todayKarachi } from '../lib/format';
import { toast } from '../components/Toast';
import Modal from '../components/Modal';

// ── constants ────────────────────────────────────────────────────────────────

const STATUSES = ['PAID', 'UNPAID', 'DUE_THIS_MONTH', 'DISPUTED'];

const STATUS_META = {
  PAID:           { label: 'Paid',           color: '#16a34a', bg: '#dcfce7', border: '#86efac' },
  UNPAID:         { label: 'Unpaid',         color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' },
  DUE_THIS_MONTH: { label: 'Due This Month', color: '#1d4ed8', bg: '#dbeafe', border: '#93c5fd' },
  DISPUTED:       { label: 'Disputed',       color: '#a16207', bg: '#fef9c3', border: '#fde047' },
};

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.UNPAID;
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 600, letterSpacing: '.3px',
      color: m.color, background: m.bg, border: `1px solid ${m.border}`,
    }}>
      {m.label}
    </span>
  );
}

function fmt(n) { return 'Rs ' + (Number(n) || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 }); }

// Parse "Check No.: 1234" out of notes, return { checkNo, otherNotes }
function parseNotes(notes) {
  if (!notes) return { checkNo: '', otherNotes: '' };
  const m = notes.match(/^Check No\.\s*:\s*(\S+)([\s\S]*)$/i);
  if (m) return { checkNo: m[1].trim(), otherNotes: m[2].trim() };
  // check no. might be embedded elsewhere
  const m2 = notes.match(/Check No\.\s*:\s*(\S+)/i);
  if (m2) return { checkNo: m2[1].trim(), otherNotes: notes.replace(m2[0], '').trim() };
  return { checkNo: '', otherNotes: notes.trim() };
}

function buildNotes(checkNo, otherNotes) {
  const parts = [];
  if (checkNo.trim()) parts.push(`Check No.: ${checkNo.trim()}`);
  if (otherNotes.trim()) parts.push(otherNotes.trim());
  return parts.join(' · ') || null;
}

// ── stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accentColor }) {
  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: 10,
      padding: '16px 20px',
      boxShadow: '0 1px 3px rgba(0,0,0,.06)',
      borderTop: accentColor ? `3px solid ${accentColor}` : '3px solid #e5e7eb',
    }}>
      <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 6, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

// ── add / edit bill modal ────────────────────────────────────────────────────

function BillModal({ bill, vendors, selectedVendorId, onClose, onSaved, onDeleted }) {
  const isEdit = !!bill?.id;
  const [vendorId, setVendorId] = useState(bill?.vendor_id || selectedVendorId || vendors[0]?.id || '');
  const [invoiceId, setInvoiceId] = useState(bill?.invoice_id || '');
  const [billDate, setBillDate] = useState(bill?.bill_date || todayKarachi());
  const [items, setItems] = useState(bill?.items || '');
  const [amount, setAmount] = useState(bill?.amount != null ? String(bill.amount) : '');
  const [status, setStatus] = useState(bill?.status || 'UNPAID');
  const { checkNo: initCheckNo, otherNotes: initOtherNotes } = parseNotes(bill?.notes || '');
  const [checkNo, setCheckNo] = useState(initCheckNo);
  const [otherNotes, setOtherNotes] = useState(initOtherNotes);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
      amount: amt, status, notes: buildNotes(checkNo, otherNotes),
    };
    const { error } = isEdit
      ? await supabase.from('vendor_bills').update(payload).eq('id', bill.id)
      : await supabase.from('vendor_bills').insert(payload);
    setSaving(false);
    if (error) { setErr(error.message); return; }
    toast(isEdit ? 'Bill updated.' : 'Bill added.');
    onSaved();
  }

  async function handleDelete() {
    if (!confirm(`Delete this bill (${bill.items})?`)) return;
    setDeleting(true);
    const { error } = await supabase.from('vendor_bills').delete().eq('id', bill.id);
    setDeleting(false);
    if (error) { toast('Error: ' + error.message); return; }
    toast('Bill deleted.');
    onDeleted();
  }

  const inp = {
    background: '#f9fafb',
    border: '1px solid #d1d5db',
    borderRadius: 7,
    padding: '8px 11px',
    color: '#111827',
    width: '100%',
    fontSize: 13,
    boxSizing: 'border-box',
  };
  const lbl = {
    fontSize: 11,
    color: '#6b7280',
    display: 'block',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: '.5px',
    fontWeight: 600,
  };

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
              {STATUSES.map(s => (
                <option key={s} value={s}>{STATUS_META[s].label}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={lbl}>Check No.</label>
            <input
              style={inp}
              value={checkNo}
              onChange={e => setCheckNo(e.target.value)}
              placeholder="e.g. 1668"
            />
          </div>
          <div>
            <label style={lbl}>Other Notes</label>
            <input
              style={inp}
              value={otherNotes}
              onChange={e => setOtherNotes(e.target.value)}
              placeholder="Payment ref, etc."
            />
          </div>
        </div>
        {err && <p style={{ color: '#dc2626', fontSize: 12, margin: 0 }}>{err}</p>}
        <button type="submit" disabled={saving} style={{
          background: '#0d9488', color: '#fff', border: 'none', borderRadius: 7,
          padding: '10px 0', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13,
        }}>
          {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Bill'}
        </button>
        {isEdit && (
          <button type="button" onClick={handleDelete} disabled={deleting} style={{
            background: 'transparent', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 7,
            padding: '8px 0', fontWeight: 600, cursor: deleting ? 'not-allowed' : 'pointer', fontSize: 13,
          }}>
            {deleting ? 'Deleting…' : '🗑 Delete Bill'}
          </button>
        )}
      </form>
    </Modal>
  );
}

// ── add vendor modal ─────────────────────────────────────────────────────────

function VendorModal({ onClose, onSaved }) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const inp = {
    background: '#f9fafb', border: '1px solid #d1d5db', borderRadius: 7,
    padding: '8px 11px', color: '#111827', width: '100%', fontSize: 13, boxSizing: 'border-box',
  };
  const lbl = {
    fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4,
    textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 600,
  };

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
        {err && <p style={{ color: '#dc2626', fontSize: 12, margin: 0 }}>{err}</p>}
        <button type="submit" disabled={saving} style={{
          background: '#0d9488', color: '#fff', border: 'none', borderRadius: 7,
          padding: '10px 0', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13,
        }}>
          {saving ? 'Saving…' : 'Add Vendor'}
        </button>
      </form>
    </Modal>
  );
}

// ── main page ────────────────────────────────────────────────────────────────

export default function VendorTracker({ isRestricted = false }) {
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

  const thisMonth = todayKarachi().slice(0, 7);
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

  const vendorStats = useMemo(() => {
    const subset = selectedVendor === 'ALL' ? bills : bills.filter(b => b.vendor_id === selectedVendor);
    let unpaid = 0, paid = 0;
    for (const b of subset) {
      if (b.status === 'UNPAID' || b.status === 'DUE_THIS_MONTH') unpaid += Number(b.amount) || 0;
      if (b.status === 'PAID') paid += Number(b.amount) || 0;
    }
    return { unpaid, paid };
  }, [bills, selectedVendor]);

  function afterSave() {
    setShowBillModal(false);
    setShowVendorModal(false);
    setEditingBill(null);
    load();
  }

  function afterDelete() {
    setShowBillModal(false);
    setEditingBill(null);
    load();
  }

  // ── styles ────────────────────────────────────────────────────────────────

  const page = {
    background: '#f3f4f6',
    minHeight: '100vh',
    padding: '28px 32px',
    color: '#111827',
  };

  const selStyle = {
    background: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: 7,
    padding: '7px 12px',
    color: '#374151',
    fontSize: 13,
    cursor: 'pointer',
  };

  const btnPrimary = {
    background: '#0d9488',
    color: '#fff',
    border: 'none',
    borderRadius: 7,
    padding: '8px 16px',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
  };

  const btnOutline = {
    background: '#ffffff',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: 7,
    padding: '8px 14px',
    fontWeight: 500,
    fontSize: 13,
    cursor: 'pointer',
  };

  // ── render ────────────────────────────────────────────────────────────────

  if (loading) return <div style={{ padding: 40, color: '#6b7280' }}>Loading vendors…</div>;
  if (loadError) return <div style={{ padding: 40, color: '#dc2626' }}>Error: {loadError}</div>;

  return (
    <div style={page}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111827' }}>Vendor Tracker</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>Bills, payments, and outstanding balances across all vendors</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btnOutline} onClick={() => setShowVendorModal(true)}>+ Add Vendor</button>
          {!isRestricted && (
            <button style={btnPrimary} onClick={() => { setEditingBill(null); setShowBillModal(true); }}>+ Add Bill</button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard label="Total Unpaid"       value={fmt(stats.totalUnpaid)}    accentColor="#dc2626" />
        <StatCard label="Due This Month"     value={fmt(stats.dueThisMonth)}   accentColor="#1d4ed8" />
        <StatCard label="Paid This Month"    value={fmt(stats.paidThisMonth)}  sub="bills dated this month" accentColor="#16a34a" />
        <StatCard label="Total Paid"         value={fmt(stats.totalPaid)}      accentColor="#6b7280" />
        <StatCard label="Disputed"           value={fmt(stats.disputed)}       accentColor="#a16207" />
      </div>

      {/* Vendor tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {[{ id: 'ALL', name: 'All Vendors' }, ...vendors].map(v => {
          const active = selectedVendor === v.id;
          return (
            <button
              key={v.id}
              onClick={() => setSelectedVendor(v.id)}
              style={{
                background: active ? '#0d9488' : '#ffffff',
                color: active ? '#ffffff' : '#374151',
                border: active ? '1px solid #0d9488' : '1px solid #d1d5db',
                borderRadius: 20,
                padding: '6px 14px',
                fontWeight: active ? 600 : 500,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {v.name}
            </button>
          );
        })}
      </div>

      {/* Vendor summary bar */}
      {selectedVendor !== 'ALL' && (
        <div style={{
          background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 10,
          padding: '14px 20px', marginBottom: 16, display: 'flex', gap: 36, flexWrap: 'wrap',
          boxShadow: '0 1px 2px rgba(0,0,0,.04)',
        }}>
          <div>
            <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 600, marginBottom: 2 }}>Outstanding</div>
            <div style={{ fontWeight: 700, color: '#dc2626', fontSize: 16 }}>{fmt(vendorStats.unpaid)}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 600, marginBottom: 2 }}>Total Paid</div>
            <div style={{ fontWeight: 700, color: '#16a34a', fontSize: 16 }}>{fmt(vendorStats.paid)}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 600, marginBottom: 2 }}>Bills</div>
            <div style={{ fontWeight: 700, color: '#111827', fontSize: 16 }}>{bills.filter(b => b.vendor_id === selectedVendor).length}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
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
        <span style={{ fontSize: 12, color: '#9ca3af' }}>{filtered.length} bills</span>
      </div>

      {/* Table */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: 10,
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,.06)',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['Vendor', 'Date', 'Invoice', 'Items', 'Amount', 'Status', ''].map(h => (
                  <th key={h} style={{
                    padding: '10px 14px', textAlign: 'left', fontWeight: 600,
                    fontSize: 11, color: '#6b7280', textTransform: 'uppercase',
                    letterSpacing: '.5px', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '40px 14px', textAlign: 'center', color: '#9ca3af' }}>
                    No bills found.
                  </td>
                </tr>
              )}
              {filtered.map((b, i) => (
                <tr
                  key={b.id}
                  style={{
                    borderBottom: '1px solid #f3f4f6',
                    background: i % 2 === 0 ? '#ffffff' : '#fafafa',
                  }}
                >
                  <td style={{ padding: '10px 14px', fontWeight: 600, whiteSpace: 'nowrap', color: '#111827' }}>
                    {vendorMap[b.vendor_id] || '—'}
                  </td>
                  <td style={{ padding: '10px 14px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                    {formatDate(b.bill_date)}
                  </td>
                  <td style={{ padding: '10px 14px', color: '#9ca3af', whiteSpace: 'nowrap', fontSize: 11 }}>
                    {b.invoice_id || '—'}
                  </td>
                  <td style={{ padding: '10px 14px', maxWidth: 260 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#374151' }} title={b.items}>
                      {b.items}
                    </div>
                    {(() => {
                      const { checkNo: cn, otherNotes: on } = parseNotes(b.notes);
                      return (
                        <>
                          {cn && (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                              <span style={{
                                fontSize: 10, fontWeight: 700, letterSpacing: '.4px',
                                color: '#0d9488', background: 'rgba(13,148,136,.08)',
                                border: '1px solid rgba(13,148,136,.2)',
                                borderRadius: 4, padding: '1px 6px',
                              }}>CHK {cn}</span>
                            </div>
                          )}
                          {on && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{on}</div>}
                        </>
                      );
                    })()}
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 700, whiteSpace: 'nowrap', color: '#111827' }}>
                    {fmt(b.amount)}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <StatusBadge status={b.status} />
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    {!isRestricted && (
                      <button
                        onClick={() => { setEditingBill(b); setShowBillModal(true); }}
                        style={{
                          background: '#f9fafb', color: '#374151',
                          border: '1px solid #d1d5db', borderRadius: 6,
                          padding: '4px 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                        }}
                      >
                        Edit
                      </button>
                    )}
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
          onDeleted={afterDelete}
        />
      )}
      {showVendorModal && (
        <VendorModal onClose={() => setShowVendorModal(false)} onSaved={afterSave} />
      )}
    </div>
  );
}
