/* ============================================
   Tour de Outback — Main JavaScript
   ============================================ */

// --- Countdown Timer ---
function initCountdown() {
  const eventDate = new Date('2026-06-27T07:00:00-07:00').getTime();
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
// EmailOctopus handles form submission via their embedded script.
// No custom JS needed — the EO script manages submit, validation, and reCAPTCHA.
function initNewsletter() {
  // Placeholder — EO script handles everything
}

// --- Register Button Click Tracking (GA4) ---
function initRegisterTracking() {
  document.querySelectorAll('a[href*="bikereg.com"]').forEach(link => {
    link.addEventListener('click', () => {
      if (typeof gtag === 'function') {
        gtag('event', 'register_click', {
          event_category: 'conversion',
          event_label: link.textContent.trim(),
          transport_type: 'beacon'
        });
      }
    });
  });
}

// --- Weather Widget (Open-Meteo API — Lakeview, OR) ---
function initWeather() {
  var widget = document.getElementById('weather-widget');
  if (!widget) return;

  function renderWeather(icon, temp) {
    widget.innerHTML = '<span class="weather-location">Lake County</span>' +
      '<span class="weather-bottom"><span class="weather-icon">' + icon + '</span> ' +
      '<span class="weather-temp">' + temp + '°F</span></span>';
  }

  // Check cache first — instant render on page navigation
  var cached = sessionStorage.getItem('weatherData');
  if (cached) {
    var c = JSON.parse(cached);
    // Use cache if less than 15 minutes old
    if (Date.now() - c.timestamp < 15 * 60 * 1000) {
      renderWeather(c.icon, c.temp);
      return;
    }
  }

  // WMO weather code to emoji
  var weatherCodes = {
    0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
    45: '🌫️', 48: '🌫️',
    51: '🌦️', 53: '🌦️', 55: '🌧️',
    61: '🌦️', 63: '🌧️', 65: '🌧️',
    71: '🌨️', 73: '❄️', 75: '❄️', 77: '🌨️',
    80: '🌦️', 81: '🌧️', 82: '🌧️',
    85: '🌨️', 86: '🌨️',
    95: '⛈️', 96: '⛈️', 99: '⛈️'
  };

  // Lakeview, OR: 42.1888° N, 120.3458° W
  fetch('https://api.open-meteo.com/v1/forecast?latitude=42.1888&longitude=-120.3458&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=America/Los_Angeles')
    .then(function(res) { return res.json(); })
    .then(function(data) {
      var temp = Math.round(data.current.temperature_2m);
      var icon = weatherCodes[data.current.weather_code] || '🌡️';
      renderWeather(icon, temp);
      sessionStorage.setItem('weatherData', JSON.stringify({
        icon: icon, temp: temp, timestamp: Date.now()
      }));
    })
    .catch(function() {
      widget.innerHTML = '';
    });
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
});
