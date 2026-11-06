import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { supabase, fetchAllRows } from '../lib/supabaseClient';
import { formatDate, formatMoney, todayKarachi, toWhatsAppNumber } from '../lib/format';
import Modal from '../components/Modal';
import PatientForm from '../components/PatientForm';
import { toast } from '../components/Toast';

// ─── constants ───────────────────────────────────────────────────────────────
const PAYMENT_MODES = ['Cash', 'Bank Transfer', 'Debit/Credit Card', 'GIA International', 'Habib Insurance', 'Cheque', 'Other'];
const CLINIC_NAME   = 'Revive House of Dermatology & Health Care';
const CLINIC_ADDR   = 'Plot#102 Shop#1 Imperial Residency Siraj ud-Daulah Road, Bahadurabad, Karachi, Sindh, Pakistan';
const CLINIC_PHONE  = '0303-0008483 · 03011788000';
const CLINIC_HRS    = '1pm–10pm, Monday–Saturday';

// ─── helpers ─────────────────────────────────────────────────────────────────
const pk = (phone) => { const d = String(phone || '').replace(/\D/g, ''); return d.length >= 10 ? d.slice(-10) : null; };
const num = (v) => Number(v) || 0;

function emptyItem() { return { description: '', rate: '', qty: 1, amount: 0 }; }
function calcItem(it) { return { ...it, amount: num(it.rate) * num(it.qty) }; }

// ─── Invoice print/share component (renders off-screen, exported to WA) ──────
function InvoiceDoc({ bill, logoSrc }) {
  const sub = num(bill.subtotal);
  const grand = num(bill.grand_total);
  const paid = num(bill.paid_amount);
  const bal = num(bill.balance_due);

  return (
    <div id="invoice-root" style={{
      fontFamily: 'Arial, sans-serif', fontSize: 13, color: '#111',
      background: '#fff', width: 680, padding: '32px 36px', boxSizing: 'border-box',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 20 }}>
        {logoSrc && <img src={logoSrc} alt="Revive" style={{ width: 90, objectFit: 'contain' }} />}
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.3 }}>{CLINIC_NAME}</div>
          <div style={{ marginTop: 6, color: '#444', lineHeight: 1.6 }}>
            {CLINIC_ADDR}<br />
            {CLINIC_PHONE}
          </div>
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #ccc', margin: '12px 0' }} />

      {/* Patient row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
        <div><b>Name:</b> {bill.patient_name}</div>
        <div style={{ textAlign: 'right' }}><b>Date:</b> {formatDate(bill.billing_date)} - {new Date(bill.created_at || Date.now()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
        <div><b>MR#:</b> {bill.mr_no ?? '—'}</div>
        <div style={{ textAlign: 'right' }}><b>Invoice#:</b> {bill.ref_no}</div>
        {bill.patient_phone && <div><b>Phone:</b> {bill.patient_phone}</div>}
        {bill.patient_gender && <div><b>Gender:</b> {bill.patient_gender}</div>}
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #ccc', margin: '12px 0' }} />

      {/* Line items table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
        <thead>
          <tr style={{ background: '#f5f5f5' }}>
            {['Description', 'Rate', 'Quantity', 'Amount'].map((h) => (
              <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Description' ? 'left' : 'right', borderBottom: '1px solid #ccc', fontWeight: 700 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(bill.items || []).map((it, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #e5e5e5' }}>
              <td style={{ padding: '8px 10px' }}>{it.description}</td>
              <td style={{ padding: '8px 10px', textAlign: 'right' }}>{num(it.rate).toLocaleString()}</td>
              <td style={{ padding: '8px 10px', textAlign: 'right' }}>{it.qty}</td>
              <td style={{ padding: '8px 10px', textAlign: 'right' }}>{num(it.amount).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{ maxWidth: 300, color: '#444', fontSize: 12 }}>
          Payment Mode: {bill.payment_mode}
        </div>
        <table style={{ fontSize: 13 }}>
          <tbody>
            <tr>
              <td style={{ padding: '3px 16px', color: '#555' }}>Sub - Total:</td>
              <td style={{ textAlign: 'right', padding: '3px 0' }}>Rs. {sub.toLocaleString()}.00</td>
            </tr>
            <tr>
              <td style={{ padding: '3px 16px', fontWeight: 700 }}>Grand Total:</td>
              <td style={{ textAlign: 'right', fontWeight: 700, padding: '3px 0' }}>Rs. {grand.toLocaleString()}.00/-</td>
            </tr>
            <tr>
              <td style={{ padding: '3px 16px', color: '#555' }}>Paid Amount:</td>
              <td style={{ textAlign: 'right', padding: '3px 0' }}>Rs. {paid.toLocaleString()}.00/-</td>
            </tr>
            {bal > 0 && (
              <tr>
                <td style={{ padding: '3px 16px', color: '#c00', fontWeight: 700 }}>Balance Due:</td>
                <td style={{ textAlign: 'right', color: '#c00', fontWeight: 700, padding: '3px 0' }}>Rs. {bal.toLocaleString()}.00/-</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #ccc', margin: '12px 0' }} />

      {/* Footer */}
      <div style={{ fontSize: 12, color: '#333' }}>
        <b>Note:</b> Instructions:-<br />
        • No Refund Policy.<br />
        • Timings {CLINIC_HRS}.<br />
        • For Queries contact on {CLINIC_PHONE}
        {bill.notes && <><br /><br /><b>Notes:</b> {bill.notes}</>}
      </div>
    </div>
  );
}

// ─── BillingForm modal ────────────────────────────────────────────────────────
function BillingForm({ initial, patients, onClose, onSaved }) {
  const [patientSearch, setPatientSearch] = useState(initial?.patient_name || '');
  const [patientId, setPatientId] = useState(initial?.patient_id || null);
  const [patientMrNo, setPatientMrNo] = useState(initial?.mr_no || null);
  const [patientPhone, setPatientPhone] = useState(initial?.patient_phone || '');
  const [patientAge, setPatientAge] = useState(initial?.patient_age || '');
  const [patientGender, setPatientGender] = useState(initial?.patient_gender || '');
  const [items, setItems] = useState(initial?.items?.length ? initial.items : [emptyItem()]);
  const [paymentMode, setPaymentMode] = useState(initial?.payment_mode || 'Cash');
  const [paidAmount, setPaidAmount] = useState(initial?.paid_amount ?? '');
  const [notes, setNotes] = useState(initial?.notes || '');
  const [billingDate, setBillingDate] = useState(initial?.billing_date || todayKarachi());
  const [addingNew, setAddingNew] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fuzzy patient matches
  const matches = useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    if (!q || patientId) return [];
    return patients
      .filter((p) =>
        p.name.toLowerCase().includes(q) ||
        (p.phone || '').replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
        String(p.mr_no) === q.replace('#', '')
      )
      .slice(0, 10);
  }, [patientSearch, patients, patientId]);

  function pickPatient(p) {
    setPatientSearch(p.name);
    setPatientId(p.id);
    setPatientMrNo(p.mr_no);
    setPatientPhone(p.phone || '');
    setPatientAge(p.age || '');
    setPatientGender(p.gender || '');
  }

  function clearPatient() {
    setPatientSearch('');
    setPatientId(null);
    setPatientMrNo(null);
    setPatientPhone('');
    setPatientAge('');
    setPatientGender('');
  }

  // Items
  const updateItem = (i, field, value) =>
    setItems((prev) => prev.map((it, idx) => idx === i ? calcItem({ ...it, [field]: value }) : it));
  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (i) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  const subtotal = items.reduce((s, it) => s + num(it.amount), 0);
  const grandTotal = subtotal;
  const paid = num(paidAmount) || grandTotal;
  const balance = grandTotal - paid;

  async function handleSave(e) {
    e.preventDefault();
    if (!patientSearch.trim()) { toast('Enter patient name'); return; }
    setSaving(true);

    try {
      let resolvedPatientId = patientId;
      let resolvedMrNo = patientMrNo;

      // Auto-create patient if no match selected
      if (!resolvedPatientId) {
        // Check if phone matches an existing patient exactly
        const phoneDig = pk(patientPhone);
        let existingPatient = phoneDig
          ? patients.find((p) => pk(p.phone) === phoneDig)
          : null;

        if (!existingPatient) {
          // Try exact name match
          const nameLower = patientSearch.trim().toLowerCase();
          existingPatient = patients.find((p) => p.name.toLowerCase() === nameLower) || null;
        }

        if (existingPatient) {
          resolvedPatientId = existingPatient.id;
          resolvedMrNo = existingPatient.mr_no;
        } else {
          // Create new patient
          const { data: np, error: pe } = await supabase.from('patients').insert({
            name: patientSearch.trim(),
            phone: patientPhone || null,
            gender: patientGender || null,
          }).select('id, mr_no').single();
          if (pe) throw pe;
          resolvedPatientId = np.id;
          resolvedMrNo = np.mr_no;
        }
      }

      const payload = {
        patient_id: resolvedPatientId,
        patient_name: patientSearch.trim(),
        patient_phone: patientPhone || null,
        patient_age: patientAge || null,
        patient_gender: patientGender || null,
        items,
        subtotal,
        grand_total: grandTotal,
        payment_mode: paymentMode,
        paid_amount: num(paidAmount) || grandTotal,
        balance_due: Math.max(0, balance),
        notes: notes || null,
        billing_date: billingDate,
      };

      let saved;
      if (initial?.id) {
        const { data, error } = await supabase.from('billings').update(payload).eq('id', initial.id).select('*, patients(mr_no)').single();
        if (error) throw error;
        saved = { ...data, mr_no: data.patients?.mr_no ?? resolvedMrNo };
      } else {
        const { data, error } = await supabase.from('billings').insert(payload).select('*, patients(mr_no)').single();
        if (error) throw error;
        saved = { ...data, mr_no: data.patients?.mr_no ?? resolvedMrNo };
      }
      onSaved(saved);
    } catch (err) {
      toast('Error: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={initial ? 'Edit Billing Entry' : 'New Billing Entry'} onClose={onClose}>
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Patient search */}
        <div>
          <label className="label">FIND EXISTING PATIENT</label>
          <div style={{ position: 'relative' }}>
            <input
              className="input"
              placeholder="Search patient by name or phone..."
              value={patientSearch}
              onChange={(e) => { setPatientSearch(e.target.value); if (patientId) clearPatient(); }}
              autoComplete="off"
            />
            {patientId && (
              <button type="button" onClick={clearPatient} style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 18,
              }}>×</button>
            )}
          </div>
          {matches.length > 0 && !patientId && (
            <div className="picker-list">
              {matches.map((p) => (
                <button type="button" key={p.id} className="patient-row" onClick={() => pickPatient(p)}>
                  <span className="chip">#{p.mr_no}</span>
                  <span className="patient-row__main">
                    <span className="patient-row__name">{p.name}</span>
                    <span className="patient-row__sub mono">{p.phone || 'No phone'}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
          {patientSearch.trim() && !patientId && matches.length === 0 && (
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="muted small">No match — will create new patient on save.</span>
              <button type="button" className="btn btn-sm" onClick={() => setAddingNew(true)}>+ Fill details</button>
            </div>
          )}
        </div>

        {/* Patient details row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <div>
            <label className="label">PATIENT NAME</label>
            <input className="input" value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} required />
          </div>
          <div>
            <label className="label">PATIENT PHONE</label>
            <input className="input" value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)} placeholder="03xx-xxxxxxx" />
          </div>
          <div>
            <label className="label">PATIENT AGE</label>
            <input className="input" value={patientAge} onChange={(e) => setPatientAge(e.target.value)} placeholder="e.g. 32" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label className="label">GENDER</label>
            <select className="input" value={patientGender} onChange={(e) => setPatientGender(e.target.value)}>
              <option value="">—</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="label">DATE</label>
            <input className="input" type="date" value={billingDate} onChange={(e) => setBillingDate(e.target.value)} required />
          </div>
        </div>

        {/* Line items */}
        <div>
          <label className="label">SERVICES / ITEMS</label>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)' }}>
                {['Description', 'Rate (PKR)', 'Qty', 'Amount', ''].map((h) => (
                  <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--muted)', borderBottom: '1px solid var(--line)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i}>
                  <td style={{ padding: '4px 4px 4px 0' }}>
                    <input className="input" style={{ minWidth: 160 }} value={it.description} onChange={(e) => updateItem(i, 'description', e.target.value)} placeholder="e.g. Consultation" required />
                  </td>
                  <td style={{ padding: '4px' }}>
                    <input className="input" type="number" min="0" style={{ width: 110 }} value={it.rate} onChange={(e) => updateItem(i, 'rate', e.target.value)} placeholder="0" />
                  </td>
                  <td style={{ padding: '4px' }}>
                    <input className="input" type="number" min="1" style={{ width: 60 }} value={it.qty} onChange={(e) => updateItem(i, 'qty', e.target.value)} />
                  </td>
                  <td style={{ padding: '4px 8px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {formatMoney(it.amount)}
                  </td>
                  <td>
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 18, padding: '0 4px' }}>×</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className="btn btn-sm" style={{ marginTop: 8 }} onClick={addItem}>+ Add Line</button>
        </div>

        {/* Totals & payment */}
        <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span className="muted">Subtotal</span>
            <span style={{ fontWeight: 600 }}>{formatMoney(subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 17, fontWeight: 700 }}>
            <span>Grand Total</span>
            <span style={{ color: 'var(--accent)' }}>{formatMoney(grandTotal)}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="label">PAYMENT MODE</label>
              <select className="input" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                {PAYMENT_MODES.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">PAID AMOUNT (PKR)</label>
              <input className="input" type="number" min="0" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} placeholder={grandTotal || '0'} />
            </div>
          </div>
          {balance > 0 && (
            <div style={{ marginTop: 8, color: '#dc2626', fontWeight: 600 }}>
              Balance Due: {formatMoney(balance)}
            </div>
          )}
        </div>

        <div>
          <label className="label">NOTES</label>
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1 }}>
            {saving ? 'Saving…' : (initial ? 'Update Entry' : 'Save Billing Entry')}
          </button>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
        </div>
      </form>

      {addingNew && (
        <PatientForm
          initialName={patientSearch.trim()}
          onClose={() => setAddingNew(false)}
          onSaved={(p) => { setAddingNew(false); pickPatient(p); }}
        />
      )}
    </Modal>
  );
}

// ─── Invoice Modal ────────────────────────────────────────────────────────────
function InvoiceModal({ bill, logoSrc, onClose }) {
  const waNumber = toWhatsAppNumber(bill.patient_phone);

  function shareViaWhatsApp() {
    if (!waNumber) { toast('No phone number on this entry'); return; }
    const lines = [
      `*${CLINIC_NAME}*`,
      `${CLINIC_ADDR}`,
      `Tel: ${CLINIC_PHONE}`,
      ``,
      `*Invoice #${bill.ref_no}*`,
      `Date: ${formatDate(bill.billing_date)}`,
      `Patient: ${bill.patient_name}${bill.mr_no ? ` (MR #${bill.mr_no})` : ''}`,
      ``,
      `*Services:*`,
      ...(bill.items || []).map((it) => `• ${it.description}: ${num(it.rate).toLocaleString()} × ${it.qty} = Rs. ${num(it.amount).toLocaleString()}`),
      ``,
      `Grand Total: *Rs. ${num(bill.grand_total).toLocaleString()}*`,
      `Paid: Rs. ${num(bill.paid_amount).toLocaleString()}`,
      ...(num(bill.balance_due) > 0 ? [`Balance Due: Rs. ${num(bill.balance_due).toLocaleString()}`] : []),
      ``,
      `No Refund Policy. Timings ${CLINIC_HRS}.`,
      `For queries: ${CLINIC_PHONE}`,
    ];
    const text = encodeURIComponent(lines.join('\n'));
    window.open(`https://wa.me/${waNumber}?text=${text}`, '_blank');
  }

  function printInvoice() {
    const el = document.getElementById('invoice-root');
    if (!el) return;
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>Invoice #${bill.ref_no}</title>
    <style>body{margin:0;font-family:Arial,sans-serif;}@media print{body{margin:0}}</style></head>
    <body>${el.outerHTML}<script>window.onload=function(){window.print();window.close();}<\/script></body></html>`);
    w.document.close();
  }

  return (
    <Modal title={`Invoice #${bill.ref_no}`} onClose={onClose}>
      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={shareViaWhatsApp} disabled={!waNumber} style={{ flex: 1 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ verticalAlign: 'middle', marginRight: 6 }}>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.374 0 0 5.373 0 12c0 2.14.558 4.154 1.532 5.9L0 24l6.264-1.502A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.797 9.797 0 01-5.019-1.382l-.36-.214-3.72.892.916-3.618-.235-.372A9.794 9.794 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
          </svg>
          Send via WhatsApp
        </button>
        <button className="btn" onClick={printInvoice}>
          🖨 Print
        </button>
      </div>

      {/* Invoice preview */}
      <div style={{ border: '1px solid var(--line)', borderRadius: 8, overflow: 'auto', maxHeight: '70vh' }}>
        <InvoiceDoc bill={bill} logoSrc={logoSrc} />
      </div>
    </Modal>
  );
}

// ─── Main Billings page ───────────────────────────────────────────────────────
export default function Billings() {
  const [bills, setBills] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editBill, setEditBill] = useState(null);
  const [viewBill, setViewBill] = useState(null);
  const [logoSrc, setLogoSrc] = useState(null);
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // Preload logo as data URL for invoice
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}revive-logo.png`)
      .then((r) => r.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onload = () => setLogoSrc(reader.result);
        reader.readAsDataURL(blob);
      }).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: b }, { data: p }] = await Promise.all([
      fetchAllRows(() => supabase.from('billings').select('*, patients(mr_no)').order('created_at', { ascending: false })),
      fetchAllRows(() => supabase.from('patients').select('id, mr_no, name, phone, gender').order('mr_no')),
    ]);
    setBills((b || []).map((x) => ({ ...x, mr_no: x.patients?.mr_no })));
    setPatients(p || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Summary stats
  const stats = useMemo(() => {
    const today = todayKarachi();
    const todayBills = bills.filter((b) => b.billing_date === today);
    return {
      todayTotal: todayBills.reduce((s, b) => s + num(b.grand_total), 0),
      todayCount: todayBills.length,
      monthTotal: bills.filter((b) => b.billing_date?.slice(0, 7) === today.slice(0, 7)).reduce((s, b) => s + num(b.grand_total), 0),
    };
  }, [bills]);

  // Filtered list
  const filtered = useMemo(() => {
    let list = bills;
    if (filterDate) list = list.filter((b) => b.billing_date === filterDate);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((b) =>
        b.patient_name?.toLowerCase().includes(q) ||
        b.patient_phone?.includes(q) ||
        String(b.ref_no).includes(q) ||
        String(b.mr_no).includes(q)
      );
    }
    return list;
  }, [bills, filterDate, search]);

  function handleSaved(saved) {
    setBills((prev) => {
      const idx = prev.findIndex((b) => b.id === saved.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next; }
      return [saved, ...prev];
    });
    // Also refresh patients list in case a new one was created
    fetchAllRows(() => supabase.from('patients').select('id, mr_no, name, phone, gender').order('mr_no')).then(({ data }) => setPatients(data || []));
    setShowForm(false);
    setEditBill(null);
    toast('Billing entry saved');
    // Auto-open invoice
    setViewBill(saved);
  }

  async function deleteBill(bill) {
    if (!confirm(`Delete invoice #${bill.ref_no}? This cannot be undone.`)) return;
    const { error } = await supabase.from('billings').delete().eq('id', bill.id);
    if (error) { toast('Error: ' + error.message); return; }
    setBills((prev) => prev.filter((b) => b.id !== bill.id));
    toast('Entry deleted');
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Billings</h1>
          <p className="page-sub">Invoices &amp; payment records</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ New Entry</button>
      </div>

      {/* Stats tiles */}
      <div className="tiles" style={{ marginBottom: 24 }}>
        <div className="tile lead">
          <div className="tile-label">Today's Revenue</div>
          <div className="tile-value">{formatMoney(stats.todayTotal)}</div>
          <div className="tile-sub">{stats.todayCount} {stats.todayCount === 1 ? 'entry' : 'entries'}</div>
        </div>
        <div className="tile">
          <div className="tile-label">This Month</div>
          <div className="tile-value">{formatMoney(stats.monthTotal)}</div>
        </div>
        <div className="tile">
          <div className="tile-label">Total Entries</div>
          <div className="tile-value">{bills.length}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input className="input" style={{ flex: 1, minWidth: 200 }} placeholder="Search patient, phone, invoice #…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <input className="input" type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
        {filterDate && <button className="btn btn-sm" onClick={() => setFilterDate('')}>Clear date</button>}
      </div>

      {/* Table */}
      {loading ? (
        <p className="muted">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="muted">No billing entries found.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Ref#</th>
                <th>Date</th>
                <th>Patient</th>
                <th>Services</th>
                <th>Mode</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th style={{ textAlign: 'right' }}>Paid</th>
                <th style={{ textAlign: 'right' }}>Balance</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id}>
                  <td className="mono" style={{ color: 'var(--accent)', fontWeight: 600 }}>#{b.ref_no}</td>
                  <td className="mono">{formatDate(b.billing_date)}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{b.patient_name}</div>
                    {b.mr_no && <div className="mono small muted">MR #{b.mr_no}</div>}
                    {b.patient_phone && <div className="small muted">{b.patient_phone}</div>}
                  </td>
                  <td style={{ maxWidth: 220 }}>
                    <div className="small" style={{ lineHeight: 1.5 }}>
                      {(b.items || []).slice(0, 2).map((it, i) => (
                        <div key={i}>{it.description}</div>
                      ))}
                      {b.items?.length > 2 && <div className="muted">+{b.items.length - 2} more</div>}
                    </div>
                  </td>
                  <td className="small">{b.payment_mode}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatMoney(b.grand_total)}</td>
                  <td style={{ textAlign: 'right' }}>{formatMoney(b.paid_amount)}</td>
                  <td style={{ textAlign: 'right', color: num(b.balance_due) > 0 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
                    {num(b.balance_due) > 0 ? formatMoney(b.balance_due) : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-sm" onClick={() => setViewBill(b)}>Invoice</button>
                      <button className="btn btn-sm" onClick={() => { setEditBill(b); setShowForm(false); }}>Edit</button>
                      <button className="btn btn-sm" style={{ color: '#dc2626' }} onClick={() => deleteBill(b)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {(showForm || editBill) && (
        <BillingForm
          initial={editBill}
          patients={patients}
          onClose={() => { setShowForm(false); setEditBill(null); }}
          onSaved={handleSaved}
        />
      )}
      {viewBill && (
        <InvoiceModal
          bill={viewBill}
          logoSrc={logoSrc}
          onClose={() => setViewBill(null)}
        />
      )}
    </div>
  );
}
