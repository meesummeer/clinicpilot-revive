import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { todayKarachi } from '../../lib/format';
import { PLANS, STATUS_LABEL, addMonths, nextCardNumber } from '../../lib/circle';
import Modal from '../../components/Modal';

export default function MemberForm({ member, reload, onClose, onSaved }) {
  const isEdit = Boolean(member);
  const initialStart = member ? member.start_date || '' : todayKarachi();
  const [name, setName] = useState(member?.name || '');
  const [phone, setPhone] = useState(member?.phone || '');
  const [email, setEmail] = useState(member?.email || '');
  const [plan, setPlan] = useState(member?.plan || '6month');
  const [status, setStatus] = useState(member?.status || 'active');
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(member ? member.end_date || '' : addMonths(initialStart, 6));
  const [notes, setNotes] = useState(member?.notes || '');
  const [nextCard, setNextCard] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) reload().then((all) => setNextCard(nextCardNumber(all)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function changePlan(value) {
    setPlan(value);
    if (start) setEnd(addMonths(start, PLANS[value].months));
  }
  function changeStart(value) {
    setStart(value);
    if (value) setEnd(addMonths(value, PLANS[plan].months));
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!name.trim()) { setError('Enter the member\'s name.'); return; }
    if (!phone.trim()) { setError('Enter a phone number.'); return; }
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) { setError('That email address doesn\'t look right.'); return; }
    if (!start || !end) { setError('Enter both a start date and an end date.'); return; }
    if (end <= start) { setError('The end date must be after the start date.'); return; }
    setSaving(true);
    setError('');
    const values = { name: name.trim(), phone: phone.trim(), email: email.trim(), plan, start_date: start, end_date: end, notes: notes.trim() };
    try {
      if (isEdit) {
        const { error: err } = await supabase.from('members').update({ ...values, status }).eq('id', member.id);
        if (err) throw err;
        await reload();
        onSaved(member, false);
      } else {
        const row = { ...values, id: crypto.randomUUID(), status: 'active', created_at: new Date().toISOString() };
        // Read the latest cards before issuing one; retry if someone else just took that number.
        for (let attempt = 0; ; attempt++) {
          const card = nextCardNumber(await reload());
          const { error: err } = await supabase.from('members').insert({ ...row, card_number: card });
          if (!err) { row.card_number = card; break; }
          if (err.code !== '23505' || attempt >= 4) throw err;
        }
        await reload();
        onSaved(row, true);
      }
    } catch (err) {
      setError(`Couldn't save: ${err.message}. Nothing was changed.`);
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? 'Edit member' : 'Add member'} onClose={onClose}>
      <p className="muted small" style={{ margin: '-10px 0 16px' }}>
        Card <span className="chip">{isEdit ? member.card_number : nextCard || 'RC-…'}</span>{!isEdit && ' will be issued on save'}
      </p>
      <form onSubmit={handleSave} noValidate>
        <div className="form-grid">
          <div className="field full"><label htmlFor="mName">Name <span className="req">*</span></label><input className="input" id="mName" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" autoFocus /></div>
          <div className="field"><label htmlFor="mPhone">Phone <span className="req">*</span></label><input className="input mono" id="mPhone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="off" /></div>
          <div className="field"><label htmlFor="mEmail">Email</label><input className="input" id="mEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" /></div>
          <div className={`field ${isEdit ? '' : 'full'}`}><label htmlFor="mPlan">Plan</label>
            <select className="input" id="mPlan" value={plan} onChange={(e) => changePlan(e.target.value)}>
              <option value="6month">6-Month</option><option value="annual">Annual</option>
            </select>
          </div>
          {isEdit && (
            <div className="field"><label htmlFor="mStatus">Status</label>
              <select className="input" id="mStatus" value={status} onChange={(e) => setStatus(e.target.value)}>
                {['active', 'paused', 'expired'].map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </div>
          )}
          <div className="field"><label htmlFor="mStart">Start date <span className="req">*</span></label><input className="input" id="mStart" type="date" value={start} onChange={(e) => changeStart(e.target.value)} /></div>
          <div className="field"><label htmlFor="mEnd">End date <span className="req">*</span></label><input className="input" id="mEnd" type="date" value={end} onChange={(e) => setEnd(e.target.value)} /><span className="hint">Set automatically from the plan and start date.</span></div>
          <div className="field full"><label htmlFor="mNotes">Notes</label><textarea className="input" id="mNotes" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        {error && <p className="form-error" role="alert" style={{ marginTop: 12 }}>{error}</p>}
        <div className="dlg-foot">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add member'}</button>
        </div>
      </form>
    </Modal>
  );
}
