import { useEffect, useState } from 'react';
import { supabase, fetchAllRows } from '../lib/supabaseClient';
import { APPOINTMENT_STATUS, PROCEDURE_SUGGESTIONS, hhmmKarachi, karachiToIso, todayKarachi, ymdKarachi } from '../lib/format';
import Modal from './Modal';
import PatientPicker from './PatientPicker';

// appt: an existing row to edit, or null. presetPatient / presetDate fill in a new one.
export default function AppointmentForm({ appt, presetPatient, presetDate, onClose, onSaved }) {
  const isEdit = Boolean(appt);
  const [patient, setPatient] = useState(appt?.patients ? { id: appt.patient_id, ...appt.patients } : presetPatient || null);
  const [procedure, setProcedure] = useState(appt?.procedure || '');
  const [doctor, setDoctor] = useState(appt?.doctor || '');
  const [date, setDate] = useState(appt ? ymdKarachi(appt.scheduled_at) : presetDate || todayKarachi());
  const [time, setTime] = useState(appt ? hhmmKarachi(appt.scheduled_at) : '10:00');
  const [status, setStatus] = useState(appt?.status || 'scheduled');
  const [notes, setNotes] = useState(appt?.notes || '');
  const [doctors, setDoctors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAllRows(() => supabase.from('appointments').select('doctor').not('doctor', 'is', null).order('id')).then(({ data }) => {
      setDoctors([...new Set(data.map((r) => r.doctor.trim()).filter(Boolean))].sort());
    });
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    if (!patient) { setError('Choose a patient.'); return; }
    if (!date || !time) { setError('Enter the date and time.'); return; }
    setSaving(true);
    setError('');
    const payload = {
      patient_id: patient.id,
      procedure: procedure.trim() || null,
      doctor: doctor.trim() || null,
      scheduled_at: karachiToIso(date, time),
      status,
      notes: notes.trim() || null,
    };
    const { error: err } = isEdit
      ? await supabase.from('appointments').update(payload).eq('id', appt.id)
      : await supabase.from('appointments').insert(payload);
    setSaving(false);
    if (err) { setError(`Couldn't save: ${err.message}`); return; }
    onSaved();
  }

  async function handleDelete() {
    if (!window.confirm(`Delete this appointment for ${patient?.name}? This can't be undone.`)) return;
    setSaving(true);
    const { error: err } = await supabase.from('appointments').delete().eq('id', appt.id);
    setSaving(false);
    if (err) { setError(`Couldn't delete: ${err.message}`); return; }
    onSaved();
  }

  return (
    <Modal title={isEdit ? 'Edit appointment' : 'New appointment'} onClose={onClose}>
      <form onSubmit={handleSave} noValidate>
        <div className="form-grid">
          <div className="field full">
            <label htmlFor="apptPatient">Patient <span className="req">*</span></label>
            {patient ? (
              <div className="picked">
                <span className="picked-who"><span className="chip">#{patient.mr_no}</span> <strong>{patient.name}</strong></span>
                {!presetPatient && <button type="button" className="btn btn-sm" onClick={() => setPatient(null)}>Change</button>}
              </div>
            ) : (
              <PatientPicker inputId="apptPatient" onSelect={setPatient} />
            )}
          </div>
          <div className="field">
            <label htmlFor="apptProcedure">Procedure</label>
            <input className="input" id="apptProcedure" list="apptProcedures" value={procedure} onChange={(e) => setProcedure(e.target.value)} autoComplete="off" />
            <datalist id="apptProcedures">{PROCEDURE_SUGGESTIONS.map((p) => <option key={p} value={p} />)}</datalist>
          </div>
          <div className="field">
            <label htmlFor="apptDoctor">Doctor</label>
            <input className="input" id="apptDoctor" list="apptDoctors" value={doctor} onChange={(e) => setDoctor(e.target.value)} autoComplete="off" />
            <datalist id="apptDoctors">{doctors.map((d) => <option key={d} value={d} />)}</datalist>
          </div>
          <div className="field"><label htmlFor="apptDate">Date <span className="req">*</span></label><input className="input" id="apptDate" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="field"><label htmlFor="apptTime">Time <span className="req">*</span></label><input className="input" id="apptTime" type="time" value={time} onChange={(e) => setTime(e.target.value)} style={{ colorScheme: 'dark' }} /></div>
          <div className="field full">
            <label htmlFor="apptStatus">Status</label>
            <select className="input" id="apptStatus" value={status} onChange={(e) => setStatus(e.target.value)}>
              {Object.entries(APPOINTMENT_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="field full"><label htmlFor="apptNotes">Notes</label><textarea className="input" id="apptNotes" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        {error && <p className="form-error" role="alert" style={{ marginTop: 12 }}>{error}</p>}
        <div className="dlg-foot">
          {isEdit && <button type="button" className="btn btn-danger" style={{ marginRight: 'auto' }} onClick={handleDelete} disabled={saving}>Delete</button>}
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add appointment'}</button>
        </div>
      </form>
    </Modal>
  );
}
