import { useEffect, useMemo, useState } from 'react';
import { supabase, fetchAllRows } from '../lib/supabaseClient';
import PatientForm from './PatientForm';

// Search by name, phone or MR number, with "+ New patient" when nothing matches.
export default function PatientPicker({ inputId, onSelect }) {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchAllRows(() => supabase.from('patients').select('id, mr_no, name, phone').order('mr_no')).then(({ data }) => setPatients(data));
  }, []);

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return patients
      .filter((p) => p.name.toLowerCase().includes(q) || (p.phone || '').toLowerCase().includes(q) || String(p.mr_no) === q.replace('#', ''))
      .slice(0, 12);
  }, [patients, search]);

  return (
    <div>
      <input className="input" id={inputId} placeholder="Search by name, phone or MR number" autoComplete="off" value={search} onChange={(e) => setSearch(e.target.value)} />
      {matches.length > 0 && (
        <div className="picker-list">
          {matches.map((p) => (
            <button type="button" key={p.id} className="patient-row" onClick={() => onSelect(p)}>
              <span className="chip">#{p.mr_no}</span>
              <span className="patient-row__main">
                <span className="patient-row__name">{p.name}</span>
                <span className="patient-row__sub mono">{p.phone || 'No phone'}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      {search.trim() && matches.length === 0 && (
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="muted small">No matching patient.</span>
          <button type="button" className="btn btn-sm" onClick={() => setAdding(true)}>+ New patient</button>
        </div>
      )}
      {adding && (
        <PatientForm
          initialName={search.trim()}
          onClose={() => setAdding(false)}
          onSaved={(p) => { setAdding(false); onSelect(p); }}
        />
      )}
    </div>
  );
}
