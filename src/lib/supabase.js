import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// lê a var de ambiente (mantém original para criar o cliente)
const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// debug: mostra a url (limpa a / final) — NÃO mostres a anon key em público
const cleaned = rawUrl ? rawUrl.replace(/\/$/, '') : '';
console.log('Supabase URL (raw):', rawUrl ?? '(não encontrada)');
console.log('Supabase URL (cleaned):', cleaned);

// Cria cliente normalmente
export const SUPABASE_URL = cleaned;
export const supabase = createClient(cleaned ?? '', anon ?? '', {
  auth: {
    storage: AsyncStorage,
  },
});

// Teste de conectividade ao host do Supabase (executa apenas no arranque, verbose para debug)
(async function connectivityTest() {
  if (!cleaned) {
    console.warn('SUPABASE_URL vazio — confirma o .env');
    return;
  }

  try {
    console.log('Connectivity test → fetching Supabase root:', cleaned);
    const res = await fetch(cleaned, { method: 'GET' });
    console.log('Connectivity test status:', res.status);
    let body = '';
    try {
      body = await res.text();
      console.log('Connectivity test body (trim):', body?.slice(0, 300));
    } catch (e) {
      console.log('Could not read body:', e?.message ?? e);
    }
  } catch (err) {
    // imprime erro completo para investigarmos (Network request failed usually aqui)
    console.error('Connectivity test failed:', err);
    // dica rápida: tenta novamente com lowercase host (não altera cliente)
    try {
      const lower = cleaned.toLowerCase();
      if (lower !== cleaned) {
        console.log('Trying lowercase host for diagnosis:', lower);
        const res2 = await fetch(lower, { method: 'GET' });
        console.log('Lowercase test status:', res2.status);
      }
    } catch (err2) {
      console.error('Lowercase test failed:', err2);
    }
  }
})();