// Daily special banner — shows the admin-set promotion for today's day of
// the week, read from Firestore (dailySpecials/{day}). Hidden entirely on
// Sundays (shop is closed) and hidden if no special is set for today.
import { db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

var DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
var DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

document.addEventListener('DOMContentLoaded', async function () {
  var promoStrip = document.getElementById('promoStrip');
  if (!promoStrip) return;

  var dayIndex = new Date().getDay();
  var dayKey = DAY_KEYS[dayIndex];

  if (dayKey === 'sunday') return; // closed, no special to show

  try {
    var snap = await getDoc(doc(db, 'dailySpecials', dayKey));
    if (!snap.exists()) return;

    var special = snap.data();
    if (!special.item || !special.promo) return;

    promoStrip.querySelector('.promo-day').textContent = DAY_NAMES[dayIndex] + "'s Special";
    promoStrip.querySelector('.promo-text').textContent = special.item + ' — ' + special.promo;
    promoStrip.hidden = false;
  } catch (err) {
    console.error('Failed to load daily special', err);
  }
});
