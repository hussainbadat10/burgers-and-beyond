// Shared Firebase initialization — imported by menu-loader.js, promo.js,
// site-content.js, and admin.js. This config is the public, client-side
// Firebase config (safe to expose — access is controlled by Firestore
// security rules, not by hiding this object).
//
// Note: photo uploads use Cloudinary (see js/admin.js), not Firebase
// Storage — Storage now requires Google's paid Blaze plan (a card on
// file), which this project deliberately avoids.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCzUprf42SxmpYCySk6ToqFIAr5F_MfAVM",
  authDomain: "burgers-n-beyond-b15a1.firebaseapp.com",
  projectId: "burgers-n-beyond-b15a1",
  storageBucket: "burgers-n-beyond-b15a1.firebasestorage.app",
  messagingSenderId: "703605585068",
  appId: "1:703605585068:web:eb7e3693267370f0281b09"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
