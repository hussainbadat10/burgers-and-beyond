// Mobile nav toggle
document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');

  if (toggle && links) {
    toggle.addEventListener('click', function () {
      links.classList.toggle('open');
      var expanded = links.classList.contains('open');
      toggle.setAttribute('aria-expanded', expanded);
    });

    links.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Set active nav link based on current page
  var currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(function (link) {
    var href = link.getAttribute('href');
    if (href === currentPage) {
      link.classList.add('active');
    }
  });

  // Fade/slide cards and section headers in as they scroll into view.
  // Safety net: force everything visible after a short delay regardless of
  // scroll/intersection state, so content is never stuck invisible for a
  // renderer that doesn't scroll (crawlers, print, screenshot tools, etc.)
  // or if IntersectionObserver never fires for some other reason.
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
    var revealEls = document.querySelectorAll('.card, .section-header');
    revealEls.forEach(function (el) {
      el.classList.add('reveal');
    });

    var revealAll = function () {
      revealEls.forEach(function (el) {
        el.classList.add('reveal-visible');
      });
    };

    var revealObserver = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

    revealEls.forEach(function (el) {
      revealObserver.observe(el);
    });

    setTimeout(function () {
      revealObserver.disconnect();
      revealAll();
    }, 1200);
  }
});

// Caches the static shell (HTML/CSS/JS/images) for instant repeat loads and
// basic offline browsing — never the live Firestore data (menu, specials,
// open/closed status), which always comes fresh from network. Registered
// after 'load' so it doesn't compete with the page's own initial resources.
// admin.html doesn't load this file, so the admin panel is never controlled
// by this service worker.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function (err) {
      console.error('Service worker registration failed', err);
    });
  });
}
