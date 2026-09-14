import { db, auth } from './firebase-config.js';
import {
  onAuthStateChanged, signInWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  collection, getDocs, getDoc, doc, setDoc, updateDoc, deleteDoc, addDoc,
  query, orderBy, writeBatch
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { CATEGORIES, ITEMS, SITE_CONTENT, DAILY_SPECIALS } from './seed-data.js';

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

async function loadEverything() {
  await loadMenuEditor();
  await loadContentEditor();
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

var CONTENT_FIELDS = [
  { key: 'heroHeadline', label: 'Homepage Headline', type: 'input' },
  { key: 'heroSub', label: 'Homepage Intro Text', type: 'textarea' },
  { key: 'aboutIntro', label: 'About Page — Intro Paragraph', type: 'textarea' },
  { key: 'aboutBelieve', label: 'About Page — "What We Believe" Paragraph', type: 'textarea' },
  { key: 'aboutTakeaway', label: 'About Page — "Takeaway, Done Right" Paragraph', type: 'textarea' }
];

async function loadContentEditor() {
  var editor = document.getElementById('contentEditor');
  var snap = await getDoc(doc(db, 'siteContent', 'main'));
  var content = snap.exists() ? snap.data() : {};

  editor.innerHTML =
    CONTENT_FIELDS.map(function (f) {
      var value = content[f.key] || '';
      var field = f.type === 'textarea'
        ? '<textarea data-field="' + f.key + '">' + value + '</textarea>'
        : '<input type="text" data-field="' + f.key + '" value="' + escapeAttr(value) + '">';
      return '<div class="admin-field"><label>' + f.label + '</label>' + field + '</div>';
    }).join('') +
    '<button id="saveContentBtn" class="btn btn-primary" type="button">Save Site Text</button>';

  document.getElementById('saveContentBtn').addEventListener('click', saveContent);
}

async function saveContent() {
  var editor = document.getElementById('contentEditor');
  var data = {};
  CONTENT_FIELDS.forEach(function (f) {
    data[f.key] = editor.querySelector('[data-field="' + f.key + '"]').value.trim();
  });

  try {
    await setDoc(doc(db, 'siteContent', 'main'), data, { merge: true });
    showToast('Site text saved');
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
    var data = snap.exists() ? snap.data() : { item: '', promo: '' };
    return { key: key, item: data.item || '', promo: data.promo || '' };
  }));

  editor.innerHTML = rows.map(function (r) {
    return (
      '<div class="admin-item-row" style="grid-template-columns: 100px 1fr 1fr auto;" data-day="' + r.key + '">' +
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
