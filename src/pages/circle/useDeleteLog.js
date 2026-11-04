import { supabase } from '../../lib/supabaseClient';
import { formatDate } from '../../lib/format';
import { toast } from '../../components/Toast';

export function useDeleteLog(reload) {
  return async (entry) => {
    if (!window.confirm(`Delete ${entry.service} on ${formatDate(entry.date)}? The session goes back to the member's allowance.`)) return;
    const { error } = await supabase.from('service_log').delete().eq('id', entry.id);
    if (error) { toast(`Couldn't delete: ${error.message}`, true); return; }
    toast('Entry deleted.');
    await reload();
  };
}
