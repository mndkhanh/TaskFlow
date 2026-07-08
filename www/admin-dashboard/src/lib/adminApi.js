import { supabase } from './supabaseClient'

// Single round-trip to the admin-gated RPC (see supabase/db/admin_data.sql).
// Throws on RLS/permission errors so the UI can surface them.
export async function fetchDashboard() {
  const { data, error } = await supabase.rpc('admin_dashboard')
  if (error) throw error
  return data
}
