// Custom "Add to Home Screen" nudge. Chrome/Edge/Android fire
// beforeinstallprompt when the site meets PWA installability criteria
// (manifest + service worker + HTTPS, all already true here) — this
// suppresses the browser's own default mini-infobar and shows a plain
// banner instead, matching the site's own styling, that triggers the same
// native install dialog on click.
//
// iOS Safari never fires beforeinstallprompt at all (Apple gives no
// programmatic install API — only the manual Share -> Add to Home Screen
// flow), so this banner simply never appears there. That's an accepted
// platform limitation, not a bug: there's nothing to trigger it with.
//
// Plain script (not a module), same reasoning as analytics.js — loaded at
// the bottom of every page via base.njk.
(function () {
  var DISMISS_KEY = 'bnb_install_dismissed';
  var deferredPrompt = null;

  function isDismissed() {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch (err) {
      return false;
    }
  }

  function setDismissed() {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch (err) {
      /* storage unavailable — banner may just reappear next visit */
    }
  }

  function cookieBannerShowing() {
    var cookieBanner = document.getElementById('cookieBanner');
    return !!cookieBanner && !cookieBanner.hidden;
  }

  // Reuses the cookie banner's own offset CSS variable rather than adding a
  // second one — this banner is deliberately never shown while the cookie
  // banner is (see showWhenReady), so the two never need to combine.
  function setBannerOffset(px) {
    document.documentElement.style.setProperty('--cookie-banner-offset', px + 'px');
  }

  function showWhenReady() {
    if (isDismissed() || !deferredPrompt) return;
    var banner = document.getElementById('installBanner');
    if (!banner) return;

    // Don't stack two bottom banners at once — wait for the cookie choice
    // to be made first, checking again shortly after.
    if (cookieBannerShowing()) {
      setTimeout(showWhenReady, 1000);
      return;
    }

    banner.hidden = false;
    setBannerOffset(banner.offsetHeight);
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    // A short delay so it never appears the instant a page loads.
    setTimeout(showWhenReady, 2000);
  });

  window.addEventListener('appinstalled', function () {
    setDismissed();
    var banner = document.getElementById('installBanner');
    if (banner) {
      banner.hidden = true;
      setBannerOffset(0);
    }
  });

  document.addEventListener('DOMContentLoaded', function () {
    var banner = document.getElementById('installBanner');
    if (!banner) return;

    var installBtn = document.getElementById('installBannerInstall');
    var dismissBtn = document.getElementById('installBannerDismiss');

    if (installBtn) {
      installBtn.addEventListener('click', function () {
        banner.hidden = true;
        setBannerOffset(0);
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        deferredPrompt.userChoice.finally(function () {
          deferredPrompt = null;
        });
      });
    }

    if (dismissBtn) {
      dismissBtn.addEventListener('click', function () {
        setDismissed();
        banner.hidden = true;
        setBannerOffset(0);
      });
    }
  });
})();
