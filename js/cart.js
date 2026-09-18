// Order cart: add-to-order buttons on the menu feed a shared cart
// (persisted in localStorage) with a floating summary panel that
// calculates the running total and hands the order off via WhatsApp,
// since there's no online payment on this site.
import { escapeHtml, escapeAttr } from './escape-utils.js';

(function () {
  var STORAGE_KEY = 'bnbCart';

  function loadCart() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveCart(cart) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      /* storage unavailable — cart just won't persist across reloads */
    }
  }

  var cart = loadCart();

  function findItem(name) {
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].name === name) return cart[i];
    }
    return null;
  }

  function addItem(name, price) {
    var item = findItem(name);
    if (item) {
      // Refresh to the current price too, not just qty — otherwise an item
      // sitting in a returning visitor's localStorage cart from before a
      // price change keeps charging the stale price when added again.
      item.price = price;
      item.qty += 1;
    } else {
      cart.push({ name: name, price: price, qty: 1 });
    }
    saveCart(cart);
    render();
  }

  function changeQty(name, delta) {
    var item = findItem(name);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) {
      cart = cart.filter(function (i) { return i.name !== name; });
    }
    saveCart(cart);
    render();
  }

  function removeItem(name) {
    cart = cart.filter(function (i) { return i.name !== name; });
    saveCart(cart);
    render();
  }

  function clearCart() {
    cart = [];
    saveCart(cart);
    render();
  }

  function total() {
    return cart.reduce(function (sum, i) { return sum + i.price * i.qty; }, 0);
  }

  function itemCount() {
    return cart.reduce(function (sum, i) { return sum + i.qty; }, 0);
  }

  // Upsell items (name + price) are read straight from the rendered menu
  // DOM rather than a second Firestore fetch here: menu-loader.js marks
  // whichever items the admin has ticked "Suggest in cart" for (Menu Items
  // editor) with a data-upsell="true" attribute, so this only needs to
  // exist on menu.html (where the upsell is actually actionable) and
  // naturally does nothing on every other page, with zero new coupling
  // between the two modules.
  //
  // Falls back to the "On The Side" category (id "on-the-side" — see
  // seed-data.js) when nothing has been explicitly marked yet, so the nudge
  // still does something sensible out of the box before an admin configures
  // it, matching this project's usual static-fallback-until-configured
  // pattern.
  function getUpsellItems() {
    var main = document.getElementById('menuMain');
    if (!main) return null; // not on the menu page — nothing to suggest

    var marked = Array.from(main.querySelectorAll('.menu-item[data-upsell="true"]'));
    var source = marked.length ? marked : Array.from(main.querySelectorAll('[data-category-id="on-the-side"] .menu-item[data-name]'));

    return source.map(function (el) {
      return { name: el.dataset.name, price: parseInt(el.dataset.price, 10) };
    });
  }

  function cartHasUpsellItem(items) {
    var names = items.map(function (s) { return s.name; });
    return cart.some(function (i) { return names.indexOf(i.name) !== -1; });
  }

  // The cart panel covers the entire screen on mobile, so a text-only nudge
  // gives no way to actually act on it without closing the panel, hunting
  // down the suggested item, and reopening the cart — real friction
  // reported after the first version shipped. Quick-add buttons let it be
  // added without leaving the panel.
  //
  // Stays visible even after one suggested item is already in the cart
  // (just switches wording) rather than disappearing outright — a customer
  // adding for multiple people may want more than one side, and the first
  // version's hide-once-satisfied behavior was reported as the nudge
  // "removing itself" from checkout. Only items not already in the cart are
  // offered as buttons (capped at 4) so it doesn't invite adding
  // duplicates of something already there.
  function renderUpsell() {
    var upsell = document.querySelector('.cart-upsell');
    if (!upsell) return;

    var allItems = getUpsellItems();
    if (!cart.length || !allItems || !allItems.length) {
      upsell.hidden = true;
      upsell.innerHTML = '';
      return;
    }

    var alreadyHasOne = cartHasUpsellItem(allItems);
    var remaining = allItems.filter(function (s) {
      return cart.every(function (i) { return i.name !== s.name; });
    }).slice(0, 4);

    if (!remaining.length) {
      upsell.hidden = true;
      upsell.innerHTML = '';
      return;
    }

    var message = alreadyHasOne ? '🍟 Add another side?' : '🍟 Don\'t forget a side!';

    upsell.hidden = false;
    upsell.innerHTML = (
      '<p class="cart-upsell-msg">' + message + '</p>' +
      '<div class="cart-upsell-list">' +
        remaining.map(function (s) {
          var name = escapeAttr(s.name);
          return (
            '<button type="button" class="cart-upsell-add" data-name="' + name + '" data-price="' + s.price + '">' +
              '+ ' + escapeHtml(s.name) + ' (R' + s.price + ')' +
            '</button>'
          );
        }).join('') +
      '</div>'
    );
  }

  // Pickup time is read fresh from the cart panel UI right before building
  // the WhatsApp message rather than persisted alongside the cart itself —
  // it's a "how do you want this order" choice made at send-time, not part
  // of what's actually in the order, so it resets to ASAP on every visit
  // like a delivery-time picker would.
  function getPickupTimeText() {
    var scheduled = document.querySelector('input[name="pickupTiming"][value="scheduled"]');
    if (scheduled && scheduled.checked) {
      var timeInput = document.querySelector('.cart-pickup-time-input');
      if (timeInput && timeInput.value) return 'At ' + timeInput.value;
    }
    return 'ASAP';
  }

  function buildOrderText() {
    if (!cart.length) return '';
    var lines = cart.map(function (i) {
      return i.qty + 'x ' + i.name + ' - R' + (i.price * i.qty);
    });
    return (
      "Hi Burgers N Beyond! I'd like to place an order:\n\n" +
      lines.join('\n') +
      '\n\nTotal: R' + total() +
      '\nPickup: ' + getPickupTimeText() +
      '\n\nEFT confirms order! Please send banking details.' +
      '\nIf payment does not reflect, the order will not be processed.' +
      '\n\n(Sent via the website order form)'
    );
  }

  function render() {
    var badge = document.querySelector('.cart-fab-badge');
    var fab = document.querySelector('.cart-fab');
    var count = itemCount();

    if (badge) badge.textContent = count;
    if (fab) fab.hidden = count === 0;

    // The upsell and pickup-time UI live inside the scrollable body, not
    // the footer — with items, quick-add buttons, and a pickup picker all
    // vying for space in a panel that's the full screen height on mobile,
    // keeping the footer to just the total/CTA/note (its original size)
    // and letting everything else scroll together stops the footer from
    // growing so tall it squeezes the item list down to a sliver (reported
    // directly: newly-added items were getting clipped behind the footer).
    var linesList = document.querySelector('.cart-lines-list');
    var footer = document.querySelector('.cart-panel-footer');
    var pickup = document.querySelector('.cart-pickup');
    if (!linesList) return;

    if (!cart.length) {
      linesList.innerHTML = '<p class="cart-empty">Your order is empty — add something from the menu.</p>';
      if (footer) footer.hidden = true;
      if (pickup) pickup.hidden = true;
      renderUpsell();
      return;
    }

    if (footer) footer.hidden = false;
    if (pickup) pickup.hidden = false;

    linesList.innerHTML = cart.map(function (i) {
      var name = escapeHtml(i.name);
      var attrName = escapeAttr(i.name);
      return (
        '<div class="cart-line" data-name="' + attrName + '">' +
          '<div>' +
            '<div class="cart-line-name">' + name + '</div>' +
            '<div class="cart-line-unit">R' + i.price + ' each</div>' +
            '<div class="cart-line-controls">' +
              '<button type="button" class="cart-qty-btn" data-action="dec" aria-label="Decrease quantity">−</button>' +
              '<span class="cart-qty-value">' + i.qty + '</span>' +
              '<button type="button" class="cart-qty-btn" data-action="inc" aria-label="Increase quantity">+</button>' +
            '</div>' +
          '</div>' +
          '<div class="cart-line-right">' +
            '<div class="cart-line-total">R' + (i.price * i.qty) + '</div>' +
            '<button type="button" class="cart-line-remove" data-action="remove">Remove</button>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    var totalValue = document.querySelector('.cart-total-value');
    if (totalValue) totalValue.textContent = 'R' + total();

    renderUpsell();
  }

  function openPanel() {
    var panel = document.querySelector('.cart-panel');
    var backdrop = document.querySelector('.cart-backdrop');
    if (panel) panel.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
  }

  function closePanel() {
    var panel = document.querySelector('.cart-panel');
    var backdrop = document.querySelector('.cart-backdrop');
    if (panel) panel.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
  }

  function resetPickupTimeUi() {
    var asap = document.querySelector('input[name="pickupTiming"][value="asap"]');
    var timeInput = document.querySelector('.cart-pickup-time-input');
    if (asap) asap.checked = true;
    if (timeInput) timeInput.hidden = true;
  }

  document.addEventListener('DOMContentLoaded', function () {
    render();
    resetPickupTimeUi();

    document.addEventListener('change', function (e) {
      if (e.target.name === 'pickupTiming') {
        var timeInput = document.querySelector('.cart-pickup-time-input');
        if (timeInput) timeInput.hidden = e.target.value !== 'scheduled';
      }
    });

    // Add-to-order buttons (menu page only)
    document.addEventListener('click', function (e) {
      var addBtn = e.target.closest('.menu-item-add');
      if (addBtn) {
        var name = addBtn.dataset.name;
        var price = parseInt(addBtn.dataset.price, 10);
        addItem(name, price);

        var originalText = addBtn.textContent;
        addBtn.classList.add('added');
        addBtn.textContent = '✓';
        setTimeout(function () {
          addBtn.classList.remove('added');
          addBtn.textContent = originalText;
        }, 700);
        return;
      }

      var upsellBtn = e.target.closest('.cart-upsell-add');
      if (upsellBtn) {
        addItem(upsellBtn.dataset.name, parseInt(upsellBtn.dataset.price, 10));
        return;
      }

      if (e.target.closest('.cart-fab')) {
        openPanel();
        return;
      }

      if (e.target.closest('.cart-panel-close') || e.target === document.querySelector('.cart-backdrop')) {
        closePanel();
        return;
      }

      var qtyBtn = e.target.closest('.cart-qty-btn');
      if (qtyBtn) {
        var line = qtyBtn.closest('.cart-line');
        var lineName = line.dataset.name;
        changeQty(lineName, qtyBtn.dataset.action === 'inc' ? 1 : -1);
        return;
      }

      var removeBtn = e.target.closest('[data-action="remove"]');
      if (removeBtn) {
        var rLine = removeBtn.closest('.cart-line');
        removeItem(rLine.dataset.name);
        return;
      }

      if (e.target.closest('.cart-clear')) {
        if (confirm('Clear your whole order?')) clearCart();
        return;
      }

      var waBtn = e.target.closest('.cart-order-whatsapp');
      if (waBtn) {
        e.preventDefault();
        if (!cart.length) return;
        var phone = waBtn.dataset.phone;
        var url = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(buildOrderText());
        if (window.trackEvent) window.trackEvent('order_via_whatsapp', { value: total(), currency: 'ZAR' });
        window.open(url, '_blank', 'noopener');
        clearCart();
        closePanel();
        resetPickupTimeUi();
      }
    });
  });
})();
