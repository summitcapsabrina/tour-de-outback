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
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.nav-links a:not(.btn)');

  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
}

// --- Newsletter Form (EmailOctopus) ---
function initNewsletter() {
  const form = document.querySelector('.newsletter-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = form.querySelector('input[type="email"]');
    const btn = form.querySelector('button');
    const email = input.value.trim();
    if (!email) return;

    // Disable form while submitting
    input.disabled = true;
    btn.disabled = true;
    btn.textContent = 'Signing up...';

    try {
      const response = await fetch('https://emailoctopus.com/api/1.6/lists/35e53e2a-1812-11f1-bdf7-2131ac6e0118/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: 'eo_a7a922b0c394ea97ab45290411ffc56b9106fe9bc8fec966de81ec64ad29c0af',
          email_address: email,
          status: 'SUBSCRIBED'
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Success
        form.reset();
        btn.textContent = 'You\'re In!';
        btn.style.background = '#2ecc71';
        setTimeout(() => {
          btn.textContent = 'Sign Up';
          btn.style.background = '';
          input.disabled = false;
          btn.disabled = false;
        }, 3000);
      } else if (data.error && data.error.code === 'MEMBER_EXISTS_WITH_EMAIL_ADDRESS') {
        // Already subscribed
        form.reset();
        btn.textContent = 'Already Subscribed!';
        setTimeout(() => {
          btn.textContent = 'Sign Up';
          input.disabled = false;
          btn.disabled = false;
        }, 3000);
      } else {
        throw new Error(data.error ? data.error.message : 'Something went wrong');
      }
    } catch (err) {
      btn.textContent = 'Try Again';
      btn.style.background = '#e74c3c';
      setTimeout(() => {
        btn.textContent = 'Sign Up';
        btn.style.background = '';
        input.disabled = false;
        btn.disabled = false;
      }, 3000);
    }
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
});
