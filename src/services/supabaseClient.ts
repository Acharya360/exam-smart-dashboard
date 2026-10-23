import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const isSupabaseConfigured = (): boolean => {
  return (
    !!supabaseUrl &&
    supabaseUrl !== 'https://placeholder.supabase.co' &&
    supabaseUrl !== 'https://your-project-id.supabase.co' &&
    !supabaseUrl.includes('placeholder') &&
    !!supabaseAnonKey &&
    supabaseAnonKey !== 'placeholder-key' &&
    supabaseAnonKey !== 'your-anon-key'
  );
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
