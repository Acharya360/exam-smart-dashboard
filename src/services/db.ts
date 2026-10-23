import { LocalDBService } from './localDb';
import { SupabaseDBService } from './supabaseDb';
import { isSupabaseConfigured } from './supabaseClient';

// Dynamic Database Provider Switcher:
// Automatically uses Supabase cloud database when VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY are present (e.g. on Vercel),
// or falls back to the local SQL Server Express bridge for local desktop development.
export function createDatabaseService() {
  if (isSupabaseConfigured()) {
    return new SupabaseDBService();
  }
  return new LocalDBService();
}

export const db = createDatabaseService();
