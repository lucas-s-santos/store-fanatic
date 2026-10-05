import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.")
}

export const supabase = createClient(supabaseUrl || "http://localhost:54321", supabaseAnonKey || "dummy-key", {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'sf-auth',
  },
})

// O link de "esqueci a senha" abre uma sessão de recuperação. Se o Supabase
// devolver a pessoa para outra página (endereço fora das Redirect URLs do
// painel), leva para a tela de nova senha mesmo assim.
supabase.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY' && window.location.pathname !== '/redefinir-senha') {
    window.location.replace('/redefinir-senha')
  }
})
