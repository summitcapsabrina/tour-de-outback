/**
 * Shop order receipt — the branded, itemized confirmation email we send the
 * customer after a shop order is placed (this is OUR receipt, separate from the
 * plain Stripe receipt). Kept in its own module so the exact same template can be
 * exercised by a test/preview script and stay byte-identical to production.
 *
 * Exports:
 *   buildShopReceiptEmail(order, num) -> { html, text }
 *
 * `order` shape (same object sendShopOrderEmails already has):
 *   {
 *     email, subtotal, shipping, total,               // cents for money fields
 *     discount: { amount, label|code } | null,
 *     items: [{ title, variantTitle, quantity, price }],   // price in cents (per unit)
 *     address: { first_name, last_name, address1, address2, city, region, zip, country }
 *   }
 *   `num` is the human order number (e.g. TDO-1A2B3C4D).
 */

const LOGO_URL = 'https://www.tourdeoregon.com/images/logo-white-red.png';
const LOGO_CIRCLE_URL = 'https://www.tourdeoregon.com/images/logo-red-circle.png';
const SITE_URL = 'https://www.tourdeoregon.com/';
const SUPPORT_EMAIL = 'info@tourdeoutback.org';

const RED = '#cc0000';
const CHARCOAL = '#222222';
const LIGHT = '#f5f5f5';

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  });
}

function money(c) { return '$' + (((c || 0)) / 100).toFixed(2); }

function buildShopReceiptEmail(order, num) {
  order = order || {};
  const a = order.address || {};
  const items = order.items || [];
  const name = ((a.first_name || '') + ' ' + (a.last_name || '')).trim();

  const shipLinesArr = [
    name,
    a.address1, a.address2,
    ((a.city || '') + ', ' + (a.region || '') + ' ' + (a.zip || '')).trim().replace(/^,\s*/, ''),
    a.country,
  ].filter(function (l) { return l && String(l).trim(); });

  // --- Itemized rows -------------------------------------------------------
  const itemsHtml = items.map(function (it, i) {
    const isLast = i === items.length - 1;
    const border = isLast ? '' : 'border-bottom:1px solid #eeeeee;';
    return '' +
      '<tr>' +
        '<td style="padding:12px 0;' + border + 'font-size:14px;color:' + CHARCOAL + ';vertical-align:top;">' +
          '<strong style="font-weight:700;">' + escapeHtml(it.title) + '</strong>' +
          (it.variantTitle ? '<br><span style="color:#888888;font-size:13px;">' + escapeHtml(it.variantTitle) + '</span>' : '') +
        '</td>' +
        '<td style="padding:12px 8px;' + border + 'font-size:14px;color:#555555;text-align:center;white-space:nowrap;vertical-align:top;">' + (it.quantity || 1) + '</td>' +
        '<td style="padding:12px 0;' + border + 'font-size:14px;color:' + CHARCOAL + ';text-align:right;white-space:nowrap;vertical-align:top;">' + money((it.price || 0) * (it.quantity || 1)) + '</td>' +
      '</tr>';
  }).join('');

  // --- Totals --------------------------------------------------------------
  const totalsHtml = '' +
    '<tr><td style="padding:4px 0;font-size:14px;color:#555555;">Subtotal</td>' +
      '<td style="padding:4px 0;font-size:14px;color:' + CHARCOAL + ';text-align:right;white-space:nowrap;">' + money(order.subtotal) + '</td></tr>' +
    (order.discount && order.discount.amount ?
      '<tr><td style="padding:4px 0;font-size:14px;color:#1b7a2e;">Discount (' + escapeHtml(order.discount.label || order.discount.code || 'code') + ')</td>' +
      '<td style="padding:4px 0;font-size:14px;color:#1b7a2e;text-align:right;white-space:nowrap;">&minus;' + money(order.discount.amount) + '</td></tr>' : '') +
    '<tr><td style="padding:4px 0;font-size:14px;color:#555555;">Shipping</td>' +
      '<td style="padding:4px 0;font-size:14px;color:' + CHARCOAL + ';text-align:right;white-space:nowrap;">' + money(order.shipping) + '</td></tr>' +
    '<tr><td style="padding:14px 0 0;border-top:2px solid ' + CHARCOAL + ';font-size:17px;font-weight:700;color:' + CHARCOAL + ';">Total</td>' +
      '<td style="padding:14px 0 0;border-top:2px solid ' + CHARCOAL + ';font-size:17px;font-weight:700;color:' + RED + ';text-align:right;white-space:nowrap;">' + money(order.total) + '</td></tr>';

  // --- Full HTML document --------------------------------------------------
  const html =
'<!DOCTYPE html>' +
'<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
'<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only">' +
'<title>Your Tour de Outback order</title></head>' +
'<body style="margin:0;padding:0;background-color:' + LIGHT + ';">' +
'<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your order ' + escapeHtml(num) + ' is confirmed — thank you for supporting Lake County Search and Rescue.</div>' +
'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:' + LIGHT + ';">' +
  '<tr><td align="center" style="padding:24px 12px;">' +
    '<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06);">' +

      // Logo header (charcoal bar)
      '<tr><td align="center" style="background-color:' + CHARCOAL + ';padding:26px 24px 22px;">' +
        '<a href="' + SITE_URL + '" target="_blank" style="text-decoration:none;">' +
          '<img src="' + LOGO_URL + '" alt="Oregon Tour de Outback" width="210" style="display:block;width:210px;max-width:80%;height:auto;border:0;">' +
        '</a>' +
      '</td></tr>' +

      // Red accent strip
      '<tr><td style="background-color:' + RED + ';font-size:0;line-height:0;height:4px;">&nbsp;</td></tr>' +

      // Body
      '<tr><td style="padding:32px 32px 8px;">' +
        '<h1 style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.2;color:' + CHARCOAL + ';font-weight:700;letter-spacing:.3px;">Thank you for your order!</h1>' +
        '<p style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#888888;">Order confirmed &bull; Oregon Tour de Outback</p>' +

        '<p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:' + CHARCOAL + ';line-height:1.55;">Hi ' + escapeHtml(a.first_name || 'there') + ',</p>' +
        '<p style="margin:0 0 22px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:' + CHARCOAL + ';line-height:1.55;">Your order is confirmed and headed into production. Here&rsquo;s a full summary of what you bought.</p>' +

        // Order number badge
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">' +
          '<tr><td style="background-color:' + LIGHT + ';border:1px solid #eaeaea;border-radius:8px;padding:12px 18px;font-family:Arial,Helvetica,sans-serif;">' +
            '<span style="font-size:11px;color:#888888;text-transform:uppercase;letter-spacing:1.5px;">Order number</span><br>' +
            '<span style="font-size:18px;color:' + CHARCOAL + ';font-weight:700;letter-spacing:.5px;">' + escapeHtml(num) + '</span>' +
          '</td></tr>' +
        '</table>' +
      '</td></tr>' +

      // Items
      '<tr><td style="padding:0 32px;">' +
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif;">' +
          '<tr>' +
            '<th align="left" style="padding:0 0 8px;font-size:11px;color:#888888;text-transform:uppercase;letter-spacing:1.5px;border-bottom:2px solid #eeeeee;font-weight:700;">Item</th>' +
            '<th align="center" style="padding:0 8px 8px;font-size:11px;color:#888888;text-transform:uppercase;letter-spacing:1.5px;border-bottom:2px solid #eeeeee;font-weight:700;">Qty</th>' +
            '<th align="right" style="padding:0 0 8px;font-size:11px;color:#888888;text-transform:uppercase;letter-spacing:1.5px;border-bottom:2px solid #eeeeee;font-weight:700;">Price</th>' +
          '</tr>' +
          itemsHtml +
        '</table>' +
      '</td></tr>' +

      // Totals
      '<tr><td style="padding:16px 32px 0;">' +
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif;">' +
          totalsHtml +
        '</table>' +
      '</td></tr>' +

      // Shipping address
      '<tr><td style="padding:28px 32px 0;">' +
        '<h3 style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#888888;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;">Shipping to</h3>' +
        '<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:' + CHARCOAL + ';line-height:1.6;">' + shipLinesArr.map(escapeHtml).join('<br>') + '</p>' +
      '</td></tr>' +

      // What's next
      '<tr><td style="padding:24px 32px 4px;">' +
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' +
          '<td style="background-color:' + LIGHT + ';border-radius:8px;padding:16px 18px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#555555;line-height:1.6;">' +
            '<strong style="color:' + CHARCOAL + ';">What happens next?</strong><br>' +
            'You&rsquo;ll get a shipping confirmation with tracking as soon as your order is on its way. Questions? Just reply to this email or write to ' +
            '<a href="mailto:' + SUPPORT_EMAIL + '" style="color:' + RED + ';text-decoration:none;">' + SUPPORT_EMAIL + '</a>.' +
          '</td>' +
        '</tr></table>' +
      '</td></tr>' +

      // Footer
      '<tr><td align="center" style="padding:28px 32px 32px;">' +
        '<a href="' + SITE_URL + '" target="_blank" style="text-decoration:none;">' +
          '<img src="' + LOGO_CIRCLE_URL + '" alt="Oregon Tour de Outback" width="56" style="display:inline-block;width:56px;height:auto;border:0;margin-bottom:10px;">' +
        '</a>' +
        '<p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:' + CHARCOAL + ';font-weight:700;">Oregon Tour de Outback</p>' +
        '<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#999999;line-height:1.6;">Every purchase helps support <strong>Lake County Search and Rescue</strong>.<br>' +
        'June 26, 2027 &bull; Lakeview, Oregon &bull; <a href="' + SITE_URL + '" target="_blank" style="color:#999999;text-decoration:underline;">tourdeoregon.com</a></p>' +
      '</td></tr>' +

    '</table>' +
  '</td></tr>' +
'</table>' +
'</body></html>';

  // --- Plain-text fallback -------------------------------------------------
  const itemsText = items.map(function (it) {
    return '  ' + (it.quantity || 1) + ' x ' + it.title + (it.variantTitle ? ' (' + it.variantTitle + ')' : '') +
      '  ' + money((it.price || 0) * (it.quantity || 1));
  }).join('\n');

  const text =
    'THANK YOU FOR YOUR ORDER!\n' +
    'Oregon Tour de Outback\n\n' +
    'Order number: ' + num + '\n\n' +
    'Hi ' + (a.first_name || 'there') + ',\n' +
    'Your order is confirmed and headed into production. Here is your summary:\n\n' +
    'ITEMS\n' + itemsText + '\n\n' +
    'Subtotal: ' + money(order.subtotal) + '\n' +
    (order.discount && order.discount.amount ? 'Discount (' + (order.discount.label || order.discount.code || 'code') + '): -' + money(order.discount.amount) + '\n' : '') +
    'Shipping: ' + money(order.shipping) + '\n' +
    'Total: ' + money(order.total) + '\n\n' +
    'SHIPPING TO\n' + shipLinesArr.join('\n') + '\n\n' +
    "You'll get a shipping confirmation with tracking once your order is on its way.\n" +
    'Questions? Reply to this email or write to ' + SUPPORT_EMAIL + '.\n\n' +
    'Every purchase helps support Lake County Search and Rescue.\n' +
    'June 26, 2027 - Lakeview, Oregon - tourdeoregon.com';

  return { html: html, text: text };
}

module.exports = { buildShopReceiptEmail: buildShopReceiptEmail };
