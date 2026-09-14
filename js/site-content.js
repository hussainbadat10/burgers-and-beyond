// Fills any element with a [data-content-key] attribute from the single
// siteContent/main Firestore document. Falls back to leaving the page's
// existing static text in place if Firestore has no value for a key yet,
// or if the fetch fails — the page always reads correctly either way.
import { db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', async function () {
  var targets = document.querySelectorAll('[data-content-key]');
  if (!targets.length) return;

  try {
    var snap = await getDoc(doc(db, 'siteContent', 'main'));
    if (!snap.exists()) return;

    var content = snap.data();
    targets.forEach(function (el) {
      var key = el.getAttribute('data-content-key');
      if (content[key]) el.textContent = content[key];
    });
  } catch (err) {
    console.error('Failed to load site content', err);
  }
});
