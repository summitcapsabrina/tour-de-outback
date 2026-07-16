/* ============================================
   Tour de Outback — Main JavaScript
   ============================================ */

// --- Countdown Timer ---
function initCountdown() {
  const eventDate = new Date('2027-06-26T07:00:00-07:00').getTime();
  const daysEl = document.getElementById('countdown-days');
  const hoursEl = document.getElementById('countdown-hours');
  const minsEl = document.getElementById('countdown-mins');
  const secsEl = document.getElementById('countdown-secs');

  if (!daysEl) return;

  function update() {
    const now = new Date().getTime();
    const diff = eventDate - now;

    if (diff <= 0) {
      daysEl.textContent = '0';
      hoursEl.textContent = '0';
      minsEl.textContent = '0';
      secsEl.textContent = '0';
      return;
    }

    daysEl.textContent = Math.floor(diff / (1000 * 60 * 60 * 24));
    hoursEl.textContent = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    minsEl.textContent = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    secsEl.textContent = Math.floor((diff % (1000 * 60)) / 1000);
  }

  update();
  setInterval(update, 1000);
}

// --- Mobile Navigation Toggle ---
function initMobileNav() {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');

  if (!toggle || !links) return;

  toggle.addEventListener('click', () => {
    toggle.classList.toggle('active');
    links.classList.toggle('open');
  });

  // Close menu when a link is clicked
  links.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      toggle.classList.remove('active');
      links.classList.remove('open');
    });
  });
}

// --- Navbar Scroll Effect ---
function initNavScroll() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });
}

// --- FAQ Accordion ---
function initFAQ() {
  const items = document.querySelectorAll('.faq-item');

  items.forEach(item => {
    const question = item.querySelector('.faq-question');
    if (!question) return;

    question.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');

      // Close all
      items.forEach(i => i.classList.remove('open'));

      // Open clicked (if it wasn't already open)
      if (!isOpen) {
        item.classList.add('open');
      }
    });
  });
}

// --- Active Nav Link ---
function setActiveNav() {
  const path = window.location.pathname;
  const navLinks = document.querySelectorAll('.nav-links a:not(.btn)');

  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (
      (href === '/' && (path === '/' || path === '/index.html')) ||
      (href !== '/' && path.startsWith(href.replace(/\/$/, '')))
    ) {
      link.classList.add('active');
    }
  });
}

// --- Newsletter Form (EmailOctopus Embedded) ---
// EmailOctopus handles the form itself via its embedded script (submit, validation,
// reCAPTCHA). On a successful signup EO redirects to ?eo_subscribed=1 (configured in
// the EO form settings) — we fire the Google Ads "Email sign-up" conversion on return,
// then strip the flag so a reload/bookmark can't re-fire it.
function initNewsletter() {
  if (!/[?&]eo_subscribed=1/.test(location.search)) return;
  if (typeof gtag === 'function') {
    gtag('event', 'conversion', { 'send_to': 'AW-11006704390/-3_RCM7OgdAcEIb2s4Ap' });
  }
  try {
    var url = new URL(location.href);
    url.searchParams.delete('eo_subscribed');
    history.replaceState(null, '', url.pathname + url.search + url.hash);
  } catch (e) {}
}

// --- Register Button Click Tracking (GA4 + Google Ads + Meta Pixel) ---
function initRegisterTracking() {
  document.querySelectorAll('a[href*="bikereg.com"]').forEach(link => {
    link.addEventListener('click', function(e) {
      if (typeof gtag === 'function') {
        // GA4 event
        gtag('event', 'register_click', {
          event_category: 'conversion',
          event_label: link.textContent.trim(),
          transport_type: 'beacon'
        });
        // Google Ads conversion
        gtag('event', 'conversion', {
          'send_to': 'AW-11006704390/jCTGCNvHjLAcEIb2s4Ap'
        });
      }
      // Meta Pixel Lead event
      if (typeof fbq === 'function') {
        fbq('track', 'Lead', {
          content_name: link.textContent.trim()
        });
      }
    });
  });
}

// --- Weather Widget (NWS API — Lakeview, OR) ---
function initWeather() {
  var widget = document.getElementById('weather-widget');
  if (!widget) return;

  var nwsHeaders = { 'Accept': 'application/geo+json', 'User-Agent': 'TourDeOutback/1.0 (sabrina@summitcapllc.com)' };
  var currentObsIcon = null; // syncs header icon to first forecast card
  var currentObsTemp = null; // syncs header temp to first forecast card
  var todayHigh = null; // today's forecast high for first card
  var todayLow = null; // today's forecast low for first card
  var obsHigh = null; // observed high from station (last 24h)

  function buildCompass(windDir, windSpeed) {
    return '<svg class="wind-compass-svg" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">' +
      '<text x="25" y="12" text-anchor="middle" font-size="9" font-weight="700" fill="rgba(255,255,255,0.7)" font-family="sans-serif">N</text>' +
      '<text x="25" y="46" text-anchor="middle" font-size="9" font-weight="700" fill="rgba(255,255,255,0.5)" font-family="sans-serif">S</text>' +
      '<text x="5" y="29" text-anchor="middle" font-size="9" font-weight="700" fill="rgba(255,255,255,0.5)" font-family="sans-serif">W</text>' +
      '<text x="45" y="29" text-anchor="middle" font-size="9" font-weight="700" fill="rgba(255,255,255,0.5)" font-family="sans-serif">E</text>' +
      '<g transform="rotate(' + windDir + ' 25 25)">' +
        '<polygon points="25,3 22,14 25,12 28,14" fill="#cc0000"/>' +
      '</g>' +
      '<text x="25" y="29" text-anchor="middle" font-size="13" font-weight="700" fill="rgba(255,255,255,0.9)" font-family="sans-serif">' + windSpeed + '</text>' +
    '</svg>';
  }

  function renderWeather(icon, temp, windSpeed, windDir, windGusts) {
    // Header shows icon + temp + arrow only. The wind compass lives solely in the
    // dropdown forecast cards (buildForecastCompass), not in the header.
    var html = '<span class="weather-current" role="button" tabindex="0">' +
        '<span class="weather-main">' +
          '<span class="weather-icon">' + icon + '</span> ' +
          '<span class="weather-temp">' + temp + '°F</span>' +
        '</span>' +
        '<span class="weather-arrow">▾</span></span>';
    // Preserve existing forecast dropdown if present
    var existing = widget.querySelector('.forecast-dropdown');
    var dd = existing ? existing.outerHTML : '<div class="forecast-dropdown"></div>';
    widget.innerHTML = html + dd;
    // Attach click toggle
    var current = widget.querySelector('.weather-current');
    if (current) {
      current.addEventListener('click', function(e) {
        e.stopPropagation();
        widget.classList.toggle('forecast-open');
      });
    }
  }

  // Render the widget shell immediately (header placeholder + empty dropdown with
  // a loading state) so the dropdown is never blank if the user clicks it before
  // fresh data arrives.
  function renderShell() {
    var existing = widget.querySelector('.forecast-dropdown');
    var ddHTML = existing
      ? existing.outerHTML
      : '<div class="forecast-dropdown"><div class="forecast-loading">Loading forecast…</div></div>';
    widget.innerHTML =
      '<span class="weather-current" role="button" tabindex="0">' +
        '<span class="weather-main">' +
          '<span class="weather-icon">⛅</span> ' +
          '<span class="weather-temp">--°</span>' +
        '</span>' +
        '<span class="weather-arrow">▾</span>' +
      '</span>' + ddHTML;
    var current = widget.querySelector('.weather-current');
    if (current) {
      current.addEventListener('click', function(e) {
        e.stopPropagation();
        widget.classList.toggle('forecast-open');
      });
    }
  }
  renderShell();

  // Apply cached observation data instantly (no fetch wait)
  var cached = sessionStorage.getItem('weatherData');
  if (cached) {
    var c = JSON.parse(cached);
    currentObsIcon = c.icon;
    currentObsTemp = c.temp;
    renderWeather(c.icon, c.temp, c.windSpeed, c.windDir, c.windGusts);
  }

  // NWS weather description to emoji.
  // IMPORTANT: only use widely-supported emoji (Unicode <= 6.1). The extended
  // "weather" set (U+1F324–U+1F32B: 🌤️ 🌥️ 🌧️ 🌫️) and 🥶 (Emoji 5.0) render as a
  // tofu box on many devices/browsers, which is why the widget periodically showed
  // a square. ☀️ ⛅ ☁️ ☔ ⛈️ ❄️ 🌁 💨 🌙 all have universal coverage.
  function weatherToIcon(desc, isNight) {
    if (!desc) return isNight ? '🌙' : '☀️';
    var d = desc.toLowerCase();
    if (d.indexOf('snow') !== -1 || d.indexOf('blizzard') !== -1 || d.indexOf('sleet') !== -1 || d.indexOf('flurr') !== -1) return '❄️';
    if (d.indexOf('ice') !== -1 || d.indexOf('freez') !== -1 || d.indexOf('frost') !== -1) return '❄️';
    if (d.indexOf('thunder') !== -1 || d.indexOf('lightning') !== -1) return '⛈️';
    if (d.indexOf('rain') !== -1 || d.indexOf('drizzle') !== -1 || d.indexOf('shower') !== -1) return '☔';
    if (d.indexOf('fog') !== -1 || d.indexOf('mist') !== -1 || d.indexOf('haze') !== -1 || d.indexOf('smoke') !== -1) return '🌁';
    if (d.indexOf('overcast') !== -1) return '☁️';
    if (d.indexOf('mostly cloudy') !== -1 || d.indexOf('considerable') !== -1) return '☁️';
    if (d.indexOf('partly') !== -1 || d.indexOf('scattered') !== -1) return isNight ? '☁️' : '⛅';
    if (d.indexOf('cloudy') !== -1 || d.indexOf('cloud') !== -1) return '☁️';
    if (d.indexOf('few clouds') !== -1 || d.indexOf('mostly clear') !== -1 || d.indexOf('mostly sunny') !== -1) return isNight ? '🌙' : '⛅';
    if (d.indexOf('sunny') !== -1 || d.indexOf('clear') !== -1 || d.indexOf('fair') !== -1) return isNight ? '🌙' : '☀️';
    if (d.indexOf('wind') !== -1 || d.indexOf('breezy') !== -1 || d.indexOf('blust') !== -1) return '💨';
    if (d.indexOf('dust') !== -1 || d.indexOf('sand') !== -1) return '🌁';
    if (d.indexOf('hot') !== -1) return '☀️';
    if (d.indexOf('cold') !== -1 || d.indexOf('frigid') !== -1 || d.indexOf('chill') !== -1) return '❄️';
    return isNight ? '🌙' : '☀️';
  }

  // Celsius to Fahrenheit
  function cToF(c) { return Math.round(c * 9 / 5 + 32); }
  // km/h to mph
  function kmhToMph(kmh) { return Math.round(kmh * 0.6214); }

  // Convert compass direction text (e.g., "SW") to degrees
  function dirToDeg(dir) {
    var map = { N:0, NNE:22, NE:45, ENE:67, E:90, ESE:112, SE:135, SSE:157, S:180, SSW:202, SW:225, WSW:247, W:270, WNW:292, NW:315, NNW:337 };
    return map[dir] !== undefined ? map[dir] : 0;
  }

  // Parse first number from wind speed string like "10 to 15 mph"
  function parseWindSpeed(str) {
    var m = str.match(/(\d+)/);
    return m ? m[1] : '';
  }

  // Build compass for forecast cards (dark background version)
  function buildForecastCompass(windDirText, windSpeedStr) {
    var deg = dirToDeg(windDirText);
    var speed = parseWindSpeed(windSpeedStr);
    return '<div class="forecast-compass">' +
      '<svg class="wind-compass-svg forecast-compass-svg" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">' +
      '<text x="25" y="12" text-anchor="middle" font-size="9" font-weight="700" fill="rgba(255,255,255,0.7)" font-family="sans-serif">N</text>' +
      '<text x="25" y="46" text-anchor="middle" font-size="9" font-weight="700" fill="rgba(255,255,255,0.5)" font-family="sans-serif">S</text>' +
      '<text x="5" y="29" text-anchor="middle" font-size="9" font-weight="700" fill="rgba(255,255,255,0.5)" font-family="sans-serif">W</text>' +
      '<text x="45" y="29" text-anchor="middle" font-size="9" font-weight="700" fill="rgba(255,255,255,0.5)" font-family="sans-serif">E</text>' +
      '<g transform="rotate(' + deg + ' 25 25)">' +
        '<polygon points="25,2 20,14 25,11 30,14" fill="#cc0000"/>' +
      '</g>' +
      '<text x="25" y="29" text-anchor="middle" font-size="13" font-weight="700" fill="rgba(255,255,255,0.9)" font-family="sans-serif">' + speed + '</text>' +
    '</svg>' +
    '<span class="forecast-compass-label">' + windSpeedStr + ' ' + windDirText + '</span>' +
    '</div>';
  }

  // Format NWS forecast periods into day cards (group day+night pairs)
  function buildForecast(periods) {
    var days = [];
    var i = 0;
    // If first period is tonight, start with it
    while (i < periods.length && days.length < 3) {
      var p = periods[i];
      var day = { name: '', date: '', icon: '', high: null, low: null, precip: '', windSpeed: '', windDir: '', desc: '' };
      if (p.isDaytime) {
        day.name = p.name;
        day.icon = weatherToIcon(p.shortForecast, false);
        day.high = p.temperature;
        day.windSpeed = p.windSpeed;
        day.windDir = p.windDirection;
        day.desc = p.detailedForecast;
        day.precip = p.probabilityOfPrecipitation && p.probabilityOfPrecipitation.value !== null ? p.probabilityOfPrecipitation.value + '% Precip.' : '';
        // Parse date from startTime
        var dt = new Date(p.startTime);
        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        var dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        day.date = dayNames[dt.getDay()] + ' ' + months[dt.getMonth()] + ' ' + dt.getDate();
        // Check for matching night
        if (i + 1 < periods.length && !periods[i + 1].isDaytime) {
          day.low = periods[i + 1].temperature;
          i += 2;
        } else {
          i++;
        }
      } else {
        // Night-only period (e.g., "Tonight")
        day.name = p.name;
        day.icon = weatherToIcon(p.shortForecast, true);
        day.low = p.temperature;
        day.windSpeed = p.windSpeed;
        day.windDir = p.windDirection;
        day.desc = p.detailedForecast;
        day.precip = p.probabilityOfPrecipitation && p.probabilityOfPrecipitation.value !== null ? p.probabilityOfPrecipitation.value + '% Precip.' : '';
        var dt2 = new Date(p.startTime);
        var months2 = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        var dayNames2 = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        day.date = dayNames2[dt2.getDay()] + ' ' + months2[dt2.getMonth()] + ' ' + dt2.getDate();
        i++;
      }
      // Store today's high/low from the first card
      if (days.length === 0) {
        todayHigh = day.high;
        todayLow = day.low;
      }
      days.push(day);
    }

    var html = '<div class="forecast-header">3-Day Forecast — Lakeview, OR</div><div class="forecast-cards">';
    for (var j = 0; j < days.length; j++) {
      var d = days[j];
      html += '<div class="forecast-card">' +
        '<div class="forecast-day">' + d.name + '</div>' +
        '<div class="forecast-date">' + d.date + '</div>' +
        '<div class="forecast-card-icon">' + d.icon + '</div>' +
        '<div class="forecast-temps">' +
          (d.high !== null ? '<span class="forecast-high">High ' + d.high + '°F</span>' : '') +
          (d.low !== null ? '<span class="forecast-low">Low ' + d.low + '°F</span>' : '') +
        '</div>' +
        (d.precip ? '<div class="forecast-precip">' + d.precip + '</div>' : '') +
        buildForecastCompass(d.windDir, d.windSpeed) +
        '<div class="forecast-desc">' + d.desc + '</div>' +
      '</div>';
    }
    html += '</div>';
    return html;
  }

  // Sync first forecast card with current observations
  function syncFirstCard() {
    var firstCard = widget.querySelector('.forecast-card');
    if (!firstCard) return;
    // Replace period name with "Now XX°F"
    if (currentObsTemp !== null) {
      var dayEl = firstCard.querySelector('.forecast-day');
      if (dayEl) dayEl.innerHTML = 'Now ' + currentObsTemp + '°F';
    }
    // Sync icon
    if (currentObsIcon) {
      var iconEl = firstCard.querySelector('.forecast-card-icon');
      if (iconEl) iconEl.textContent = currentObsIcon;
    }
    // Show today's forecast high/low below icon (only if we have forecast data)
    var high = todayHigh !== null ? todayHigh : obsHigh;
    if (high !== null || todayLow !== null) {
      var tempsEl = firstCard.querySelector('.forecast-temps');
      if (tempsEl) {
        var html = '';
        if (high !== null) html += '<span class="forecast-high">High ' + high + '°F</span>';
        if (todayLow !== null) html += '<span class="forecast-low">Low ' + todayLow + '°F</span>';
        tempsEl.innerHTML = html;
      }
    }
  }

  // Apply cached forecast immediately — dropdown shell exists from renderShell(),
  // so it's safe to populate even if obs fetch hasn't returned yet.
  var cachedForecast = sessionStorage.getItem('weatherForecast');
  if (cachedForecast) {
    var cf = JSON.parse(cachedForecast);
    var dd0 = widget.querySelector('.forecast-dropdown');
    if (dd0) {
      dd0.innerHTML = cf.html;
      var firstCachedCard = dd0.querySelector('.forecast-card');
      if (firstCachedCard) {
        var hEl = firstCachedCard.querySelector('.forecast-high');
        var lEl = firstCachedCard.querySelector('.forecast-low');
        if (hEl && todayHigh === null) { var hm = hEl.textContent.match(/(\d+)/); if (hm) todayHigh = parseInt(hm[1], 10); }
        if (lEl && todayLow === null) { var lm = lEl.textContent.match(/(\d+)/); if (lm) todayLow = parseInt(lm[1], 10); }
      }
    }
  }

  // Fetch wrapper — called on init, hourly, and when the tab becomes visible
  // again after >1h. Pulls observations, forecast, and grid data in parallel.
  var lastFetch = 0;
  function loadWeatherData() {
    lastFetch = Date.now();

    // Lakeview Airport station (KLKV) — actual observed conditions
    fetch('https://api.weather.gov/stations/KLKV/observations/latest', { headers: nwsHeaders })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        var p = data.properties;
        var temp = p.temperature && p.temperature.value !== null ? cToF(p.temperature.value) : null;
        var nowHour = new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Los_Angeles' });
        var isNightNow = parseInt(nowHour, 10) >= 20 || parseInt(nowHour, 10) < 6;
        var icon = weatherToIcon(p.textDescription, isNightNow);
        if (p.maxTemperatureLast24Hours && p.maxTemperatureLast24Hours.value !== null) {
          obsHigh = cToF(p.maxTemperatureLast24Hours.value);
        }
        var windSpeed = p.windSpeed && p.windSpeed.value !== null ? kmhToMph(p.windSpeed.value) : null;
        var windDir = p.windDirection && p.windDirection.value !== null ? p.windDirection.value : null;
        var windGusts = p.windGust && p.windGust.value !== null ? kmhToMph(p.windGust.value) : null;
        // KLKV sometimes reports observations with a null temperature. Only take
        // over the header when we actually have an observed temp; otherwise leave
        // it to the forecast fallback below so it never stays stuck at "--°".
        if (temp !== null) {
          currentObsIcon = icon;
          currentObsTemp = temp;
          renderWeather(icon, temp, windSpeed, windDir, windGusts);
          syncFirstCard();
          sessionStorage.setItem('weatherData', JSON.stringify({
            icon: icon, temp: temp, windSpeed: windSpeed, windDir: windDir, windGusts: windGusts, timestamp: Date.now()
          }));
        }
      })
      .catch(function() {});

    // Forecast + grid (today's explicit high/low)
    fetch('https://api.weather.gov/points/42.1888,-120.3458', { headers: nwsHeaders })
      .then(function(res) { return res.json(); })
      .then(function(pointsData) {
        fetch(pointsData.properties.forecast, { headers: nwsHeaders })
          .then(function(res) { return res.json(); })
          .then(function(data) {
            var periods = data.properties.periods;
            var html = buildForecast(periods);
            var dd = widget.querySelector('.forecast-dropdown');
            if (dd) dd.innerHTML = html;
            // Fallback header: if the station observation had no temperature,
            // drive the header icon/temp from the first forecast period so it
            // doesn't stay stuck at the "--°" placeholder.
            if (currentObsTemp === null && periods && periods.length) {
              var fp = periods[0];
              if (fp.temperature !== null && fp.temperature !== undefined) {
                currentObsTemp = fp.temperature;
                currentObsIcon = weatherToIcon(fp.shortForecast, !fp.isDaytime);
                renderWeather(currentObsIcon, currentObsTemp, null, null, null);
                sessionStorage.setItem('weatherData', JSON.stringify({
                  icon: currentObsIcon, temp: currentObsTemp, timestamp: Date.now()
                }));
              }
            }
            syncFirstCard();
            sessionStorage.setItem('weatherForecast', JSON.stringify({ html: html, timestamp: Date.now() }));
          })
          .catch(function() {});
        fetch(pointsData.properties.forecastGridData, { headers: nwsHeaders })
          .then(function(res) { return res.json(); })
          .then(function(gdata) {
            var todayStr = new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }).split(',')[0];
            var todayDate = new Date(todayStr + ' 12:00:00');
            var todayISO = todayDate.getFullYear() + '-' + String(todayDate.getMonth() + 1).padStart(2, '0') + '-' + String(todayDate.getDate()).padStart(2, '0');
            var maxTemps = gdata.properties.maxTemperature.values;
            for (var k = 0; k < maxTemps.length; k++) {
              if (maxTemps[k].validTime.indexOf(todayISO) !== -1 && maxTemps[k].value !== null) {
                todayHigh = cToF(maxTemps[k].value);
                break;
              }
            }
            var minTemps = gdata.properties.minTemperature.values;
            for (var k = 0; k < minTemps.length; k++) {
              if (minTemps[k].validTime.indexOf(todayISO) !== -1 && minTemps[k].value !== null) {
                if (todayLow === null) todayLow = cToF(minTemps[k].value);
                break;
              }
            }
            syncFirstCard();
          })
          .catch(function() {});
      })
      .catch(function() {});
  }

  // Initial fetch + hourly auto-refresh while tab is open
  loadWeatherData();
  setInterval(loadWeatherData, 60 * 60 * 1000);

  // Refresh when the tab regains focus after >1 hour (browsers throttle setInterval
  // in background tabs, so this catches users coming back to a long-open tab).
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden && Date.now() - lastFetch > 60 * 60 * 1000) {
      loadWeatherData();
    }
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', function(e) {
    if (!widget.contains(e.target)) {
      widget.classList.remove('forecast-open');
    }
  });
}

// --- Route App Switcher ---
function initRouteSwitch() {
  var switcher = document.querySelector('.route-app-switcher');
  if (!switcher) return;

  var buttons = switcher.querySelectorAll('.route-app-btn');
  var maps = document.querySelectorAll('.route-row-map[data-ridewithgps]');

  var stravaScriptLoaded = false;

  // Strava iframes post resize messages using a custom array protocol:
  //   [prefix, "BROADCAST_IFRAME_HEIGHT", heightInPx]
  // Strava's own embed.js handles this, but it sometimes misses on mobile
  // (iframe stays at the initial 650px from the embed bootstrap). Listen
  // ourselves and apply the height directly, with !important so we beat
  // Strava's inline style and any CSS rule.
  window.addEventListener('message', function(e) {
    var d = e.data;
    if (!Array.isArray(d) || d.length < 3) return;
    if (d[1] !== 'BROADCAST_IFRAME_HEIGHT') return;
    var h = d[2];
    if (typeof h !== 'number' || h < 100) return;
    var iframes = document.querySelectorAll('.strava-native-embed iframe');
    for (var i = 0; i < iframes.length; i++) {
      if (iframes[i].contentWindow === e.source) {
        iframes[i].style.setProperty('height', h + 'px', 'important');
        return;
      }
    }
  });

  function loadStravaScript() {
    if (stravaScriptLoaded) return;
    stravaScriptLoaded = true;
    var s = document.createElement('script');
    s.src = 'https://strava-embeds.com/embed.js';
    s.async = true;
    document.body.appendChild(s);
  }

  function reprocessStravaEmbeds() {
    // Strava's embed.js watches for new placeholder divs via MutationObserver,
    // but if the script is already loaded we may need to re-trigger it
    if (window.StravaEmbeds) {
      // Re-run the embed processor if available
      try { window.StravaEmbeds.process(); } catch(e) {}
    } else {
      // Reload the script to process new placeholders
      var s = document.createElement('script');
      s.src = 'https://strava-embeds.com/embed.js';
      s.async = true;
      document.body.appendChild(s);
    }
  }

  function setApp(app) {
    // Update button states
    buttons.forEach(function(btn) {
      btn.classList.toggle('active', btn.getAttribute('data-app') === app);
    });

    // Update all route maps
    maps.forEach(function(mapDiv) {
      var iframe = mapDiv.querySelector('iframe');
      var placeholder = mapDiv.querySelector('.route-coming-soon');
      var stravaContainer = mapDiv.querySelector('.strava-native-embed');
      var stravaId = mapDiv.getAttribute('data-strava-id');
      var hasStrava = stravaId && stravaId.length > 0;

      // Hide strava native embed when not using strava
      if (app !== 'strava') {
        if (stravaContainer) stravaContainer.style.display = 'none';
        mapDiv.classList.remove('strava-active');
      }

      if (app === 'strava') {
        // Hide iframe and coming-soon placeholder
        if (iframe) iframe.style.display = 'none';
        if (placeholder) placeholder.style.display = 'none';
        mapDiv.classList.remove('rwgps-active');

        if (hasStrava) {
          mapDiv.style.height = '';
          mapDiv.style.maxHeight = '';
          mapDiv.classList.add('strava-active');

          if (!stravaContainer) {
            // Create native Strava embed
            stravaContainer = document.createElement('div');
            stravaContainer.className = 'strava-native-embed';
            var embedDiv = document.createElement('div');
            embedDiv.className = 'strava-embed-placeholder';
            embedDiv.setAttribute('data-embed-type', 'route');
            embedDiv.setAttribute('data-embed-id', stravaId);
            embedDiv.setAttribute('data-full-width', 'true');
            embedDiv.setAttribute('data-style', 'standard');
            embedDiv.setAttribute('data-map-hash', mapDiv.getAttribute('data-strava-hash') || '');
            embedDiv.setAttribute('data-club-id', '1896211');
            embedDiv.setAttribute('data-from-embed', 'true');
            embedDiv.setAttribute('data-token', mapDiv.getAttribute('data-strava-token') || '');
            stravaContainer.appendChild(embedDiv);
            mapDiv.appendChild(stravaContainer);
            // Watch for Strava's embed.js to replace the placeholder with an iframe,
            // then lock it: scrolling="no" stops the user from scrolling inside the
            // iframe to reveal clipped content (which made the title/map/buttons drift).
            var lockObserver = new MutationObserver(function() {
              var f = stravaContainer.querySelector('iframe');
              if (f) {
                f.setAttribute('scrolling', 'no');
                lockObserver.disconnect();
              }
            });
            lockObserver.observe(stravaContainer, { childList: true, subtree: true });
            loadStravaScript();
            // Give the script a moment then reprocess
            setTimeout(reprocessStravaEmbeds, 300);
          } else {
            stravaContainer.style.display = '';
          }
        } else {
          // No Strava route — show coming soon
          mapDiv.style.height = '720px';
          mapDiv.style.maxHeight = '720px';
          if (!placeholder) {
            placeholder = document.createElement('div');
            placeholder.className = 'route-coming-soon';
            mapDiv.appendChild(placeholder);
          }
          placeholder.innerHTML = '<span class="coming-soon-icon">🚴</span><span class="coming-soon-text">Strava Route Coming Soon</span>';
          placeholder.style.display = '';
        }
      } else {
        var src = mapDiv.getAttribute('data-' + app);

        if (src === 'coming-soon' || !src) {
          // Show Coming Soon placeholder, hide iframe
          if (iframe) iframe.style.display = 'none';
          var appNames = { ridewithgps: 'RideWithGPS', mapmyride: 'MapMyRide', komoot: 'Komoot', strava: 'Strava' };
          var appLabel = appNames[app] || app;
          if (!placeholder) {
            placeholder = document.createElement('div');
            placeholder.className = 'route-coming-soon';
            mapDiv.appendChild(placeholder);
          }
          placeholder.innerHTML = '<span class="coming-soon-icon">🚴</span><span class="coming-soon-text">' + appLabel + ' Route Coming Soon</span>';
          placeholder.style.display = '';
          mapDiv.style.height = '720px';
          mapDiv.style.maxHeight = '720px';
          mapDiv.classList.remove('rwgps-active');
        } else if (iframe && src) {
          // Show iframe, hide placeholder
          if (placeholder) placeholder.style.display = 'none';
          iframe.style.display = '';
          mapDiv.style.height = '720px';
          mapDiv.style.maxHeight = '720px';
          if (app === 'ridewithgps') {
            iframe.style.width = '1px';
            iframe.style.minWidth = '100%';
            iframe.style.height = '700px';
            iframe.style.border = 'none';
            iframe.setAttribute('scrolling', 'no');
            mapDiv.classList.add('rwgps-active');
          } else if (app === 'komoot') {
            iframe.style.width = '100%';
            iframe.style.minWidth = '';
            iframe.style.height = '700px';
            iframe.style.border = 'none';
            iframe.setAttribute('scrolling', 'no');
            mapDiv.classList.remove('rwgps-active');
          } else {
            iframe.style.width = '100%';
            iframe.style.minWidth = '';
            iframe.style.height = '1051px';
            iframe.style.border = '';
            iframe.removeAttribute('scrolling');
            mapDiv.classList.remove('rwgps-active');
          }
          iframe.src = src;
        }
      }
    });

    // Remember preference
    try { sessionStorage.setItem('routeApp', app); } catch(e) {}
  }

  // Button click handlers
  buttons.forEach(function(btn) {
    btn.addEventListener('click', function() {
      setApp(btn.getAttribute('data-app'));
    });
  });

  // Load default or remembered preference
  var saved = null;
  try { saved = sessionStorage.getItem('routeApp'); } catch(e) {}
  setApp(saved || 'ridewithgps');
}

// --- Newsletter Slide-In Popup (8s delay, once per browser) ---
// The popup HTML is in the static page markup (before </body>) so the
// EmailOctopus loader inside it runs in its normal document parse context —
// dynamic injection caused 405s on submit because EO's renderer relies on
// document.currentScript / document.write running during parsing.
//
// Dismissal is set the moment the popup opens, not on close, so it's strictly
// once-per-browser regardless of whether the user clicks X, submits, or just
// navigates away.
function initNewsletterPopup() {
  var popup = document.getElementById('newsletter-popup');
  if (!popup) return;

  try {
    if (localStorage.getItem('newsletterPopupShown')) return;
  } catch (e) {}

  setTimeout(function() {
    popup.classList.add('open');
    try { localStorage.setItem('newsletterPopupShown', '1'); } catch (e) {}
  }, 8000);

  var closeBtn = popup.querySelector('.newsletter-popup-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', function() {
      popup.classList.remove('open');
    });
  }

  // CTA variant: close popup smoothly when user clicks "Sign Me Up"
  var cta = popup.querySelector('.newsletter-popup-cta');
  if (cta) {
    cta.addEventListener('click', function() {
      popup.classList.remove('open');
    });
  }
}

// --- Initialize Everything ---
document.addEventListener('DOMContentLoaded', () => {
  initCountdown();
  initMobileNav();
  initNavScroll();
  initFAQ();
  setActiveNav();
  initNewsletter();
  initRegisterTracking();
  initWeather();
  initRouteSwitch();
  initNewsletterPopup();
});

// --- Global auth widget: inject the Firebase Auth navbar dropdown (ES module) ---
(function loadAuthWidget() {
  // Reserve the avatar slot synchronously (before first paint) so the async
  // module doesn't pop the avatar in and shove the menu sideways on every load.
  // Also paint the signed-in user's CACHED photo right now, so it doesn't flash
  // to the default icon while Firebase re-resolves the session on each nav.
  // auth-widget.js reuses this element instead of creating its own.
  var navbar = document.querySelector('.navbar');
  if (navbar) {
    var container = navbar.querySelector('.container') || navbar;
    var slot = container.querySelector('.tdo-auth');
    if (!slot) {
      slot = document.createElement('div');
      slot.className = 'tdo-auth';
      container.appendChild(slot);
    }
    if (!slot.querySelector('.tdo-avatar')) {
      var cachedPhoto = null;
      try { cachedPhoto = localStorage.getItem('tdoAvatarPhoto'); } catch (e) {}
      var HEAD = '<svg viewBox="0 0 24 24"><path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5z"/></svg>';
      var inner = HEAD;
      if (cachedPhoto) {
        var safe = cachedPhoto.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        // A broken/rotated cached URL hides itself (auth-widget.js re-renders the
        // avatar with the person-icon fallback once Firebase resolves the session).
        inner = '<img class="tdo-photo" src="' + safe + '" alt="" referrerpolicy="no-referrer" onerror="this.style.display=&quot;none&quot;">';
      }
      slot.innerHTML =
        '<button class="tdo-avatar" id="tdo-avatar" aria-label="Account" aria-haspopup="true" aria-expanded="false">' + inner + '</button>' +
        '<div class="tdo-menu" id="tdo-menu" role="menu"></div>';
    }
  }
  var s = document.createElement('script');
  s.type = 'module';
  s.src = '/js/auth-widget.js';
  (document.head || document.documentElement).appendChild(s);
})();

// --- Sabrina: inject the floating AI support chat widget on every page ---
(function loadChatWidget() {
  var s = document.createElement('script');
  s.src = '/js/chat-widget.js';
  s.defer = true;
  (document.head || document.documentElement).appendChild(s);
})();

// --- Footer legal links (Privacy Policy / Terms) on every page ---
// Runs synchronously (main.js is at the end of <body>, so the DOM is ready).
// No DOMContentLoaded deferral, so these land in the FIRST paint — no pop-in.
(function addFooterLegal() {
  var fb = document.querySelector('.footer-bottom');
  if (fb && !fb.querySelector('.footer-legal')) {
    var span = document.createElement('span');
    span.className = 'footer-legal';
    span.innerHTML = ' | <a href="/privacy/" style="color:#bbb;text-decoration:underline">Privacy Policy</a> &middot; <a href="/terms/" style="color:#bbb;text-decoration:underline">Terms of Service</a>';
    fb.appendChild(span);
  }
})();

// --- Donate link in the navbar + footer on every page ---
// Synchronous (no DOMContentLoaded) so the Donate link is present in the first
// paint of the navbar — otherwise it pops in late and shifts the whole menu.
(function addDonateLinks() {
  var navLinks = document.querySelector('.nav-links');
  if (navLinks && !navLinks.querySelector('a[href="/donate/"]')) {
    var a = document.createElement('a');
    a.href = '/donate/';
    a.textContent = 'Donate';
    var reg = navLinks.querySelector('a.btn');
    if (reg) { navLinks.insertBefore(a, reg); } else { navLinks.appendChild(a); }
  }
  var footUl = document.querySelector('.footer-links ul');
  if (footUl && !footUl.querySelector('a[href="/donate/"]')) {
    var li = document.createElement('li');
    var fa = document.createElement('a');
    fa.href = '/donate/';
    fa.textContent = 'Donate';
    li.appendChild(fa);
    var regLi = Array.prototype.slice.call(footUl.querySelectorAll('li')).filter(function (l) {
      var x = l.querySelector('a'); return x && /bikereg/.test(x.href);
    })[0];
    if (regLi) { footUl.insertBefore(li, regLi); } else { footUl.appendChild(li); }
  }
})();

// --- Shop link in the navbar + footer on every page ---
// Central injector (like the Donate link above) so reviving the Shop only needed
// one change here, not an edit to every page's hardcoded nav. Skips pages that
// already include the Shop link (e.g. the shop + checkout pages themselves).
(function addShopLinks() {
  var navLinks = document.querySelector('.nav-links');
  if (navLinks && !navLinks.querySelector('a[href="/shop/"]')) {
    var a = document.createElement('a');
    a.href = '/shop/';
    a.textContent = 'Shop';
    var before = navLinks.querySelector('a[href="/blog/"]') || navLinks.querySelector('a[href="/donate/"]') || navLinks.querySelector('a.btn');
    if (before) { navLinks.insertBefore(a, before); } else { navLinks.appendChild(a); }
  }
  var footUl = document.querySelector('.footer-links ul');
  if (footUl && !footUl.querySelector('a[href="/shop/"]')) {
    var li = document.createElement('li');
    var fa = document.createElement('a');
    fa.href = '/shop/';
    fa.textContent = 'Shop';
    li.appendChild(fa);
    var beforeLi = Array.prototype.slice.call(footUl.querySelectorAll('li')).filter(function (l) {
      var x = l.querySelector('a'); return x && /\/blog\/$/.test(x.getAttribute('href') || '');
    })[0];
    if (beforeLi) { footUl.insertBefore(li, beforeLi); } else { footUl.appendChild(li); }
  }
})();

// --- Load the shop cart button + drawer on EVERY page, so the cart persists
//     across the whole site (not just /shop/). shop.js self-guards against a
//     double init, so it's safe that the shop pages also include it directly. ---
(function loadShopCart() {
  if (window.TDOShop) return;
  var s = document.createElement('script');
  s.src = '/js/shop.js?v=8';
  document.head.appendChild(s);
})();

// --- Register gate: BikeReg is disabled. Any "Register" link (which points to
//     bikereg.com) instead opens a popup: registration opens January 1st, with an
//     email-capture form for launch updates. Works site-wide (nav, footer, hero,
//     register page). ---
(function registerGate() {
  var injected = false, overlay = null;
  function inject() {
    if (injected) return; injected = true;
    var css = document.createElement('style');
    css.textContent = [
      '.reg-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.55);display:none;align-items:center;justify-content:center;z-index:3000;padding:20px}',
      '.reg-modal-overlay.open{display:flex}',
      '.reg-modal{position:relative;background:#fff;color:#222;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,0.35);width:420px;max-width:94vw;padding:30px 28px;text-align:center;font-family:"Open Sans",Arial,sans-serif}',
      '.reg-modal-close{position:absolute;top:10px;right:14px;background:none;border:none;font-size:1.7rem;line-height:1;color:#999;cursor:pointer;padding:0}',
      '.reg-modal-close:hover{color:#333}',
      '.reg-modal h3{font-family:"Oswald",Arial,sans-serif;font-size:1.55rem;margin:0 0 10px;color:#cc0000}',
      '.reg-modal p{font-size:0.96rem;color:#444;line-height:1.5;margin:0 0 18px}',
      '.reg-modal form{display:flex;gap:8px}',
      '.reg-modal input{flex:1;padding:12px 14px;border:1px solid #ccc;border-radius:9px;font-size:1rem;font-family:inherit}',
      '.reg-modal input:focus{outline:none;border-color:#cc0000;box-shadow:0 0 0 2px rgba(204,0,0,0.15)}',
      '.reg-modal button.go{flex:none;background:#cc0000;color:#fff;border:none;border-radius:9px;padding:0 18px;font-weight:600;cursor:pointer;font-family:inherit;font-size:0.95rem}',
      '.reg-modal button.go:hover{background:#a80000}.reg-modal button.go:disabled{background:#ccc}',
      '.reg-modal .reg-msg{font-size:0.9rem;margin-top:12px;min-height:18px}',
      '.reg-modal .reg-msg.err{color:#b71c1c}.reg-modal .reg-msg.ok{color:#1b5e20}'
    ].join('');
    document.head.appendChild(css);
    overlay = document.createElement('div');
    overlay.className = 'reg-modal-overlay';
    overlay.innerHTML =
      '<div class="reg-modal">' +
        '<button class="reg-modal-close" aria-label="Close">&times;</button>' +
        '<h3>Registration opens January 1st</h3>' +
        '<p>Online registration for the Oregon Tour de Outback opens <strong>January 1st</strong>. Leave your email and we\'ll let you know the moment it\'s open.</p>' +
        '<form id="reg-form"><input type="email" id="reg-email" placeholder="you@example.com" autocomplete="email" required><button type="submit" class="go">Notify me</button></form>' +
        '<div class="reg-msg" id="reg-msg"></div>' +
      '</div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    overlay.querySelector('.reg-modal-close').addEventListener('click', close);
    overlay.querySelector('#reg-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var email = (overlay.querySelector('#reg-email').value || '').trim();
      var msg = overlay.querySelector('#reg-msg');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg.className = 'reg-msg err'; msg.textContent = 'Please enter a valid email.'; return; }
      var btn = overlay.querySelector('button.go'); btn.disabled = true;
      fetch('/api/registration-interest', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, pageUrl: location.href }) })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (res) {
          btn.disabled = false;
          if (res.ok) { msg.className = 'reg-msg ok'; msg.textContent = "You're on the list — we'll email you when registration opens. 🎉"; overlay.querySelector('#reg-form').style.display = 'none'; }
          else { msg.className = 'reg-msg err'; msg.textContent = (res.d && res.d.error) || 'Something went wrong. Please try again.'; }
        })
        .catch(function () { btn.disabled = false; msg.className = 'reg-msg err'; msg.textContent = 'Network error. Please try again.'; });
    });
  }
  function open() {
    inject();
    var f = overlay.querySelector('#reg-form'); if (f) { f.style.display = 'flex'; }
    overlay.querySelector('#reg-msg').textContent = '';
    overlay.classList.add('open');
    setTimeout(function () { var i = overlay.querySelector('#reg-email'); if (i) i.focus(); }, 60);
  }
  function close() { if (overlay) overlay.classList.remove('open'); }
  // Capture-phase so we run before the link's own handlers and block navigation.
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href*="bikereg"]') : null;
    if (a) { e.preventDefault(); e.stopPropagation(); open(); }
  }, true);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
})();
