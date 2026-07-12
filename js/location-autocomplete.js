// Structured State + City location picker for the survey pages.
// - State: type-ahead over all 50 states + DC. Typing an abbreviation ("OR")
//   narrows fast; selecting stores the 2-letter code in a hidden <input name="state">.
// - City: type-ahead over cities in the chosen state (data lazy-loaded from
//   /js/us-cities.min.js on first focus). Free text is allowed if not listed.
// Exposes window.TDOLocation { getCode, getCity, validate(required) }.
// validate(true) requires BOTH a state and a city.
(function () {
  var STATES = [
    ["AL","Alabama"],["AK","Alaska"],["AZ","Arizona"],["AR","Arkansas"],["CA","California"],
    ["CO","Colorado"],["CT","Connecticut"],["DE","Delaware"],["DC","District of Columbia"],
    ["FL","Florida"],["GA","Georgia"],["HI","Hawaii"],["ID","Idaho"],["IL","Illinois"],
    ["IN","Indiana"],["IA","Iowa"],["KS","Kansas"],["KY","Kentucky"],["LA","Louisiana"],
    ["ME","Maine"],["MD","Maryland"],["MA","Massachusetts"],["MI","Michigan"],["MN","Minnesota"],
    ["MS","Mississippi"],["MO","Missouri"],["MT","Montana"],["NE","Nebraska"],["NV","Nevada"],
    ["NH","New Hampshire"],["NJ","New Jersey"],["NM","New Mexico"],["NY","New York"],
    ["NC","North Carolina"],["ND","North Dakota"],["OH","Ohio"],["OK","Oklahoma"],["OR","Oregon"],
    ["PA","Pennsylvania"],["RI","Rhode Island"],["SC","South Carolina"],["SD","South Dakota"],
    ["TN","Tennessee"],["TX","Texas"],["UT","Utah"],["VT","Vermont"],["VA","Virginia"],
    ["WA","Washington"],["WV","West Virginia"],["WI","Wisconsin"],["WY","Wyoming"]
  ];
  var CITIES = null, citiesLoading = false;

  function loadCities() {
    if (window.TDO_CITIES) { CITIES = window.TDO_CITIES; return; }
    if (citiesLoading) return;
    citiesLoading = true;
    var s = document.createElement('script');
    s.src = '/js/us-cities.min.js';
    s.onload = function () { CITIES = window.TDO_CITIES || {}; };
    s.onerror = function () { CITIES = {}; };
    document.head.appendChild(s);
  }

  var style = document.createElement('style');
  style.textContent =
    '.ac-wrap{position:relative}' +
    '.ac-list{position:absolute;top:100%;left:0;right:0;z-index:50;background:#fff;border:1px solid #ddd;border-top:none;' +
      'border-radius:0 0 6px 6px;max-height:240px;overflow-y:auto;box-shadow:0 6px 18px rgba(0,0,0,.12);display:none}' +
    '.ac-list.show{display:block}' +
    '.ac-item{padding:9px 13px;cursor:pointer;font-size:0.95rem;color:#333;font-family:\'Open Sans\',sans-serif}' +
    '.ac-item:hover,.ac-item.active{background:#fdeaea;color:#cc0000}' +
    '.ac-wrap input:disabled{background:#f1f1f1;color:#999;cursor:not-allowed}';
  document.head.appendChild(style);

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function autocomplete(input, list, getItems, onSelect, onType) {
    var items = [], active = -1;
    function render() {
      items = getItems(input.value.trim());
      if (!items.length) { list.classList.remove('show'); list.innerHTML = ''; return; }
      list.innerHTML = items.map(function (it, i) { return '<div class="ac-item" data-i="' + i + '">' + esc(it.label) + '</div>'; }).join('');
      active = -1;
      list.classList.add('show');
    }
    function close() { list.classList.remove('show'); active = -1; }
    input.addEventListener('input', function () { if (onType) onType(); render(); });
    input.addEventListener('focus', render);
    input.addEventListener('keydown', function (e) {
      if (!list.classList.contains('show')) return;
      var nodes = list.querySelectorAll('.ac-item');
      if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(active + 1, nodes.length - 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(active - 1, 0); }
      else if (e.key === 'Enter') { if (active >= 0) { e.preventDefault(); onSelect(items[active]); close(); } return; }
      else if (e.key === 'Escape') { close(); return; }
      else return;
      nodes.forEach(function (n, i) { n.classList.toggle('active', i === active); });
      if (nodes[active]) nodes[active].scrollIntoView({ block: 'nearest' });
    });
    list.addEventListener('mousedown', function (e) {
      var it = e.target.closest('.ac-item'); if (!it) return;
      e.preventDefault();
      onSelect(items[+it.getAttribute('data-i')]); close();
    });
    document.addEventListener('click', function (e) { if (e.target !== input && !list.contains(e.target)) close(); });
  }

  function clearInvalid() {
    var block = document.getElementById('locationBlock');
    var err = document.getElementById('locationError');
    if (block) block.classList.remove('q-invalid');
    if (err) err.hidden = true;
  }

  // City field is locked until a state is chosen, then it only searches that state.
  function setCityEnabled(on) {
    var city = document.getElementById('cityInput');
    if (!city) return;
    city.disabled = !on;
    city.placeholder = on ? 'City — type to search' : 'Choose a state first';
    if (!on) city.value = '';
  }

  function initState() {
    var input = document.getElementById('stateInput');
    var codeEl = document.getElementById('stateCode');
    var list = document.getElementById('stateList');
    var cityInput = document.getElementById('cityInput');
    if (!input || !codeEl || !list) return;
    autocomplete(input, list,
      function (q) {
        var ql = q.toLowerCase();
        var res = STATES.filter(function (s) {
          return !ql || s[0].toLowerCase().indexOf(ql) === 0 || s[1].toLowerCase().indexOf(ql) !== -1;
        });
        res.sort(function (a, b) {
          var ap = a[0].toLowerCase().indexOf(ql) === 0 ? 0 : 1;
          var bp = b[0].toLowerCase().indexOf(ql) === 0 ? 0 : 1;
          if (ap !== bp) return ap - bp;
          return a[1] < b[1] ? -1 : 1;
        });
        return res.slice(0, 8).map(function (s) { return { label: s[1] + ' (' + s[0] + ')', code: s[0], name: s[1] }; });
      },
      function (item) {
        input.value = item.name + ' (' + item.code + ')';
        codeEl.value = item.code;
        clearInvalid();
        setCityEnabled(true);
        if (cityInput) cityInput.focus();
      },
      function () { codeEl.value = ''; setCityEnabled(false); }
    );
    input.addEventListener('blur', function () {
      setTimeout(function () {
        if (codeEl.value) return;
        var v = input.value.trim().toLowerCase();
        if (!v) return;
        var m = STATES.filter(function (s) {
          return s[0].toLowerCase() === v || s[1].toLowerCase() === v || (s[1] + ' (' + s[0] + ')').toLowerCase() === v;
        })[0];
        if (m) { codeEl.value = m[0]; input.value = m[1] + ' (' + m[0] + ')'; setCityEnabled(true); }
      }, 160);
    });
  }

  function initCity() {
    var input = document.getElementById('cityInput');
    var list = document.getElementById('cityList');
    var codeEl = document.getElementById('stateCode');
    if (!input || !list) return;
    input.addEventListener('focus', loadCities);
    // Typing or picking a city clears the "enter your city" error.
    input.addEventListener('input', function () { if (input.value.trim()) clearInvalid(); });
    autocomplete(input, list,
      function (q) {
        var code = codeEl ? codeEl.value : '';
        if (!code || !CITIES || !CITIES[code]) return [];
        var arr = CITIES[code];
        var ql = q.toLowerCase();
        var out = [];
        for (var i = 0; i < arr.length && out.length < 10; i++) {
          if (!ql || arr[i].toLowerCase().indexOf(ql) === 0) out.push(arr[i]);
        }
        return out.map(function (c) { return { label: c, city: c }; });
      },
      function (item) { input.value = item.city; clearInvalid(); }
    );
  }

  window.TDOLocation = {
    getCode: function () { var el = document.getElementById('stateCode'); return el ? el.value : ''; },
    getCity: function () { var el = document.getElementById('cityInput'); return el ? el.value.trim() : ''; },
    validate: function (required) {
      var block = document.getElementById('locationBlock');
      var err = document.getElementById('locationError');
      var noState = !this.getCode();
      var noCity = !this.getCity();
      var bad = !!required && (noState || noCity);
      if (err) {
        err.textContent = noState ? 'Please choose your state.' : 'Please enter your city.';
        err.hidden = !bad;
      }
      if (block) block.classList.toggle('q-invalid', bad);
      return !bad;
    }
  };

  function boot() {
    initState();
    initCity();
    var codeEl = document.getElementById('stateCode');
    setCityEnabled(!!(codeEl && codeEl.value)); // locked until a state is picked
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
