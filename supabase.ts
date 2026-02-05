
import { createClient } from '@supabase/supabase-js';

/**
 * CONFIGURAÇÃO DO SUPABASE
 */
const supabaseUrl: string = 'https://pukyymqhazzrpscklqzd.supabase.co';
const supabaseKey: string = 'sb_publishable_0nmasXYkYRSJ2UitmIUS-Q_gV1VJob6';

// Helper para verificar se as chaves foram preenchidas
export const isSupabaseConfigured = () => {
  return supabaseUrl.includes('supabase.co') && 
         supabaseKey !== 'SUA_ANON_KEY_DO_SUPABASE' &&
         supabaseKey.length > 20;
};

export const supabase = createClient(supabaseUrl, supabaseKey);
