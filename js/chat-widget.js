// Sabrina — floating AI support chat widget for the Oregon Tour de Outback.
// Open to ALL visitors (no login, no payment gating). Loaded on every page via
// main.js. Talks ONLY to the same-origin Cloud Functions (/api/chat*), which hold
// the Claude key server-side. Conversation persists across reloads (localStorage
// id + server-stored thread). Mobile-friendly (works at <=768px).
(function () {
  'use strict';
  if (window.__tdoChatLoaded) return;
  window.__tdoChatLoaded = true;

  var API = {
    chat: '/api/chat',
    poll: '/api/chat-poll',
    escalate: '/api/chat-escalate',
    typing: '/api/chat-typing'
  };
  var LS = {
    cid: 'tdo_chat_cid',
    vid: 'tdo_chat_vid',
    name: 'tdo_chat_name',
    email: 'tdo_chat_email'
  };
  var RED = '#cc0000';

  // ---- persistent visitor id (not auth — just a stable local reference) ----
  function lsGet(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function makeId() {
    return 'v_' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  }
  var visitorId = lsGet(LS.vid);
  if (!visitorId) { visitorId = makeId(); lsSet(LS.vid, visitorId); }

  var state = {
    cid: lsGet(LS.cid) || '',
    name: lsGet(LS.name) || '',
    email: lsGet(LS.email) || '',
    status: 'bot',
    adminName: '',        // human operator's name while status === 'human'
    open: false,
    lastTs: 0,            // ms of newest server message rendered
    renderedIds: {},      // id -> true
    polling: null,
    typingTimer: null,
    lastTypingSent: 0,
    nudgeTimer: null,
    nudged: false,
    unread: 0,
    booted: false
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  // Render text safely: escape HTML, then apply a tiny, safe subset of Markdown
  // (bold, markdown links, bare URLs) and preserve newlines. Order matters —
  // markdown links are linkified before bare URLs so their target isn't double-wrapped.
  function renderText(s) {
    var safe = esc(s);
    // **bold** and __bold__
    safe = safe.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>');
    safe = safe.replace(/__([^_\n]+?)__/g, '<strong>$1</strong>');
    // [label](https://url)
    safe = safe.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>');
    // bare URLs not already inside an href="" attribute
    safe = safe.replace(/(^|[^"'=>])(https?:\/\/[^\s<]+)/g, function (m, pre, u) {
      var clean = u.replace(/[.,!?)]+$/, '');
      var tail = u.slice(clean.length);
      return pre + '<a href="' + clean + '" target="_blank" rel="noopener">' + clean + '</a>' + tail;
    });
    return safe.replace(/\n/g, '<br>');
  }
  function timeLabel(iso) {
    try {
      var d = iso ? new Date(iso) : new Date();
      var h = d.getHours(), m = d.getMinutes();
      var ap = h >= 12 ? 'PM' : 'AM';
      h = h % 12; if (h === 0) h = 12;
      return h + ':' + (m < 10 ? '0' + m : m) + ' ' + ap;
    } catch (e) { return ''; }
  }

  // ---------------------------------------------------------------- styles
  var css = document.createElement('style');
  css.textContent = [
    '#tdo-chat *{box-sizing:border-box}',
    '#tdo-chat-launch{position:fixed;right:20px;bottom:20px;z-index:2147483000;width:60px;height:60px;border-radius:50%;background:' + RED + ';border:none;cursor:pointer;box-shadow:0 6px 22px rgba(0,0,0,0.28);display:flex;align-items:center;justify-content:center;transition:transform .15s,background .15s}',
    '#tdo-chat-launch:hover{background:#a80000;transform:translateY(-2px)}',
    '#tdo-chat-launch .tdo-ic{position:relative;width:28px;height:28px;transition:transform .4s cubic-bezier(.55,.15,.25,1)}',
    '#tdo-chat-launch.open .tdo-ic{transform:rotate(180deg)}',
    '#tdo-chat-launch .tdo-ic-chat,#tdo-chat-launch .tdo-ic-x{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;transition:opacity .25s ease}',
    '#tdo-chat-launch .tdo-ic svg{width:28px;height:28px;fill:#fff;display:block}',
    '#tdo-chat-launch .tdo-ic-chat svg{fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}',
    '#tdo-chat-launch .tdo-ic-x{opacity:0}',
    '#tdo-chat-launch.open .tdo-ic-chat{opacity:0}',
    '#tdo-chat-launch.open .tdo-ic-x{opacity:1}',
    '#tdo-chat-badge{position:absolute;top:-3px;right:-3px;min-width:20px;height:20px;border-radius:10px;background:#fff;color:' + RED + ';font:700 12px/20px Arial,sans-serif;text-align:center;padding:0 5px;border:2px solid ' + RED + ';display:none}',
    '#tdo-chat-panel{position:fixed;right:20px;bottom:92px;z-index:2147483000;width:380px;max-width:calc(100vw - 32px);height:560px;max-height:calc(100vh - 120px);background:#fff;border-radius:16px;box-shadow:0 18px 60px rgba(0,0,0,0.32);display:none;flex-direction:column;overflow:hidden;font-family:"Open Sans",Arial,sans-serif}',
    '#tdo-chat-panel.open{display:flex}',
    '.tdo-c-head{background:' + RED + ';color:#fff;padding:14px 16px;display:flex;align-items:center;gap:11px;flex:none;position:relative}',
    '.tdo-c-ava{width:40px;height:40px;border-radius:50%;background:#fff;flex:none;display:flex;align-items:center;justify-content:center;overflow:hidden}',
    '.tdo-c-ava span{font:700 18px/1 "Oswald",Arial,sans-serif;color:' + RED + '}',
    '.tdo-c-ava img{width:100%;height:100%;object-fit:cover}',
    '.tdo-c-title{font-family:"Oswald",Arial,sans-serif;font-weight:600;font-size:1.1rem;line-height:1.1}',
    '.tdo-c-sub{font-size:0.74rem;opacity:.92;display:flex;align-items:center;gap:5px}',
    '.tdo-c-dot{width:8px;height:8px;border-radius:50%;background:#4caf50;display:inline-block}',
    '.tdo-c-x{margin-left:auto;background:none;border:none;color:#fff;font-size:1.5rem;line-height:1;cursor:pointer;padding:4px 6px;opacity:.9}',
    '.tdo-c-x:hover{opacity:1}',
    '.tdo-c-body{flex:1;overflow-y:auto;padding:16px;background:#f5f5f5;display:flex;flex-direction:column;gap:10px}',
    '.tdo-c-row{display:flex;flex-direction:column;max-width:82%}',
    '.tdo-c-row.me{align-self:flex-end;align-items:flex-end}',
    '.tdo-c-row.them{align-self:flex-start;align-items:flex-start}',
    '.tdo-c-who{font-size:0.68rem;color:#888;margin:0 4px 2px}',
    '.tdo-c-bub{padding:9px 13px;border-radius:14px;font-size:0.92rem;line-height:1.4;word-wrap:break-word;white-space:normal}',
    '.tdo-c-row.them .tdo-c-bub{background:#fff;color:#222;border:1px solid #e6e6e6;border-bottom-left-radius:4px}',
    '.tdo-c-row.me .tdo-c-bub{background:' + RED + ';color:#fff;border-bottom-right-radius:4px}',
    '.tdo-c-row.pending .tdo-c-bub{opacity:.6}',
    '.tdo-c-bub a{color:inherit;text-decoration:underline}',
    '.tdo-c-row.them .tdo-c-bub a{color:' + RED + '}',
    '.tdo-c-time{font-size:0.64rem;color:#aaa;margin:2px 4px 0}',
    '.tdo-c-sys{align-self:center;text-align:center;max-width:90%;font-size:0.76rem;color:#777;background:#eaeaea;border-radius:10px;padding:5px 12px}',
    '.tdo-c-typing{align-self:flex-start;align-items:center;background:#fff;border:1px solid #e6e6e6;border-radius:14px;border-bottom-left-radius:4px;padding:9px 13px;display:none}',
    '.tdo-c-typing.show{display:flex}',
    '.tdo-c-typing-label{font-size:0.8rem;color:#888;margin-right:7px;font-style:italic}',
    '.tdo-c-typing i{display:inline-block;width:7px;height:7px;margin:0 2px;border-radius:50%;background:#999;animation:tdoblink 1.2s infinite both}',
    '.tdo-c-typing i:nth-child(2){animation-delay:.2s}.tdo-c-typing i:nth-child(3){animation-delay:.4s}',
    '@keyframes tdoblink{0%,80%,100%{opacity:.3}40%{opacity:1}}',
    '.tdo-c-foot{flex:none;border-top:1px solid #eee;background:#fff;padding:10px 12px}',
    '.tdo-c-inrow{display:flex;align-items:flex-end;gap:8px}',
    '.tdo-c-in{flex:1;border:1px solid #ccc;border-radius:20px;padding:10px 14px;font-size:0.92rem;font-family:inherit;resize:none;max-height:96px;line-height:1.35;outline:none}',
    '.tdo-c-in:focus{border-color:' + RED + ';box-shadow:0 0 0 2px rgba(204,0,0,0.14)}',
    '.tdo-c-send{flex:none;width:40px;height:40px;border-radius:50%;background:' + RED + ';border:none;cursor:pointer;display:flex;align-items:center;justify-content:center}',
    '.tdo-c-send:hover{background:#a80000}.tdo-c-send:disabled{background:#ccc;cursor:default}',
    '.tdo-c-send svg{width:19px;height:19px;fill:#fff}',
    '.tdo-c-actions{display:flex;justify-content:space-between;align-items:center;margin-top:7px}',
    '.tdo-c-human{background:none;border:none;color:' + RED + ';font-size:0.78rem;font-weight:600;cursor:pointer;padding:0;text-decoration:underline;font-family:inherit}',
    '.tdo-c-human:disabled{color:#aaa;cursor:default;text-decoration:none}',
    '.tdo-c-note{font-size:0.68rem;color:#aaa}',
    '.tdo-c-intro{align-self:stretch;text-align:center;color:#666;font-size:0.82rem;padding:6px 8px}',
    // Gate (require sign-in or guest name+email before chatting)
    '.tdo-c-gate{position:absolute;left:0;right:0;bottom:0;top:69px;background:#fff;z-index:5;overflow-y:auto;padding:22px 20px;display:none}',
    '.tdo-c-gate.show{display:block}',
    '.tdo-c-gate h4{font-family:"Oswald",Arial,sans-serif;font-size:1.15rem;margin:0 0 6px;color:#222}',
    '.tdo-c-gate .g-sub{font-size:0.86rem;color:#666;margin:0 0 16px}',
    '.tdo-c-gate .g-primary{display:block;width:100%;background:' + RED + ';color:#fff;border:none;border-radius:10px;padding:12px;font-size:0.95rem;font-weight:600;cursor:pointer;font-family:inherit}',
    '.tdo-c-gate .g-primary:hover{background:#a80000}',
    '.tdo-c-gate .g-or{display:flex;align-items:center;gap:10px;color:#999;font-size:0.78rem;margin:16px 0 12px}',
    '.tdo-c-gate .g-or::before,.tdo-c-gate .g-or::after{content:"";flex:1;height:1px;background:#e6e6e6}',
    '.tdo-c-gate label{display:block;font-size:0.8rem;font-weight:600;color:#444;margin:0 0 4px}',
    '.tdo-c-gate input{width:100%;padding:10px 12px;border:1px solid #ccc;border-radius:8px;font-size:0.92rem;font-family:inherit;margin-bottom:11px;box-sizing:border-box}',
    '.tdo-c-gate input:focus{outline:none;border-color:' + RED + ';box-shadow:0 0 0 2px rgba(204,0,0,0.14)}',
    '.tdo-c-gate .g-note{font-size:0.76rem;color:#888;background:#f6f6f6;border-radius:8px;padding:9px 11px;margin:0 0 12px;line-height:1.4}',
    '.tdo-c-gate .g-err{color:#b71c1c;font-size:0.8rem;margin:0 0 10px;display:none}',
    '.tdo-c-gate .g-err.show{display:block}',
    '.tdo-c-gate .g-guest{display:block;width:100%;background:#222;color:#fff;border:none;border-radius:10px;padding:12px;font-size:0.95rem;font-weight:600;cursor:pointer;font-family:inherit}',
    '.tdo-c-gate .g-guest:hover{background:#000}',
    // "Talk to a person" options card (Chat vs Email)
    '.tdo-c-opts{align-self:stretch;background:#fff;border:1px solid #e6e6e6;border-radius:12px;padding:12px;margin:2px 0}',
    '.tdo-c-opts .o-q{font-size:0.86rem;color:#333;font-weight:600;margin-bottom:9px}',
    '.tdo-c-opt{display:flex;align-items:center;justify-content:center;gap:7px;width:100%;box-sizing:border-box;border:1px solid #ddd;background:#fafafa;color:#222;border-radius:9px;padding:10px;font-size:0.9rem;font-weight:600;cursor:pointer;font-family:inherit;text-decoration:none;margin-bottom:8px}',
    '.tdo-c-opt:last-child{margin-bottom:0}',
    '.tdo-c-opt[data-opt="chat"]{border-color:' + RED + ';color:' + RED + '}',
    '.tdo-c-opt:hover{background:#f0f0f0}',
    '@media (max-width:480px){#tdo-chat-panel{right:8px;left:8px;bottom:84px;width:auto;height:calc(100vh - 100px)}#tdo-chat-launch{right:16px;bottom:16px}}'
  ].join('');
  document.head.appendChild(css);

  // ------------------------------------------------------------- DOM build
  var root = document.createElement('div');
  root.id = 'tdo-chat';
  var CHAT_SVG = '<svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';
  var X_SVG = '<svg viewBox="0 0 24 24"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
  var SEND_SVG = '<svg viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>';
  var AVA = window.tdoChatAvatar || '/images/logo-square-black.png';

  root.innerHTML =
    '<button id="tdo-chat-launch" aria-label="Chat with Sabrina">' +
      '<span class="tdo-ic"><span class="tdo-ic-chat">' + CHAT_SVG + '</span><span class="tdo-ic-x">' + X_SVG + '</span></span>' +
      '<span id="tdo-chat-badge">0</span></button>' +
    '<div id="tdo-chat-panel" role="dialog" aria-label="Chat with Sabrina">' +
      '<div class="tdo-c-head">' +
        '<div class="tdo-c-ava"><img src="' + AVA + '" alt="" onerror="this.style.display=\'none\';this.parentNode.innerHTML=\'<span>S</span>\'"></div>' +
        '<div>' +
          '<div class="tdo-c-title" id="tdo-c-title">Sabrina ✨</div>' +
          '<div class="tdo-c-sub" id="tdo-c-sub"><span class="tdo-c-dot"></span> Tour de Outback support</div>' +
        '</div>' +
        '<button class="tdo-c-x" id="tdo-c-x" aria-label="Close chat">&times;</button>' +
      '</div>' +
      '<div class="tdo-c-gate" id="tdo-c-gate">' +
        '<h4>Before we chat</h4>' +
        '<p class="g-sub" id="tdo-g-sub">So we can address you and keep your conversation, please sign in — or continue as a guest.</p>' +
        '<button class="g-primary" id="tdo-g-signin">Sign in or create an account</button>' +
        '<div class="g-or" id="tdo-g-or">or continue as a guest</div>' +
        '<label for="tdo-g-name">Your name</label>' +
        '<input type="text" id="tdo-g-name" placeholder="First and last name" maxlength="120" autocomplete="name">' +
        '<label for="tdo-g-email">Email</label>' +
        '<input type="email" id="tdo-g-email" placeholder="you@example.com" maxlength="160" autocomplete="email">' +
        '<p class="g-note">We ask for your name and email in case we lose the connection and need to reach you again — we won\'t use them for anything else.</p>' +
        '<div class="g-err" id="tdo-g-err"></div>' +
        '<button class="g-guest" id="tdo-g-start">Start chatting</button>' +
      '</div>' +
      '<div class="tdo-c-body" id="tdo-c-body">' +
        '<div class="tdo-c-intro" id="tdo-c-intro">Hi! I’m Sabrina. Ask me anything about the Oregon Tour de Outback — routes, registration, the schedule, and more.</div>' +
        '<div class="tdo-c-typing" id="tdo-c-typing"><span class="tdo-c-typing-label">Sabrina is typing</span><i></i><i></i><i></i></div>' +
      '</div>' +
      '<div class="tdo-c-foot">' +
        '<div class="tdo-c-inrow">' +
          '<textarea class="tdo-c-in" id="tdo-c-in" rows="1" placeholder="Type your message…" maxlength="2000"></textarea>' +
          '<button class="tdo-c-send" id="tdo-c-send" aria-label="Send">' + SEND_SVG + '</button>' +
        '</div>' +
        '<div class="tdo-c-actions">' +
          '<button class="tdo-c-human" id="tdo-c-human">Talk to a person</button>' +
          '<span class="tdo-c-note">Powered by Claude Haiku 4.5</span>' +
        '</div>' +
      '</div>' +
    '</div>';
  (document.body || document.documentElement).appendChild(root);

  var $ = function (id) { return document.getElementById(id); };
  var elPanel = $('tdo-chat-panel'), elBody = $('tdo-c-body'), elIn = $('tdo-c-in'),
      elSend = $('tdo-c-send'), elTyping = $('tdo-c-typing'), elBadge = $('tdo-chat-badge'),
      elHuman = $('tdo-c-human'), elSub = $('tdo-c-sub'), elTitle = $('tdo-c-title'), elIntro = $('tdo-c-intro'),
      elLaunch = $('tdo-chat-launch'), elGate = $('tdo-c-gate');

  function scrollDown() { elBody.scrollTop = elBody.scrollHeight; }

  // ---- identity gate: require a real name + email before chatting.
  // Being signed in is NOT enough on its own — an account can lack a display
  // name (e.g. email/password signups never set one), which would otherwise
  // let a visitor through with a blank name and show as "Visitor" in the inbox.
  // So we always confirm we actually have both a name and an email, pre-filling
  // whatever the signed-in account already gives us.
  function authUser() { return (window.tdoAuth && window.tdoAuth.currentUser) || null; }
  function validEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
  function isIdentified() { return !!(state.name && state.email); }
  function applyIdentity() {
    var u = authUser();
    if (u) {
      if (u.displayName) { state.name = u.displayName; lsSet(LS.name, state.name); }
      if (u.email) { state.email = u.email; lsSet(LS.email, state.email); }
    }
  }
  // Populate the gate inputs with anything we already know and tailor the copy:
  // a signed-in visitor usually only needs to add the missing piece (a name).
  function prefillGate() {
    var nEl = $('tdo-g-name'), eEl = $('tdo-g-email');
    if (nEl && !nEl.value && state.name) nEl.value = state.name;
    if (eEl && !eEl.value && state.email) eEl.value = state.email;
    var signedIn = !!authUser();
    var sub = $('tdo-g-sub'), signin = $('tdo-g-signin'), or = $('tdo-g-or');
    if (signin) signin.style.display = signedIn ? 'none' : '';
    if (or) or.style.display = signedIn ? 'none' : '';
    if (sub) sub.textContent = signedIn
      ? 'Just add your name so we can address you and keep your conversation.'
      : 'So we can address you and keep your conversation, please sign in — or continue as a guest.';
  }
  function showGate() {
    prefillGate();
    elGate.classList.add('show');
    // Focus the first still-empty field (the name, for signed-in visitors).
    var nEl = $('tdo-g-name'), eEl = $('tdo-g-email');
    var focusEl = (nEl && !nEl.value) ? nEl : ((eEl && !eEl.value) ? eEl : nEl);
    if (focusEl) setTimeout(function () { focusEl.focus(); }, 60);
  }
  function hideGate() { elGate.classList.remove('show'); }
  // Show or dismiss the gate based on the current identity state.
  function maybeGate() {
    applyIdentity();
    if (isIdentified()) { hideGate(); return true; }
    showGate();
    return false;
  }
  function passGuest() {
    var name = $('tdo-g-name').value.trim();
    var email = $('tdo-g-email').value.trim();
    var err = $('tdo-g-err');
    if (name.length < 2) { err.textContent = 'Please enter your name.'; err.classList.add('show'); return; }
    if (!validEmail(email)) { err.textContent = 'Please enter a valid email so we can reach you if we get disconnected.'; err.classList.add('show'); return; }
    err.classList.remove('show');
    state.name = name; state.email = email;
    lsSet(LS.name, name); lsSet(LS.email, email);
    hideGate();
    setTimeout(function () { elIn.focus(); }, 60);
  }

  // --------------------------------------------------------- render messages
  function appendServerMessage(m) {
    if (m.id && state.renderedIds[m.id]) return;
    if (m.id) state.renderedIds[m.id] = true;
    var ts = m.createdAt ? new Date(m.createdAt).getTime() : Date.now();
    if (ts > state.lastTs) state.lastTs = ts;
    if (elIntro) { elIntro.style.display = 'none'; }

    if (m.role === 'system') {
      var s = document.createElement('div');
      s.className = 'tdo-c-sys';
      // Tag the "Connecting you with our team…" notice so it can be replaced by
      // the "<name> has joined the chat" line when a human takes over.
      if (/connecting you with our team/i.test(m.text || '')) s.className += ' tdo-c-connecting';
      s.innerHTML = renderText(m.text);
      elBody.insertBefore(s, elTyping);
      if (/has joined the chat/i.test(m.text || '')) {
        var olds = elBody.querySelectorAll('.tdo-c-connecting');
        for (var i = 0; i < olds.length; i++) { if (olds[i].parentNode) olds[i].parentNode.removeChild(olds[i]); }
      }
      scrollDown();
      return;
    }
    var mine = m.role === 'user';
    var row = document.createElement('div');
    row.className = 'tdo-c-row ' + (mine ? 'me' : 'them');
    var whoName = mine ? '' : (m.role === 'agent' ? (m.senderName || 'Team') : 'Sabrina ✨');
    row.innerHTML =
      (whoName ? '<div class="tdo-c-who">' + esc(whoName) + '</div>' : '') +
      '<div class="tdo-c-bub">' + renderText(m.text) + '</div>' +
      '<div class="tdo-c-time">' + timeLabel(m.createdAt) + '</div>';
    elBody.insertBefore(row, elTyping);
    scrollDown();
  }

  // Optimistic bubble for the visitor's own message (reconciled on next poll).
  var pendingEl = null;
  function showPending(text) {
    if (elIntro) elIntro.style.display = 'none';
    var row = document.createElement('div');
    row.className = 'tdo-c-row me pending';
    row.innerHTML = '<div class="tdo-c-bub">' + renderText(text) + '</div>' +
      '<div class="tdo-c-time">' + timeLabel() + '</div>';
    elBody.insertBefore(row, elTyping);
    pendingEl = row;
    scrollDown();
  }
  function clearPending() { if (pendingEl && pendingEl.parentNode) { pendingEl.parentNode.removeChild(pendingEl); } pendingEl = null; }

  function showTyping(on, who) {
    if (on) {
      var lbl = elTyping.querySelector('.tdo-c-typing-label');
      if (lbl) lbl.textContent = (who || 'Sabrina') + ' is typing';
    }
    elTyping.classList.toggle('show', !!on);
    if (on) scrollDown();
  }
  function setStatusLabel() {
    if (state.status === 'human' || state.status === 'escalated') {
      elSub.innerHTML = '<span class="tdo-c-dot"></span> ' +
        (state.status === 'human' ? 'Connected with our team' : 'Connecting you with our team…');
      elHuman.disabled = true;
      elHuman.textContent = 'A person is helping';
    } else {
      elSub.innerHTML = '<span class="tdo-c-dot"></span> Tour de Outback support';
      elHuman.disabled = false;
      elHuman.textContent = 'Talk to a person';
    }
    // When a human is actively in the chat, show their name + a waving hand;
    // otherwise it's Sabrina (the AI). 'escalated' is still Sabrina — no human yet.
    if (elTitle) {
      elTitle.textContent = state.status === 'human'
        ? (state.adminName || 'Our team') + ' 👋'
        : 'Sabrina ✨';
    }
  }

  // ------------------------------------------------------------ networking
  function postJSON(url, body) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); });
  }

  var sending = false;
  function send() {
    if (!isIdentified()) { maybeGate(); return; }
    var text = elIn.value.trim();
    if (!text || sending) return;
    unlockAudio();
    sending = true;
    elSend.disabled = true;
    elIn.value = '';
    autoGrow();
    showPending(text);
    showTyping(state.status === 'bot', 'Sabrina');
    if (draftTimer) { clearTimeout(draftTimer); draftTimer = null; }
    sendTyping(false);

    var offerHuman = false;
    postJSON(API.chat, {
      conversationId: state.cid,
      message: text,
      visitorId: visitorId,
      visitorName: state.name || undefined,
      visitorEmail: state.email || undefined,
      pageUrl: location.href
    }).then(function (res) {
      if (res.d && res.d.conversationId) {
        var wasNew = !state.cid;
        state.cid = res.d.conversationId;
        lsSet(LS.cid, state.cid);
        if (wasNew && state.open) reportPanel(true); // presence for the new thread
      }
      if (res.d && res.d.status) state.status = res.d.status;
      if (res.d && res.d.offerHuman) offerHuman = true;
      if (!res.ok) {
        showTyping(false);
        appendServerMessage({ role: 'assistant', text: (res.d && res.d.error) || 'Sorry, something went wrong. Please try again.' });
      }
      // Pull authoritative messages (the user's message + Sabrina's reply, with ids).
      return fetchNew();
    }).catch(function () {
      showTyping(false);
      clearPending();
      appendServerMessage({ role: 'assistant', text: "I couldn't reach the server. Please check your connection and try again." });
    }).then(function () {
      showTyping(false);
      setStatusLabel();
      sending = false;
      elSend.disabled = false;
      ensurePolling();
      armNudge();
      // Sabrina (or the visitor's wording) asked for a human → show Chat/Email choice.
      if (offerHuman) showHumanOptions();
    });
  }

  // Fetch messages newer than what we've rendered; reconcile pending bubble.
  function fetchNew() {
    if (!state.cid) return Promise.resolve();
    var since = state.lastTs ? new Date(state.lastTs).toISOString() : new Date(0).toISOString();
    return postJSON(API.poll, { conversationId: state.cid, since: since }).then(function (res) {
      if (!res.ok || !res.d) return;
      if (res.d.status) state.status = res.d.status;
      state.adminName = res.d.adminName || '';
      var msgs = res.d.messages || [];
      var fresh = msgs.filter(function (m) { return !(m.id && state.renderedIds[m.id]); });
      if (fresh.length) clearPending();
      var away = visitorAway();
      fresh.forEach(function (m) {
        appendServerMessage(m);
        if (!state.open && (m.role === 'agent' || m.role === 'assistant' || m.role === 'system')) bumpBadge();
        // Ping once per human (agent) message when the visitor isn't looking.
        if (m.role === 'agent' && away) playPing();
      });
      // Admin (human) typing indicator.
      if (state.status === 'human' && res.d.adminTyping) showTyping(true, res.d.adminName || 'Our team');
      else if (state.status !== 'bot') showTyping(false);
      setStatusLabel();
    }).catch(function () {});
  }

  // Poll while the panel is open OR a human is involved (to receive replies).
  function ensurePolling() {
    if (state.polling) return;
    var tick = function () {
      var shouldPoll = state.open || state.status === 'human' || state.status === 'escalated';
      if (shouldPoll && state.cid) fetchNew();
    };
    state.polling = setInterval(tick, 4000);
  }

  // ------------------------------------------------------------- typing out
  function sendTyping(on) {
    if (!state.cid) return;
    var now = Date.now();
    if (on && now - state.lastTypingSent < 2500) return; // throttle
    state.lastTypingSent = now;
    postJSON(API.typing, { conversationId: state.cid, typing: !!on }).catch(function () {});
  }
  // Mirror the visitor's in-progress text to the admin (debounced), so the team
  // can see what's being typed before it's sent. Cleared server-side on send.
  var draftTimer = null;
  function scheduleDraft() {
    if (!state.cid) return;
    if (draftTimer) clearTimeout(draftTimer);
    draftTimer = setTimeout(function () {
      if (!state.cid) return;
      postJSON(API.typing, { conversationId: state.cid, typing: true, draft: elIn.value.slice(0, 4000) }).catch(function () {});
    }, 350);
  }

  // ------------------------------------------------- presence (open/closed)
  // Tell the server whether the visitor currently has the chat window open, so
  // the admin can see when they open and close it.
  function reportPanel(open) {
    if (!state.cid) return;
    postJSON(API.typing, { conversationId: state.cid, panelOpen: !!open }).catch(function () {});
  }

  // --------------------------------------------------- new-message sound alert
  // A short ping when a human's message arrives while the visitor isn't looking
  // at the chat (tab hidden or panel closed). Web Audio needs a prior user
  // gesture, so we unlock the context the first time they interact.
  var audioCtx = null;
  function unlockAudio() {
    try {
      if (!audioCtx) { var AC = window.AudioContext || window.webkitAudioContext; if (AC) audioCtx = new AC(); }
      if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    } catch (e) { /* ignore */ }
  }
  function playPing() {
    try {
      if (!audioCtx) return;
      var t = audioCtx.currentTime;
      var o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.connect(g); g.connect(audioCtx.destination);
      o.type = 'sine'; o.frequency.setValueAtTime(880, t); o.frequency.setValueAtTime(1245, t + 0.1);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.16, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.start(t); o.stop(t + 0.37);
    } catch (e) { /* ignore */ }
  }
  function visitorAway() { return document.hidden || !state.open; }

  // ---------------------------------------------------------- escalation
  function escalate() {
    if (state.status === 'human' || state.status === 'escalated') return;
    elHuman.disabled = true;
    postJSON(API.escalate, { conversationId: state.cid, reason: 'Visitor clicked "Talk to a person"' })
      .then(function (res) {
        if (res.d && res.d.status) state.status = res.d.status;
        setStatusLabel();
        ensurePolling();
        return fetchNew();
      }).catch(function () { setStatusLabel(); });
  }

  // "Talk to a person" → let the visitor choose Chat (escalate to a human) or Email.
  function showHumanOptions() {
    if (state.status === 'human' || state.status === 'escalated') return;
    if (document.getElementById('tdo-c-human-opts')) { scrollDown(); return; }
    if (elIntro) elIntro.style.display = 'none';
    var card = document.createElement('div');
    card.className = 'tdo-c-opts';
    card.id = 'tdo-c-human-opts';
    card.innerHTML =
      '<div class="o-q">How would you like to reach our team?</div>' +
      '<button class="tdo-c-opt" data-opt="chat">💬 Chat with a person</button>' +
      '<a class="tdo-c-opt" data-opt="email" href="mailto:info@tourdeoutback.org?subject=Tour%20de%20Outback%20question">✉️ Email us (info@tourdeoutback.org)</a>';
    elBody.insertBefore(card, elTyping);
    scrollDown();
    card.querySelector('[data-opt="chat"]').addEventListener('click', function () {
      if (card.parentNode) card.parentNode.removeChild(card);
      escalate();
    });
    card.querySelector('[data-opt="email"]').addEventListener('click', function () {
      appendServerMessage({ role: 'assistant', text: "Opening your email app to reach info@tourdeoutback.org. If it doesn't open, just email us there directly." });
    });
  }

  // --------------------------------------------------- re-engagement nudge
  function armNudge() {
    if (state.nudgeTimer) clearTimeout(state.nudgeTimer);
    if (state.nudged) return;
    state.nudgeTimer = setTimeout(function () {
      if (state.nudged) return;
      // Only nudge if there's an active thread and the visitor has gone quiet.
      if (!state.cid) return;
      state.nudged = true;
      appendServerMessage({
        role: state.status === 'human' ? 'agent' : 'assistant',
        text: state.status === 'human'
          ? 'Are you still there? Feel free to reply whenever you’re ready — we’re here to help.'
          : 'Still there? I’m happy to help with routes, registration, or anything else about the ride. 🚴',
        senderName: state.status === 'human' ? 'Team' : 'Sabrina'
      });
      if (!state.open) bumpBadge();
    }, 10 * 60 * 1000); // ~10 minutes
  }
  function resetNudge() {
    state.nudged = false;
    if (state.nudgeTimer) { clearTimeout(state.nudgeTimer); state.nudgeTimer = null; }
  }

  // ------------------------------------------------------------- badge/open
  function bumpBadge() {
    state.unread += 1;
    elBadge.textContent = state.unread > 9 ? '9+' : String(state.unread);
    elBadge.style.display = 'block';
  }
  function clearBadge() { state.unread = 0; elBadge.style.display = 'none'; }

  function openPanel() {
    state.open = true;
    unlockAudio();
    elPanel.classList.add('open');
    elLaunch.classList.add('open');
    elLaunch.setAttribute('aria-label', 'Minimize chat');
    clearBadge();
    setStatusLabel();
    maybeGate();
    if (!state.booted) { state.booted = true; if (state.cid) fetchNew(); }
    ensurePolling();
    reportPanel(true);
    setTimeout(function () { if (!elGate.classList.contains('show')) elIn.focus(); scrollDown(); }, 60);
  }
  function closePanel() {
    state.open = false;
    elPanel.classList.remove('open');
    elLaunch.classList.remove('open');
    elLaunch.setAttribute('aria-label', 'Chat with Sabrina');
    reportPanel(false);
  }
  function toggle() { state.open ? closePanel() : openPanel(); }

  // ----------------------------------------------------------------- input
  function autoGrow() { elIn.style.height = 'auto'; elIn.style.height = Math.min(elIn.scrollHeight, 96) + 'px'; }
  elIn.addEventListener('input', function () {
    autoGrow();
    resetNudge();
    if (elIn.value.trim()) sendTyping(true);
    scheduleDraft();
  });
  elIn.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });
  elSend.addEventListener('click', send);
  elHuman.addEventListener('click', showHumanOptions);
  // Identity gate wiring
  $('tdo-g-signin').addEventListener('click', function () { if (window.tdoOpenAuth) window.tdoOpenAuth(); });
  $('tdo-g-start').addEventListener('click', passGuest);
  $('tdo-g-name').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); $('tdo-g-email').focus(); } });
  $('tdo-g-email').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); passGuest(); } });
  // If the visitor signs in via the modal while the gate is open, dismiss it.
  window.addEventListener('tdo-auth-changed', function () {
    if (state.open) { maybeGate(); if (!elGate.classList.contains('show')) setTimeout(function () { elIn.focus(); }, 60); }
  });
  $('tdo-c-x').addEventListener('click', closePanel);
  $('tdo-chat-launch').addEventListener('click', toggle);

  // Public opener (parity with window.tdoOpenAuth) so other UI can open the chat.
  window.tdoOpenChat = openPanel;

  // If a human was already helping (returning visitor), keep polling in background.
  if (state.cid) ensurePolling();

  // ----------------------------------------------------------- admin gate
  // The floating widget is for visitors and riders — admins don't need it. We
  // hide it for any signed-in admin, and leave it untouched for everyone else.
  // Auth state is resolved asynchronously by auth-widget.js and shared via
  // window.tdoAuth, which carries an `isAdmin` flag it derives from the cached
  // token claim (no extra network for non-admins). We re-check on every
  // `tdo-auth-changed` so this stays correct across sign-in / sign-out.
  function applyAdminGate() {
    if (window.tdoAuth && window.tdoAuth.isAdmin) {
      if (state.open) closePanel();
      if (state.polling) { clearInterval(state.polling); state.polling = null; }
      root.style.display = 'none';
    } else {
      root.style.display = '';
    }
  }
  window.addEventListener('tdo-auth-changed', applyAdminGate);
  applyAdminGate(); // in case auth resolved before this script loaded
})();
