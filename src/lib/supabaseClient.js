import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

// Supabase returns at most 1000 rows per request, so a plain .select() silently
// loses rows past that. Always read lists through this. buildQuery must return a
// FRESH query each call, ending in an .order() on a unique column.
const PAGE_SIZE = 1000;

export async function fetchAllRows(buildQuery) {
  let rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await buildQuery().range(from, from + PAGE_SIZE - 1);
    if (error) return { data: rows, error };
    rows = rows.concat(data || []);
    if (!data || data.length < PAGE_SIZE) return { data: rows, error: null };
  }
}
