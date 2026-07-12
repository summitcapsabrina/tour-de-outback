/**
 * Tour de Outback — Shop cart engine.
 *
 * Framework-free. Owns the localStorage cart, a money formatter, and a slide-in
 * cart drawer + floating cart button that it injects into whatever page loads it
 * (shop listing + checkout). Prices are handled in CENTS end-to-end to match the
 * Printify/Stripe backend; only the formatter converts to dollars for display.
 *
 * Public API (window.TDOShop):
 *   .money(cents)                      -> "$12.34"
 *   .cart.items()                      -> [{key, productId, variantId, quantity, title, variantTitle, price, image}]
 *   .cart.count()                      -> total quantity
 *   .cart.subtotal()                   -> subtotal in cents
 *   .cart.add(item)                    -> add/increment a line (item.quantity default 1)
 *   .cart.setQty(key, qty)             -> set a line's quantity (0 removes it)
 *   .cart.remove(key)                  -> remove a line
 *   .cart.clear()                      -> empty the cart
 *   .cart.onChange(fn)                 -> subscribe to cart changes (returns unsub)
 *   .openDrawer() / .closeDrawer()
 */
(function () {
  'use strict';
  // Guard: this script is included on shop pages AND injected site-wide by main.js,
  // so it can load twice. Initialize only once.
  if (window.TDOShop) return;

  var STORE_KEY = 'tdo_cart_v1';
  var CHECKOUT_URL = '/shop/checkout/';

  // ---- money -------------------------------------------------------------
  function money(cents) {
    var n = (Number(cents) || 0) / 100;
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // ---- storage -----------------------------------------------------------
  function keyFor(productId, variantId) { return String(productId) + ':' + String(variantId); }

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(arr)) arr = [];
      // Defensive: drop malformed lines.
      return arr.filter(function (i) { return i && i.productId && i.variantId && i.quantity > 0; });
    } catch (e) { return []; }
  }

  var _items = load();
  var _subs = [];

  function persist() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(_items)); } catch (e) {}
    _subs.forEach(function (fn) { try { fn(_items); } catch (e) {} });
    renderDrawer();
    renderFab();
  }

  var cart = {
    items: function () { return _items.slice(); },
    count: function () { return _items.reduce(function (n, i) { return n + (i.quantity || 0); }, 0); },
    subtotal: function () { return _items.reduce(function (n, i) { return n + (i.price || 0) * (i.quantity || 0); }, 0); },
    add: function (item) {
      var qty = Math.max(1, Math.min(20, parseInt(item.quantity, 10) || 1));
      var key = keyFor(item.productId, item.variantId);
      var existing = _items.filter(function (i) { return i.key === key; })[0];
      if (existing) {
        existing.quantity = Math.min(20, existing.quantity + qty);
      } else {
        _items.push({
          key: key,
          productId: String(item.productId),
          variantId: item.variantId,
          quantity: qty,
          title: item.title || 'Item',
          variantTitle: item.variantTitle || '',
          price: Number(item.price) || 0,
          image: item.image || ''
        });
      }
      persist();
    },
    setQty: function (key, qty) {
      qty = Math.max(0, Math.min(20, parseInt(qty, 10) || 0));
      _items = _items.map(function (i) { return i; });
      var line = _items.filter(function (i) { return i.key === key; })[0];
      if (!line) return;
      if (qty === 0) { _items = _items.filter(function (i) { return i.key !== key; }); }
      else { line.quantity = qty; }
      persist();
    },
    remove: function (key) { _items = _items.filter(function (i) { return i.key !== key; }); persist(); },
    clear: function () { _items = []; persist(); },
    onChange: function (fn) {
      _subs.push(fn);
      return function () { _subs = _subs.filter(function (f) { return f !== fn; }); };
    }
  };

  // ---- injected styles ---------------------------------------------------
  function injectStyles() {
    if (document.getElementById('tdo-shop-styles')) return;
    var css =
      // Cart button lives in the navbar, far right (after the profile avatar).
      '.tdo-cart-nav{position:relative;background:none;border:none;cursor:pointer;padding:6px;margin-left:10px;' +
      'display:flex;align-items:center;flex:0 0 auto}' +
      '.tdo-cart-nav svg{width:26px;height:26px;stroke:#fff;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;transition:stroke .2s}' +
      '.tdo-cart-nav:hover svg{stroke:#cc0000}' +
      '.tdo-cart-nav .tdo-cart-badge{position:absolute;top:-3px;right:-7px;min-width:18px;height:18px;padding:0 4px;' +
      'background:#cc0000;color:#fff;border-radius:9px;font-family:Oswald,sans-serif;font-size:.72rem;font-weight:600;' +
      'display:flex;align-items:center;justify-content:center;border:2px solid #1a1a1a}' +
      // `display:flex` above beats the browser [hidden] rule, so make hidden explicit —
      // otherwise an empty cart still shows a "0" badge.
      '.tdo-cart-nav .tdo-cart-badge[hidden]{display:none}' +
      // Fallback if a page has no navbar: pin it top-right (still clear of the chat widget).
      '.tdo-cart-nav.tdo-cart-fallback{position:fixed;top:14px;right:16px;z-index:1200}' +
      '.tdo-cart-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:1300;opacity:0;pointer-events:none;transition:opacity .25s}' +
      '.tdo-cart-overlay.open{opacity:1;pointer-events:auto}' +
      // When closed, the drawer is parked off-screen to the right with
      // translateX(100%). On iOS Safari an off-screen *fixed* element like this
      // stays pannable and creates a phantom horizontal scroll site-wide (it's
      // injected on every page). visibility:hidden removes the closed drawer from
      // the pannable area; the delayed visibility transition keeps the slide
      // animation (visible instantly on open, hidden 280ms after close finishes).
      '.tdo-cart-drawer{position:fixed;top:0;right:0;height:100%;width:400px;max-width:92vw;background:#fff;z-index:1310;' +
      'transform:translateX(100%);visibility:hidden;transition:transform .28s ease,visibility 0s linear .28s;display:flex;flex-direction:column;box-shadow:-8px 0 30px rgba(0,0,0,.18)}' +
      '.tdo-cart-drawer.open{transform:translateX(0);visibility:visible;transition:transform .28s ease,visibility 0s}' +
      '.tdo-cart-head{display:flex;align-items:center;justify-content:space-between;padding:20px 22px;border-bottom:1px solid #eee}' +
      '.tdo-cart-head h3{font-family:Oswald,sans-serif;font-size:1.3rem;font-weight:600;color:#222;margin:0}' +
      '.tdo-cart-close{background:none;border:none;font-size:1.6rem;line-height:1;color:#888;cursor:pointer}' +
      '.tdo-cart-body{flex:1;overflow-y:auto;padding:8px 22px}' +
      '.tdo-cart-empty{text-align:center;color:#999;padding:48px 12px;font-size:.95rem}' +
      '.tdo-cart-line{display:flex;gap:12px;padding:16px 0;border-bottom:1px solid #f0f0f0}' +
      '.tdo-cart-line img{width:64px;height:64px;object-fit:cover;border-radius:8px;background:#f2f2f2;flex-shrink:0}' +
      '.tdo-cart-line .tdo-ln-info{flex:1;min-width:0}' +
      '.tdo-cart-line .tdo-ln-title{font-family:Oswald,sans-serif;font-weight:600;color:#222;font-size:.98rem;margin:0 0 2px}' +
      '.tdo-cart-line .tdo-ln-variant{color:#888;font-size:.82rem;margin:0 0 8px}' +
      '.tdo-ln-row{display:flex;align-items:center;justify-content:space-between}' +
      '.tdo-qty{display:inline-flex;align-items:center;border:1px solid #ddd;border-radius:6px;overflow:hidden}' +
      '.tdo-qty button{width:28px;height:28px;border:none;background:#fafafa;color:#333;font-size:1rem;cursor:pointer}' +
      '.tdo-qty button:hover{background:#f0f0f0}' +
      '.tdo-qty span{min-width:30px;text-align:center;font-weight:600;font-size:.9rem}' +
      '.tdo-ln-price{font-family:Oswald,sans-serif;font-weight:600;color:#cc0000}' +
      '.tdo-ln-remove{background:none;border:none;color:#bbb;font-size:.78rem;cursor:pointer;text-decoration:underline;margin-top:6px}' +
      '.tdo-ln-remove:hover{color:#cc0000}' +
      '.tdo-cart-foot{padding:18px 22px;border-top:1px solid #eee}' +
      '.tdo-cart-subtotal{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px}' +
      '.tdo-cart-subtotal span:first-child{color:#555}' +
      '.tdo-cart-subtotal span:last-child{font-family:Oswald,sans-serif;font-size:1.4rem;font-weight:700;color:#222}' +
      '.tdo-cart-note{color:#999;font-size:.78rem;margin:0 0 14px}' +
      '.tdo-cart-checkout{display:block;width:100%;padding:14px;background:#cc0000;color:#fff;border:none;border-radius:6px;' +
      'font-family:Oswald,sans-serif;font-size:1rem;font-weight:600;letter-spacing:1px;text-transform:uppercase;cursor:pointer;text-align:center;text-decoration:none}' +
      '.tdo-cart-checkout:hover{background:#a00}' +
      '.tdo-cart-checkout[disabled]{background:#ddd;cursor:not-allowed}';
    var el = document.createElement('style');
    el.id = 'tdo-shop-styles';
    el.textContent = css;
    document.head.appendChild(el);
  }

  // ---- drawer + FAB ------------------------------------------------------
  var fabEl = null, overlayEl = null, drawerEl = null, bodyEl = null, footEl = null;

  function buildChrome() {
    injectStyles();

    // Adopt the static cart button the page baked into .tdo-cart-slot (styled by
    // render-blocking styles.css) so the icon is already visible on first paint —
    // no flicker as the page navigates. Only build one if the static button is
    // missing (e.g. a nav-less page).
    fabEl = document.querySelector('.navbar .container .tdo-cart-slot .tdo-cart-nav');
    if (!fabEl) {
      fabEl = document.createElement('button');
      fabEl.className = 'tdo-cart-nav';
      fabEl.type = 'button';
      fabEl.setAttribute('aria-label', 'Open cart');
      fabEl.innerHTML =
        '<svg viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle>' +
        '<path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>' +
        '<span class="tdo-cart-badge" hidden>0</span>';
    }
    fabEl.addEventListener('click', openDrawer);

    overlayEl = document.createElement('div');
    overlayEl.className = 'tdo-cart-overlay';
    overlayEl.addEventListener('click', closeDrawer);

    drawerEl = document.createElement('aside');
    drawerEl.className = 'tdo-cart-drawer';
    drawerEl.setAttribute('role', 'dialog');
    drawerEl.setAttribute('aria-label', 'Shopping cart');
    drawerEl.innerHTML =
      '<div class="tdo-cart-head"><h3>Your Cart</h3><button class="tdo-cart-close" type="button" aria-label="Close">&times;</button></div>' +
      '<div class="tdo-cart-body"></div>' +
      '<div class="tdo-cart-foot"></div>';
    drawerEl.querySelector('.tdo-cart-close').addEventListener('click', closeDrawer);
    bodyEl = drawerEl.querySelector('.tdo-cart-body');
    footEl = drawerEl.querySelector('.tdo-cart-foot');

    // Mount the cart button only if it isn't already in the DOM (i.e. we had to
    // build it above because the page had no static button). The static button is
    // already in its .tdo-cart-slot, so this is a no-op in the common case.
    if (!fabEl.parentNode) {
      var cartSlot = document.querySelector('.navbar .container .tdo-cart-slot');
      var navContainer = document.querySelector('.navbar .container');
      if (cartSlot) { cartSlot.appendChild(fabEl); }
      else if (navContainer) { navContainer.appendChild(fabEl); }
      else { fabEl.classList.add('tdo-cart-fallback'); document.body.appendChild(fabEl); }
    }
    document.body.appendChild(overlayEl);
    document.body.appendChild(drawerEl);

    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrawer(); });

    renderFab();
    renderDrawer();
  }

  function renderFab() {
    if (!fabEl) return;
    var c = cart.count();
    var badge = fabEl.querySelector('.tdo-cart-badge');
    if (c > 0) { badge.hidden = false; badge.textContent = String(c); }
    else { badge.hidden = true; }
  }

  function renderDrawer() {
    if (!bodyEl) return;
    var items = cart.items();
    if (!items.length) {
      bodyEl.innerHTML = '<div class="tdo-cart-empty">Your cart is empty.<br>Add some gear to get started!</div>';
      footEl.innerHTML = '';
      return;
    }
    bodyEl.innerHTML = items.map(function (i) {
      var img = i.image
        ? '<img src="' + esc(i.image) + '" alt="" loading="lazy">'
        : '<div style="width:64px;height:64px;border-radius:8px;background:#f2f2f2;flex-shrink:0"></div>';
      return '<div class="tdo-cart-line" data-key="' + esc(i.key) + '">' + img +
        '<div class="tdo-ln-info">' +
        '<p class="tdo-ln-title">' + esc(i.title) + '</p>' +
        (i.variantTitle ? '<p class="tdo-ln-variant">' + esc(i.variantTitle) + '</p>' : '') +
        '<div class="tdo-ln-row">' +
        '<div class="tdo-qty"><button type="button" data-act="dec" aria-label="Decrease">&minus;</button>' +
        '<span>' + i.quantity + '</span>' +
        '<button type="button" data-act="inc" aria-label="Increase">+</button></div>' +
        '<span class="tdo-ln-price">' + money(i.price * i.quantity) + '</span></div>' +
        '<button class="tdo-ln-remove" type="button" data-act="remove">Remove</button>' +
        '</div></div>';
    }).join('');

    Array.prototype.forEach.call(bodyEl.querySelectorAll('.tdo-cart-line'), function (line) {
      var key = line.getAttribute('data-key');
      line.querySelectorAll('[data-act]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var act = btn.getAttribute('data-act');
          var cur = (cart.items().filter(function (x) { return x.key === key; })[0] || {}).quantity || 0;
          if (act === 'inc') cart.setQty(key, cur + 1);
          else if (act === 'dec') cart.setQty(key, cur - 1);
          else if (act === 'remove') cart.remove(key);
        });
      });
    });

    footEl.innerHTML =
      '<div class="tdo-cart-subtotal"><span>Subtotal</span><span>' + money(cart.subtotal()) + '</span></div>' +
      '<p class="tdo-cart-note">Shipping calculated at checkout. Taxes, if any, shown before you pay.</p>' +
      '<a class="tdo-cart-checkout" href="' + CHECKOUT_URL + '">Checkout</a>';
  }

  function openDrawer() { if (!drawerEl) return; overlayEl.classList.add('open'); drawerEl.classList.add('open'); }
  function closeDrawer() { if (!drawerEl) return; overlayEl.classList.remove('open'); drawerEl.classList.remove('open'); }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  // ---- catalog cache + prefetch -----------------------------------------
  // The shop catalog is cached in sessionStorage so returning to /shop/ renders
  // instantly instead of showing a spinner every time. Because this script loads
  // on every page, we also prefetch the catalog in the background while the user
  // is elsewhere — so even the first Shop visit is instant. loadCatalog() always
  // revalidates in the background and re-renders only if the data changed.
  var CATALOG_KEY = 'tdo_catalog_v1';
  var CATALOG_TTL = 5 * 60 * 1000;   // client cache freshness for prefetch skipping

  function readCatalogCache() {
    try {
      var o = JSON.parse(sessionStorage.getItem(CATALOG_KEY) || 'null');
      return (o && Array.isArray(o.products)) ? o : null;
    } catch (e) { return null; }
  }
  function writeCatalogCache(products) {
    try { sessionStorage.setItem(CATALOG_KEY, JSON.stringify({ products: products, at: Date.now() })); } catch (e) {}
  }
  function fetchCatalog() {
    return fetch('/api/shop-products', { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (!res.ok) throw new Error((res.d && res.d.error) || 'load failed');
        var products = (res.d && res.d.products) || [];
        writeCatalogCache(products);
        return products;
      });
  }
  // onData(products, meta) may fire twice: instantly from cache, then again with
  // fresh data if it differs. onData(null, {error}) if there's no cache and the fetch fails.
  function loadCatalog(onData) {
    var cached = readCatalogCache();
    var servedFromCache = !!(cached && cached.products.length);
    if (servedFromCache) onData(cached.products, { cached: true });
    return fetchCatalog().then(function (products) {
      if (!servedFromCache || JSON.stringify(products) !== JSON.stringify(cached.products)) {
        onData(products, { fresh: true });
      }
    }).catch(function (e) { if (!servedFromCache) onData(null, { error: e }); });
  }
  function prefetchCatalog() {
    var cached = readCatalogCache();
    if (cached && (Date.now() - cached.at) < CATALOG_TTL) return;   // still fresh — skip
    fetchCatalog().catch(function () {});
  }

  // ---- expose + boot -----------------------------------------------------
  window.TDOShop = {
    money: money,
    esc: esc,
    cart: cart,
    openDrawer: openDrawer,
    closeDrawer: closeDrawer,
    loadCatalog: loadCatalog,
    prefetchCatalog: prefetchCatalog,
    checkoutUrl: CHECKOUT_URL
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildChrome);
  } else {
    buildChrome();
  }

  // Warm the catalog cache in the background on non-shop pages so the first Shop
  // visit is instant. On /shop/ the page's own loader handles it.
  if (!/^\/shop\//.test(location.pathname)) {
    var idle = window.requestIdleCallback || function (f) { return setTimeout(f, 1500); };
    idle(function () { prefetchCatalog(); });
  }
})();
