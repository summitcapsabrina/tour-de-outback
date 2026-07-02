// Vercel serverless function — creates a Square hosted checkout link for a
// Tour de Outback donation and returns its URL. The static donate page
// (GitHub Pages) POSTs here; the browser then redirects to the Square URL.
//
// Secrets live ONLY in Vercel environment variables — never in this file:
//   SQUARE_ACCESS_TOKEN  (secret; sandbox EAAA… or production access token)
//   SQUARE_LOCATION_ID   (e.g. L…)
//   SQUARE_ENV           ("sandbox" | "production", default "sandbox")
//   SQUARE_VERSION       (optional; Square API version, has a sane default)
//
// Recurring/monthly is wired in a follow-up during sandbox testing (see below).

const FEE_RATE = 0.029;   // must match the front-end (donate/index.html)
const FEE_FLAT = 0.30;

// Origins allowed to call this endpoint (the live site + local testing).
const ALLOWED_ORIGINS = [
  'https://www.tourdeoregon.com',
  'https://tourdeoregon.com',
  'http://localhost:8000',
  'http://127.0.0.1:8000',
];

function squareBaseUrl() {
  return (process.env.SQUARE_ENV || 'sandbox') === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com';
}

// Thin Square REST helper. Returns { ok, status, data }.
async function squareFetch(path, method, body) {
  const apiVersion = process.env.SQUARE_VERSION || '2024-12-18';
  const resp = await fetch(`${squareBaseUrl()}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
      'Square-Version': apiVersion,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await resp.json().catch(() => ({}));
  return { ok: resp.ok, status: resp.status, data };
}

// Find a catalog object of a given type by its exact name, or null.
async function findCatalogByName(objectType, name) {
  const { ok, data } = await squareFetch('/v2/catalog/search', 'POST', {
    object_types: [objectType],
    query: { exact_query: { attribute_name: 'name', attribute_value: name } },
    limit: 1,
  });
  if (ok && data.objects && data.objects.length) return data.objects[0].id;
  return null;
}

const MONTHLY_PLAN_NAME = 'Tour de Outback Monthly Donation';

// Ensure the parent subscription plan exists; return its catalog id.
async function ensureMonthlyPlan() {
  const existing = await findCatalogByName('SUBSCRIPTION_PLAN', MONTHLY_PLAN_NAME);
  if (existing) return existing;
  const { ok, data } = await squareFetch('/v2/catalog/object', 'POST', {
    idempotency_key: 'tdo-plan-monthly-v1',
    object: {
      type: 'SUBSCRIPTION_PLAN',
      id: '#tdo-monthly-plan',
      subscription_plan_data: { name: MONTHLY_PLAN_NAME, all_items: true },
    },
  });
  if (!ok || !data.catalog_object) throw new Error('plan-create-failed: ' + JSON.stringify(data));
  return data.catalog_object.id;
}

// Ensure a monthly plan variation exists for this exact amount; return its id.
async function ensureMonthlyVariation(planId, amountCents) {
  const dollars = (amountCents / 100).toFixed(2);
  const varName = `TdO Monthly Donation $${dollars}`;
  const existing = await findCatalogByName('SUBSCRIPTION_PLAN_VARIATION', varName);
  if (existing) return existing;
  const { ok, data } = await squareFetch('/v2/catalog/object', 'POST', {
    idempotency_key: `tdo-var-monthly-${amountCents}-v1`,
    object: {
      type: 'SUBSCRIPTION_PLAN_VARIATION',
      id: '#tdo-monthly-var',
      subscription_plan_variation_data: {
        name: varName,
        subscription_plan_id: planId,
        phases: [
          {
            ordinal: 0,
            cadence: 'MONTHLY',
            pricing: { type: 'STATIC', price_money: { amount: amountCents, currency: 'USD' } },
          },
        ],
      },
    },
  });
  if (!ok || !data.catalog_object) throw new Error('variation-create-failed: ' + JSON.stringify(data));
  return data.catalog_object.id;
}

function setCors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// Server-side fee math — never trust an amount computed in the browser.
function chargeAmountCents(baseDollars, coverFee) {
  const base = Number(baseDollars);
  if (!base || base <= 0) return null;
  const total = coverFee ? (base + FEE_FLAT) / (1 - FEE_RATE) : base;
  return Math.round(total * 100);
}

module.exports = async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_LOCATION_ID;
  if (!token || !locationId) {
    return res.status(500).json({ error: 'Server not configured (missing Square credentials).' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (_) { body = {}; }
  }
  body = body || {};

  const frequency = body.frequency === 'monthly' ? 'monthly' : 'one-time';
  const coverFee = body.coverFee !== false; // default true, matches page default
  const amountCents = chargeAmountCents(body.baseAmount, coverFee);
  if (!amountCents || amountCents < 100) {
    return res.status(400).json({ error: 'Please choose a donation amount of at least $1.' });
  }

  const idempotencyKey = `tdo-${frequency}-${amountCents}-${Math.random().toString(36).slice(2)}`;
  const REDIRECT_URL = 'https://www.tourdeoregon.com/donate/?thanks=1';

  try {
    let payload;

    if (frequency === 'monthly') {
      // Recurring: donor-chosen amounts need a Square subscription plan variation
      // priced to that amount. Find-or-create the plan + variation, then a
      // subscription checkout link (donor finishes recurring signup on Square).
      const planId = await ensureMonthlyPlan();
      const variationId = await ensureMonthlyVariation(planId, amountCents);
      payload = {
        idempotency_key: idempotencyKey,
        subscription_plan_id: variationId,
        order: {
          location_id: locationId,
          line_items: [
            {
              name: 'Tour de Outback Monthly Donation',
              quantity: '1',
              base_price_money: { amount: amountCents, currency: 'USD' },
            },
          ],
        },
        checkout_options: { redirect_url: REDIRECT_URL },
      };
    } else {
      // One-time: quick-pay hosted checkout for an arbitrary amount.
      payload = {
        idempotency_key: idempotencyKey,
        quick_pay: {
          name: 'Tour de Outback Donation',
          price_money: { amount: amountCents, currency: 'USD' },
          location_id: locationId,
        },
        checkout_options: { redirect_url: REDIRECT_URL },
      };
    }

    const { ok, data } = await squareFetch('/v2/online-checkout/payment-links', 'POST', payload);
    if (!ok) {
      console.error('Square payment-link error:', JSON.stringify(data));
      const detail = (process.env.SQUARE_ENV || 'sandbox') !== 'production' ? data.errors : undefined;
      return res.status(502).json({ error: 'Could not start checkout. Please try again.', detail });
    }

    const url = data.payment_link && data.payment_link.url;
    if (!url) return res.status(502).json({ error: 'Checkout link missing from Square response.' });
    return res.status(200).json({ url });
  } catch (err) {
    console.error('create-checkout failed:', err);
    const detail = (process.env.SQUARE_ENV || 'sandbox') !== 'production' ? String(err.message || err) : undefined;
    return res.status(500).json({ error: 'Unexpected error creating checkout.', detail });
  }
};
