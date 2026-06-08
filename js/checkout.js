// ============================================================
// js/checkout.js — Stripe Checkout + Coduri reducere
// ============================================================
import { getCurrentProfile, getSession } from './supabase.js';

// ⚠️  ÎNLOCUIEȘTE cu datele tale din Stripe Dashboard
const STRIPE_PUBLIC_KEY = 'pk_live_YOUR_STRIPE_PUBLIC_KEY';

// Price IDs din Stripe Dashboard → Products
const PRICES = {
  monthly:  'price_YOUR_MONTHLY_PRICE_ID',   // ex: 99 RON/lună
  lifetime: 'price_YOUR_LIFETIME_PRICE_ID'   // ex: 299 RON o dată
};

// Prețuri afișate (în RON)
const DISPLAY_PRICES = {
  monthly:  { original: 159, sale: 99,  label: 'Lunar' },
  lifetime: { original: 499, sale: 299, label: 'Lifetime' }
};

// ─────────────────────────────────────────────
// CODURI DE REDUCERE — 15% discount
// NU le posta public. Adaugă câte vrei.
// ─────────────────────────────────────────────
const DISCOUNT_CODES = {
  'dragos24': 0.15,
  'andrei1':  0.15,
  'cristi1':  0.15,
  'estetiq':  0.15,
  'fit2026':  0.10,
  'summer26': 0.20
};

let appliedDiscount = 0;
let selectedPlan = 'lifetime'; // default

// ─────────────────────────────────────────────
// INIȚIALIZARE PAGINĂ CHECKOUT
// ─────────────────────────────────────────────
export async function initCheckout() {
  const session = await getSession();
  const urlParams = new URLSearchParams(window.location.search);

  // Verifică dacă a venit cu ?success=true (după plată)
  if (urlParams.get('success') === 'true') {
    showSuccess();
    return;
  }

  // Dacă e deja premium
  if (session) {
    const profile = await getCurrentProfile();
    if (profile?.role === 'premium') {
      document.getElementById('already-premium')?.classList.remove('hidden');
    }
  }

  // Afișează prețurile
  renderPrices();
  initPlanSelector();
  initDiscountCode();
  initCheckoutButton();
}

// ─────────────────────────────────────────────
// RANDEAZĂ PREȚURI
// ─────────────────────────────────────────────
function renderPrices() {
  Object.entries(DISPLAY_PRICES).forEach(([plan, prices]) => {
    const originalEl = document.getElementById(`price-original-${plan}`);
    const saleEl = document.getElementById(`price-sale-${plan}`);
    if (originalEl) originalEl.textContent = prices.original + ' RON';
    if (saleEl) saleEl.textContent = prices.sale + ' RON';
  });
}

// ─────────────────────────────────────────────
// SELECTOR PLAN
// ─────────────────────────────────────────────
function initPlanSelector() {
  document.querySelectorAll('[data-plan]').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedPlan = btn.dataset.plan;
      document.querySelectorAll('[data-plan]').forEach(b => b.classList.remove('plan-selected'));
      btn.classList.add('plan-selected');
      updateFinalPrice();
    });
  });
}

// ─────────────────────────────────────────────
// COD DE REDUCERE
// ─────────────────────────────────────────────
function initDiscountCode() {
  const applyBtn = document.getElementById('apply-discount');
  const codeInput = document.getElementById('discount-code');
  const feedback = document.getElementById('discount-feedback');

  if (!applyBtn || !codeInput) return;

  applyBtn.addEventListener('click', () => {
    const code = codeInput.value.trim().toLowerCase();
    const discount = DISCOUNT_CODES[code];

    if (discount) {
      appliedDiscount = discount;
      feedback.textContent = `✅ Cod aplicat! −${Math.round(discount * 100)}% reducere`;
      feedback.className = 'discount-ok';
      codeInput.classList.add('input-valid');
      updateFinalPrice();
    } else if (code === '') {
      feedback.textContent = 'Introdu un cod de reducere.';
      feedback.className = 'discount-err';
    } else {
      appliedDiscount = 0;
      feedback.textContent = '❌ Cod invalid. Încearcă altul.';
      feedback.className = 'discount-err';
      updateFinalPrice();
    }
  });

  // Enter pe input
  codeInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') applyBtn.click();
  });
}

// ─────────────────────────────────────────────
// ACTUALIZEAZĂ PREȚUL FINAL CU DISCOUNT
// ─────────────────────────────────────────────
function updateFinalPrice() {
  const prices = DISPLAY_PRICES[selectedPlan];
  const finalPrice = Math.round(prices.sale * (1 - appliedDiscount));
  const el = document.getElementById('final-price');
  const discountEl = document.getElementById('discount-line');

  if (el) el.textContent = finalPrice + ' RON';

  if (discountEl) {
    if (appliedDiscount > 0) {
      const saved = prices.sale - finalPrice;
      discountEl.innerHTML = `<span class="discount-saved">Economisești ${saved} RON cu codul tău 🎉</span>`;
      discountEl.classList.remove('hidden');
    } else {
      discountEl.classList.add('hidden');
    }
  }
}

// ─────────────────────────────────────────────
// BUTON CHECKOUT → STRIPE
// ─────────────────────────────────────────────
function initCheckoutButton() {
  const btn = document.getElementById('checkout-btn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Se procesează...';

    try {
      const session = await getSession();
      if (!session) {
        window.location.href = '/login.html?redirect=/checkout.html';
        return;
      }

      // Stripe Checkout via Supabase Edge Function sau direct
      // Opțiunea simplă: redirect la Stripe Payment Link
      const stripeLinks = {
        monthly:  'https://buy.stripe.com/YOUR_MONTHLY_LINK',
        lifetime: 'https://buy.stripe.com/YOUR_LIFETIME_LINK'
      };

      // Adaugă email utilizator pentru pre-completare
      const email = session.user.email;
      const baseUrl = stripeLinks[selectedPlan];
      const checkoutUrl = `${baseUrl}?prefilled_email=${encodeURIComponent(email)}&client_reference_id=${session.user.id}`;

      window.location.href = checkoutUrl;

    } catch (err) {
      console.error('Checkout error:', err);
      btn.disabled = false;
      btn.textContent = 'Încearcă din nou';
    }
  });
}

// ─────────────────────────────────────────────
// SUCCESS PAGE
// ─────────────────────────────────────────────
function showSuccess() {
  const main = document.getElementById('checkout-main');
  const success = document.getElementById('checkout-success');
  if (main) main.classList.add('hidden');
  if (success) success.classList.remove('hidden');

  // Countdown redirect la dashboard
  let count = 5;
  const countEl = document.getElementById('redirect-count');
  const interval = setInterval(() => {
    count--;
    if (countEl) countEl.textContent = count;
    if (count <= 0) {
      clearInterval(interval);
      window.location.href = '/dashboard.html';
    }
  }, 1000);
}
