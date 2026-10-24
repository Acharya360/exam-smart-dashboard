import { LocalDBService } from './localDb';
import { SupabaseDBService } from './supabaseDb';
import { isSupabaseConfigured } from './supabaseClient';

export type DatabaseMode = 'local' | 'supabase';

export function getActiveDatabaseMode(): DatabaseMode {
  // 1. Check query parameter (?db=local or ?db=supabase)
  if (typeof window !== 'undefined' && window.location) {
    const params = new URLSearchParams(window.location.search);
    const dbParam = params.get('db')?.toLowerCase();
    if (dbParam === 'local') {
      try { localStorage.setItem('examtrack_db_mode', 'local'); } catch {}
      return 'local';
    }
    if (dbParam === 'supabase') {
      try { localStorage.setItem('examtrack_db_mode', 'supabase'); } catch {}
      return 'supabase';
    }

    // 2. Check localStorage override
    try {
      const stored = localStorage.getItem('examtrack_db_mode');
      if (stored === 'local') return 'local';
      if (stored === 'supabase') return 'supabase';
    } catch {}
  }

  // 3. Check VITE_DB_MODE env var
  const envMode = import.meta.env.VITE_DB_MODE?.toLowerCase();
  if (envMode === 'local') return 'local';
  if (envMode === 'supabase') return 'supabase';

  // 4. Cloud host detection: On Vercel / non-localhost, prefer Supabase if configured
  if (typeof window !== 'undefined' && window.location) {
    const isCloudHost = !['localhost', '127.0.0.1'].includes(window.location.hostname);
    if (isCloudHost && isSupabaseConfigured()) {
      return 'supabase';
    }
  }

  // 5. Default fallback
  return isSupabaseConfigured() ? 'supabase' : 'local';
}

export function setActiveDatabaseMode(mode: DatabaseMode) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('examtrack_db_mode', mode);
    } catch {}
    const url = new URL(window.location.href);
    url.searchParams.set('db', mode);
    window.location.href = url.toString();
  }
}

// Dynamic Database Provider Switcher
export function createDatabaseService() {
  const mode = getActiveDatabaseMode();
  if (mode === 'supabase') {
    return new SupabaseDBService();
  }
  return new LocalDBService();
}

export const db = createDatabaseService();
