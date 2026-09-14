// Renders the menu (categories + items) into #menuContainer from Firestore,
// reproducing the exact markup/classes the static site used to hand-author,
// so css/style.css and js/cart.js (which listens for .menu-item-add clicks
// via delegation on document) work unchanged.
import { db } from './firebase-config.js';
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

function escapeHtml(str) {
  var div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, '&quot;');
}

function renderItem(item) {
  var name = escapeAttr(item.name);
  var desc = item.description
    ? '<div class="menu-item-desc">' + escapeHtml(item.description) + '</div>'
    : '';
  var photo = item.imageUrl
    ? '<img src="' + escapeAttr(item.imageUrl) + '" alt="' + name + '" class="menu-item-photo" loading="lazy">'
    : '';

  return (
    '<div class="menu-item" data-name="' + name + '" data-price="' + item.price + '">' +
      photo +
      '<div>' +
        '<div class="menu-item-name">' + escapeHtml(item.name) + '</div>' +
        desc +
      '</div>' +
      '<div class="menu-item-right">' +
        '<div class="menu-item-price">R' + item.price + '</div>' +
        '<button class="menu-item-add" type="button" data-name="' + name + '" data-price="' + item.price + '" aria-label="Add ' + name + ' to order">+</button>' +
      '</div>' +
    '</div>'
  );
}

function renderCategory(cat, items) {
  var dividerHtml = '';
  if (cat.dividerBefore) {
    dividerHtml =
      '<div class="section-header" style="margin-top: 16px;">' +
        '<span class="section-eyebrow">' + escapeHtml(cat.dividerBefore.eyebrow) + '</span>' +
        '<h2>' + escapeHtml(cat.dividerBefore.title) + '</h2>' +
        '<p>' + escapeHtml(cat.dividerBefore.note) + '</p>' +
      '</div>';
  }

  var noteHtml = cat.note
    ? '<p class="menu-category-note">' + escapeHtml(cat.note) + '</p>'
    : '';

  var comboHtml = cat.comboCallout
    ? '<div class="combo-callout">' + cat.comboCallout + '</div>'
    : '';

  var itemsHtml = items.map(renderItem).join('');

  return (
    dividerHtml +
    '<details class="menu-category">' +
      '<summary class="menu-category-summary">' +
        '<h2 class="menu-category-title"><span class="emoji">' + (cat.emoji || '') + '</span> ' + escapeHtml(cat.name) + '</h2>' +
        '<span class="menu-category-chevron" aria-hidden="true">▾</span>' +
      '</summary>' +
      noteHtml +
      '<div class="menu-list">' + itemsHtml + '</div>' +
      comboHtml +
    '</details>'
  );
}

async function loadMenu() {
  var container = document.getElementById('menuContainer');
  if (!container) return;

  try {
    var catsSnap = await getDocs(query(collection(db, 'menuCategories'), orderBy('order')));
    var itemsSnap = await getDocs(query(collection(db, 'menuItems'), orderBy('order')));

    var categories = [];
    catsSnap.forEach(function (doc) {
      categories.push(Object.assign({ id: doc.id }, doc.data()));
    });

    var itemsByCategory = {};
    itemsSnap.forEach(function (doc) {
      var item = Object.assign({ id: doc.id }, doc.data());
      if (!itemsByCategory[item.categoryId]) itemsByCategory[item.categoryId] = [];
      itemsByCategory[item.categoryId].push(item);
    });

    if (!categories.length) {
      container.innerHTML = '<p style="text-align:center;color:var(--color-text-muted);padding:40px 0;">Menu is being updated — check back shortly, or call us to order.</p>';
      return;
    }

    container.innerHTML = categories
      .map(function (cat) { return renderCategory(cat, itemsByCategory[cat.id] || []); })
      .join('');
  } catch (err) {
    console.error('Failed to load menu from Firestore', err);
    container.innerHTML = '<p style="text-align:center;color:var(--color-text-muted);padding:40px 0;">Couldn\'t load the menu right now — please call us to order, or try refreshing.</p>';
  }
}

document.addEventListener('DOMContentLoaded', loadMenu);
