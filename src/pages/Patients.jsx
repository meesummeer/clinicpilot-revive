import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, fetchAllRows } from '../lib/supabaseClient';
import { plural } from '../lib/format';
import PatientForm from '../components/PatientForm';

export default function Patients() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [newestFirst, setNewestFirst] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    document.title = 'Patients — ClinicPilot';
    fetchAllRows(() => supabase.from('patients').select('*').order('mr_no')).then(({ data, error: err }) => {
      if (err) setError(err.message);
      setPatients(data);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, '');
    const list = patients.filter((p) => !q
      || p.name.toLowerCase().includes(q)
      || (qDigits && (p.phone || '').replace(/\D/g, '').includes(qDigits))
      || String(p.mr_no) === q.replace('#', ''));
    return list.sort(newestFirst ? (a, b) => b.mr_no - a.mr_no : (a, b) => a.name.localeCompare(b.name));
  }, [patients, search, newestFirst]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Patients</h1>
          <p className="page-sub">{loading ? 'Loading…' : filtered.length === patients.length ? plural(patients.length, 'patient') : `${filtered.length} of ${patients.length} patients`}</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>+ New patient</button>
      </div>
      <div className="toolbar">
        <input className="input search" type="search" aria-label="Search patients" placeholder="Search by name, phone or MR number" value={search} onChange={(e) => setSearch(e.target.value)} />
        <label className="small muted" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <input type="checkbox" checked={newestFirst} onChange={(e) => setNewestFirst(e.target.checked)} /> Newest first
        </label>
      </div>
      {error && <p className="form-error" role="alert">Couldn't load patients: {error}</p>}
      <div className="patient-list">
        {!loading && !error && filtered.length === 0 && (
          <div className="panel empty">{patients.length ? 'No patients match this search.' : 'No patients yet. Add the first one to issue MR #1.'}</div>
        )}
        {filtered.map((p) => (
          <Link key={p.id} className="patient-row" to={`/patients/${p.id}`}>
            <span className="chip">#{p.mr_no}</span>
            <span className="patient-row__main">
              <span className="patient-row__name">{p.name}</span>
              <span className="patient-row__sub mono">{p.phone || 'No phone'}</span>
            </span>
            <span className="patient-row__chevron" aria-hidden="true">›</span>
          </Link>
        ))}
      </div>
      {adding && <PatientForm onClose={() => setAdding(false)} onSaved={(p) => navigate(`/patients/${p.id}`)} />}
    </>
  );
}
