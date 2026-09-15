// One-time starter data for Firestore — the current real menu, site text,
// and example daily specials, exactly as they existed as static HTML before
// the admin panel. Used by admin.html's "Import Starter Data" button, which
// only appears when the menuCategories collection is empty (so this can't
// accidentally overwrite real edits made after the first import).

export const CATEGORIES = [
  { id: 'smash-burgers', name: 'Smash Burgers', emoji: '🍔', note: 'Double patty, double cheese, with side chips.', order: 1 },
  { id: 'regular-burgers', name: 'Regular Burgers', emoji: '🍔', note: 'Comes with cheese and chips.', order: 2 },
  { id: 'toasted-sandwiches', name: 'Toasted Sandwiches', emoji: '🥪', note: 'Specials come with cheese & chips.', order: 3 },
  { id: 'triple-decker', name: 'Triple Decker', emoji: '🍞', note: '3 gorgeous toasted slices with triple cheeses, sauces, garnish and chips.', order: 4 },
  { id: 'on-a-roll', name: 'On A Roll', emoji: '🌭', note: 'Specials come with cheese & chips.', order: 5 },
  { id: 'roti-wraps', name: 'Roti Wraps', emoji: '🌯', note: 'Soft home-made roti with filling, salads, cheese and chips.', order: 6 },
  { id: 'flame-grilled-wings', name: 'Flame Grilled Wings', emoji: '🍗', note: 'Comes with chips & coleslaw.', order: 7 },
  { id: 'on-the-grill', name: 'On The Grill', emoji: '🔥', note: 'Specials come with cheese & chips.', order: 8, comboCallout: 'Add cheddamelt mushroom sauce to any grill meal for <strong>+R35</strong>.' },
  { id: 'on-the-side', name: 'On The Side', emoji: '🍟', note: 'Comes with a dip.', order: 9 },
  { id: 'fish-and-chips', name: 'Fish & Chips', emoji: '🐟', note: 'Old school battered fresh hake & chips.', order: 10 },
  { id: 'kotas-bunny-chow', name: 'Kotas — Bunny Chow', emoji: '🥖', note: 'Hollowed-out bread, filled to order — a South African classic.', order: 11 },
  {
    id: 'streetbox-meals', name: 'Streetbox Meals', emoji: '📦',
    note: 'Large chips, salads, lots of cheese and sauce, with russians, viennas & polony loaded in a large box.',
    order: 12,
    dividerBefore: { eyebrow: 'For The Table', title: 'Sharing Meals', note: 'Built for splitting — feeds two or more.' }
  },
  { id: 'wonder-what-pizza', name: 'Wonder What Pizza', emoji: '🍕', note: 'Large 30cm pizza packed with russians, viennas and polony, creamy mozzarella, chips, salads and sauces.', order: 13 },
  { id: 'gatsby-ak47', name: 'Gatsby AK47', emoji: '🥖', note: 'Mega large half-a-metre roll with sauces, cheeses, russians, polonys, viennas, tomatoes, onions and sauces.', order: 14 },
  { id: 'flame-grilled-chicken', name: 'Flame Grilled Chicken', emoji: '🐓', note: '', order: 15 },
  { id: 'add-ons', name: 'Add Ons', emoji: '➕', note: 'Extras to add to any meal.', order: 16 }
];

export const ITEMS = [
  // Smash Burgers
  { categoryId: 'smash-burgers', name: 'Classic Smash', price: 70, description: 'Lettuce, tomato, onion, gherkin.', order: 1 },
  { categoryId: 'smash-burgers', name: 'Street Smash', price: 75, description: 'Caramelised onions and grilled mushrooms.', order: 2 },
  { categoryId: 'smash-burgers', name: 'Brazilian Smash', price: 75, description: 'Lettuce, tomato, red onion, home-made pesto sauce.', order: 3 },
  { categoryId: 'smash-burgers', name: 'Mediterranean Smash', price: 75, description: 'Sweet peppers, caramelised onion, feta cheese.', order: 4 },
  { categoryId: 'smash-burgers', name: 'English Smash', price: 75, description: 'Cucumbers, house-made pepper sauce, gherkins.', order: 5 },
  { categoryId: 'smash-burgers', name: 'Nacho Smash', price: 80, description: 'Jalapeños, caramelised onions, jalapeño sauce, nachos.', order: 6 },
  { categoryId: 'smash-burgers', name: 'Manhattan Smash', price: 80, description: 'Lettuce, onion, french polony, cheddar melt, truffle sauce.', order: 7 },
  { categoryId: 'smash-burgers', name: 'Mexicano Smash', price: 80, description: 'Creamy coleslaw, gherkins, house-made chipotle sauce.', order: 8 },
  { categoryId: 'smash-burgers', name: 'Italiano Smash', price: 85, description: 'Marinara sauce, black olives, creamy mozzarella cheese.', order: 9 },
  { categoryId: 'smash-burgers', name: 'El Macho Smash', price: 85, description: 'Onions, gherkin, lettuce, cheesy glam garlic sauce.', order: 10 },
  { categoryId: 'smash-burgers', name: 'Cheese Bomb Smash', price: 90, description: 'Lettuce, tomato, onion, gherkin, and cheese bombs.', order: 11 },
  { categoryId: 'smash-burgers', name: 'Americano Smash', price: 90, description: 'Lettuce, tomato, onion, gherkin, macon relish.', order: 12 },
  { categoryId: 'smash-burgers', name: 'Hulk Smash', price: 100, description: '3x smash patty, 3x cheeses, lettuce, onion, gherkin & green chillie.', order: 13 },
  { categoryId: 'smash-burgers', name: 'Texan Smash', price: 110, description: 'BBQ sauce, caramelised onions, mushrooms, egg, crispy onion rings.', order: 14 },

  // Regular Burgers
  { categoryId: 'regular-burgers', name: 'Grilled Chicken Burger', price: 75, description: 'Grilled chicken fillet with whip, lettuce, tomato, onion.', order: 1 },
  { categoryId: 'regular-burgers', name: 'Somethin Cheeky Chicken Burger', price: 75, description: 'Pan-fried chicken fillet with coleslaw, gherkins and whip.', order: 2 },
  { categoryId: 'regular-burgers', name: 'Frikkadel Burger', price: 75, description: 'Beef frikkadels, lettuce, tomato, onion and sauces.', order: 3 },
  { categoryId: 'regular-burgers', name: 'Fish Burger', price: 60, description: 'Hake fillet with tartar sauce, lettuce, tomato, onion.', order: 4 },

  // Toasted Sandwiches
  { categoryId: 'toasted-sandwiches', name: 'Toasted Cheese', price: 25, description: '', order: 1 },
  { categoryId: 'toasted-sandwiches', name: 'Cheese and Tomato', price: 30, description: '', order: 2 },
  { categoryId: 'toasted-sandwiches', name: 'Cheese and Beef Macon', price: 40, description: '', order: 3 },
  { categoryId: 'toasted-sandwiches', name: 'Polony Special', price: 60, description: '', order: 4 },
  { categoryId: 'toasted-sandwiches', name: 'Steak and Cheese Only', price: 70, description: '', order: 5 },
  { categoryId: 'toasted-sandwiches', name: 'Chicken Mayo with Cheese', price: 70, description: '', order: 6 },
  { categoryId: 'toasted-sandwiches', name: 'Chicken Mayo Special', price: 75, description: '', order: 7 },
  { categoryId: 'toasted-sandwiches', name: 'Steak Special', price: 75, description: '', order: 8 },
  { categoryId: 'toasted-sandwiches', name: 'Jays Special', price: 75, description: '', order: 9 },
  { categoryId: 'toasted-sandwiches', name: 'Patty Melt Special', price: 75, description: '', order: 10 },
  { categoryId: 'toasted-sandwiches', name: 'Steak and Polony Special', price: 85, description: '', order: 11 },

  // Triple Decker
  { categoryId: 'triple-decker', name: 'Dagwood', price: 95, description: 'Steak, polony, egg.', order: 1 },
  { categoryId: 'triple-decker', name: 'Grease', price: 95, description: 'Steak, sheesh kebabs.', order: 2 },
  { categoryId: 'triple-decker', name: 'Smack', price: 95, description: 'Steak, french polony, mushroom.', order: 3 },
  { categoryId: 'triple-decker', name: 'Melz', price: 95, description: 'Steak, russian, vienna, polony.', order: 4 },

  // On A Roll
  { categoryId: 'on-a-roll', name: 'Chip Roll Special', price: 35, description: '', order: 1 },
  { categoryId: 'on-a-roll', name: 'Hot Dog Special', price: 50, description: '', order: 2 },
  { categoryId: 'on-a-roll', name: 'Russian Special', price: 50, description: '', order: 3 },
  { categoryId: 'on-a-roll', name: 'Wors Roll and Cheese', price: 50, description: '', order: 4 },
  { categoryId: 'on-a-roll', name: 'Wors Roll Special', price: 60, description: '', order: 5 },
  { categoryId: 'on-a-roll', name: 'Sheesh Roll Special', price: 75, description: '', order: 6 },
  { categoryId: 'on-a-roll', name: 'Hero Steak Roll Only', price: 85, description: '', order: 7 },
  { categoryId: 'on-a-roll', name: 'Hero Steak Roll Special', price: 100, description: '', order: 8 },

  // Roti Wraps
  { categoryId: 'roti-wraps', name: 'Chicken Roti Special', price: 75, description: '', order: 1 },
  { categoryId: 'roti-wraps', name: 'Steak Roti Special', price: 75, description: '', order: 2 },
  { categoryId: 'roti-wraps', name: 'Sheesh Roti Special', price: 75, description: '', order: 3 },

  // Flame Grilled Wings
  { categoryId: 'flame-grilled-wings', name: '3 Full Wings', price: 65, description: '', order: 1 },
  { categoryId: 'flame-grilled-wings', name: '6 Full Wings', price: 120, description: '', order: 2 },

  // On The Grill
  { categoryId: 'on-the-grill', name: 'Chicken Skewer Meal', price: 85, description: '2 chicken skewers, chips, salad, garlic sauce & pita bread.', order: 1 },
  { categoryId: 'on-the-grill', name: 'Brisket Meal', price: 140, description: '300g brisket, chips, salad & special sauce.', order: 2 },
  { categoryId: 'on-the-grill', name: 'Sirloin Meal', price: 140, description: '250g sirloin, chips, salad, onion rings & special sauce.', order: 3 },
  { categoryId: 'on-the-grill', name: 'Rump Meal', price: 140, description: '250g rump steak, chips, salad, onion rings & special sauce.', order: 4 },

  // On The Side
  { categoryId: 'on-the-side', name: 'Crispy Onion Rings', price: 40, description: '', order: 1 },
  { categoryId: 'on-the-side', name: 'Crumbed Mushrooms', price: 40, description: '', order: 2 },
  { categoryId: 'on-the-side', name: 'Fried Chicken Pops', price: 40, description: '', order: 3 },
  { categoryId: 'on-the-side', name: 'Fried Hake Bites', price: 50, description: '', order: 4 },
  { categoryId: 'on-the-side', name: 'Mozzarella Sticks', price: 50, description: '', order: 5 },

  // Fish & Chips
  { categoryId: 'fish-and-chips', name: 'Regular Hake & Chips', price: 60, description: '', order: 1 },
  { categoryId: 'fish-and-chips', name: 'Large Hake & Chips', price: 100, description: '', order: 2 },

  // Kotas — Bunny Chow
  { categoryId: 'kotas-bunny-chow', name: 'Chips Only', price: 25, description: '', order: 1 },
  { categoryId: 'kotas-bunny-chow', name: 'Egg & Chips', price: 30, description: '', order: 2 },
  { categoryId: 'kotas-bunny-chow', name: 'Russian & Chips', price: 35, description: '', order: 3 },
  { categoryId: 'kotas-bunny-chow', name: 'Vienna & Chips', price: 35, description: '', order: 4 },
  { categoryId: 'kotas-bunny-chow', name: 'French/Garlic Polony & Chips', price: 35, description: '', order: 5 },
  { categoryId: 'kotas-bunny-chow', name: 'Cheese Griller & Chips', price: 40, description: '', order: 6 },

  // Streetbox Meals
  { categoryId: 'streetbox-meals', name: 'Streetbox 1 — Regular', price: 110, description: '', order: 1 },
  { categoryId: 'streetbox-meals', name: 'Streetbox 2 — With Chicken', price: 115, description: '', order: 2 },
  { categoryId: 'streetbox-meals', name: 'Streetbox 3 — With Steak', price: 120, description: '', order: 3 },

  // Wonder What Pizza
  { categoryId: 'wonder-what-pizza', name: 'Steak Wonder Pizza', price: 230, description: '', order: 1 },
  { categoryId: 'wonder-what-pizza', name: 'Chicken Wonder Pizza', price: 230, description: '', order: 2 },

  // Gatsby AK47
  { categoryId: 'gatsby-ak47', name: 'Steak AK47 Gatsby', price: 230, description: '', order: 1 },
  { categoryId: 'gatsby-ak47', name: 'Chicken AK47 Gatsby', price: 230, description: '', order: 2 },

  // Flame Grilled Chicken
  { categoryId: 'flame-grilled-chicken', name: 'Quarter Chicken with Chips', price: 50, description: '', order: 1 },
  { categoryId: 'flame-grilled-chicken', name: 'Quarter Chicken with Salad', price: 50, description: '', order: 2 },
  { categoryId: 'flame-grilled-chicken', name: 'Quarter Chicken with Pap', price: 50, description: 'Served with chakalaka & coleslaw.', order: 3 },
  { categoryId: 'flame-grilled-chicken', name: 'Half Chicken with Chips / or Pap', price: 85, description: '', order: 4 },
  { categoryId: 'flame-grilled-chicken', name: 'Full Chicken Meal', price: 160, description: 'With 4 rolls & large chips.', order: 5 },
  { categoryId: 'flame-grilled-chicken', name: 'Full Chicken Mega Meal', price: 195, description: 'With 4 rolls, large chips, coleslaw, plus a 2L cold drink.', order: 6 },

  // Add Ons
  { categoryId: 'add-ons', name: 'Slice Polony', price: 4, description: '', order: 1 },
  { categoryId: 'add-ons', name: 'Egg', price: 6, description: '', order: 2 },
  { categoryId: 'add-ons', name: 'Sliced French Polony', price: 6, description: '', order: 3 },
  { categoryId: 'add-ons', name: 'Cheese Slice', price: 6, description: '', order: 4 },
  { categoryId: 'add-ons', name: 'Russian or Vienna', price: 17, description: '', order: 5 },
  { categoryId: 'add-ons', name: 'Cheese Griller', price: 20, description: '', order: 6 }
];

export const SITE_CONTENT = {
  // Home hero
  heroEyebrow: 'Takeaway Only · Flame-Grilled Daily',
  heroHeadline: 'Good Food, Good Mood!',
  heroSub: "Burgers N Beyond serves up smash burgers, gatsbys, kotas and flame-grilled everything — made fresh to order and ready for collection.",

  // Home — Fan Favourites (heading/sub only — the cards themselves are now
  // the fanFavourites collection, see FAN_FAVOURITES below, since the admin
  // panel needs to add/remove cards, not just edit a fixed set of 4)
  fanFavHeading: "What We're Known For",
  fanFavSub: 'A few of the menu highlights our regulars keep coming back for.',

  // Home — Reviews
  reviewsHeading: 'Loved By Locals',
  reviewsSub: "We're proud of the reviews we've earned on Google. Read what people are saying, or leave your own if you've enjoyed a meal with us.",

  // Menu hero
  menuHeroEyebrow: 'Takeaway Only',
  menuHeroTitle: 'Our Menu',
  menuHeroSub: "From smash burgers to gatsbys, kotas and flame-grilled wings — everything's made fresh to order. Prices in ZAR (R).",

  // About hero
  aboutHeroEyebrow: 'Our Story',
  aboutHeroTitle: 'About Burgers N Beyond',
  aboutHeroSub: "Good burgers, made properly, served fast — that's the whole idea.",

  // About — story paragraphs
  aboutIntro: 'Founded in 2019, Burgers N Beyond started with a simple frustration: too many "quick" burgers taste like it. We set out to build a takeaway spot where every patty is flame-grilled to order, every bun is toasted fresh, and every side is made in-house — without making you wait around for it.',
  whatWeBelieveHeading: 'What We Believe',
  aboutBelieve: 'From smash burgers to gatsbys, kotas and roti wraps, our menu covers a lot of ground — but nothing on it is an afterthought. Every item gets the same attention: proper ingredients, cooked to order, no shortcuts.',
  takeawayDoneRightHeading: 'Takeaway, Done Right',
  aboutTakeaway: "We're a takeaway-only kitchen, and we've built our whole process around that. Call ahead, and your order will be hot and ready the moment you walk in — no sitting around, no soggy fries from sitting under a heat lamp.",

  // About — bottom CTA
  aboutCtaEyebrow: 'Hungry Yet?',
  aboutCtaHeading: 'Come Taste The Difference',
  aboutCtaText: 'Check out the full menu, then give us a call to place your order.',

  // Contact hero
  contactHeroEyebrow: 'Get In Touch',
  contactHeroTitle: 'Contact Us',
  contactHeroSub: 'Call ahead to order, or drop by during opening hours for collection.',

  // Footer (shared across all pages)
  footerTagline: 'Smash burgers, gatsbys, kotas and flame-grilled everything — made fresh to order.'
};

// Home page "Fan Favourites" cards — own collection (not part of SITE_CONTENT)
// so the admin panel can add/remove cards, not just edit a fixed set of 4.
// A card can have a real photo (imageUrl) instead of an emoji — takes
// priority over the emoji when both are set.
export const FAN_FAVOURITES = [
  { emoji: '🔨', title: 'Hulk Smash', desc: '3x smash patty, 3x cheeses, lettuce, onion, gherkin & green chillie — not for the faint-hearted.', imageUrl: '', order: 1 },
  { emoji: '🥖', title: 'Gatsby AK47', desc: 'A mega half-metre roll loaded with russians, polonys, viennas and all the sauces.', imageUrl: '', order: 2 },
  { emoji: '🥪', title: 'Toasted Steak Special', desc: 'Pulled steak, cheese, chips and a signature sauce.', imageUrl: '', order: 3 },
  { emoji: '🍗', title: 'Flame Grilled Chicken', desc: 'Quarter, half or full chicken — flame-grilled and served with chips, salad or pap.', imageUrl: '', order: 4 }
];

// About page "value" cards — own collection for the same reason. The 4th
// card (Halaal certification) uses the real SANHA logo as its imageUrl
// instead of an emoji — fully editable/deletable like the other three, per
// hbadat (the earlier "not editable" restriction was a judgment call, not
// something asked for).
export const VALUE_CARDS = [
  { emoji: '🔥', title: 'Flame-Grilled', desc: 'Every patty, every time — never a frozen shortcut.', imageUrl: '', order: 1 },
  { emoji: '⏱️', title: 'Made To Order', desc: 'Nothing sits and waits. Your food is cooked when you call.', imageUrl: '', order: 2 },
  { emoji: '🤝', title: 'Local & Honest', desc: 'Straightforward menu, fair prices, no gimmicks.', imageUrl: '', order: 3 },
  { emoji: '', title: '100% Halaal حلال', desc: 'Certified Halaal by SANHA — every ingredient, every time.', imageUrl: 'images/sanha-logo.png', order: 4 }
];

export const BUSINESS_INFO = {
  phone1Text: '082 514 0077', phone1Href: 'tel:+27825140077', phone1Wa: '27825140077',
  phone2Text: '082 421 1750', phone2Href: 'tel:+27824211750', phone2Wa: '27824211750',
  addressLine1: '80 Main Reef Rd',
  addressLine2: 'Randfontein, 1760',
  mapsHref: 'https://www.google.com/maps/place/?q=place_id:ChIJCcZKIRWXlR4R4rzPcr4PmvA',
  writeReviewHref: 'https://search.google.com/local/writereview?placeid=ChIJCcZKIRWXlR4R4rzPcr4PmvA',
  hoursMonSat: 'Mon–Sat: 10:00 – 18:30',
  hoursFri: 'Fri: closed 12:20 – 13:20',
  hoursSun: 'Sun: Closed',
  // Structured times below drive the live "Open Now / Closed" badge — kept
  // separate from the free-text lines above so editing the display wording
  // never breaks the badge, and vice versa.
  hoursMonSatOpenTime: '10:00', hoursMonSatCloseTime: '18:30',
  hoursFriOpenTime1: '10:00', hoursFriCloseTime1: '12:20',
  hoursFriOpenTime2: '13:20', hoursFriCloseTime2: '18:30',
  emailText: 'Burgersnbeyondsa@gmail.com', emailHref: 'mailto:Burgersnbeyondsa@gmail.com',
  mrdHref: 'https://www.mrd.com/delivery/restaurant/burgers-n-beyond-randfontein-cbd/31105?section=6955689',
  instagramHref: 'https://www.instagram.com/burgers._n_beyond/'
};

// Each day is a LIST of specials (dailySpecials/{day}/items/{id} in
// Firestore) so the admin panel can add or remove specials per day freely —
// not just edit one fixed slot. Sunday has no key at all (shop is closed).
export const DAILY_SPECIALS = {
  monday: [{ item: 'Classic Smash', promo: '10% off', imageUrl: '', order: 1 }],
  tuesday: [{ item: 'Wors Roll Special', promo: 'R10 off', imageUrl: '', order: 1 }],
  wednesday: [{ item: 'Toasted Cheese', promo: 'Buy 1, get 1 half price', imageUrl: '', order: 1 }],
  thursday: [{ item: '3 Full Wings', promo: 'R10 off', imageUrl: '', order: 1 }],
  friday: [{ item: 'Streetbox 1 — Regular', promo: '10% off', imageUrl: '', order: 1 }],
  saturday: [{ item: 'Hulk Smash', promo: 'R15 off', imageUrl: '', order: 1 }]
};
