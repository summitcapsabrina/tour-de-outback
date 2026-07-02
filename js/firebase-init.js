// Shared Firebase initialization for the customer-account platform.
// Uses the modular Firebase JS SDK via CDN (no build step). These config
// values are client-side identifiers, not secrets — safe to ship.
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAli_2DbFIhnKBox5yXLX__uoTg5aHb4OE",
  authDomain: "oregon-tour-de-outback.firebaseapp.com",
  projectId: "oregon-tour-de-outback",
  storageBucket: "oregon-tour-de-outback.firebasestorage.app",
  messagingSenderId: "11400321135",
  appId: "1:11400321135:web:82a6eba65acfbec9cb559a",
  measurementId: "G-YN68CZQ429"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Backend endpoints (served same-origin via Firebase Hosting rewrites).
export const API = {
  createDonation: "/api/create-donation",
  billingHistory: "/api/billing-history",
  portalSession: "/api/portal-session"
};
