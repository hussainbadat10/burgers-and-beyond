// Live "Open Now / Closed" badge, computed client-side from businessInfo's
// structured hoursXxxTime fields (kept separate from the free-text hours
// lines used elsewhere, so editing the display wording never breaks this).
// Progressive enhancement: if no [data-store-status-wrap] elements exist on
// the page, or the structured fields haven't been seeded yet (fresh install,
// before the owner's first admin login backfills them), this does nothing —
// it never shows a badge it can't back up with real data.
import { db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

var DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function toMinutes(t) {
  var parts = t.split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

function formatTime12h(t) {
  var parts = t.split(':');
  var h = parseInt(parts[0], 10);
  var m = parts[1];
  var suffix = h >= 12 ? 'PM' : 'AM';
  var h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return h12 + (m === '00' ? '' : ':' + m) + suffix;
}

// Sunday has no windows (always closed); Friday has two (split for the
// midday prayer break); every other day is a single Mon–Sat window.
function getDayWindows(dayIndex, info) {
  if (dayIndex === 0) return [];
  if (dayIndex === 5) {
    return [
      [info.hoursFriOpenTime1, info.hoursFriCloseTime1],
      [info.hoursFriOpenTime2, info.hoursFriCloseTime2]
    ];
  }
  return [[info.hoursMonSatOpenTime, info.hoursMonSatCloseTime]];
}

function hasRequiredFields(info) {
  return !!(
    info.hoursMonSatOpenTime && info.hoursMonSatCloseTime &&
    info.hoursFriOpenTime1 && info.hoursFriCloseTime1 &&
    info.hoursFriOpenTime2 && info.hoursFriCloseTime2
  );
}

function computeStatus(info, now) {
  now = now || new Date();
  var day = now.getDay();
  var minutes = now.getHours() * 60 + now.getMinutes();
  var windows = getDayWindows(day, info);
  var i;

  for (i = 0; i < windows.length; i++) {
    if (minutes >= toMinutes(windows[i][0]) && minutes < toMinutes(windows[i][1])) {
      return { open: true, detail: 'Closes at ' + formatTime12h(windows[i][1]) };
    }
  }

  // Closed right now — a later window might still open today (e.g. Friday's
  // afternoon reopening after the prayer break).
  for (i = 0; i < windows.length; i++) {
    if (minutes < toMinutes(windows[i][0])) {
      return { open: false, detail: 'Opens today at ' + formatTime12h(windows[i][0]) };
    }
  }

  // Nothing left today — walk forward to the next day with any open window.
  for (var offset = 1; offset <= 7; offset++) {
    var nextDay = (day + offset) % 7;
    var nextWindows = getDayWindows(nextDay, info);
    if (nextWindows.length) {
      var label = offset === 1 ? 'tomorrow' : DAY_NAMES[nextDay];
      return { open: false, detail: 'Opens ' + label + ' at ' + formatTime12h(nextWindows[0][0]) };
    }
  }

  return { open: false, detail: '' };
}

function renderStatus(status) {
  var wraps = document.querySelectorAll('[data-store-status-wrap]');
  for (var i = 0; i < wraps.length; i++) {
    var wrap = wraps[i];
    var badge = wrap.querySelector('[data-store-status]');
    var detail = wrap.querySelector('[data-store-status-detail]');
    if (badge) {
      badge.textContent = status.open ? 'Open Now' : 'Closed';
      badge.classList.toggle('store-status-badge--open', status.open);
      badge.classList.toggle('store-status-badge--closed', !status.open);
    }
    if (detail) detail.textContent = status.detail;
    wrap.hidden = false;
  }
}

async function initStoreStatus() {
  if (!document.querySelector('[data-store-status-wrap]')) return;

  try {
    var snap = await getDoc(doc(db, 'businessInfo', 'main'));
    if (!snap.exists()) return;

    var info = snap.data();
    if (!hasRequiredFields(info)) return;

    renderStatus(computeStatus(info));
    // Recompute every minute so it flips automatically right at opening/closing time.
    setInterval(function () { renderStatus(computeStatus(info)); }, 60000);
  } catch (err) {
    console.error('Failed to load store status', err);
  }
}

document.addEventListener('DOMContentLoaded', initStoreStatus);
