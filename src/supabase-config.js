/**
 * Supabase Client – Configuração global
 * As credenciais abaixo são públicas (anon key) e seguras para uso no navegador.
 * Para produção, restrinja domínios permitidos no painel do Supabase.
 */
const SUPABASE_URL  = 'https://awatkzgqxsoawilpwefj.supabase.co';
const SUPABASE_ANON = 'sb_publishable_odwWc5Hbfmo5tJZChagpKg_247uWOlL';

const _supa = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

window.SGO_SUPABASE = _supa;
