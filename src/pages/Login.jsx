import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { document.title = 'Sign in — ClinicPilot'; }, []);

  async function handleLogin(e) {
    e.preventDefault();
    if (!email.trim() || !password) { setError('Enter your email and password.'); return; }
    setError('');
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (err) {
      setPassword('');
      setError(err.code === 'invalid_credentials' ? 'Incorrect email or password.' : `Couldn't sign in: ${err.message}`);
    }
  }

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={handleLogin} noValidate>
        <div className="auth-brand">
          <img className="brand-logo" src={`${import.meta.env.BASE_URL}revive-logo.png`} alt="Revive House of Dermatology & Health Care" />
          <span><span className="brand-name">ClinicPilot</span><span className="brand-sub">Revive</span></span>
        </div>
        <h1 className="dlg-title" style={{ margin: 0 }}>Sign in</h1>
        <div className="field"><label htmlFor="loginEmail">Email</label><input className="input" id="loginEmail" type="email" autoComplete="username" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="field"><label htmlFor="loginPassword">Password</label><input className="input" id="loginPassword" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
        <p className="hint">Need access or forgot your password? Ask your clinic admin.</p>
      </form>
    </div>
  );
}
