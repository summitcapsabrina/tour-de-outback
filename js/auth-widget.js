// Global navbar auth widget: an avatar button (to the right of the weather
// widget). Signed out → clicking it (or any "Sign in" button on the page via
// window.tdoOpenAuth) opens a centered login MODAL. Signed in → it opens a
// small account dropdown. Loaded on every page via main.js.
import { auth, isAdminUser } from "/js/firebase-init.js";
import {
  onAuthStateChanged, signOut,
  GoogleAuthProvider, signInWithPopup, getAdditionalUserInfo,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendSignInLinkToEmail
} from "https://www.gstatic.com/firebasejs/11.9.0/firebase-auth.js";

(function () {
  // ---- Styles ----
  var css = document.createElement('style');
  css.textContent = [
    '.tdo-auth{position:relative;display:flex;align-items:center;margin-left:24px;font-family:inherit}',
    '.tdo-avatar{width:36px;height:36px;border-radius:50%;border:2px solid rgba(255,255,255,0.35);background:#3a3a3a;cursor:pointer;padding:0;overflow:hidden;display:flex;align-items:center;justify-content:center}',
    '.tdo-avatar:hover{border-color:#cc0000}',
    '.tdo-avatar img{width:100%;height:100%;object-fit:cover;display:block}',
    '.tdo-avatar svg{width:22px;height:22px;fill:rgba(255,255,255,0.75)}',
    '.tdo-menu{position:absolute;top:48px;right:0;width:300px;max-width:88vw;background:#fff;color:#222;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,0.25);padding:18px;z-index:1200;display:none;text-align:left}',
    '.tdo-menu.open{display:block}',
    // Modal
    '.tdo-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.55);display:none;align-items:center;justify-content:center;z-index:2147483646;padding:20px}',
    '.tdo-modal-overlay.open{display:flex}',
    '.tdo-modal{position:relative;background:#fff;color:#222;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,0.35);width:380px;max-width:92vw;max-height:90vh;overflow:auto;padding:28px 26px;text-align:left}',
    '.tdo-modal-close{position:absolute;top:10px;right:14px;background:none;border:none;font-size:1.6rem;line-height:1;color:#999;cursor:pointer;padding:0}',
    '.tdo-modal-close:hover{color:#333}',
    '.tdo-modal h4{font-family:inherit;font-size:1.25rem;margin:0 0 16px;font-weight:700}',
    '.tdo-modal .tdo-field{margin-bottom:12px}',
    '.tdo-modal label{display:block;font-size:0.85rem;font-weight:600;margin-bottom:5px;color:#444}',
    '.tdo-modal input{width:100%;padding:11px 13px;border:1px solid #ccc;border-radius:8px;font-size:1rem;font-family:inherit;box-sizing:border-box}',
    '.tdo-modal input:focus{outline:none;border-color:#cc0000;box-shadow:0 0 0 2px rgba(204,0,0,0.15)}',
    // Shared bits (dropdown + modal)
    '.tdo-menu h4{font-family:inherit;font-size:1rem;margin:0 0 12px;font-weight:700}',
    '.tdo-btn{display:block;width:100%;border:none;border-radius:8px;padding:11px 12px;font-size:0.98rem;font-weight:600;cursor:pointer;font-family:inherit;text-align:center;text-decoration:none;box-sizing:border-box}',
    '.tdo-btn-primary{background:#cc0000;color:#fff}.tdo-btn-primary:hover{background:#a80000}',
    '.tdo-btn-google{background:#fff;color:#3c4043;border:1px solid #dadce0;display:flex;align-items:center;justify-content:center;gap:9px}',
    '.tdo-btn-google:hover{background:#f7f8f8}.tdo-btn-google svg{width:17px;height:17px}',
    '.tdo-div{display:flex;align-items:center;gap:10px;color:#999;font-size:0.8rem;margin:14px 0}',
    '.tdo-div::before,.tdo-div::after{content:"";flex:1;height:1px;background:#e5e5e5}',
    '.tdo-link{background:none;border:none;color:#cc0000;font-weight:600;cursor:pointer;font-family:inherit;font-size:0.88rem;padding:0;text-decoration:underline}',
    '.tdo-foot{font-size:0.88rem;color:#555;margin-top:11px}',
    '.tdo-msg{padding:9px 11px;border-radius:8px;font-size:0.85rem;margin-bottom:12px;display:none}',
    '.tdo-msg.show{display:block}.tdo-msg.err{background:#fdecea;color:#b71c1c}.tdo-msg.ok{background:#e8f0fe;color:#1a3a6b}',
    '.tdo-profile{display:flex;align-items:center;gap:12px;margin-bottom:14px}',
    '.tdo-profile .pic{width:44px;height:44px;border-radius:50%;background:#eee;overflow:hidden;flex:none;display:flex;align-items:center;justify-content:center}',
    '.tdo-profile .pic img{width:100%;height:100%;object-fit:cover}.tdo-profile .pic svg{width:26px;height:26px;fill:#bbb}',
    '.tdo-profile .who{min-width:0}.tdo-profile .nm{font-weight:700;font-size:0.95rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.tdo-profile .em{font-size:0.8rem;color:#777;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.tdo-menu a.tdo-btn{margin-bottom:8px}'
  ].join('');
  document.head.appendChild(css);

  var HEAD_SVG = '<svg viewBox="0 0 24 24"><path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5z"/></svg>';
  var GOOGLE_SVG = '<svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z"/></svg>';

  function mount() {
    var navbar = document.querySelector('.navbar');
    if (!navbar) return null;
    // Reuse the slot main.js reserved before first paint (so the avatar fills in
    // without shifting the menu). Only create one if the reservation is missing.
    var wrap = navbar.querySelector('.tdo-auth');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'tdo-auth';
      var weather = document.getElementById('weather-widget');
      if (weather && weather.parentNode) {
        weather.parentNode.insertBefore(wrap, weather.nextSibling);
      } else {
        var container = navbar.querySelector('.container, .nav-container') || navbar;
        container.appendChild(wrap);
      }
    }
    // main.js already paints the avatar button (with the cached photo) before
    // first paint — reuse it so we don't wipe the photo back to the default icon
    // and cause a flash. Only build it here if that reservation is missing.
    if (!wrap.querySelector('.tdo-avatar')) {
      wrap.innerHTML =
        '<button class="tdo-avatar" id="tdo-avatar" aria-label="Account" aria-haspopup="true" aria-expanded="false">' + HEAD_SVG + '</button>' +
        '<div class="tdo-menu" id="tdo-menu" role="menu"></div>';
    }
    return wrap;
  }

  var root = mount();
  if (!root) return;
  var avatarBtn = document.getElementById('tdo-avatar');
  var menu = document.getElementById('tdo-menu');
  var currentUser = null;
  var signupMode = false;

  // Login modal (centered) — appended to <body>.
  var overlay = document.createElement('div');
  overlay.className = 'tdo-modal-overlay';
  overlay.innerHTML =
    '<div class="tdo-modal"><button class="tdo-modal-close" id="tdo-modal-close" aria-label="Close">&times;</button>' +
    '<div id="tdo-modal-body"></div></div>';
  document.body.appendChild(overlay);
  var modalBody = overlay.querySelector('#tdo-modal-body');

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function openMenu() { menu.classList.add('open'); avatarBtn.setAttribute('aria-expanded', 'true'); }
  function closeMenu() { menu.classList.remove('open'); avatarBtn.setAttribute('aria-expanded', 'false'); }
  function openModal() { renderLogin(); overlay.classList.add('open'); }
  function closeModal() { overlay.classList.remove('open'); }
  // Any page's "Sign in" button opens the centered modal.
  window.tdoOpenAuth = openModal;

  avatarBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    if (currentUser) { menu.classList.contains('open') ? closeMenu() : openMenu(); }
    else { openModal(); }
  });
  document.addEventListener('click', function (e) { if (!root.contains(e.target)) closeMenu(); });
  overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });
  document.getElementById('tdo-modal-close').addEventListener('click', closeModal);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeMenu(); closeModal(); } });

  function friendly(e) {
    var c = (e && e.code) || '';
    if (c === 'auth/invalid-credential' || c === 'auth/wrong-password' || c === 'auth/user-not-found') return 'Email or password didn’t match.';
    if (c === 'auth/email-already-in-use') return 'That email already has an account — sign in instead.';
    if (c === 'auth/weak-password') return 'Password must be at least 6 characters.';
    if (c === 'auth/invalid-email') return 'That doesn’t look like a valid email.';
    if (c === 'auth/popup-closed-by-user') return 'Sign-in was cancelled.';
    if (c === 'auth/unauthorized-domain') return 'This domain isn’t authorized for sign-in yet.';
    return (e && e.message) || 'Something went wrong.';
  }
  function msg(cls, text) {
    var el = modalBody.querySelector('.tdo-msg');
    if (!el) return;
    el.className = 'tdo-msg show ' + cls;
    el.textContent = text;
  }

  // ---- Google Ads conversions ----
  // Account signup fires on every genuinely-new account. The Email sign-up
  // conversion is separate and additional: it fires only when a consented email
  // is newly added to EmailOctopus (see subscribeAndTrack).
  var CONV_ACCOUNT_SIGNUP = 'AW-11006704390/9clOCOrB6c8cEIb2s4Ap';
  var CONV_EMAIL_SIGNUP = 'AW-11006704390/-3_RCM7OgdAcEIb2s4Ap';
  function fireConversion(sendTo) {
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'conversion', { send_to: sendTo });
    }
  }
  // Subscribe a consented email to EmailOctopus, then fire the Email sign-up
  // conversion only if they were newly added (created:true) — not if already listed.
  function subscribeAndTrack(email) {
    if (!email) return;
    fetch('/api/subscribe-newsletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email })
    }).then(function (r) {
      return r.json().then(function (d) { return { ok: r.ok, d: d }; });
    }).then(function (res) {
      if (res.ok && res.d && res.d.created) { fireConversion(CONV_EMAIL_SIGNUP); }
    }).catch(function () {});
  }

  // ---- Login form (rendered into the modal) ----
  function renderLogin() {
    signupMode = false;
    modalBody.innerHTML =
      '<h4>Sign in</h4>' +
      '<div class="tdo-msg"></div>' +
      '<button class="tdo-btn tdo-btn-google" id="tdo-google">' + GOOGLE_SVG + ' Continue with Google</button>' +
      '<div class="tdo-div">or</div>' +
      '<div class="tdo-field"><label>Email</label><input type="email" id="tdo-email" autocomplete="email" placeholder="you@example.com"></div>' +
      '<div class="tdo-field"><label>Password</label><input type="password" id="tdo-pw" autocomplete="current-password" placeholder="Your password"></div>' +
      '<div class="tdo-consent" id="tdo-consent-field" style="display:none;margin:2px 0 14px">' +
        '<label style="display:flex;align-items:flex-start;gap:8px;font-size:0.82rem;line-height:1.4;font-weight:400;cursor:pointer;color:#555">' +
          '<input type="checkbox" id="tdo-consent" checked style="margin-top:2px;flex:none">' +
          '<span>Email me Tour de Outback updates — routes, registration, and event news. Unsubscribe anytime.</span>' +
        '</label>' +
      '</div>' +
      '<button class="tdo-btn tdo-btn-primary" id="tdo-email-submit">Sign in</button>' +
      '<p class="tdo-foot"><span id="tdo-mode-hint">New here?</span> <button class="tdo-link" id="tdo-toggle">Create an account</button></p>' +
      '<p class="tdo-foot">Prefer no password? <button class="tdo-link" id="tdo-emaillink">Email me a link</button></p>';

    modalBody.querySelector('#tdo-google').addEventListener('click', function () {
      signInWithPopup(auth, new GoogleAuthProvider()).then(function (result) {
        // First-ever Google sign-in creates an account → count it (no email consent box shown here).
        var info = getAdditionalUserInfo(result);
        if (info && info.isNewUser) { fireConversion(CONV_ACCOUNT_SIGNUP); }
      }).catch(function (e) { msg('err', friendly(e)); });
    });
    modalBody.querySelector('#tdo-toggle').addEventListener('click', function () {
      signupMode = !signupMode;
      modalBody.querySelector('#tdo-email-submit').textContent = signupMode ? 'Create account' : 'Sign in';
      modalBody.querySelector('#tdo-mode-hint').textContent = signupMode ? 'Have an account?' : 'New here?';
      modalBody.querySelector('#tdo-toggle').textContent = signupMode ? 'Sign in instead' : 'Create an account';
      var cf = modalBody.querySelector('#tdo-consent-field');
      if (cf) cf.style.display = signupMode ? 'block' : 'none';
    });
    modalBody.querySelector('#tdo-email-submit').addEventListener('click', function () {
      var email = modalBody.querySelector('#tdo-email').value.trim();
      var pw = modalBody.querySelector('#tdo-pw').value;
      if (!email || !pw) { msg('err', 'Enter your email and password.'); return; }
      if (signupMode) {
        var consentBox = modalBody.querySelector('#tdo-consent');
        var wantsEmail = !!(consentBox && consentBox.checked);
        createUserWithEmailAndPassword(auth, email, pw).then(function () {
          fireConversion(CONV_ACCOUNT_SIGNUP);
          if (wantsEmail) { subscribeAndTrack(email); }
        }).catch(function (e) { msg('err', friendly(e)); });
      } else {
        signInWithEmailAndPassword(auth, email, pw).catch(function (e) { msg('err', friendly(e)); });
      }
    });
    modalBody.querySelector('#tdo-emaillink').addEventListener('click', function () {
      var email = modalBody.querySelector('#tdo-email').value.trim();
      if (!email) { msg('err', 'Enter your email above first.'); return; }
      var acs = { url: window.location.origin + '/account/', handleCodeInApp: true };
      sendSignInLinkToEmail(auth, email, acs).then(function () {
        window.localStorage.setItem('emailForSignIn', email);
        msg('ok', 'Check your inbox — we sent a sign-in link to ' + email + '.');
      }).catch(function (e) { msg('err', friendly(e)); });
    });
  }

  // ---- Signed-in account dropdown ----
  function renderSignedIn(user) {
    var pic = user.photoURL
      ? '<img src="' + esc(user.photoURL) + '" alt="" referrerpolicy="no-referrer">'
      : HEAD_SVG;
    menu.innerHTML =
      '<div class="tdo-profile"><div class="pic">' + pic + '</div><div class="who">' +
      '<div class="nm">' + esc(user.displayName || 'Your account') + '</div>' +
      '<div class="em">' + esc(user.email || '') + '</div></div></div>' +
      '<a class="tdo-btn tdo-btn-primary" href="/account/">My Account</a>' +
      (isAdminUser(user) ? '<a class="tdo-btn" style="background:#222;color:#fff" href="/admin/">Admin</a>' : '') +
      '<button class="tdo-btn" style="background:#f0f0f0;color:#333" id="tdo-signout">Sign out</button>';
    menu.querySelector('#tdo-signout').addEventListener('click', function () {
      signOut(auth).then(closeMenu);
    });
  }

  function setAvatar(user) {
    avatarBtn.innerHTML = (user && user.photoURL)
      ? '<img src="' + esc(user.photoURL) + '" alt="" referrerpolicy="no-referrer">'
      : HEAD_SVG;
  }

  // Bridge so other widgets (e.g. the chat widget) can read auth state and react
  // to sign-in/out. `resolved` flips true once Firebase has determined the state.
  window.tdoAuth = window.tdoAuth || { currentUser: null, resolved: false, isAdmin: false };

  // Lightweight admin check for UI gating (e.g. hiding the chat widget). Reads
  // only the CACHED token claim — no force-refresh — so non-admin visitors incur
  // no extra network. A just-promoted admin picks this up on their next reload.
  function cachedIsAdmin(user) {
    if (!user || !user.emailVerified) return Promise.resolve(false);
    if (isAdminUser(user)) return Promise.resolve(true);
    return user.getIdTokenResult()
      .then(function (r) { return !!(r.claims && r.claims.admin === true); })
      .catch(function () { return false; });
  }

  onAuthStateChanged(auth, function (user) {
    currentUser = user;
    setAvatar(user);
    // Cache the photo so the next page can paint it synchronously (no flash).
    // Cleared on sign-out or for accounts without a photo (both show the icon).
    try {
      if (user && user.photoURL) localStorage.setItem('tdoAvatarPhoto', user.photoURL);
      else localStorage.removeItem('tdoAvatarPhoto');
    } catch (e) { /* storage disabled */ }
    if (user) { renderSignedIn(user); closeModal(); }
    else { menu.innerHTML = ''; closeMenu(); }
    // Resolve the admin flag before publishing state, so listeners (the chat
    // widget) see a consistent view. The cached-claim read resolves in a
    // microtask for non-admins, so gate dismissal isn't meaningfully delayed.
    cachedIsAdmin(user).then(function (isAdmin) {
      window.tdoAuth.currentUser = user
        ? { uid: user.uid, displayName: user.displayName || '', email: user.email || '' }
        : null;
      window.tdoAuth.isAdmin = !!isAdmin;
      window.tdoAuth.resolved = true;
      try {
        window.dispatchEvent(new CustomEvent('tdo-auth-changed', { detail: window.tdoAuth.currentUser }));
      } catch (e) { /* older browsers */ }
    });
  });
})();
