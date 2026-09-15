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
//
// Falls back to the page's existing static content if a field has no value
// yet, or if the fetch fails entirely — the page always reads correctly.
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

function escapeHtml(str) {
  var div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

function renderCard(card) {
  return (
    '<div class="card">' +
      '<div class="card-emoji">' + escapeHtml(card.emoji || '') + '</div>' +
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

    document.querySelectorAll('[data-content-key]').forEach(function (el) {
      var key = el.getAttribute('data-content-key');
      if (content[key]) el.textContent = content[key];
    });

    document.querySelectorAll('[data-content-href-key]').forEach(function (el) {
      var key = el.getAttribute('data-content-href-key');
      if (content[key]) el.setAttribute('href', content[key]);
    });

    document.querySelectorAll('[data-content-phone-key]').forEach(function (el) {
      var key = el.getAttribute('data-content-phone-key');
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
