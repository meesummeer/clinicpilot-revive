import { useEffect } from 'react';
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './lib/useAuth';
import { supabase } from './lib/supabaseClient';
import { ToastHost } from './components/Toast';
import Login from './pages/Login';
import Hub from './pages/Hub';
import Patients from './pages/Patients';
import PatientProfile from './pages/PatientProfile';
import Appointments from './pages/Appointments';
import Expenses from './pages/Expenses';
import CircleLayout from './pages/circle/CircleLayout';
import CircleOverview from './pages/circle/CircleOverview';
import CircleMembers from './pages/circle/CircleMembers';
import CircleMemberProfile from './pages/circle/CircleMemberProfile';
import CircleServiceLog from './pages/circle/CircleServiceLog';
import CircleAnalytics from './pages/circle/CircleAnalytics';

const NAV = [
  { to: '/hub', label: 'Hub', icon: <path d="M5 20v-7M12 20V4M19 20v-11" /> },
  { to: '/patients', label: 'Patients', icon: <><circle cx="9" cy="8" r="4" /><path d="M2 21c0-4 3-7 7-7s7 3 7 7" /><path d="M16 4.5a4 4 0 010 7M18 14.5c2.4.8 4 3 4 6.5" /></> },
  { to: '/appointments', label: 'Appointments', icon: <><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /></> },
  { to: '/expenses', label: 'Expenses', icon: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></> },
  { to: '/circle', label: 'Circle', icon: <circle cx="12" cy="12" r="8" /> },
];

async function signOut() {
  try { localStorage.removeItem('cp_logged_by'); } catch { /* optional convenience */ }
  await supabase.auth.signOut({ scope: 'local' });
}

export default function App() {
  const { session, loading } = useAuth();
  const { pathname } = useLocation();

  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  if (loading) return null;
  if (!session) return <Login />;

  return (
    <div className="shell">
      <aside className="sidebar">
        <NavLink className="brand" to="/hub">
          <span className="brand-ring" aria-hidden="true" />
          <span><span className="brand-name">ClinicPilot</span><span className="brand-sub">Revive House</span></span>
        </NavLink>
        <nav className="nav" aria-label="Main">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{n.icon}</svg>
              {n.label}
            </NavLink>
          ))}
          <button type="button" className="nav-sep" onClick={signOut}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 4H5v16h5" /><path d="M14 8l4 4-4 4M18 12H9" /></svg>
            Sign out
          </button>
        </nav>
        <div className="sidebar-foot">
          <span style={{ overflowWrap: 'anywhere' }}>{session.user.email}</span>
          <span>Revive House of Dermatology &amp; Healthcare, Karachi</span>
          <span>Powered by CyberHealth Solutions</span>
        </div>
      </aside>
      <main className="main">
        <Routes>
          <Route path="/" element={<Navigate to="/hub" replace />} />
          <Route path="/hub" element={<Hub />} />
          <Route path="/patients" element={<Patients />} />
          <Route path="/patients/:id" element={<PatientProfile />} />
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/circle" element={<CircleLayout session={session} />}>
            <Route index element={<CircleOverview />} />
            <Route path="members" element={<CircleMembers />} />
            <Route path="members/:id" element={<CircleMemberProfile />} />
            <Route path="log" element={<CircleServiceLog />} />
            <Route path="analytics" element={<CircleAnalytics />} />
          </Route>
          <Route path="*" element={<Navigate to="/hub" replace />} />
        </Routes>
      </main>
      <ToastHost />
    </div>
  );
}
