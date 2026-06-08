// ============================================================
// js/auth.js — Logica completă autentificare Supabase
// ============================================================
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// SCHIMBĂ AICI CU DATELE TALE DIN SUPABASE
const SUPABASE_URL = 'https://utljkuefjdvdpmmzxnoi.supabase.co' // pune URL-ul tău
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS...' // pune cheia ta anon public

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Așteaptă să se încarce pagina
document.addEventListener('DOMContentLoaded', () => {

    // 1. TAB SWITCHING
    const tabBtns = document.querySelectorAll('.tab-btn')
    const forms = document.querySelectorAll('.auth-form')

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'))
            forms.forEach(f => f.classList.remove('active'))
            btn.classList.add('active')
            document.getElementById(btn.dataset.tab + 'Form').classList.add('active')
            hideMessage()
        })
    })

    // 2. LOGIN
    const loginForm = document.getElementById('loginForm')
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault()
            const email = document.getElementById('login-email').value.trim()
            const password = document.getElementById('login-password').value

            showMessage('Se conectează...', 'success')
            const { data, error } = await supabase.auth.signInWithPassword({ email, password })

            if (error) {
                showMessage(translateError(error.message), 'error')
            } else {
                window.location.href = 'EstetiqAntrenamentB.html'
            }
        })
    }

    // 3. REGISTER
    const registerForm = document.getElementById('registerForm')
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault()
            const email = document.getElementById('register-email').value.trim()
            const password = document.getElementById('register-password').value
            const confirm = document.getElementById('register-password-confirm').value

            if (password!== confirm) {
                showMessage('Parolele nu coincid', 'error')
                return
            }

            showMessage('Se creează contul...', 'success')
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: window.location.origin
                }
            })

            if (error) {
                showMessage(translateError(error.message), 'error')
            } else {
                showMessage('Cont creat! Acum te poți loga.', 'success')
                setTimeout(() => {
                    document.querySelector('[data-tab="login"]').click()
                }, 2000)
            }
        })
    }

    // 4. FORGOT PASSWORD
    const forgotBtn = document.getElementById('forgotBtn')
    const forgotForm = document.getElementById('forgotForm')
    const backToLogin = document.getElementById('backToLogin')

    if (forgotBtn) {
        forgotBtn.addEventListener('click', () => {
            forms.forEach(f => f.classList.remove('active'))
            forgotForm.classList.add('active')
            hideMessage()
        })
    }

    if (backToLogin) {
        backToLogin.addEventListener('click', () => {
            forms.forEach(f => f.classList.remove('active'))
            loginForm.classList.add('active')
            hideMessage()
        })
    }

    if (forgotForm) {
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault()
            const email = document.getElementById('forgot-email').value.trim()

            showMessage('Se trimite...', 'success')
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/login.html'
            })

            if (error) {
                showMessage(translateError(error.message), 'error')
            } else {
                showMessage('Link de resetare trimis pe email!', 'success')
            }
        })
    }

    // 5. VERIFICĂ DACĂ E DEJA LOGAT
    checkSession()
})

// ─────────────────────────────────────────────
// FUNCȚII HELPER
// ─────────────────────────────────────────────
async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession()
    if (session && window.location.pathname.includes('login.html')) {
        window.location.href = 'EstetiqAntrenamentB.html'
    }
}

function showMessage(text, type) {
    const msg = document.getElementById('message')
    if (msg) {
        msg.style.display = 'block'
        msg.className = 'message ' + type
        msg.innerText = text
    }
}

function hideMessage() {
    const msg = document.getElementById('message')
    if (msg) msg.style.display = 'none'
}

function translateError(msg) {
    const errors = {
        'Invalid login credentials': 'Email sau parolă incorectă',
        'Email not confirmed': 'Confirmă email-ul mai întâi',
        'User already registered': 'Există deja un cont cu acest email',
        'Password should be at least 6 characters': 'Parola trebuie să aibă minim 6 caractere',
        'Unable to validate email address: invalid format': 'Format email invalid',
        'Signup requires a valid password': 'Parolă invalidă'
    }
    return errors[msg] || msg
}

// Export pentru alte fișiere
export async function logoutUser() {
    await supabase.auth.signOut()
    window.location.href = 'login.html'
}

export async function getSession() {
    const { data: { session } } = await supabase.auth.getSession()
    return session
}