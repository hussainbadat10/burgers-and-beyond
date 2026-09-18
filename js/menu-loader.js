// Renders the menu (categories + items) into #menuSidebar/#menuMain from
// Firestore. All categories render in one continuous scroll in #menuMain;
// the sidebar (horizontal chips on mobile) highlights whichever category is
// currently in view (scroll-spy) and clicking one smooth-scrolls to it.
// css/style.css and js/cart.js (which listens for .menu-item-add clicks via
// delegation on document) work unchanged regardless of scroll position.
import { db } from './firebase-config.js';
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { escapeHtml, escapeAttr } from './escape-utils.js';

var categories = [];
var itemsByCategory = {};
var activeCategoryId = null;
var suppressSpyUntil = 0;
var tickingScroll = false;
var searchActive = false;
var noResultsTimer = null;
var lastTrackedNoResultsQuery = '';

function sectionId(categoryId) {
  return 'menu-cat-' + categoryId;
}

function renderItem(item) {
  var name = escapeAttr(item.name);
  var desc = item.description
    ? '<div class="menu-item-desc">' + escapeHtml(item.description) + '</div>'
    : '';
  var photo = item.imageUrl
    ? '<img src="' + escapeAttr(item.imageUrl) + '" alt="' + name + '" class="menu-item-photo" loading="lazy" width="100" height="80">'
    : '';

  // The add button floats in the card's top-right corner via its own
  // absolute positioning (see .menu-item-add in css/style.css) rather than
  // stacking above the photo in a side column — it needs to sit at a
  // consistent corner position whether or not this item has a photo.
  //
  // data-upsell marks items the admin has picked (via the "Suggest in
  // cart" checkbox in the Menu Items editor) to appear as quick-add
  // suggestions in the cart panel — see js/cart.js's getUpsellItems().
  return (
    '<div class="menu-item" data-name="' + name + '" data-price="' + item.price + '"' +
      (item.upsellSuggested ? ' data-upsell="true"' : '') + '>' +
      '<div class="menu-item-main">' +
        '<div class="menu-item-name">' + escapeHtml(item.name) + '</div>' +
        '<div class="menu-item-price">R' + item.price + '</div>' +
        desc +
      '</div>' +
      photo +
      '<button class="menu-item-add" type="button" data-name="' + name + '" data-price="' + item.price + '" aria-label="Add ' + name + ' to order">+</button>' +
    '</div>'
  );
}

function renderCategorySection(cat) {
  var items = itemsByCategory[cat.id] || [];

  var dividerHtml = '';
  if (cat.dividerBefore) {
    dividerHtml =
      '<div class="section-header" data-divider-for="' + escapeAttr(cat.id) + '" style="text-align:left;margin:0 0 24px;max-width:none;">' +
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

  return (
    dividerHtml +
    '<section class="menu-category-section" id="' + sectionId(cat.id) + '" data-category-id="' + escapeAttr(cat.id) + '">' +
      '<h2 class="menu-category-title"><span class="emoji">' + (cat.emoji || '') + '</span> ' + escapeHtml(cat.name) + '</h2>' +
      noteHtml +
      '<div class="menu-list">' + itemsHtml + '</div>' +
      comboHtml +
    '</section>'
  );
}

function renderSidebar() {
  var sidebar = document.getElementById('menuSidebar');
  sidebar.removeAttribute('aria-busy');
  sidebar.innerHTML = categories.map(function (cat) {
    return (
      '<button type="button" class="menu-sidebar-item" data-category-id="' + escapeAttr(cat.id) + '">' +
        '<span class="emoji">' + (cat.emoji || '') + '</span> ' + escapeHtml(cat.name) +
      '</button>'
    );
  }).join('');

  sidebar.querySelectorAll('.menu-sidebar-item').forEach(function (btn) {
    btn.addEventListener('click', function () {
      scrollToCategory(btn.dataset.categoryId);
      setActiveSidebar(btn.dataset.categoryId, true);
    });
  });
}

function renderMain() {
  var main = document.getElementById('menuMain');
  main.removeAttribute('aria-busy');
  main.innerHTML = categories.map(renderCategorySection).join('');
}

function isMobileLayout() {
  return window.matchMedia('(max-width: 800px)').matches;
}

function getStickyOffset() {
  var header = document.querySelector('.site-header');
  var headerHeight = header ? header.offsetHeight : 0;
  if (isMobileLayout()) {
    var sidebar = document.getElementById('menuSidebar');
    return headerHeight + (sidebar ? sidebar.offsetHeight : 0);
  }
  return headerHeight;
}

function scrollToCategory(categoryId) {
  var target = document.getElementById(sectionId(categoryId));
  if (!target) return;
  var top = target.getBoundingClientRect().top + window.scrollY - getStickyOffset() - 16;
  suppressSpyUntil = Date.now() + 3000; // hard cap; cleared early once the scroll actually settles
  window.scrollTo({ top: top, behavior: 'smooth' });
  waitForScrollSettle();
}

// A smooth-scroll to a far-off category can take well over a second, and a
// fixed suppression timeout would either cut in too early (scroll-spy
// flickers through in-between categories while still animating) or hang
// on to a stale suppression too long. Instead, poll until the scroll
// position stops moving, then hand control back to scroll-spy right away.
function waitForScrollSettle() {
  var lastY = window.scrollY;
  var stableFrames = 0;

  function check() {
    if (Date.now() >= suppressSpyUntil) return; // hard cap reached, scroll-spy already resumed on its own

    var y = window.scrollY;
    if (Math.abs(y - lastY) < 1) {
      stableFrames++;
    } else {
      stableFrames = 0;
      lastY = y;
    }

    if (stableFrames >= 3) {
      suppressSpyUntil = 0;
      updateActiveFromScroll();
      return;
    }
    requestAnimationFrame(check);
  }

  requestAnimationFrame(check);
}

function ensureSidebarItemVisible(btn) {
  var sidebar = document.getElementById('menuSidebar');
  if (!sidebar || !btn) return;

  if (isMobileLayout()) {
    var sRect = sidebar.getBoundingClientRect();
    var bRect = btn.getBoundingClientRect();
    if (bRect.left < sRect.left || bRect.right > sRect.right) {
      sidebar.scrollTo({
        left: sidebar.scrollLeft + (bRect.left - sRect.left) - (sRect.width - bRect.width) / 2,
        behavior: 'smooth'
      });
    }
  } else {
    var sRect2 = sidebar.getBoundingClientRect();
    var bRect2 = btn.getBoundingClientRect();
    if (bRect2.top < sRect2.top || bRect2.bottom > sRect2.bottom) {
      sidebar.scrollTo({
        top: sidebar.scrollTop + (bRect2.top - sRect2.top) - (sRect2.height - bRect2.height) / 2,
        behavior: 'smooth'
      });
    }
  }
}

function setActiveSidebar(categoryId, updateHash) {
  if (categoryId === activeCategoryId) return;
  activeCategoryId = categoryId;

  var activeBtn = null;
  document.querySelectorAll('.menu-sidebar-item').forEach(function (btn) {
    var isActive = btn.dataset.categoryId === categoryId;
    btn.classList.toggle('active', isActive);
    if (isActive) activeBtn = btn;
  });

  if (activeBtn) ensureSidebarItemVisible(activeBtn);
  if (updateHash) history.replaceState(null, '', '#' + categoryId);
}

function updateActiveFromScroll() {
  if (Date.now() < suppressSpyUntil) return;

  var offset = getStickyOffset() + 24;
  var current = categories.length ? categories[0].id : null;

  for (var i = 0; i < categories.length; i++) {
    var section = document.getElementById(sectionId(categories[i].id));
    if (!section) continue;
    if (section.getBoundingClientRect().top - offset <= 0) {
      current = categories[i].id;
    } else {
      break;
    }
  }

  if (current) setActiveSidebar(current, true);
}

function updateBackToTop() {
  var btn = document.getElementById('backToTop');
  if (btn) btn.hidden = window.scrollY < 500;
}

function onScroll() {
  if (tickingScroll) return;
  tickingScroll = true;
  window.requestAnimationFrame(function () {
    // Scroll-spy doesn't make sense against a filtered list where most
    // sections are hidden — skip it while a search is active.
    if (!searchActive) updateActiveFromScroll();
    updateBackToTop();
    tickingScroll = false;
  });
}

function getOrCreateSearchEmptyMessage() {
  var msg = document.getElementById('menuSearchEmpty');
  if (!msg) {
    msg = document.createElement('p');
    msg.id = 'menuSearchEmpty';
    msg.className = 'menu-search-empty';
    msg.hidden = true;
    document.getElementById('menuMain').appendChild(msg);
  }
  return msg;
}

function applySearch(rawQuery) {
  var main = document.getElementById('menuMain');
  var sidebar = document.getElementById('menuSidebar');
  var query = rawQuery.trim().toLowerCase();
  searchActive = query.length > 0;

  var emptyMsg = getOrCreateSearchEmptyMessage();

  if (!searchActive) {
    main.querySelectorAll('.menu-search-hide').forEach(function (el) {
      el.classList.remove('menu-search-hide');
    });
    emptyMsg.hidden = true;
    if (sidebar) sidebar.classList.remove('menu-search-hide');
    updateActiveFromScroll();
    return;
  }

  if (sidebar) sidebar.classList.add('menu-search-hide');

  var anyVisible = false;
  main.querySelectorAll('.menu-category-section').forEach(function (section) {
    var sectionHasMatch = false;
    section.querySelectorAll('.menu-item').forEach(function (item) {
      var name = (item.dataset.name || '').toLowerCase();
      var descEl = item.querySelector('.menu-item-desc');
      var descText = descEl ? descEl.textContent.toLowerCase() : '';
      var matches = name.indexOf(query) !== -1 || descText.indexOf(query) !== -1;
      item.classList.toggle('menu-search-hide', !matches);
      if (matches) sectionHasMatch = true;
    });
    section.classList.toggle('menu-search-hide', !sectionHasMatch);

    // The "Sharing Meals" section-header divider (if any) sits as a plain
    // sibling before its section, not inside it — hide it in tandem so a
    // filtered-out category doesn't leave an orphaned heading behind.
    var categoryId = section.dataset.categoryId;
    var divider = main.querySelector('[data-divider-for="' + categoryId + '"]');
    if (divider) divider.classList.toggle('menu-search-hide', !sectionHasMatch);

    if (sectionHasMatch) anyVisible = true;
  });

  emptyMsg.hidden = anyVisible;
  emptyMsg.textContent = anyVisible ? '' : 'No menu items match "' + rawQuery.trim() + '". Try a different search.';

  // Tells the owner what customers search for but can't find on the menu.
  // Debounced so a query that stays empty-result while still being typed
  // (e.g. "chick" -> "chicke" -> "chicken") only logs once it settles, and
  // de-duped against the last query actually sent so re-triggering
  // applySearch with the same text (e.g. from an unrelated re-render) never
  // double-logs.
  if (noResultsTimer) clearTimeout(noResultsTimer);
  if (!anyVisible) {
    var trimmed = rawQuery.trim();
    noResultsTimer = setTimeout(function () {
      if (trimmed && trimmed !== lastTrackedNoResultsQuery && window.trackEvent) {
        lastTrackedNoResultsQuery = trimmed;
        window.trackEvent('menu_search_no_results', { search_term: trimmed });
      }
    }, 600);
  } else {
    lastTrackedNoResultsQuery = '';
  }
}

function updateHeaderHeightVar() {
  var header = document.querySelector('.site-header');
  if (header) {
    document.documentElement.style.setProperty('--header-height', header.offsetHeight + 'px');
  }
}

// Menu/MenuItem structured data for the real menu, built and injected
// client-side once Firestore data has actually loaded. Google's crawler
// renders pages with full JS execution before reading structured data (this
// is officially supported, unlike simple non-JS social-share crawlers), so
// this reaches search results the same as build-time JSON-LD would — the
// only way to get real prices/items into it at all, since the menu itself
// lives in Firestore, not in the static build.
function injectMenuJsonLd() {
  var sections = categories
    .map(function (cat) {
      var items = itemsByCategory[cat.id] || [];
      if (!items.length) return null;
      return {
        '@type': 'MenuSection',
        name: cat.name,
        hasMenuItem: items.map(function (item) {
          var menuItem = { '@type': 'MenuItem', name: item.name };
          if (item.description) menuItem.description = item.description;
          menuItem.offers = { '@type': 'Offer', price: String(item.price), priceCurrency: 'ZAR' };
          return menuItem;
        })
      };
    })
    .filter(Boolean);

  if (!sections.length) return;

  var data = {
    '@context': 'https://schema.org',
    '@type': 'Menu',
    name: 'Burgers N Beyond Menu',
    hasMenuSection: sections
  };

  var existing = document.getElementById('menu-jsonld');
  if (existing) existing.remove();

  var script = document.createElement('script');
  script.type = 'application/ld+json';
  script.id = 'menu-jsonld';
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

async function loadComboDeals() {
  try {
    var snap = await getDocs(query(collection(db, 'comboDeals'), orderBy('order')));
    var combos = [];
    snap.forEach(function (d) {
      var combo = Object.assign({ id: d.id }, d.data());
      if (combo.active !== false) combos.push(combo);
    });
    return combos;
  } catch (err) {
    console.error('Failed to load combo deals from Firestore', err);
    return [];
  }
}

async function loadMenu() {
  var sidebar = document.getElementById('menuSidebar');
  var main = document.getElementById('menuMain');
  if (!sidebar || !main) return;

  // Registered up front (not gated on Firestore succeeding) so "back to
  // top" works even if the menu itself fails to load.
  var backToTopBtn = document.getElementById('backToTop');
  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  // Disabled until real items exist to search against (renderMain enables
  // it) — typing during the loading-skeleton window would just search
  // placeholder content.
  var searchInput = document.getElementById('menuSearch');
  if (searchInput) {
    searchInput.disabled = true;
    searchInput.addEventListener('input', function () {
      applySearch(searchInput.value);
    });
  }

  try {
    var snaps = await Promise.all([
      getDocs(query(collection(db, 'menuCategories'), orderBy('order'))),
      getDocs(query(collection(db, 'menuItems'), orderBy('order'))),
      loadComboDeals()
    ]);
    var catsSnap = snaps[0];
    var itemsSnap = snaps[1];
    var combos = snaps[2];

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

    // Combo deals are a separate Firestore collection (admin-managed, see
    // "Combo Deals" in the admin panel), but rendered as an ordinary
    // pseudo-category pinned to the top of the menu — that gets scroll-spy,
    // sidebar navigation, and search filtering for free, and "Add" behaves
    // exactly like any other menu item (same .menu-item-add button, so it
    // lands in the cart the same way).
    if (combos.length) {
      categories.unshift({ id: 'combo-deals', name: 'Combo Deals', emoji: '🎉', order: -1 });
      itemsByCategory['combo-deals'] = combos;
    }

    if (!categories.length) {
      main.removeAttribute('aria-busy');
      sidebar.removeAttribute('aria-busy');
      main.innerHTML = '<p style="text-align:center;color:var(--color-text-muted);padding:40px 0;">Menu is being updated — check back shortly, or call us to order.</p>';
      sidebar.innerHTML = '';
      return;
    }

    renderSidebar();
    renderMain();
    updateHeaderHeightVar();
    injectMenuJsonLd();
    if (searchInput) searchInput.disabled = false;

    var initial = window.location.hash.replace('#', '');
    if (!categories.some(function (c) { return c.id === initial; })) {
      initial = categories[0].id;
    }
    setActiveSidebar(initial, false);
    if (window.location.hash) {
      // Land directly on the linked category instead of the top of the page.
      requestAnimationFrame(function () { scrollToCategory(initial); });
    }

    window.addEventListener('resize', updateHeaderHeightVar);
  } catch (err) {
    console.error('Failed to load menu from Firestore', err);
    main.removeAttribute('aria-busy');
    sidebar.removeAttribute('aria-busy');
    main.innerHTML = '<p style="text-align:center;color:var(--color-text-muted);padding:40px 0;">Couldn\'t load the menu right now — please call us to order, or try refreshing.</p>';
    sidebar.innerHTML = '';
  }
}

document.addEventListener('DOMContentLoaded', loadMenu);
