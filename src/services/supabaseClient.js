import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'SUA_URL_SUPABASE');
};

export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    })
  : null;

/**
 * Busca todas as operações gravadas na nuvem para o usuário logado
 */
export const fetchUserTrades = async (userId) => {
  if (!isSupabaseConfigured() || !supabase || !userId) return [];

  try {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .order('trade_date', { ascending: false });

    if (error) {
      console.warn('Erro ao buscar trades do Supabase:', error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.warn('Falha de conexão com Supabase:', err);
    return [];
  }
};

/**
 * Sincroniza em lote (Batch Upsert) um array de trades com o Supabase
 */
export const saveTradesBatch = async (userId, tradesList) => {
  if (!isSupabaseConfigured() || !supabase || !userId || !tradesList || tradesList.length === 0) {
    return { success: false, count: 0 };
  }

  try {
    const payload = tradesList.map(t => {
      const dateStr = t['abertura'] || t['data'] || t['Abertura'] || t['Data'] || t['date'] || new Date().toISOString();
      const rawPnl = typeof t.pnl === 'number' ? t.pnl : parseFloat(String(t['resultado líquido'] || t['resultado'] || t['Resultado (R$)'] || '0').replace(/[^\d,-]/g, '').replace(',', '.')) || 0;
      const assetStr = (t['ativo'] || t['Ativo'] || t.asset || 'WIN').toUpperCase();
      const sideStr = (t['lado'] || t['Lado'] || t['operação'] || 'COMPRA').toUpperCase().includes('V') ? 'VENDA' : 'COMPRA';
      const hashStr = `${dateStr}-${assetStr}-${sideStr}-${rawPnl}`.toLowerCase().replace(/\s/g, '');

      return {
        user_id: userId,
        asset: assetStr,
        trade_date: isNaN(new Date(dateStr).getTime()) ? new Date().toISOString() : new Date(dateStr).toISOString(),
        side: sideStr,
        quantity: parseInt(String(t['quantidade'] || t['qtd'] || '1').replace(/[^\d]/g, ''), 10) || 1,
        gross_pnl: rawPnl,
        net_pnl: rawPnl,
        source_hash: hashStr
      };
    });

    const { data, error } = await supabase
      .from('trades')
      .upsert(payload, { onConflict: 'user_id, source_hash', ignoreDuplicates: true })
      .select();

    if (error) {
      console.warn('Erro ao salvar batch de trades no Supabase:', error.message);
      return { success: false, count: 0 };
    }

    return { success: true, count: data ? data.length : 0 };
  } catch (err) {
    console.warn('Falha na sincronização assíncrona com o Supabase:', err);
    return { success: false, count: 0 };
  }
};
