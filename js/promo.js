// Daily special banner — shows a different example promotion depending on
// the day of the week. These are EXAMPLE specials only (real menu items,
// placeholder discounts) until real daily promotions are decided — see the
// visible "Example special" note, which must stay until real specials
// replace this table.
document.addEventListener('DOMContentLoaded', function () {
  var promoStrip = document.getElementById('promoStrip');
  if (!promoStrip) return;

  var SPECIALS = {
    1: { item: 'Classic Smash', promo: '10% off' },
    2: { item: 'Wors Roll Special', promo: 'R10 off' },
    3: { item: 'Toasted Cheese', promo: 'Buy 1, get 1 half price' },
    4: { item: '3 Full Wings', promo: 'R10 off' },
    5: { item: 'Streetbox 1 — Regular', promo: '10% off' },
    6: { item: 'Hulk Smash', promo: 'R15 off' }
  };

  var DAY_NAMES = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ];

  var dayIndex = new Date().getDay();
  var special = SPECIALS[dayIndex];

  if (!special) {
    return; // Sunday — closed, no special to show
  }

  promoStrip.querySelector('.promo-day').textContent = DAY_NAMES[dayIndex] + "'s Special";
  promoStrip.querySelector('.promo-text').textContent = special.item + ' — ' + special.promo;
  promoStrip.hidden = false;
});
