// ============================================================
// js/supabase.js — Config Supabase
// IMPORTANT: Folosește DOAR anon key. NICIODATĂ service_role key pe frontend.
// ============================================================

// ⚠️  ÎNLOCUIEȘTE cu datele tale din Supabase → Settings → API
const SUPABASE_URL = 'https://utljkuefjdvdpmmzxnoi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_dJNniaqWOEVQLDLFms6bDQ_zoaRJqvb';

// Importă din CDN
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// ─────────────────────────────────────────────
// HELPERS AUTH
// ─────────────────────────────────────────────

/** Returnează sesiunea curentă sau null */
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/** Returnează profilul utilizatorului curent sau null */
export async function getCurrentProfile() {
  const session = await getSession();
  if (!session) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (error) { console.error('Profile error:', error); return null; }
  return data;
}

/** Verifică dacă utilizatorul e premium sau admin */
export async function isPremium() {
  const profile = await getCurrentProfile();
  return profile && ['premium', 'admin'].includes(profile.role);
}

/** Verifică dacă utilizatorul e admin */
export async function isAdmin() {
  const profile = await getCurrentProfile();
  return profile && profile.role === 'admin';
}

/**
 * Protejează o pagină — dacă nu e logat, redirecționează la login
 * Dacă requirePremium=true și nu e premium, redirecționează la checkout
 */
export async function requireAuth(requirePremium = false, requireAdmin = false) {
  const session = await getSession();
  if (!session) {
    window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
    return null;
  }

  const profile = await getCurrentProfile();

  if (requireAdmin && profile?.role !== 'admin') {
    window.location.href = '/dashboard.html';
    return null;
  }

  if (requirePremium && !['premium', 'admin'].includes(profile?.role)) {
    window.location.href = '/checkout.html?reason=locked';
    return null;
  }

  return profile;
}
