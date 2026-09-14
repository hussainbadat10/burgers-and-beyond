// Shared Firebase initialization — imported by menu-loader.js, promo.js,
// site-content.js, and admin.js. This config is the public, client-side
// Firebase config (safe to expose — access is controlled by Firestore/
// Storage security rules, not by hiding this object).
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";

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
export const storage = getStorage(app);
