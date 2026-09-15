// Fills editable content from Firestore into the page. Two docs are merged
// into one lookup object: siteContent/main (headings/paragraphs/cards) and
// businessInfo/main (phone/address/hours/email/links — centralized so
// editing one field in the admin panel updates every page that shows it).
//
// Supported attributes, usable on any element, in any combination:
//   data-content-key="fieldName"        sets el.textContent
//   data-content-href-key="fieldName"   sets el.href
//   data-content-phone-key="fieldName"  sets el.dataset.phone (for cart.js's WhatsApp buttons)
//   data-content-map="1"                builds a Google Maps embed src from
//                                       addressLine1 + addressLine2 (contact.html only)
//   data-sep-for="fieldName"            a separator (e.g. ", ") next to a
//                                       data-content-key element, hidden
//                                       together with it when that field is
//                                       intentionally blanked out (see below)
//
// Falls back to the page's existing static content if a field has never
// been set (the key doesn't exist in Firestore at all yet), or if the fetch
// fails entirely — the page always reads correctly. But if the admin has
// actively edited a field to be blank (the key exists, with an empty
// value — e.g. removing a "Line 2" that doesn't apply), that's respected:
// the element's text is cleared AND the element itself is hidden, rather
// than silently keeping the old static text forever because an empty
// string reads as falsy. That distinction (key missing vs. key present but
// empty) is exactly what this always checks via `key in content`.
//
// Two containers get card-collection rendering instead of simple text
// substitution, since the admin panel needs to add/remove cards, not just
// edit a fixed set: #fanFavGrid (home page) from the fanFavourites
// collection, #valueCardsWrap (about page) from valueCards. Same
// fallback philosophy applies — if the collection is empty (e.g. before
// the one-time migration from the old fixed fields has run), the page's
// existing static cards are left exactly as they are.
import { db } from './firebase-config.js';
import {
  doc, getDoc, collection, getDocs, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { escapeHtml, escapeAttr } from './escape-utils.js';

function renderCard(card) {
  // A real photo/logo (e.g. the Halaal certification badge) takes priority
  // over the emoji — a card has one or the other, not both.
  var icon = card.imageUrl
    ? '<img class="card-photo" src="' + escapeAttr(card.imageUrl) + '" alt="">'
    : '<div class="card-emoji">' + escapeHtml(card.emoji || '') + '</div>';

  return (
    '<div class="card">' +
      icon +
      '<h3>' + escapeHtml(card.title || '') + '</h3>' +
      '<p>' + escapeHtml(card.desc || '') + '</p>' +
    '</div>'
  );
}

async function renderCardCollection(containerId, collectionName) {
  var container = document.getElementById(containerId);
  if (!container) return;

  try {
    var snap = await getDocs(query(collection(db, collectionName), orderBy('order')));
    if (snap.empty) return; // leave the existing static fallback cards as-is

    var html = '';
    snap.forEach(function (d) { html += renderCard(d.data()); });
    container.innerHTML = html;
  } catch (err) {
    console.error('Failed to load ' + collectionName, err);
  }
}

document.addEventListener('DOMContentLoaded', async function () {
  renderCardCollection('fanFavGrid', 'fanFavourites');
  renderCardCollection('valueCardsWrap', 'valueCards');

  var hasWork = document.querySelector('[data-content-key], [data-content-href-key], [data-content-phone-key], [data-content-map]');
  if (!hasWork) return;

  try {
    var [siteSnap, bizSnap] = await Promise.all([
      getDoc(doc(db, 'siteContent', 'main')),
      getDoc(doc(db, 'businessInfo', 'main'))
    ]);

    var content = Object.assign(
      {},
      siteSnap.exists() ? siteSnap.data() : {},
      bizSnap.exists() ? bizSnap.data() : {}
    );

    function setSepHidden(key, hide) {
      var sep = document.querySelector('[data-sep-for="' + key + '"]');
      if (sep) sep.hidden = hide;
    }

    document.querySelectorAll('[data-content-key]').forEach(function (el) {
      var key = el.getAttribute('data-content-key');
      if (!(key in content)) return; // never set — keep the static fallback text
      el.textContent = content[key];
      el.hidden = !content[key]; // set, but intentionally blank — hide the line entirely
      setSepHidden(key, !content[key]);
    });

    document.querySelectorAll('[data-content-href-key]').forEach(function (el) {
      var key = el.getAttribute('data-content-href-key');
      if (!(key in content)) return;
      if (content[key]) {
        el.setAttribute('href', content[key]);
      } else {
        el.hidden = true;
      }
    });

    document.querySelectorAll('[data-content-phone-key]').forEach(function (el) {
      var key = el.getAttribute('data-content-phone-key');
      if (!(key in content)) return;
      if (content[key]) el.setAttribute('data-phone', content[key]);
    });

    var mapEl = document.querySelector('[data-content-map]');
    if (mapEl && content.addressLine1) {
      var fullAddress = content.addressLine1 + (content.addressLine2 ? ', ' + content.addressLine2 : '');
      mapEl.src = 'https://www.google.com/maps?q=' + encodeURIComponent(fullAddress) + '&output=embed';
    }
  } catch (err) {
    console.error('Failed to load site content', err);
  }
});
