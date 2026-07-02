/**
 * Tour de Outback — donation payment backend (Stripe + Firestore).
 *
 * Two HTTPS functions, exposed to the site via Firebase Hosting rewrites:
 *   POST /api/create-donation  -> createDonation  (starts a payment/subscription)
 *   POST /api/stripe-webhook   -> stripeWebhook   (records successful gifts)
 *
 * Secrets (set with `firebase functions:secrets:set ...`, never in the repo):
 *   STRIPE_SECRET_KEY     - Stripe secret key (sk_test_... / sk_live_...)
 *   STRIPE_WEBHOOK_SECRET - signing secret from the Stripe webhook endpoint (whsec_...)
 *
 * "In-house": the browser renders Stripe's Payment Element on our own page and
 * calls create-donation for a client secret. We never see raw card data; Stripe
 * tokenizes it in the Element. The donor never leaves the site.
 *
 * Deployed to us-central1. Both endpoints are public (invoker: 'public') so the
 * Firebase Hosting /api/** rewrites can reach them from the browser. (Requires
 * Domain Restricted Sharing to be relaxed on this project for allUsers.)
 */

const { onRequest } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');
const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET');

setGlobalOptions({ region: 'us-central1', maxInstances: 10 });

// Origins allowed to call create-donation from the browser. Same-origin calls
// through the Hosting rewrite don't need CORS, but this keeps local + GitHub
// Pages testing working too.
const ALLOWED_ORIGINS = [
  'https://www.tourdeoregon.com',
  'https://tourdeoregon.com',
  'https://oregon-tour-de-outback.web.app',
  'https://oregon-tour-de-outback.firebaseapp.com',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
];

// Processing-fee model — MUST match the labels shown on the donate page.
const FEE_RATE = 0.029;
const FEE_FLAT_CENTS = 30;

/** Server-authoritative charge amount in cents. Never trusts a client total. */
function chargeAmountCents(baseDollars, coverFee) {
  const baseCents = Math.round(Number(baseDollars) * 100);
  if (!baseCents || baseCents <= 0) return null;
  if (!coverFee) return baseCents;
  return Math.round((baseCents + FEE_FLAT_CENTS) / (1 - FEE_RATE));
}

/**
 * Find-or-create a monthly Stripe Price for a given amount, cached in Firestore.
 * The cache is keyed by Stripe mode (test/live) so those environments don't clash,
 * and self-heals: if a cached product/price no longer exists in the current Stripe
 * account (e.g. after swapping keys, or on the test->live cutover), it's recreated.
 */
async function getMonthlyPriceId(stripe, amountCents, mode) {
  const cfgRef = db.doc(`stripe_config/donation_${mode}`);
  const cfgSnap = await cfgRef.get();
  let productId = cfgSnap.exists ? cfgSnap.data().productId : null;
  if (productId) {
    try { await stripe.products.retrieve(productId); }
    catch (e) { if (e && e.code === 'resource_missing') productId = null; else throw e; }
  }
  if (!productId) {
    const product = await stripe.products.create({ name: 'Tour de Outback Monthly Donation' });
    productId = product.id;
    await cfgRef.set({ productId }, { merge: true });
  }

  const priceRef = db.doc(`stripe_prices/${mode}_monthly_${amountCents}`);
  const priceSnap = await priceRef.get();
  let priceId = priceSnap.exists ? priceSnap.data().priceId : null;
  if (priceId) {
    try {
      const p = await stripe.prices.retrieve(priceId);
      if (!p.active || p.unit_amount !== amountCents || p.product !== productId) priceId = null;
    } catch (e) { if (e && e.code === 'resource_missing') priceId = null; else throw e; }
  }
  if (!priceId) {
    const price = await stripe.prices.create({
      unit_amount: amountCents,
      currency: 'usd',
      recurring: { interval: 'month' },
      product: productId,
    });
    priceId = price.id;
    await priceRef.set({ priceId, amountCents });
  }
  return priceId;
}

/** Verify a Firebase ID token from the "Authorization: Bearer" header.
 *  Returns the decoded token ({uid, email, name}) or null if absent/invalid. */
async function verifyAuthUser(req) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer (.+)$/);
  if (!match) return null;
  try {
    return await admin.auth().verifyIdToken(match[1]);
  } catch (e) {
    logger.warn('ID token verification failed', e.message);
    return null;
  }
}

/** Get-or-create the Stripe customer for a Firebase user, cached per Stripe mode
 *  in users/{uid}. Self-heals if the cached customer is missing in the account. */
async function getOrCreateUserCustomer(stripe, authUser, email, name, mode) {
  const userRef = db.doc(`users/${authUser.uid}`);
  const snap = await userRef.get();
  const data = snap.exists ? snap.data() : {};
  const field = `stripeCustomer_${mode}`;
  let customerId = data[field] || null;
  if (customerId) {
    try {
      const c = await stripe.customers.retrieve(customerId);
      if (c.deleted) customerId = null;
    } catch (e) { if (e && e.code === 'resource_missing') customerId = null; else throw e; }
  }
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: email || authUser.email || undefined,
      name: name || authUser.name || undefined,
      metadata: { firebaseUID: authUser.uid, source: 'tdo-account' },
    });
    customerId = customer.id;
  }
  await userRef.set({
    [field]: customerId,
    email: authUser.email || email || null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  return customerId;
}

/** Look up a signed-in user's Stripe customer id for the current mode (no create). */
async function getUserCustomerId(authUser, mode) {
  const snap = await db.doc(`users/${authUser.uid}`).get();
  return snap.exists ? (snap.data()[`stripeCustomer_${mode}`] || null) : null;
}

// ---------------------------------------------------------------------------
// POST /api/create-donation
// body: { baseAmount, coverFee, frequency: 'one-time'|'monthly', email, name }
// returns: { clientSecret, mode: 'payment'|'subscription' }
// ---------------------------------------------------------------------------
exports.createDonation = onRequest(
  { secrets: [STRIPE_SECRET_KEY], cors: ALLOWED_ORIGINS, invoker: 'public' },
  async (req, res) => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const secretKey = STRIPE_SECRET_KEY.value();
    const stripe = require('stripe')(secretKey);
    const stripeMode = secretKey.indexOf('sk_live') === 0 ? 'live' : 'test';
    const body = req.body || {};
    const coverFee = body.coverFee !== false; // default true — matches the page
    const isMonthly = body.frequency === 'monthly';
    const email = (body.email || '').trim();
    const name = (body.name || '').trim();

    const amountCents = chargeAmountCents(body.baseAmount, coverFee);
    if (!amountCents || amountCents < 100) {
      return res.status(400).json({ error: 'Please choose a donation amount of at least $1.' });
    }

    const sharedMeta = {
      type: 'donation',
      frequency: isMonthly ? 'monthly' : 'one-time',
      base_amount: String(body.baseAmount),
      cover_fee: String(coverFee),
      donor_name: name,
    };

    try {
      // Tie the gift to the donor's persistent Stripe customer when signed in,
      // so it appears in their account billing history.
      const authUser = await verifyAuthUser(req);
      const userCustomerId = authUser
        ? await getOrCreateUserCustomer(stripe, authUser, email, name, stripeMode)
        : null;

      if (!isMonthly) {
        const intent = await stripe.paymentIntents.create({
          amount: amountCents,
          currency: 'usd',
          description: 'Tour de Outback Donation',
          receipt_email: email || undefined,
          customer: userCustomerId || undefined,
          automatic_payment_methods: { enabled: true },
          metadata: sharedMeta,
        });
        return res.json({ clientSecret: intent.client_secret, mode: 'payment' });
      }

      // Monthly recurring gift.
      if (!email) {
        return res.status(400).json({ error: 'An email is required for monthly gifts (for your receipt).' });
      }
      // Signed-in donors reuse their persistent customer; guests get a new one.
      let subCustomerId = userCustomerId;
      if (!subCustomerId) {
        const guest = await stripe.customers.create({
          email,
          name: name || undefined,
          metadata: { source: 'tdo-donation' },
        });
        subCustomerId = guest.id;
      }
      const priceId = await getMonthlyPriceId(stripe, amountCents, stripeMode);
      // This project's Stripe SDK pins API 2025-02-24.acacia, where the first-
      // payment client secret is on latest_invoice.payment_intent. (The newer
      // "Basil" API moved it to latest_invoice.confirmation_secret — kept as a
      // fallback so a future SDK bump keeps working.)
      const subscription = await stripe.subscriptions.create({
        customer: subCustomerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: sharedMeta,
      });

      const invoice = subscription.latest_invoice || {};
      const clientSecret =
        (invoice.payment_intent && invoice.payment_intent.client_secret) ||
        (invoice.confirmation_secret && invoice.confirmation_secret.client_secret);
      if (!clientSecret) {
        logger.error('No client secret on subscription invoice', { sub: subscription.id });
        return res.status(500).json({ error: 'Could not start the monthly gift. Please try again.' });
      }
      return res.json({ clientSecret: clientSecret, mode: 'subscription' });
    } catch (err) {
      logger.error('createDonation failed', err);
      return res.status(500).json({ error: 'Could not start the donation. Please try again.' });
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/billing-history  — signed-in donor's payment history (from Stripe).
// Auth: "Authorization: Bearer <Firebase ID token>". Returns { items: [...] }.
// ---------------------------------------------------------------------------
exports.getBillingHistory = onRequest(
  { secrets: [STRIPE_SECRET_KEY], cors: ALLOWED_ORIGINS, invoker: 'public' },
  async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const authUser = await verifyAuthUser(req);
    if (!authUser) return res.status(401).json({ error: 'Please sign in.' });

    const secretKey = STRIPE_SECRET_KEY.value();
    const stripe = require('stripe')(secretKey);
    const mode = secretKey.indexOf('sk_live') === 0 ? 'live' : 'test';
    try {
      const customerId = await getUserCustomerId(authUser, mode);
      if (!customerId) return res.json({ items: [] });
      const charges = await stripe.charges.list({ customer: customerId, limit: 50 });
      const items = charges.data.map(function (ch) {
        const isMonthly = ch.metadata && ch.metadata.frequency === 'monthly';
        return {
          date: new Date(ch.created * 1000).toISOString().slice(0, 10),
          description: ch.description || (isMonthly ? 'Monthly donation' : 'Donation'),
          amount: '$' + (ch.amount / 100).toFixed(2),
          status: ch.status,
        };
      });
      return res.json({ items });
    } catch (err) {
      logger.error('getBillingHistory failed', err);
      return res.status(500).json({ error: 'Could not load your history.' });
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/portal-session  — Stripe Customer Portal link for the signed-in user.
// Auth: "Authorization: Bearer <Firebase ID token>". Returns { url }.
// ---------------------------------------------------------------------------
exports.createPortalSession = onRequest(
  { secrets: [STRIPE_SECRET_KEY], cors: ALLOWED_ORIGINS, invoker: 'public' },
  async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const authUser = await verifyAuthUser(req);
    if (!authUser) return res.status(401).json({ error: 'Please sign in.' });

    const secretKey = STRIPE_SECRET_KEY.value();
    const stripe = require('stripe')(secretKey);
    const mode = secretKey.indexOf('sk_live') === 0 ? 'live' : 'test';
    try {
      const customerId = await getUserCustomerId(authUser, mode);
      if (!customerId) return res.status(400).json({ error: 'No billing account yet — make a donation first.' });
      const origin = ALLOWED_ORIGINS.indexOf(req.headers.origin) !== -1
        ? req.headers.origin : 'https://oregon-tour-de-outback.web.app';
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: origin + '/account/',
      });
      return res.json({ url: session.url });
    } catch (err) {
      logger.error('createPortalSession failed', err);
      return res.status(500).json({ error: 'Could not open the billing portal.' });
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/stripe-webhook  — records successful gifts to Firestore.
// ---------------------------------------------------------------------------
exports.stripeWebhook = onRequest(
  { secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET], invoker: 'public' },
  async (req, res) => {
    const stripe = require('stripe')(STRIPE_SECRET_KEY.value());
    const signature = req.headers['stripe-signature'];

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.rawBody, signature, STRIPE_WEBHOOK_SECRET.value());
    } catch (err) {
      logger.warn('Webhook signature verification failed', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      if (event.type === 'payment_intent.succeeded') {
        const pi = event.data.object;
        if (pi.metadata && pi.metadata.type === 'donation') {
          await db.collection('donations').doc(pi.id).set({
            source: 'stripe',
            kind: 'payment_intent',
            amount: pi.amount,
            currency: pi.currency,
            email: pi.receipt_email || null,
            frequency: (pi.metadata && pi.metadata.frequency) || 'one-time',
            baseAmount: (pi.metadata && pi.metadata.base_amount) || null,
            coverFee: pi.metadata && pi.metadata.cover_fee === 'true',
            donorName: (pi.metadata && pi.metadata.donor_name) || null,
            status: 'succeeded',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
        }
      } else if (event.type === 'invoice.paid' || event.type === 'invoice.payment_succeeded') {
        const inv = event.data.object;
        await db.collection('donations').doc(inv.id).set({
          source: 'stripe',
          kind: 'invoice',
          amount: inv.amount_paid,
          currency: inv.currency,
          email: inv.customer_email || null,
          frequency: 'monthly',
          subscriptionId: inv.subscription || null,
          customerId: inv.customer || null,
          status: 'succeeded',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }
      return res.json({ received: true });
    } catch (err) {
      logger.error('Webhook handler error', err);
      return res.status(500).send('Webhook handler error');
    }
  }
);
