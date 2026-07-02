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

/** Find-or-create a monthly Stripe Price for a given amount, cached in Firestore. */
async function getMonthlyPriceId(stripe, amountCents) {
  const cfgRef = db.doc('stripe_config/donation');
  const cfgSnap = await cfgRef.get();
  let productId = cfgSnap.exists ? cfgSnap.data().productId : null;
  if (!productId) {
    const product = await stripe.products.create({
      name: 'Tour de Outback Monthly Donation',
    });
    productId = product.id;
    await cfgRef.set({ productId }, { merge: true });
  }

  const priceRef = db.doc(`stripe_prices/monthly_${amountCents}`);
  const priceSnap = await priceRef.get();
  if (priceSnap.exists) return priceSnap.data().priceId;

  const price = await stripe.prices.create({
    unit_amount: amountCents,
    currency: 'usd',
    recurring: { interval: 'month' },
    product: productId,
  });
  await priceRef.set({ priceId: price.id, amountCents });
  return price.id;
}

// ---------------------------------------------------------------------------
// POST /api/create-donation
// body: { baseAmount, coverFee, frequency: 'one-time'|'monthly', email, name }
// returns: { clientSecret, mode: 'payment'|'subscription' }
// ---------------------------------------------------------------------------
exports.createDonation = onRequest(
  { secrets: [STRIPE_SECRET_KEY], cors: ALLOWED_ORIGINS },
  async (req, res) => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const stripe = require('stripe')(STRIPE_SECRET_KEY.value());
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
      if (!isMonthly) {
        const intent = await stripe.paymentIntents.create({
          amount: amountCents,
          currency: 'usd',
          description: 'Tour de Outback Donation',
          receipt_email: email || undefined,
          automatic_payment_methods: { enabled: true },
          metadata: sharedMeta,
        });
        return res.json({ clientSecret: intent.client_secret, mode: 'payment' });
      }

      // Monthly recurring gift.
      if (!email) {
        return res.status(400).json({ error: 'An email is required for monthly gifts (for your receipt).' });
      }
      const customer = await stripe.customers.create({
        email,
        name: name || undefined,
        metadata: { source: 'tdo-donation' },
      });
      const priceId = await getMonthlyPriceId(stripe, amountCents);
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: sharedMeta,
      });

      const pi = subscription.latest_invoice && subscription.latest_invoice.payment_intent;
      if (!pi || !pi.client_secret) {
        logger.error('No payment_intent on subscription invoice', { sub: subscription.id });
        return res.status(500).json({ error: 'Could not start the monthly gift. Please try again.' });
      }
      return res.json({ clientSecret: pi.client_secret, mode: 'subscription' });
    } catch (err) {
      logger.error('createDonation failed', err);
      return res.status(500).json({ error: 'Could not start the donation. Please try again.' });
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/stripe-webhook  — records successful gifts to Firestore.
// ---------------------------------------------------------------------------
exports.stripeWebhook = onRequest(
  { secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET] },
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
