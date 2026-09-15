// Renders the menu (categories + items) into #menuSidebar/#menuMain from
// Firestore. Categories sit in a sticky sidebar (horizontal chips on mobile);
// clicking one swaps the item grid in #menuMain, so css/style.css and
// js/cart.js (which listens for .menu-item-add clicks via delegation on
// document) work unchanged regardless of which category is showing.
import { db } from './firebase-config.js';
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

var categories = [];
var itemsByCategory = {};
var activeCategoryId = null;

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
      '<div class="menu-item-main">' +
        '<div class="menu-item-name">' + escapeHtml(item.name) + '</div>' +
        '<div class="menu-item-price">R' + item.price + '</div>' +
        desc +
      '</div>' +
      '<div class="menu-item-side">' +
        '<button class="menu-item-add" type="button" data-name="' + name + '" data-price="' + item.price + '" aria-label="Add ' + name + ' to order">+</button>' +
        photo +
      '</div>' +
    '</div>'
  );
}

function renderSidebar() {
  var sidebar = document.getElementById('menuSidebar');
  sidebar.innerHTML = categories.map(function (cat) {
    return (
      '<button type="button" class="menu-sidebar-item" data-category-id="' + escapeAttr(cat.id) + '">' +
        '<span class="emoji">' + (cat.emoji || '') + '</span> ' + escapeHtml(cat.name) +
      '</button>'
    );
  }).join('');

  sidebar.querySelectorAll('.menu-sidebar-item').forEach(function (btn) {
    btn.addEventListener('click', function () {
      setActiveCategory(btn.dataset.categoryId);
    });
  });
}

function renderMain(categoryId) {
  var main = document.getElementById('menuMain');
  var cat = categories.find(function (c) { return c.id === categoryId; });
  if (!cat) return;

  var items = itemsByCategory[cat.id] || [];

  var dividerHtml = '';
  if (cat.dividerBefore) {
    dividerHtml =
      '<div class="section-header" style="text-align:left;margin:0 0 24px;max-width:none;">' +
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

  var itemsHtml = items.length
    ? items.map(renderItem).join('')
    : '<p style="color:var(--color-text-muted);">No items in this category yet.</p>';

  main.innerHTML = (
    dividerHtml +
    '<h2 class="menu-category-title"><span class="emoji">' + (cat.emoji || '') + '</span> ' + escapeHtml(cat.name) + '</h2>' +
    noteHtml +
    '<div class="menu-list">' + itemsHtml + '</div>' +
    comboHtml
  );
}

function setActiveCategory(categoryId) {
  if (!categories.some(function (c) { return c.id === categoryId; })) return;
  activeCategoryId = categoryId;

  document.querySelectorAll('.menu-sidebar-item').forEach(function (btn) {
    btn.classList.toggle('active', btn.dataset.categoryId === categoryId);
  });

  renderMain(categoryId);
  history.replaceState(null, '', '#' + categoryId);
}

function updateHeaderHeightVar() {
  var header = document.querySelector('.site-header');
  if (header) {
    document.documentElement.style.setProperty('--header-height', header.offsetHeight + 'px');
  }
}

async function loadMenu() {
  var sidebar = document.getElementById('menuSidebar');
  var main = document.getElementById('menuMain');
  if (!sidebar || !main) return;

  try {
    var catsSnap = await getDocs(query(collection(db, 'menuCategories'), orderBy('order')));
    var itemsSnap = await getDocs(query(collection(db, 'menuItems'), orderBy('order')));

    categories = [];
    catsSnap.forEach(function (doc) {
      categories.push(Object.assign({ id: doc.id }, doc.data()));
    });

    itemsByCategory = {};
    itemsSnap.forEach(function (doc) {
      var item = Object.assign({ id: doc.id }, doc.data());
      if (!itemsByCategory[item.categoryId]) itemsByCategory[item.categoryId] = [];
      itemsByCategory[item.categoryId].push(item);
    });

    if (!categories.length) {
      main.innerHTML = '<p style="text-align:center;color:var(--color-text-muted);padding:40px 0;">Menu is being updated — check back shortly, or call us to order.</p>';
      sidebar.innerHTML = '';
      return;
    }

    renderSidebar();

    var initial = window.location.hash.replace('#', '');
    if (!categories.some(function (c) { return c.id === initial; })) {
      initial = categories[0].id;
    }
    setActiveCategory(initial);

    updateHeaderHeightVar();
    window.addEventListener('resize', updateHeaderHeightVar);
  } catch (err) {
    console.error('Failed to load menu from Firestore', err);
    main.innerHTML = '<p style="text-align:center;color:var(--color-text-muted);padding:40px 0;">Couldn\'t load the menu right now — please call us to order, or try refreshing.</p>';
    sidebar.innerHTML = '';
  }
}

document.addEventListener('DOMContentLoaded', loadMenu);
