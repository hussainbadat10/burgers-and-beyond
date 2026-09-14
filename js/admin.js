import { db, auth } from './firebase-config.js';
import {
  onAuthStateChanged, signInWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  collection, getDocs, getDoc, doc, setDoc, updateDoc, deleteDoc, addDoc,
  query, orderBy, writeBatch
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { CATEGORIES, ITEMS, SITE_CONTENT, BUSINESS_INFO, DAILY_SPECIALS } from './seed-data.js';

// Photo uploads go to Cloudinary (free, no card required), not Firebase
// Storage (which now requires Google's paid Blaze plan). This preset is
// deliberately an "unsigned" one, meant to be used client-side like this.
var CLOUDINARY_CLOUD_NAME = 'ys741dda';
var CLOUDINARY_UPLOAD_PRESET = 'BnB_Menu';

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

async function loadEverything() {
  await fillMissingContentDefaults();
  await loadMenuEditor();
  await loadContentEditor();
  await loadBusinessEditor();
  await loadSpecialsEditor();
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
    var url = result.secure_url;

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

var CONTENT_GROUPS = [
  {
    title: 'Home — Hero',
    fields: [
      { key: 'heroEyebrow', label: 'Eyebrow', type: 'input' },
      { key: 'heroHeadline', label: 'Headline', type: 'input' },
      { key: 'heroSub', label: 'Intro Text', type: 'textarea' }
    ]
  },
  {
    title: 'Home — Fan Favourites',
    fields: [
      { key: 'fanFavHeading', label: 'Section Heading', type: 'input' },
      { key: 'fanFavSub', label: 'Section Subtext', type: 'textarea' },
      { key: 'fanFav1Emoji', label: 'Card 1 — Emoji', type: 'input' },
      { key: 'fanFav1Title', label: 'Card 1 — Title', type: 'input' },
      { key: 'fanFav1Desc', label: 'Card 1 — Description', type: 'textarea' },
      { key: 'fanFav2Emoji', label: 'Card 2 — Emoji', type: 'input' },
      { key: 'fanFav2Title', label: 'Card 2 — Title', type: 'input' },
      { key: 'fanFav2Desc', label: 'Card 2 — Description', type: 'textarea' },
      { key: 'fanFav3Emoji', label: 'Card 3 — Emoji', type: 'input' },
      { key: 'fanFav3Title', label: 'Card 3 — Title', type: 'input' },
      { key: 'fanFav3Desc', label: 'Card 3 — Description', type: 'textarea' },
      { key: 'fanFav4Emoji', label: 'Card 4 — Emoji', type: 'input' },
      { key: 'fanFav4Title', label: 'Card 4 — Title', type: 'input' },
      { key: 'fanFav4Desc', label: 'Card 4 — Description', type: 'textarea' }
    ]
  },
  {
    title: 'Home — Reviews',
    fields: [
      { key: 'reviewsHeading', label: 'Heading', type: 'input' },
      { key: 'reviewsSub', label: 'Subtext', type: 'textarea' }
    ]
  },
  {
    title: 'Menu — Hero',
    fields: [
      { key: 'menuHeroEyebrow', label: 'Eyebrow', type: 'input' },
      { key: 'menuHeroTitle', label: 'Title', type: 'input' },
      { key: 'menuHeroSub', label: 'Subtext', type: 'textarea' }
    ]
  },
  {
    title: 'About — Hero',
    fields: [
      { key: 'aboutHeroEyebrow', label: 'Eyebrow', type: 'input' },
      { key: 'aboutHeroTitle', label: 'Title', type: 'input' },
      { key: 'aboutHeroSub', label: 'Subtext', type: 'textarea' }
    ]
  },
  {
    title: 'About — Story',
    fields: [
      { key: 'aboutIntro', label: 'Intro Paragraph', type: 'textarea' },
      { key: 'whatWeBelieveHeading', label: '"What We Believe" Heading', type: 'input' },
      { key: 'aboutBelieve', label: '"What We Believe" Paragraph', type: 'textarea' },
      { key: 'takeawayDoneRightHeading', label: '"Takeaway, Done Right" Heading', type: 'input' },
      { key: 'aboutTakeaway', label: '"Takeaway, Done Right" Paragraph', type: 'textarea' }
    ]
  },
  {
    title: 'About — Value Cards',
    fields: [
      { key: 'value1Emoji', label: 'Card 1 — Emoji', type: 'input' },
      { key: 'value1Title', label: 'Card 1 — Title', type: 'input' },
      { key: 'value1Desc', label: 'Card 1 — Description', type: 'textarea' },
      { key: 'value2Emoji', label: 'Card 2 — Emoji', type: 'input' },
      { key: 'value2Title', label: 'Card 2 — Title', type: 'input' },
      { key: 'value2Desc', label: 'Card 2 — Description', type: 'textarea' },
      { key: 'value3Emoji', label: 'Card 3 — Emoji', type: 'input' },
      { key: 'value3Title', label: 'Card 3 — Title', type: 'input' },
      { key: 'value3Desc', label: 'Card 3 — Description', type: 'textarea' }
    ]
  },
  {
    title: 'About — Bottom CTA',
    fields: [
      { key: 'aboutCtaEyebrow', label: 'Eyebrow', type: 'input' },
      { key: 'aboutCtaHeading', label: 'Heading', type: 'input' },
      { key: 'aboutCtaText', label: 'Text', type: 'textarea' }
    ]
  },
  {
    title: 'Contact — Hero',
    fields: [
      { key: 'contactHeroEyebrow', label: 'Eyebrow', type: 'input' },
      { key: 'contactHeroTitle', label: 'Title', type: 'input' },
      { key: 'contactHeroSub', label: 'Subtext', type: 'textarea' }
    ]
  },
  {
    title: 'Footer (every page)',
    fields: [
      { key: 'footerTagline', label: 'Tagline', type: 'textarea' }
    ]
  }
];

async function loadContentEditor() {
  var editor = document.getElementById('contentEditor');
  var snap = await getDoc(doc(db, 'siteContent', 'main'));
  var content = snap.exists() ? snap.data() : {};

  editor.innerHTML = CONTENT_GROUPS.map(function (group, i) {
    var fieldsHtml = group.fields.map(function (f) {
      var value = content[f.key] || '';
      var field = f.type === 'textarea'
        ? '<textarea data-field="' + f.key + '">' + value + '</textarea>'
        : '<input type="text" data-field="' + f.key + '" value="' + escapeAttr(value) + '">';
      return '<div class="admin-field"><label>' + f.label + '</label>' + field + '</div>';
    }).join('');

    return (
      '<div class="admin-category" data-group-index="' + i + '">' +
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
      return '<div class="admin-field"><label>' + f.label + '</label><input type="text" data-field="' + f.key + '" value="' + escapeAttr(value) + '"></div>';
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

async function loadSpecialsEditor() {
  var editor = document.getElementById('specialsEditor');
  var rows = await Promise.all(DAY_KEYS.map(async function (key) {
    var snap = await getDoc(doc(db, 'dailySpecials', key));
    var data = snap.exists() ? snap.data() : { item: '', promo: '', imageUrl: '' };
    return { key: key, item: data.item || '', promo: data.promo || '', imageUrl: data.imageUrl || '' };
  }));

  editor.innerHTML = rows.map(function (r) {
    var photo = r.imageUrl
      ? '<img src="' + escapeAttr(r.imageUrl) + '" class="admin-item-photo" alt="">'
      : '<div class="admin-item-photo"></div>';
    var fileId = 'special-photo-' + r.key;

    return (
      '<div class="admin-item-row" style="grid-template-columns: 56px 90px 1fr 1fr auto;" data-day="' + r.key + '">' +
        '<div>' +
          photo +
          '<input type="file" id="' + fileId + '" accept="image/*" data-action="upload-special-photo" style="display:none">' +
          '<label for="' + fileId + '" class="admin-file-label">Change photo</label>' +
        '</div>' +
        '<strong>' + DAY_LABELS[r.key] + '</strong>' +
        '<input type="text" data-field="item" value="' + escapeAttr(r.item) + '" placeholder="Item name">' +
        '<input type="text" data-field="promo" value="' + escapeAttr(r.promo) + '" placeholder="e.g. 10% off">' +
        '<button class="admin-btn admin-btn-primary" type="button" data-action="save-special">Save</button>' +
      '</div>'
    );
  }).join('');

  editor.querySelectorAll('[data-action="save-special"]').forEach(function (btn) {
    btn.addEventListener('click', function () { saveSpecial(btn.closest('[data-day]')); });
  });
  editor.querySelectorAll('[data-action="upload-special-photo"]').forEach(function (input) {
    input.addEventListener('change', function () { uploadSpecialPhoto(input); });
  });
}

async function saveSpecial(row) {
  var day = row.dataset.day;
  var item = row.querySelector('[data-field="item"]').value.trim();
  var promo = row.querySelector('[data-field="promo"]').value.trim();

  try {
    await setDoc(doc(db, 'dailySpecials', day), { item: item, promo: promo }, { merge: true });
    showToast(DAY_LABELS[day] + "'s special saved");
  } catch (err) {
    console.error(err);
    showToast('Could not save — try again');
  }
}

async function uploadSpecialPhoto(input) {
  var file = input.files[0];
  if (!file) return;
  var row = input.closest('[data-day]');
  var day = row.dataset.day;

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
    var url = result.secure_url;

    await setDoc(doc(db, 'dailySpecials', day), { imageUrl: url }, { merge: true });

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

    batch.set(doc(db, 'siteContent', 'main'), SITE_CONTENT);
    batch.set(doc(db, 'businessInfo', 'main'), BUSINESS_INFO);

    Object.keys(DAILY_SPECIALS).forEach(function (day) {
      batch.set(doc(db, 'dailySpecials', day), DAILY_SPECIALS[day]);
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
