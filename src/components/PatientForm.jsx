import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Modal from './Modal';

export default function PatientForm({ patient, initialName = '', onClose, onSaved }) {
  const isEdit = Boolean(patient);
  const [name, setName] = useState(patient?.name || initialName);
  const [phone, setPhone] = useState(patient?.phone || '');
  const [address, setAddress] = useState(patient?.address || '');
  const [gender, setGender] = useState(patient?.gender || '');
  const [notes, setNotes] = useState(patient?.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave(e) {
    e.preventDefault();
    e.stopPropagation(); // this form can open inside the appointment form
    if (!name.trim()) { setError('Enter the patient\'s name.'); return; }
    setSaving(true);
    setError('');
    const payload = {
      name: name.trim(),
      phone: phone.trim() || null,
      address: address.trim() || null,
      gender: gender || null,
      notes: notes.trim() || null,
    };
    const query = isEdit ? supabase.from('patients').update(payload).eq('id', patient.id) : supabase.from('patients').insert(payload);
    const { data, error: err } = await query.select().single();
    setSaving(false);
    if (err) { setError(`Couldn't save: ${err.message}`); return; }
    onSaved(data);
  }

  return (
    <Modal title={isEdit ? 'Edit patient' : 'New patient'} onClose={onClose}>
      <form onSubmit={handleSave} noValidate>
        <div className="form-grid">
          <div className="field full"><label htmlFor="pName">Full name <span className="req">*</span></label><input className="input" id="pName" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" autoFocus /></div>
          <div className="field"><label htmlFor="pPhone">Phone</label><input className="input mono" id="pPhone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="off" /></div>
          <div className="field"><label htmlFor="pGender">Gender</label>
            <select className="input" id="pGender" value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="">—</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option>
            </select>
          </div>
          <div className="field full"><label htmlFor="pAddress">Address</label><input className="input" id="pAddress" value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="off" /></div>
          <div className="field full"><label htmlFor="pNotes">Notes</label><textarea className="input" id="pNotes" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        {error && <p className="form-error" role="alert" style={{ marginTop: 12 }}>{error}</p>}
        <div className="dlg-foot">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add patient'}</button>
        </div>
      </form>
    </Modal>
  );
}
