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

// --- Mobile Navigation ---
function initMobileNav() {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');

  if (!toggle || !links) return;

  toggle.addEventListener('click', () => {
    toggle.classList.toggle('active');
    links.classList.toggle('open');
  });
}