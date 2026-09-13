// Order cart: add-to-order buttons on the menu feed a shared cart
// (persisted in localStorage) with a floating summary panel that
// calculates the running total and hands the order off via WhatsApp,
// since there's no online payment on this site.

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

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
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
      '\n\nEFT confirms order! Please send banking details.' +
      '\n\n(Sent via the website order form)'
    );
  }

  function render() {
    var badge = document.querySelector('.cart-fab-badge');
    var fab = document.querySelector('.cart-fab');
    var count = itemCount();

    if (badge) badge.textContent = count;
    if (fab) fab.hidden = count === 0;

    var body = document.querySelector('.cart-panel-body');
    var footer = document.querySelector('.cart-panel-footer');
    if (!body) return;

    if (!cart.length) {
      body.innerHTML = '<p class="cart-empty">Your order is empty — add something from the menu.</p>';
      if (footer) footer.hidden = true;
      return;
    }

    if (footer) footer.hidden = false;

    body.innerHTML = cart.map(function (i) {
      var name = escapeHtml(i.name);
      return (
        '<div class="cart-line" data-name="' + name + '">' +
          '<div>' +
            '<div class="cart-line-name">' + name + '</div>' +
            '<div class="cart-line-unit">R' + i.price + ' each</div>' +
            '<div class="cart-line-controls">' +
              '<button type="button" class="cart-qty-btn" data-action="dec">−</button>' +
              '<span class="cart-qty-value">' + i.qty + '</span>' +
              '<button type="button" class="cart-qty-btn" data-action="inc">+</button>' +
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

  document.addEventListener('DOMContentLoaded', function () {
    render();

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
        window.open(url, '_blank', 'noopener');
        clearCart();
        closePanel();
      }
    });
  });
})();
