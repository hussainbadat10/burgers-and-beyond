import { db, auth } from './firebase-config.js';
import {
  onAuthStateChanged, signInWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  collection, getDocs, getDoc, doc, setDoc, updateDoc, deleteDoc, addDoc,
  query, orderBy, writeBatch
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { CATEGORIES, ITEMS, SITE_CONTENT, BUSINESS_INFO, DAILY_SPECIALS, FAN_FAVOURITES, VALUE_CARDS } from './seed-data.js';

// Photo uploads go to Cloudinary (free, no card required), not Firebase
// Storage (which now requires Google's paid Blaze plan). This preset is
// deliberately an "unsigned" one, meant to be used client-side like this.
var CLOUDINARY_CLOUD_NAME = 'ys741dda';
var CLOUDINARY_UPLOAD_PRESET = 'BnB_Menu';

// Cloudinary's raw secure_url is the untouched original upload — a phone
// camera photo can be 5-10MB, which is wildly oversized for an 80px menu
// thumbnail. Cloudinary can transform on the fly via the URL itself, so
// this caps the width, and lets it auto-pick quality/format (WebP/AVIF
// where supported) per visitor, no separate processing step needed.
function optimizedCloudinaryUrl(rawUrl) {
  return rawUrl.replace('/image/upload/', '/image/upload/w_500,c_limit,q_auto,f_auto/');
}

var loginView = document.getElementById('loginView');
var adminView = document.getElementById('adminView');
var loginForm = document.getElementById('loginForm');
var loginError = document.getElementById('loginError');
var logoutBtn = document.getElementById('logoutBtn');
var seedBanner = document.getElementById('seedBanner');
var seedBtn = document.getElementById('seedBtn');
var toast = document.getElementById('toast');

var DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
var DAY_LABELS = { monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday' };

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(function () { toast.classList.remove('show'); }, 2200);
}

function escapeAttr(str) {
  var div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML.replace(/"/g, '&quot;');
}

// ---------- Auth ----------

loginForm.addEventListener('submit', function (e) {
  e.preventDefault();
  loginError.textContent = '';
  var email = document.getElementById('loginEmail').value.trim();
  var password = document.getElementById('loginPassword').value;

  signInWithEmailAndPassword(auth, email, password).catch(function (err) {
    loginError.textContent = 'Could not log in — check your email and password.';
    console.error(err);
  });
});

logoutBtn.addEventListener('click', function () {
  signOut(auth);
});

onAuthStateChanged(auth, function (user) {
  if (user) {
    loginView.hidden = true;
    adminView.hidden = false;
    loadEverything();
  } else {
    loginView.hidden = false;
    adminView.hidden = true;
  }
});

// ---------- Tabs ----------

document.querySelectorAll('.admin-tab').forEach(function (tab) {
  tab.addEventListener('click', function () {
    document.querySelectorAll('.admin-tab').forEach(function (t) { t.classList.remove('active'); });
    document.querySelectorAll('.admin-panel-section').forEach(function (s) { s.hidden = true; });
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).hidden = false;
  });
});

// ---------- Load everything ----------

// Safely fills in any siteContent/businessInfo field that doesn't exist yet
// (e.g. new fields added after the site was first seeded), WITHOUT ever
// touching a key that's already present — so a real edit is never
// overwritten by a default, even if the site was seeded before these
// fields existed. Runs quietly on every login; only writes if needed.
async function fillMissingContentDefaults() {
  var [siteSnap, bizSnap] = await Promise.all([
    getDoc(doc(db, 'siteContent', 'main')),
    getDoc(doc(db, 'businessInfo', 'main'))
  ]);
  var existingSite = siteSnap.exists() ? siteSnap.data() : {};
  var existingBiz = bizSnap.exists() ? bizSnap.data() : {};

  var missingSite = {};
  Object.keys(SITE_CONTENT).forEach(function (k) {
    if (!(k in existingSite)) missingSite[k] = SITE_CONTENT[k];
  });

  var missingBiz = {};
  Object.keys(BUSINESS_INFO).forEach(function (k) {
    if (!(k in existingBiz)) missingBiz[k] = BUSINESS_INFO[k];
  });

  if (Object.keys(missingSite).length) {
    await setDoc(doc(db, 'siteContent', 'main'), missingSite, { merge: true });
  }
  if (Object.keys(missingBiz).length) {
    await setDoc(doc(db, 'businessInfo', 'main'), missingBiz, { merge: true });
  }
}

// Fan Favourites and Value Cards used to be a fixed set of siteContent
// fields (fanFav1..4 / value1..3) — now each is its own collection so the
// admin panel can add/remove cards freely, not just edit a fixed count.
// Only runs if the new collection is still empty, so a real edit made after
// migrating once can never be overwritten.
async function migrateFixedSiteContentCards(prefix, count, collectionName) {
  var existingSnap = await getDocs(collection(db, collectionName));
  if (!existingSnap.empty) return;

  var siteSnap = await getDoc(doc(db, 'siteContent', 'main'));
  if (!siteSnap.exists()) return;
  var content = siteSnap.data();

  var batch = writeBatch(db);
  var wrote = false;
  for (var i = 1; i <= count; i++) {
    var title = content[prefix + i + 'Title'];
    if (!title) continue;
    var ref = doc(collection(db, collectionName));
    batch.set(ref, {
      emoji: content[prefix + i + 'Emoji'] || '',
      title: title,
      desc: content[prefix + i + 'Desc'] || '',
      imageUrl: '',
      order: i
    });
    wrote = true;
  }
  if (wrote) await batch.commit();
}

// The Halaal certification card was never a siteContent field at all — it
// was hardcoded HTML in about.html, not admin-editable, by deliberate
// earlier design (per hbadat, that restriction was a judgment call, not
// something asked for — reversed). Unlike the migration above, this can't
// be gated on "valueCards is still empty": Fan Favourites/Value Cards had
// already been migrated (3 real cards) before this reversal, so that guard
// would never fire again. Checks specifically for whether the Halaal card
// itself exists yet (by its known imageUrl) instead, so it correctly
// backfills it into an already-migrated collection exactly once, without
// caring what state that collection was already in.
async function migrateHalaalCardIfNeeded() {
  var snap = await getDocs(collection(db, 'valueCards'));
  var hasHalaal = false;
  var maxOrder = 0;
  snap.forEach(function (d) {
    var data = d.data();
    if (data.imageUrl === 'images/sanha-logo.png') hasHalaal = true;
    if ((data.order || 0) > maxOrder) maxOrder = data.order || 0;
  });
  if (hasHalaal) return;

  await addDoc(collection(db, 'valueCards'), {
    emoji: '',
    title: '100% Halaal حلال',
    desc: 'Certified Halaal by SANHA — every ingredient, every time.',
    imageUrl: 'images/sanha-logo.png',
    order: maxOrder + 1
  });
}

// Daily specials used to be one doc per day (dailySpecials/{day}, a single
// {item, promo, imageUrl}) — now each day is a subcollection of specials
// (dailySpecials/{day}/items/{id}) so more than one can be featured on the
// same day and specials can be added/removed freely. Migrates the existing
// single special into the new subcollection as its first item, per day,
// only if that day's subcollection is still empty.
async function migrateDailySpecialsIfNeeded() {
  for (var i = 0; i < DAY_KEYS.length; i++) {
    var day = DAY_KEYS[i];
    var itemsSnap = await getDocs(collection(db, 'dailySpecials', day, 'items'));
    if (!itemsSnap.empty) continue;

    var daySnap = await getDoc(doc(db, 'dailySpecials', day));
    if (!daySnap.exists()) continue;
    var data = daySnap.data();
    if (!data.item || !data.promo) continue;

    await addDoc(collection(db, 'dailySpecials', day, 'items'), {
      item: data.item,
      promo: data.promo,
      imageUrl: data.imageUrl || '',
      order: 1
    });
  }
}

async function loadEverything() {
  await fillMissingContentDefaults();
  await migrateFixedSiteContentCards('fanFav', 4, 'fanFavourites');
  await migrateFixedSiteContentCards('value', 3, 'valueCards');
  await migrateHalaalCardIfNeeded();
  await migrateDailySpecialsIfNeeded();
  await loadContentEditorForPage('homeContentEditor', 'home');
  await loadFanFavEditor();
  await loadContentEditorForPage('menuContentEditor', 'menu');
  await loadMenuEditor();
  await loadSpecialsEditor();
  await loadContentEditorForPage('aboutContentEditor', 'about');
  await loadValueCardEditor();
  await loadContentEditorForPage('contactContentEditor', 'contact');
  await loadBusinessEditor();
}

// ---------- Menu editor ----------

async function fetchCategoriesAndItems() {
  var catsSnap = await getDocs(query(collection(db, 'menuCategories'), orderBy('order')));
  var itemsSnap = await getDocs(query(collection(db, 'menuItems'), orderBy('order')));

  var categories = [];
  catsSnap.forEach(function (d) { categories.push(Object.assign({ id: d.id }, d.data())); });

  var itemsByCategory = {};
  itemsSnap.forEach(function (d) {
    var item = Object.assign({ id: d.id }, d.data());
    if (!itemsByCategory[item.categoryId]) itemsByCategory[item.categoryId] = [];
    itemsByCategory[item.categoryId].push(item);
  });

  return { categories: categories, itemsByCategory: itemsByCategory };
}

async function loadMenuEditor() {
  var editor = document.getElementById('menuEditor');
  var data = await fetchCategoriesAndItems();

  if (!data.categories.length) {
    seedBanner.hidden = false;
    editor.innerHTML = '<p class="admin-hint">Nothing here yet — import the starter data above, or add a category directly in the Firestore console.</p>';
    return;
  }

  seedBanner.hidden = true;

  editor.innerHTML = data.categories.map(function (cat) {
    var items = data.itemsByCategory[cat.id] || [];
    return (
      '<div class="admin-category" data-category-id="' + cat.id + '">' +
        '<div class="admin-category-header">' +
          '<strong>' + (cat.emoji || '') + ' ' + escapeAttr(cat.name) + '</strong>' +
        '</div>' +
        items.map(renderItemRow).join('') +
        renderAddItemRow(cat.id) +
      '</div>'
    );
  }).join('');

  editor.querySelectorAll('[data-action="save-item"]').forEach(function (btn) {
    btn.addEventListener('click', function () { saveItem(btn.closest('.admin-item-row')); });
  });
  editor.querySelectorAll('[data-action="delete-item"]').forEach(function (btn) {
    btn.addEventListener('click', function () { deleteItem(btn.closest('.admin-item-row')); });
  });
  editor.querySelectorAll('[data-action="upload-photo"]').forEach(function (input) {
    input.addEventListener('change', function () { uploadItemPhoto(input); });
  });
  editor.querySelectorAll('[data-action="add-item"]').forEach(function (btn) {
    btn.addEventListener('click', function () { addItem(btn.closest('.admin-add-item')); });
  });
}

function renderItemRow(item) {
  var photo = item.imageUrl
    ? '<img src="' + escapeAttr(item.imageUrl) + '" class="admin-item-photo" alt="">'
    : '<div class="admin-item-photo"></div>';
  var fileId = 'photo-' + item.id;

  return (
    '<div class="admin-item-row" data-item-id="' + item.id + '">' +
      '<div>' +
        photo +
        '<input type="file" id="' + fileId + '" accept="image/*" data-action="upload-photo" style="display:none">' +
        '<label for="' + fileId + '" class="admin-file-label">Change photo</label>' +
      '</div>' +
      '<div class="admin-item-fields">' +
        '<input type="text" data-field="name" value="' + escapeAttr(item.name) + '" placeholder="Name">' +
        '<textarea data-field="description" placeholder="Description (optional)">' + (item.description || '') + '</textarea>' +
      '</div>' +
      '<input type="number" data-field="price" value="' + item.price + '" min="0" step="1">' +
      '<div class="admin-item-actions">' +
        '<button class="admin-btn admin-btn-primary" type="button" data-action="save-item">Save</button>' +
        '<button class="admin-btn admin-btn-danger" type="button" data-action="delete-item">Delete</button>' +
      '</div>' +
    '</div>'
  );
}

function renderAddItemRow(categoryId) {
  return (
    '<div class="admin-add-item" data-category-id="' + categoryId + '">' +
      '<input type="text" data-field="name" placeholder="New item name">' +
      '<input type="number" data-field="price" placeholder="Price" min="0" step="1">' +
      '<button class="admin-btn admin-btn-primary" type="button" data-action="add-item">Add Item</button>' +
    '</div>'
  );
}

async function saveItem(row) {
  var id = row.dataset.itemId;
  var name = row.querySelector('[data-field="name"]').value.trim();
  var price = Number(row.querySelector('[data-field="price"]').value);
  var description = row.querySelector('[data-field="description"]').value.trim();

  if (!name || !Number.isFinite(price)) {
    showToast('Enter a valid name and price first');
    return;
  }

  try {
    await updateDoc(doc(db, 'menuItems', id), { name: name, price: price, description: description });
    showToast('Saved');
  } catch (err) {
    console.error(err);
    showToast('Could not save — try again');
  }
}

async function deleteItem(row) {
  if (!confirm('Delete this item permanently?')) return;
  var id = row.dataset.itemId;
  try {
    await deleteDoc(doc(db, 'menuItems', id));
    row.remove();
    showToast('Item deleted');
  } catch (err) {
    console.error(err);
    showToast('Could not delete — try again');
  }
}

async function uploadItemPhoto(input) {
  var file = input.files[0];
  if (!file) return;
  var row = input.closest('.admin-item-row');
  var id = row.dataset.itemId;

  showToast('Uploading photo…');
  try {
    var formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    var res = await fetch('https://api.cloudinary.com/v1_1/' + CLOUDINARY_CLOUD_NAME + '/image/upload', {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error('Cloudinary upload failed: ' + res.status);
    var result = await res.json();
    var url = optimizedCloudinaryUrl(result.secure_url);

    await updateDoc(doc(db, 'menuItems', id), { imageUrl: url });

    var img = row.querySelector('.admin-item-photo');
    if (img.tagName === 'IMG') {
      img.src = url;
    } else {
      var newImg = document.createElement('img');
      newImg.className = 'admin-item-photo';
      newImg.src = url;
      img.replaceWith(newImg);
    }
    showToast('Photo updated');
  } catch (err) {
    console.error(err);
    showToast('Photo upload failed — try again');
  }
}

async function addItem(row) {
  var categoryId = row.dataset.categoryId;
  var name = row.querySelector('[data-field="name"]').value.trim();
  var price = Number(row.querySelector('[data-field="price"]').value);

  if (!name || !Number.isFinite(price)) {
    showToast('Enter a valid name and price first');
    return;
  }

  try {
    var itemsSnap = await getDocs(query(collection(db, 'menuItems'), orderBy('order')));
    var maxOrder = 0;
    itemsSnap.forEach(function (d) {
      var data = d.data();
      if (data.categoryId === categoryId && data.order > maxOrder) maxOrder = data.order;
    });

    await addDoc(collection(db, 'menuItems'), {
      categoryId: categoryId, name: name, price: price, description: '', imageUrl: '', order: maxOrder + 1
    });
    showToast('Item added');
    loadMenuEditor();
  } catch (err) {
    console.error(err);
    showToast('Could not add item — try again');
  }
}

// ---------- Site text editor ----------
// Grouped by page/section, each group saves independently to siteContent/main.

// Each group belongs to one `page` — the admin panel's tabs match the
// site's own nav (Home / Menu / About / Contact) exactly, so a group
// renders inside that page's tab, in the same top-to-bottom order the
// content actually appears on the real page. `footerTagline` shows on
// every page's footer but has to live in one tab — Home, since that's
// the site's landing page.
var CONTENT_GROUPS = [
  {
    page: 'home',
    title: 'Hero',
    fields: [
      { key: 'heroEyebrow', label: 'Eyebrow', type: 'input' },
      { key: 'heroHeadline', label: 'Headline', type: 'input' },
      { key: 'heroSub', label: 'Intro Text', type: 'textarea' }
    ]
  },
  {
    page: 'home',
    title: 'Fan Favourites — Heading',
    fields: [
      { key: 'fanFavHeading', label: 'Section Heading', type: 'input' },
      { key: 'fanFavSub', label: 'Section Subtext', type: 'textarea' }
    ]
  },
  {
    page: 'home',
    title: 'Reviews',
    fields: [
      { key: 'reviewsHeading', label: 'Heading', type: 'input' },
      { key: 'reviewsSub', label: 'Subtext', type: 'textarea' }
    ]
  },
  {
    page: 'home',
    title: 'Footer (shown on every page)',
    fields: [
      { key: 'footerTagline', label: 'Tagline', type: 'textarea' }
    ]
  },
  {
    page: 'menu',
    title: 'Hero',
    fields: [
      { key: 'menuHeroEyebrow', label: 'Eyebrow', type: 'input' },
      { key: 'menuHeroTitle', label: 'Title', type: 'input' },
      { key: 'menuHeroSub', label: 'Subtext', type: 'textarea' }
    ]
  },
  {
    page: 'about',
    title: 'Hero',
    fields: [
      { key: 'aboutHeroEyebrow', label: 'Eyebrow', type: 'input' },
      { key: 'aboutHeroTitle', label: 'Title', type: 'input' },
      { key: 'aboutHeroSub', label: 'Subtext', type: 'textarea' }
    ]
  },
  {
    page: 'about',
    title: 'Story',
    fields: [
      { key: 'aboutIntro', label: 'Intro Paragraph', type: 'textarea' },
      { key: 'whatWeBelieveHeading', label: '"What We Believe" Heading', type: 'input' },
      { key: 'aboutBelieve', label: '"What We Believe" Paragraph', type: 'textarea' },
      { key: 'takeawayDoneRightHeading', label: '"Takeaway, Done Right" Heading', type: 'input' },
      { key: 'aboutTakeaway', label: '"Takeaway, Done Right" Paragraph', type: 'textarea' }
    ]
  },
  {
    page: 'about',
    title: 'Bottom CTA',
    fields: [
      { key: 'aboutCtaEyebrow', label: 'Eyebrow', type: 'input' },
      { key: 'aboutCtaHeading', label: 'Heading', type: 'input' },
      { key: 'aboutCtaText', label: 'Text', type: 'textarea' }
    ]
  },
  {
    page: 'contact',
    title: 'Hero',
    fields: [
      { key: 'contactHeroEyebrow', label: 'Eyebrow', type: 'input' },
      { key: 'contactHeroTitle', label: 'Title', type: 'input' },
      { key: 'contactHeroSub', label: 'Subtext', type: 'textarea' }
    ]
  }
];

// Cached across the 4 per-page calls below so editing/saving on 4 different
// tabs only ever reads siteContent/main from Firestore once per admin
// session load, not once per tab.
var siteContentCache = null;

async function fetchSiteContent() {
  if (siteContentCache) return siteContentCache;
  var snap = await getDoc(doc(db, 'siteContent', 'main'));
  siteContentCache = snap.exists() ? snap.data() : {};
  return siteContentCache;
}

// Renders only the CONTENT_GROUPS entries belonging to one page into that
// page's own tab — data-group-index still refers to the group's position in
// the full CONTENT_GROUPS array (not the filtered list), so saveContentGroup
// below needs no changes to find the right group.
async function loadContentEditorForPage(containerId, page) {
  var editor = document.getElementById(containerId);
  var content = await fetchSiteContent();

  var groups = [];
  CONTENT_GROUPS.forEach(function (group, i) {
    if (group.page === page) groups.push({ group: group, index: i });
  });

  editor.innerHTML = groups.map(function (entry) {
    var group = entry.group;
    var fieldsHtml = group.fields.map(function (f) {
      var value = content[f.key] || '';
      var field = f.type === 'textarea'
        ? '<textarea data-field="' + f.key + '">' + value + '</textarea>'
        : '<input type="text" data-field="' + f.key + '" value="' + escapeAttr(value) + '">';
      return '<div class="admin-field"><label>' + f.label + '</label>' + field + '</div>';
    }).join('');

    return (
      '<div class="admin-category" data-group-index="' + entry.index + '">' +
        '<div class="admin-category-header"><strong>' + group.title + '</strong></div>' +
        fieldsHtml +
        '<button class="admin-btn admin-btn-primary" type="button" data-action="save-group">Save</button>' +
      '</div>'
    );
  }).join('');

  editor.querySelectorAll('[data-action="save-group"]').forEach(function (btn) {
    btn.addEventListener('click', function () { saveContentGroup(btn.closest('.admin-category')); });
  });
}

async function saveContentGroup(groupEl) {
  var groupIndex = Number(groupEl.dataset.groupIndex);
  var group = CONTENT_GROUPS[groupIndex];
  var data = {};
  group.fields.forEach(function (f) {
    data[f.key] = groupEl.querySelector('[data-field="' + f.key + '"]').value.trim();
  });

  try {
    await setDoc(doc(db, 'siteContent', 'main'), data, { merge: true });
    showToast(group.title + ' saved');
  } catch (err) {
    console.error(err);
    showToast('Could not save — try again');
  }
}

// ---------- Card collections (Fan Favourites, Value Cards) ----------

// Both are the exact same shape (emoji or photo + title + description,
// freely add/remove) so one factory builds both editors instead of
// duplicating identical CRUD logic twice. A photo (uploaded to Cloudinary,
// same as menu item photos) takes priority over the emoji when both are
// set — used for e.g. the Halaal certification card's real logo.
function makeCardCollectionEditor(collectionName, editorElId) {
  async function load() {
    var editor = document.getElementById(editorElId);
    var snap = await getDocs(query(collection(db, collectionName), orderBy('order')));
    var cards = [];
    snap.forEach(function (d) { cards.push(Object.assign({ id: d.id }, d.data())); });

    editor.innerHTML = cards.map(renderRow).join('') + renderAddRow();

    editor.querySelectorAll('[data-action="save-item"]').forEach(function (btn) {
      btn.addEventListener('click', function () { saveRow(btn.closest('.admin-item-row')); });
    });
    editor.querySelectorAll('[data-action="delete-item"]').forEach(function (btn) {
      btn.addEventListener('click', function () { deleteRow(btn.closest('.admin-item-row')); });
    });
    editor.querySelectorAll('[data-action="upload-photo"]').forEach(function (input) {
      input.addEventListener('change', function () { uploadPhoto(input); });
    });
    editor.querySelectorAll('[data-action="add-item"]').forEach(function (btn) {
      btn.addEventListener('click', function () { addRow(btn.closest('.admin-add-item')); });
    });
  }

  function renderRow(card) {
    var photo = card.imageUrl
      ? '<img src="' + escapeAttr(card.imageUrl) + '" class="admin-item-photo" alt="">'
      : '<div class="admin-item-photo"></div>';
    var fileId = collectionName + '-photo-' + card.id;

    return (
      '<div class="admin-item-row" style="grid-template-columns: 56px 90px 1fr 2fr auto;" data-item-id="' + card.id + '">' +
        '<div>' +
          photo +
          '<input type="file" id="' + fileId + '" accept="image/*" data-action="upload-photo" style="display:none">' +
          '<label for="' + fileId + '" class="admin-file-label">Change photo</label>' +
        '</div>' +
        '<input type="text" data-field="emoji" value="' + escapeAttr(card.emoji || '') + '" style="text-align:center;font-size:1.3rem;" placeholder="🔥">' +
        '<input type="text" data-field="title" value="' + escapeAttr(card.title || '') + '" placeholder="Title">' +
        '<textarea data-field="desc" placeholder="Description">' + (card.desc || '') + '</textarea>' +
        '<div class="admin-item-actions">' +
          '<button class="admin-btn admin-btn-primary" type="button" data-action="save-item">Save</button>' +
          '<button class="admin-btn admin-btn-danger" type="button" data-action="delete-item">Delete</button>' +
        '</div>' +
      '</div>'
    );
  }

  function renderAddRow() {
    return (
      '<div class="admin-add-item" style="grid-template-columns: 56px 1fr auto;">' +
        '<input type="text" data-field="emoji" style="text-align:center;font-size:1.3rem;" placeholder="🔥">' +
        '<input type="text" data-field="title" placeholder="New card title">' +
        '<button class="admin-btn admin-btn-primary" type="button" data-action="add-item">Add Card</button>' +
      '</div>'
    );
  }

  async function saveRow(row) {
    var id = row.dataset.itemId;
    var emoji = row.querySelector('[data-field="emoji"]').value.trim();
    var title = row.querySelector('[data-field="title"]').value.trim();
    var desc = row.querySelector('[data-field="desc"]').value.trim();

    if (!title) {
      showToast('Title is required');
      return;
    }

    try {
      await updateDoc(doc(db, collectionName, id), { emoji: emoji, title: title, desc: desc });
      showToast('Card saved');
    } catch (err) {
      console.error(err);
      showToast('Could not save — try again');
    }
  }

  async function deleteRow(row) {
    if (!confirm('Delete this card permanently?')) return;
    var id = row.dataset.itemId;
    try {
      await deleteDoc(doc(db, collectionName, id));
      row.remove();
      showToast('Card deleted');
    } catch (err) {
      console.error(err);
      showToast('Could not delete — try again');
    }
  }

  async function uploadPhoto(input) {
    var file = input.files[0];
    if (!file) return;
    var row = input.closest('.admin-item-row');
    var id = row.dataset.itemId;

    showToast('Uploading photo…');
    try {
      var formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

      var res = await fetch('https://api.cloudinary.com/v1_1/' + CLOUDINARY_CLOUD_NAME + '/image/upload', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error('Cloudinary upload failed: ' + res.status);
      var result = await res.json();
      var url = optimizedCloudinaryUrl(result.secure_url);

      await updateDoc(doc(db, collectionName, id), { imageUrl: url });

      var img = row.querySelector('.admin-item-photo');
      if (img.tagName === 'IMG') {
        img.src = url;
      } else {
        var newImg = document.createElement('img');
        newImg.className = 'admin-item-photo';
        newImg.src = url;
        img.replaceWith(newImg);
      }
      showToast('Photo updated');
    } catch (err) {
      console.error(err);
      showToast('Photo upload failed — try again');
    }
  }

  async function addRow(addRowEl) {
    var emoji = addRowEl.querySelector('[data-field="emoji"]').value.trim();
    var title = addRowEl.querySelector('[data-field="title"]').value.trim();

    if (!title) {
      showToast('Title is required');
      return;
    }

    try {
      var snap = await getDocs(collection(db, collectionName));
      var maxOrder = 0;
      snap.forEach(function (d) {
        var order = d.data().order || 0;
        if (order > maxOrder) maxOrder = order;
      });

      await addDoc(collection(db, collectionName), { emoji: emoji, title: title, desc: '', imageUrl: '', order: maxOrder + 1 });
      showToast('Card added');
      load();
    } catch (err) {
      console.error(err);
      showToast('Could not add — try again');
    }
  }

  return { load: load };
}

var fanFavEditor = makeCardCollectionEditor('fanFavourites', 'fanFavEditor');
var valueCardEditor = makeCardCollectionEditor('valueCards', 'valueCardsEditor');

function loadFanFavEditor() { return fanFavEditor.load(); }
function loadValueCardEditor() { return valueCardEditor.load(); }

// ---------- Business info editor ----------

var BUSINESS_FIELDS = [
  { key: 'phone1Text', label: 'Phone 1 — Display Text', type: 'input' },
  { key: 'phone1Href', label: 'Phone 1 — Link (e.g. tel:+27825140077)', type: 'input' },
  { key: 'phone1Wa', label: 'Phone 1 — WhatsApp number (digits only, e.g. 27825140077)', type: 'input' },
  { key: 'phone2Text', label: 'Phone 2 — Display Text', type: 'input' },
  { key: 'phone2Href', label: 'Phone 2 — Link (e.g. tel:+27824211750)', type: 'input' },
  { key: 'phone2Wa', label: 'Phone 2 — WhatsApp number (digits only)', type: 'input' },
  { key: 'addressLine1', label: 'Address — Line 1', type: 'input' },
  { key: 'addressLine2', label: 'Address — Line 2', type: 'input' },
  { key: 'mapsHref', label: 'Google Maps Link (address links + Read Our Reviews)', type: 'input' },
  { key: 'writeReviewHref', label: 'Google "Write A Review" Link', type: 'input' },
  { key: 'hoursMonSat', label: 'Hours — Mon–Sat line', type: 'input' },
  { key: 'hoursFri', label: 'Hours — Friday closure line', type: 'input' },
  { key: 'hoursSun', label: 'Hours — Sunday line', type: 'input' },
  { key: 'hoursMonSatOpenTime', label: 'Live "Open Now" badge — Mon–Sat opens at', type: 'time' },
  { key: 'hoursMonSatCloseTime', label: 'Live "Open Now" badge — Mon–Sat closes at', type: 'time' },
  { key: 'hoursFriOpenTime1', label: 'Live "Open Now" badge — Friday opens at (morning)', type: 'time' },
  { key: 'hoursFriCloseTime1', label: 'Live "Open Now" badge — Friday closes at (before break)', type: 'time' },
  { key: 'hoursFriOpenTime2', label: 'Live "Open Now" badge — Friday reopens at (afternoon)', type: 'time' },
  { key: 'hoursFriCloseTime2', label: 'Live "Open Now" badge — Friday closes at (evening)', type: 'time' },
  { key: 'emailText', label: 'Email — Display Text', type: 'input' },
  { key: 'emailHref', label: 'Email — Link (e.g. mailto:you@example.com)', type: 'input' },
  { key: 'mrdHref', label: 'Mr D Food Link', type: 'input' },
  { key: 'instagramHref', label: 'Instagram Link', type: 'input' }
];

async function loadBusinessEditor() {
  var editor = document.getElementById('businessEditor');
  var snap = await getDoc(doc(db, 'businessInfo', 'main'));
  var content = snap.exists() ? snap.data() : {};

  editor.innerHTML =
    BUSINESS_FIELDS.map(function (f) {
      var value = content[f.key] || '';
      var inputType = f.type === 'time' ? 'time' : 'text';
      return '<div class="admin-field"><label>' + f.label + '</label><input type="' + inputType + '" data-field="' + f.key + '" value="' + escapeAttr(value) + '"></div>';
    }).join('') +
    '<button id="saveBusinessBtn" class="btn btn-primary" type="button">Save Business Info</button>';

  document.getElementById('saveBusinessBtn').addEventListener('click', saveBusinessInfo);
}

async function saveBusinessInfo() {
  var editor = document.getElementById('businessEditor');
  var data = {};
  BUSINESS_FIELDS.forEach(function (f) {
    data[f.key] = editor.querySelector('[data-field="' + f.key + '"]').value.trim();
  });

  try {
    await setDoc(doc(db, 'businessInfo', 'main'), data, { merge: true });
    showToast('Business info saved');
  } catch (err) {
    console.error(err);
    showToast('Could not save — try again');
  }
}

// ---------- Daily specials editor ----------
// Each day can now have any number of specials (dailySpecials/{day}/items),
// not just one — add/remove freely, same CRUD shape as menu items, grouped
// by the six fixed weekday "categories" (no Sunday — shop is closed).

async function fetchDailySpecials() {
  var byDay = {};
  for (var i = 0; i < DAY_KEYS.length; i++) {
    var day = DAY_KEYS[i];
    var snap = await getDocs(query(collection(db, 'dailySpecials', day, 'items'), orderBy('order')));
    var items = [];
    snap.forEach(function (d) { items.push(Object.assign({ id: d.id }, d.data())); });
    byDay[day] = items;
  }
  return byDay;
}

function renderSpecialRow(day, special) {
  var photo = special.imageUrl
    ? '<img src="' + escapeAttr(special.imageUrl) + '" class="admin-item-photo" alt="">'
    : '<div class="admin-item-photo"></div>';
  var fileId = 'special-photo-' + day + '-' + special.id;

  return (
    '<div class="admin-item-row" style="grid-template-columns: 56px 1fr 1fr 110px auto;" data-day="' + day + '" data-item-id="' + special.id + '">' +
      '<div>' +
        photo +
        '<input type="file" id="' + fileId + '" accept="image/*" data-action="upload-special-photo" style="display:none">' +
        '<label for="' + fileId + '" class="admin-file-label">Change photo</label>' +
      '</div>' +
      '<input type="text" data-field="item" value="' + escapeAttr(special.item || '') + '" placeholder="Item name">' +
      '<input type="text" data-field="promo" value="' + escapeAttr(special.promo || '') + '" placeholder="e.g. 10% off">' +
      '<input type="number" data-field="price" value="' + (special.price || '') + '" placeholder="Price (R)" min="0" step="1">' +
      '<div class="admin-item-actions">' +
        '<button class="admin-btn admin-btn-primary" type="button" data-action="save-special">Save</button>' +
        '<button class="admin-btn admin-btn-danger" type="button" data-action="delete-special">Delete</button>' +
      '</div>' +
    '</div>'
  );
}

function renderAddSpecialRow(day) {
  return (
    '<div class="admin-add-item" style="grid-template-columns: 1fr 1fr 110px auto;" data-day="' + day + '">' +
      '<input type="text" data-field="item" placeholder="New item name">' +
      '<input type="text" data-field="promo" placeholder="e.g. 10% off">' +
      '<input type="number" data-field="price" placeholder="Price (R)" min="0" step="1">' +
      '<button class="admin-btn admin-btn-primary" type="button" data-action="add-special">Add Special</button>' +
    '</div>'
  );
}

async function loadSpecialsEditor() {
  var editor = document.getElementById('specialsEditor');
  var byDay = await fetchDailySpecials();

  editor.innerHTML = DAY_KEYS.map(function (day) {
    var specials = byDay[day] || [];
    var rowsHtml = specials.length
      ? specials.map(function (s) { return renderSpecialRow(day, s); }).join('')
      : '<p class="admin-hint" style="margin:8px 0;">No specials set for ' + DAY_LABELS[day] + ' yet.</p>';

    return (
      '<div class="admin-category">' +
        '<div class="admin-category-header"><h3 style="margin:0;">' + DAY_LABELS[day] + '</h3></div>' +
        rowsHtml +
        renderAddSpecialRow(day) +
      '</div>'
    );
  }).join('');

  editor.querySelectorAll('[data-action="save-special"]').forEach(function (btn) {
    btn.addEventListener('click', function () { saveSpecial(btn.closest('.admin-item-row')); });
  });
  editor.querySelectorAll('[data-action="delete-special"]').forEach(function (btn) {
    btn.addEventListener('click', function () { deleteSpecial(btn.closest('.admin-item-row')); });
  });
  editor.querySelectorAll('[data-action="upload-special-photo"]').forEach(function (input) {
    input.addEventListener('change', function () { uploadSpecialPhoto(input); });
  });
  editor.querySelectorAll('[data-action="add-special"]').forEach(function (btn) {
    btn.addEventListener('click', function () { addSpecial(btn.closest('.admin-add-item')); });
  });
}

async function saveSpecial(row) {
  var day = row.dataset.day;
  var id = row.dataset.itemId;
  var item = row.querySelector('[data-field="item"]').value.trim();
  var promo = row.querySelector('[data-field="promo"]').value.trim();
  var price = Number(row.querySelector('[data-field="price"]').value) || 0;

  if (!item || !promo) {
    showToast('Item name and promo are both required');
    return;
  }

  try {
    await updateDoc(doc(db, 'dailySpecials', day, 'items', id), { item: item, promo: promo, price: price });
    showToast(DAY_LABELS[day] + "'s special saved");
  } catch (err) {
    console.error(err);
    showToast('Could not save — try again');
  }
}

async function deleteSpecial(row) {
  if (!confirm('Delete this special permanently?')) return;
  var day = row.dataset.day;
  var id = row.dataset.itemId;
  try {
    await deleteDoc(doc(db, 'dailySpecials', day, 'items', id));
    showToast('Special deleted');
    loadSpecialsEditor();
  } catch (err) {
    console.error(err);
    showToast('Could not delete — try again');
  }
}

async function addSpecial(addRowEl) {
  var day = addRowEl.dataset.day;
  var item = addRowEl.querySelector('[data-field="item"]').value.trim();
  var promo = addRowEl.querySelector('[data-field="promo"]').value.trim();
  var price = Number(addRowEl.querySelector('[data-field="price"]').value) || 0;

  if (!item || !promo) {
    showToast('Item name and promo are both required');
    return;
  }

  try {
    var snap = await getDocs(collection(db, 'dailySpecials', day, 'items'));
    var maxOrder = 0;
    snap.forEach(function (d) {
      var order = d.data().order || 0;
      if (order > maxOrder) maxOrder = order;
    });

    await addDoc(collection(db, 'dailySpecials', day, 'items'), { item: item, promo: promo, price: price, imageUrl: '', order: maxOrder + 1 });
    showToast('Special added to ' + DAY_LABELS[day]);
    loadSpecialsEditor();
  } catch (err) {
    console.error(err);
    showToast('Could not add — try again');
  }
}

async function uploadSpecialPhoto(input) {
  var file = input.files[0];
  if (!file) return;
  var row = input.closest('.admin-item-row');
  var day = row.dataset.day;
  var id = row.dataset.itemId;

  showToast('Uploading photo…');
  try {
    var formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    var res = await fetch('https://api.cloudinary.com/v1_1/' + CLOUDINARY_CLOUD_NAME + '/image/upload', {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error('Cloudinary upload failed: ' + res.status);
    var result = await res.json();
    var url = optimizedCloudinaryUrl(result.secure_url);

    await updateDoc(doc(db, 'dailySpecials', day, 'items', id), { imageUrl: url });

    var img = row.querySelector('.admin-item-photo');
    if (img.tagName === 'IMG') {
      img.src = url;
    } else {
      var newImg = document.createElement('img');
      newImg.className = 'admin-item-photo';
      newImg.src = url;
      img.replaceWith(newImg);
    }
    showToast('Photo updated');
  } catch (err) {
    console.error(err);
    showToast('Photo upload failed — try again');
  }
}

// ---------- One-time seed ----------

seedBtn.addEventListener('click', async function () {
  if (!confirm('Import the starter menu and site text into the database? Only do this once.')) return;

  seedBtn.disabled = true;
  seedBtn.textContent = 'Importing…';

  try {
    var batch = writeBatch(db);

    CATEGORIES.forEach(function (cat) {
      var data = { name: cat.name, emoji: cat.emoji, note: cat.note || '', order: cat.order };
      if (cat.comboCallout) data.comboCallout = cat.comboCallout;
      if (cat.dividerBefore) data.dividerBefore = cat.dividerBefore;
      batch.set(doc(db, 'menuCategories', cat.id), data);
    });

    ITEMS.forEach(function (item) {
      var ref = doc(collection(db, 'menuItems'));
      batch.set(ref, {
        categoryId: item.categoryId, name: item.name, price: item.price,
        description: item.description || '', imageUrl: '', order: item.order
      });
    });

    FAN_FAVOURITES.forEach(function (card) {
      batch.set(doc(collection(db, 'fanFavourites')), card);
    });

    VALUE_CARDS.forEach(function (card) {
      batch.set(doc(collection(db, 'valueCards')), card);
    });

    batch.set(doc(db, 'siteContent', 'main'), SITE_CONTENT);
    batch.set(doc(db, 'businessInfo', 'main'), BUSINESS_INFO);

    Object.keys(DAILY_SPECIALS).forEach(function (day) {
      DAILY_SPECIALS[day].forEach(function (special) {
        batch.set(doc(collection(db, 'dailySpecials', day, 'items')), special);
      });
    });

    await batch.commit();
    showToast('Starter data imported!');
    seedBanner.hidden = true;
    await loadEverything();
  } catch (err) {
    console.error(err);
    alert('Import failed — check the console for details.');
  } finally {
    seedBtn.disabled = false;
    seedBtn.textContent = 'Import Starter Data';
  }
});
