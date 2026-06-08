// ============================================================
// js/auth.js — Logica completă autentificare
// ============================================================
import { supabase, getSession } from './supabase.js';

// ─────────────────────────────────────────────
// ÎNREGISTRARE
// ─────────────────────────────────────────────
export async function registerUser(email, password, fullName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: window.location.origin + '/login.html?verified=true'
    }
  });

  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────
export async function loginUser(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────
export async function logoutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  window.location.href = '/index.html';
}

// ─────────────────────────────────────────────
// RESETARE PAROLĂ
// ─────────────────────────────────────────────
export async function forgotPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/reset-password.html'
  });
  if (error) throw error;
}

// ─────────────────────────────────────────────
// HELPER: mesaje de eroare în română
// ─────────────────────────────────────────────
export function translateError(msg) {
  const map = {
    'Invalid login credentials': 'Email sau parolă incorectă.',
    'Email not confirmed': 'Confirmă email-ul mai întâi.',
    'User already registered': 'Există deja un cont cu acest email.',
    'Password should be at least 6 characters': 'Parola trebuie să aibă minim 6 caractere.',
    'Unable to validate email address: invalid format': 'Format email invalid.',
    'Email rate limit exceeded': 'Prea multe încercări. Încearcă mai târziu.',
    'For security purposes, you can only request this once every 60 seconds': 'Poți cere resetarea o dată pe minut.'
  };
  return map[msg] || msg || 'A apărut o eroare. Încearcă din nou.';
}

// ─────────────────────────────────────────────
// INIT pagini auth (apelat din fiecare pagină)
// ─────────────────────────────────────────────
export async function initAuthPage() {
  // Dacă e deja logat, du-l la dashboard
  const session = await getSession();
  if (session) {
    const redirect = new URLSearchParams(window.location.search).get('redirect');
    window.location.href = redirect || '/dashboard.html';
  }
}
