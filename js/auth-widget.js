// Global navbar auth widget: an avatar button (to the right of the weather
// widget) that opens a dropdown — a compact login menu when signed out, or a
// small account menu when signed in. Loaded on every page via main.js.
import { auth } from "/js/firebase-init.js";
import {
  onAuthStateChanged, signOut,
  GoogleAuthProvider, signInWithPopup,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendSignInLinkToEmail
} from "https://www.gstatic.com/firebasejs/11.9.0/firebase-auth.js";

(function () {
  // ---- Styles ----
  var css = document.createElement('style');
  css.textContent = [
    '.tdo-auth{position:relative;display:flex;align-items:center;margin-left:14px;font-family:inherit}',
    '.tdo-avatar{width:36px;height:36px;border-radius:50%;border:2px solid rgba(255,255,255,0.35);background:#3a3a3a;cursor:pointer;padding:0;overflow:hidden;display:flex;align-items:center;justify-content:center}',
    '.tdo-avatar:hover{border-color:#cc0000}',
    '.tdo-avatar img{width:100%;height:100%;object-fit:cover;display:block}',
    '.tdo-avatar svg{width:22px;height:22px;fill:rgba(255,255,255,0.75)}',
    '.tdo-menu{position:absolute;top:48px;right:0;width:300px;max-width:88vw;background:#fff;color:#222;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,0.25);padding:18px;z-index:1200;display:none;text-align:left}',
    '.tdo-menu.open{display:block}',
    '.tdo-menu h4{font-family:inherit;font-size:1rem;margin:0 0 12px;font-weight:700}',
    '.tdo-menu .tdo-field{margin-bottom:10px}',
    '.tdo-menu label{display:block;font-size:0.8rem;font-weight:600;margin-bottom:4px;color:#444}',
    '.tdo-menu input{width:100%;padding:10px 12px;border:1px solid #ccc;border-radius:8px;font-size:0.95rem;font-family:inherit;box-sizing:border-box}',
    '.tdo-menu input:focus{outline:none;border-color:#cc0000;box-shadow:0 0 0 2px rgba(204,0,0,0.15)}',
    '.tdo-btn{display:block;width:100%;border:none;border-radius:8px;padding:10px 12px;font-size:0.95rem;font-weight:600;cursor:pointer;font-family:inherit;text-align:center;text-decoration:none;box-sizing:border-box}',
    '.tdo-btn-primary{background:#cc0000;color:#fff}.tdo-btn-primary:hover{background:#a80000}',
    '.tdo-btn-google{background:#fff;color:#3c4043;border:1px solid #dadce0;display:flex;align-items:center;justify-content:center;gap:9px}',
    '.tdo-btn-google:hover{background:#f7f8f8}.tdo-btn-google svg{width:17px;height:17px}',
    '.tdo-div{display:flex;align-items:center;gap:10px;color:#999;font-size:0.8rem;margin:12px 0}',
    '.tdo-div::before,.tdo-div::after{content:"";flex:1;height:1px;background:#e5e5e5}',
    '.tdo-link{background:none;border:none;color:#cc0000;font-weight:600;cursor:pointer;font-family:inherit;font-size:0.85rem;padding:0;text-decoration:underline}',
    '.tdo-foot{font-size:0.85rem;color:#555;margin-top:10px}',
    '.tdo-msg{padding:9px 11px;border-radius:8px;font-size:0.83rem;margin-bottom:10px;display:none}',
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

  // ---- Mount point: after the weather widget, else in the navbar ----
  function mount() {
    var navbar = document.querySelector('.navbar');
    if (!navbar) return null;
    var wrap = document.createElement('div');
    wrap.className = 'tdo-auth';
    wrap.innerHTML =
      '<button class="tdo-avatar" id="tdo-avatar" aria-label="Account" aria-haspopup="true" aria-expanded="false">' + HEAD_SVG + '</button>' +
      '<div class="tdo-menu" id="tdo-menu" role="menu"></div>';
    var weather = document.getElementById('weather-widget');
    if (weather && weather.parentNode) {
      weather.parentNode.insertBefore(wrap, weather.nextSibling);
    } else {
      var container = navbar.querySelector('.container, .nav-container') || navbar;
      container.appendChild(wrap);
    }
    return wrap;
  }

  var root = mount();
  if (!root) return;
  var avatarBtn = document.getElementById('tdo-avatar');
  var menu = document.getElementById('tdo-menu');
  var signupMode = false;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function openMenu() { menu.classList.add('open'); avatarBtn.setAttribute('aria-expanded', 'true'); }
  function closeMenu() { menu.classList.remove('open'); avatarBtn.setAttribute('aria-expanded', 'false'); }
  function toggleMenu() { menu.classList.contains('open') ? closeMenu() : openMenu(); }

  avatarBtn.addEventListener('click', function (e) { e.stopPropagation(); toggleMenu(); });
  document.addEventListener('click', function (e) { if (!root.contains(e.target)) closeMenu(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });

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
    var el = menu.querySelector('.tdo-msg');
    if (!el) return;
    el.className = 'tdo-msg show ' + cls;
    el.textContent = text;
  }

  // ---- Signed-out login menu ----
  function renderSignedOut() {
    signupMode = false;
    menu.innerHTML =
      '<h4>Sign in</h4>' +
      '<div class="tdo-msg"></div>' +
      '<button class="tdo-btn tdo-btn-google" id="tdo-google">' + GOOGLE_SVG + ' Continue with Google</button>' +
      '<div class="tdo-div">or</div>' +
      '<div class="tdo-field"><label>Email</label><input type="email" id="tdo-email" autocomplete="email" placeholder="you@example.com"></div>' +
      '<div class="tdo-field"><label>Password</label><input type="password" id="tdo-pw" autocomplete="current-password" placeholder="Your password"></div>' +
      '<button class="tdo-btn tdo-btn-primary" id="tdo-email-submit">Sign in</button>' +
      '<p class="tdo-foot"><span id="tdo-mode-hint">New here?</span> <button class="tdo-link" id="tdo-toggle">Create an account</button></p>' +
      '<p class="tdo-foot">Prefer no password? <button class="tdo-link" id="tdo-emaillink">Email me a link</button></p>';

    menu.querySelector('#tdo-google').addEventListener('click', function () {
      signInWithPopup(auth, new GoogleAuthProvider()).catch(function (e) { msg('err', friendly(e)); });
    });
    menu.querySelector('#tdo-toggle').addEventListener('click', function () {
      signupMode = !signupMode;
      menu.querySelector('#tdo-email-submit').textContent = signupMode ? 'Create account' : 'Sign in';
      menu.querySelector('#tdo-mode-hint').textContent = signupMode ? 'Have an account?' : 'New here?';
      menu.querySelector('#tdo-toggle').textContent = signupMode ? 'Sign in instead' : 'Create an account';
    });
    menu.querySelector('#tdo-email-submit').addEventListener('click', function () {
      var email = menu.querySelector('#tdo-email').value.trim();
      var pw = menu.querySelector('#tdo-pw').value;
      if (!email || !pw) { msg('err', 'Enter your email and password.'); return; }
      var fn = signupMode ? createUserWithEmailAndPassword : signInWithEmailAndPassword;
      fn(auth, email, pw).catch(function (e) { msg('err', friendly(e)); });
    });
    menu.querySelector('#tdo-emaillink').addEventListener('click', function () {
      var email = menu.querySelector('#tdo-email').value.trim();
      if (!email) { msg('err', 'Enter your email above first.'); return; }
      var acs = { url: window.location.origin + '/account/', handleCodeInApp: true };
      sendSignInLinkToEmail(auth, email, acs).then(function () {
        window.localStorage.setItem('emailForSignIn', email);
        msg('ok', 'Check your inbox — we sent a sign-in link to ' + email + '.');
      }).catch(function (e) { msg('err', friendly(e)); });
    });
  }

  // ---- Signed-in account menu ----
  function renderSignedIn(user) {
    var pic = user.photoURL
      ? '<img src="' + esc(user.photoURL) + '" alt="" referrerpolicy="no-referrer">'
      : HEAD_SVG;
    menu.innerHTML =
      '<div class="tdo-profile"><div class="pic">' + pic + '</div><div class="who">' +
      '<div class="nm">' + esc(user.displayName || 'Your account') + '</div>' +
      '<div class="em">' + esc(user.email || '') + '</div></div></div>' +
      '<a class="tdo-btn tdo-btn-primary" href="/account/">My Account</a>' +
      '<button class="tdo-btn" style="background:#f0f0f0;color:#333" id="tdo-signout">Sign out</button>';
    menu.querySelector('#tdo-signout').addEventListener('click', function () {
      signOut(auth).then(closeMenu);
    });
  }

  function setAvatar(user) {
    if (user && user.photoURL) {
      avatarBtn.innerHTML = '<img src="' + esc(user.photoURL) + '" alt="" referrerpolicy="no-referrer">';
    } else {
      avatarBtn.innerHTML = HEAD_SVG;
    }
  }

  onAuthStateChanged(auth, function (user) {
    setAvatar(user);
    if (user) { renderSignedIn(user); } else { renderSignedOut(); }
  });
})();
