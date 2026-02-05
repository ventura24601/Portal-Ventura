
import { createClient } from 'https://esm.sh/@supabase/supabase-js@^2.45.0';

/**
 * CONFIGURAÇÃO DO SUPABASE
 * Substitua os valores abaixo pelas chaves do seu projeto que você obteve no painel.
 */
// Explicitly type as string to prevent the TypeScript compiler from narrowing to literal types, 
// which causes errors when comparing against placeholders.
const supabaseUrl: string = 'https://pukyymqhazzrpscklqzd.supabase.co';
const supabaseKey: string = 'sb_publishable_0nmasXYkYRSJ2UitmIUS-Q_gV1VJob6';

// Helper para verificar se as chaves foram preenchidas e não são os placeholders iniciais
export const isSupabaseConfigured = () => {
  return supabaseUrl.includes('supabase.co') && 
         supabaseKey !== 'SUA_ANON_KEY_DO_SUPABASE' &&
         supabaseKey.length > 20;
};

export const supabase = createClient(supabaseUrl, supabaseKey);
