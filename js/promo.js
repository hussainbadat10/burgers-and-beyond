// Daily special banner — shows every special set for today's day of the
// week (dailySpecials/{day}/items), not just one. Hidden entirely on
// Sundays (shop is closed) and hidden if nothing is set for today.
import { db } from './firebase-config.js';
import {
  doc, getDoc, collection, getDocs, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { escapeHtml, escapeAttr } from './escape-utils.js';

var DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
var DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function renderCard(special, dayName) {
  var photo = special.imageUrl
    ? '<img class="promo-photo" src="' + escapeAttr(special.imageUrl) + '" alt="' + escapeAttr(special.item) + '">'
    : '<span class="promo-emoji" aria-hidden="true">🎉</span>';

  // Older specials (saved before the Price field existed) have no numeric
  // price yet, so there's nothing valid to put in the cart/WhatsApp order —
  // show the card as display-only until the admin sets one.
  var price = Number(special.price) || 0;
  // A distinct cart line name from the plain menu item of the same name, so
  // adding both doesn't merge into one line at the wrong price (the cart
  // matches items by name) — and it reads clearly in the WhatsApp message.
  var cartName = special.item + " (Today's Special)";
  var order = price > 0
    ? (
        '<div class="promo-card-order">' +
          '<div class="promo-price">R' + price + '</div>' +
          '<button class="menu-item-add" type="button" data-name="' + escapeAttr(cartName) + '" data-price="' + price + '" aria-label="Add ' + escapeAttr(special.item) + ' special to order">+</button>' +
        '</div>'
      )
    : '';

  return (
    '<div class="promo-card">' +
      photo +
      '<div class="promo-card-info">' +
        '<div class="promo-day">' + dayName + "'s Special</div>" +
        '<div class="promo-text">' + escapeHtml(special.item) + ' — ' + escapeHtml(special.promo) + '</div>' +
      '</div>' +
      order +
    '</div>'
  );
}

document.addEventListener('DOMContentLoaded', async function () {
  var promoStrip = document.getElementById('promoStrip');
  var container = document.getElementById('promoCards');
  if (!promoStrip || !container) return;

  var dayIndex = new Date().getDay();
  var dayKey = DAY_KEYS[dayIndex];

  if (dayKey === 'sunday') return; // closed, no special to show

  try {
    var snap = await getDocs(query(collection(db, 'dailySpecials', dayKey, 'items'), orderBy('order')));
    var specials = [];
    snap.forEach(function (d) {
      var data = d.data();
      if (data.item && data.promo) specials.push(data);
    });

    // Pre-migration fallback: the old single-special-per-day doc still has
    // real data until the next admin login moves it into the subcollection
    // above. Without this, the banner would just go blank for that window.
    if (!specials.length) {
      var legacySnap = await getDoc(doc(db, 'dailySpecials', dayKey));
      if (legacySnap.exists()) {
        var legacy = legacySnap.data();
        if (legacy.item && legacy.promo) specials.push(legacy);
      }
    }

    if (!specials.length) return;

    container.innerHTML = specials.map(function (s) {
      return renderCard(s, DAY_NAMES[dayIndex]);
    }).join('');

    promoStrip.hidden = false;
  } catch (err) {
    console.error('Failed to load daily specials', err);
  }
});
