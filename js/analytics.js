// Cookie-consent-gated Google Analytics (GA4). Nothing tracking-related loads
// until the visitor explicitly accepts — declining, or not having chosen yet,
// means zero tracking scripts run and zero cookies get set. The choice is
// remembered in localStorage so the banner only shows once per browser.
//
// Plain script (not a module) on purpose: cart.js is also a plain script and
// calls window.trackEvent(...) directly (e.g. when a WhatsApp order is sent),
// which only does anything once/if gtag has actually loaded.
(function () {
  var GA_MEASUREMENT_ID = 'G-RYYWS16PFL';
  var CONSENT_KEY = 'bnb_cookie_consent';

  function getConsent() {
    try {
      return localStorage.getItem(CONSENT_KEY);
    } catch (err) {
      return null; // storage blocked (private mode, etc.) — treat as "no choice yet"
    }
  }

  function setConsent(value) {
    try {
      localStorage.setItem(CONSENT_KEY, value);
    } catch (err) {
      // nothing we can do if storage is blocked; the banner will just re-ask next time
    }
  }

  function loadGtag() {
    if (window.gtag) return; // already loaded

    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_MEASUREMENT_ID;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID);
  }

  // Safe to call from anywhere (e.g. cart.js) regardless of consent state —
  // it's a no-op until/unless gtag has actually loaded.
  window.trackEvent = function (name, params) {
    if (typeof window.gtag === 'function') window.gtag('event', name, params || {});
  };

  function setBannerOffset(px) {
    document.documentElement.style.setProperty('--cookie-banner-offset', px + 'px');
  }

  function initBanner() {
    var banner = document.getElementById('cookieBanner');
    if (!banner) return;

    var acceptBtn = document.getElementById('cookieAccept');
    var declineBtn = document.getElementById('cookieDecline');

    function dismiss() {
      banner.hidden = true;
      setBannerOffset(0);
    }

    if (acceptBtn) {
      acceptBtn.addEventListener('click', function () {
        setConsent('accepted');
        dismiss();
        loadGtag();
      });
    }
    if (declineBtn) {
      declineBtn.addEventListener('click', function () {
        setConsent('declined');
        dismiss();
      });
    }

    banner.hidden = false;
    setBannerOffset(banner.offsetHeight);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var consent = getConsent();
    if (consent === 'accepted') {
      loadGtag();
    } else if (consent !== 'declined') {
      initBanner();
    }
  });
})();
