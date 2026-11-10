import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { APPOINTMENT_STATUS, formatDate, formatTime, phoneKey, plural, toWhatsAppNumber } from '../lib/format';
import { STATUS_LABEL, displayStatus, planOf } from '../lib/circle';
import { toast } from '../components/Toast';
import PatientForm from '../components/PatientForm';
import AppointmentForm from '../components/AppointmentForm';

export default function PatientProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [circleMember, setCircleMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [apptModal, setApptModal] = useState(null); // null closed, 'new', or a row

  const load = useCallback(async () => {
    const [{ data: p }, { data: appts }, { data: members }] = await Promise.all([
      supabase.from('patients').select('*').eq('id', id).maybeSingle(),
      supabase.from('appointments').select('*').eq('patient_id', id).order('scheduled_at', { ascending: false }),
      supabase.from('members').select('id, name, phone, plan, card_number, status, end_date'),
    ]);
    setPatient(p);
    setAppointments(appts || []);
    // Circle memberships aren't linked to patients in the database; the phone number ties them.
    const key = phoneKey(p?.phone);
    setCircleMember((key && (members || []).find((m) => phoneKey(m.phone) === key)) || null);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (patient) document.title = `${patient.name} — ClinicPilot`; }, [patient]);

  async function handleDelete() {
    const n = appointments.length;
    if (!window.confirm(`Delete ${patient.name} and ${plural(n, 'appointment')}? This can't be undone.`)) return;
    const { error } = await supabase.from('patients').delete().eq('id', patient.id);
    if (error) { toast(`Couldn't delete: ${error.message}`, true); return; }
    toast(`${patient.name} deleted.`);
    navigate('/patients');
  }

  if (loading) return <div className="empty">Loading…</div>;
  if (!patient) return <><Link className="back" to="/patients">← Patients</Link><div className="panel empty">This patient doesn't exist or has been deleted.</div></>;

  const wa = toWhatsAppNumber(patient.phone);
  const asPicked = { id: patient.id, name: patient.name, mr_no: patient.mr_no };

  return (
    <>
      <Link className="back" to="/patients">← Patients</Link>
      <section className="member-card">
        <div className="mc-top">
          <div>
            <h1 className="mc-name">{patient.name}</h1>
            <div className="mc-tags"><span className="chip">MR #{patient.mr_no}</span></div>
          </div>
          <div className="mc-actions">
            <button type="button" className="btn btn-primary" onClick={() => setApptModal('new')}>+ Appointment</button>
            <button type="button" className="btn" onClick={() => setEditing(true)}>Edit</button>
            <button type="button" className="btn btn-danger" onClick={handleDelete}>Delete</button>
          </div>
        </div>
        <div className="mc-facts">
          <div><div className="fact-label">Phone</div><div className="fact-value mono">{patient.phone ? <a href={`tel:${patient.phone}`}>{patient.phone}</a> : '—'}</div></div>
          {wa && <div><div className="fact-label">WhatsApp</div><div className="fact-value"><a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">Message</a></div></div>}
          <div><div className="fact-label">Gender</div><div className="fact-value" style={{ textTransform: 'capitalize' }}>{patient.gender || '—'}</div></div>
          <div><div className="fact-label">Address</div><div className="fact-value">{patient.address || '—'}</div></div>
          <div><div className="fact-label">Patient since</div><div className="fact-value mono">{formatDate(patient.created_at)}</div></div>
        </div>
        {patient.notes && <div className="term"><div className="fact-label">Notes</div><div className="pre-wrap">{patient.notes}</div></div>}
      </section>

      {circleMember && (
        <section className="panel" style={{ marginBottom: 18 }}>
          <h2 className="panel-title">Prestige membership</h2>
          <Link className="list-row" to={`/prestige/members/${circleMember.id}`}>
            <span className="list-main"><span className="chip">{circleMember.card_number}</span> <span className="list-name">{planOf(circleMember).label} plan</span><br /><span className="muted small">Matched by phone number · Ends {formatDate(circleMember.end_date)}</span></span>
            <span className={`badge ${displayStatus(circleMember)}`}>{STATUS_LABEL[displayStatus(circleMember)]}</span>
          </Link>
        </section>
      )}

      <section className="panel">
        <h2 className="panel-title">Appointments <span className="muted small" style={{ fontWeight: 500 }}>({appointments.length})</span></h2>
        {appointments.length === 0 ? <p className="muted">No appointments yet.</p> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Time</th><th>Procedure</th><th>Doctor</th><th>Status</th></tr></thead>
              <tbody>
                {appointments.map((a) => (
                  <tr key={a.id} className="row-link" onClick={() => setApptModal(a)}>
                    <td className="mono small nowrap">{formatDate(a.scheduled_at)}</td>
                    <td className="mono small nowrap">{formatTime(a.scheduled_at)}</td>
                    <td>{a.procedure || '—'}</td>
                    <td>{a.doctor || '—'}</td>
                    <td><span className={`badge ${a.status}`}>{APPOINTMENT_STATUS[a.status]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editing && <PatientForm patient={patient} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); toast('Patient updated.'); load(); }} />}
      {apptModal && (
        <AppointmentForm
          appt={apptModal === 'new' ? null : { ...apptModal, patients: asPicked }}
          presetPatient={asPicked}
          onClose={() => setApptModal(null)}
          onSaved={() => { setApptModal(null); load(); }}
        />
      )}
    </>
  );
}
