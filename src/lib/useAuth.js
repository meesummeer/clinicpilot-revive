import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

// Emails with restricted access (view/add only — no edit/delete, no Hub)
const RESTRICTED_EMAILS = ['bushra@revive.com'];

export function useAuth() {
  const [session, setSession] = useState(undefined); // undefined until Supabase reports it

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const email = session?.user?.email?.toLowerCase() || '';
  const isRestricted = RESTRICTED_EMAILS.includes(email);

  return { session, loading: session === undefined, isRestricted };
}
