// Shared Firebase initialization for the customer-account platform.
// Uses the modular Firebase JS SDK via CDN (no build step). These config
// values are client-side identifiers, not secrets — safe to ship.
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-firestore.js";

export const firebaseConfig = {
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

// Permanent super-admins (UI gating only; the Cloud Functions enforce this
// server-side). Keep in sync with ADMIN_EMAILS in functions/index.js. Other
// admins are granted at runtime via the `admin:true` custom claim.
export const ADMIN_EMAILS = ['info@tourdeoutback.org'];
export function isAdminUser(user) {
  return !!(user && user.email && user.emailVerified &&
    ADMIN_EMAILS.indexOf(user.email.toLowerCase()) !== -1);
}
// Full admin check: a super-admin email OR a verified user carrying the
// `admin:true` custom claim. Async because it may refresh the ID token to pick
// up a claim that was just granted. Returns a Promise<boolean>.
export async function resolveIsAdmin(user) {
  if (!user || !user.emailVerified) return false;
  if (isAdminUser(user)) return true;
  try {
    let r = await user.getIdTokenResult();
    if (r.claims && r.claims.admin === true) return true;
    r = await user.getIdTokenResult(true); // force-refresh in case just granted
    return !!(r.claims && r.claims.admin === true);
  } catch (e) { return false; }
}

// Backend endpoints (served same-origin via Firebase Hosting rewrites).
export const API = {
  createDonation: "/api/create-donation",
  billingHistory: "/api/billing-history",
  portalSession: "/api/portal-session",
  adminUsers: "/api/admin-users",
  // Sabrina chat + admin inbox / knowledge base
  chat: "/api/chat",
  chatPoll: "/api/chat-poll",
  chatEscalate: "/api/chat-escalate",
  chatTyping: "/api/chat-typing",
  adminChatReply: "/api/admin-chat-reply",
  adminChatAction: "/api/admin-chat-action",
  adminKbSeed: "/api/admin-kb-seed",
  adminKbSave: "/api/admin-kb-save",
  adminKbDelete: "/api/admin-kb-delete",
  adminKbBulk: "/api/admin-kb-bulk",
  registerPushSubscription: "/api/register-push-subscription",
  unregisterPushSubscription: "/api/unregister-push-subscription",
  adminProfile: "/api/admin-profile",
  registrationInterest: "/api/registration-interest",
  submitSurvey: "/api/submit-survey",
  adminSurveyAction: "/api/admin-survey-action",
  adminSurveySummary: "/api/admin-survey-summary",
  // Registration history + grandfathered rate-lock & referral codes
  adminUploadRegistrations: "/api/admin-upload-registrations",
  adminRegistrationProgress: "/api/admin-registration-progress",
  adminRegistrants: "/api/admin-registrants",
  adminClearRegistrations: "/api/admin-clear-registrations",
  adminRideDays: "/api/admin-ride-days",
  adminCheckins: "/api/admin-checkins",
  adminUpdateRegistrant: "/api/admin-update-registrant",
  adminMergeRegistrants: "/api/admin-merge-registrants",
  myRegistrations: "/api/my-registrations",
  applyReferralCode: "/api/apply-referral-code",
  // Shop — Printify print-on-demand apparel store
  shopProducts: "/api/shop-products",
  createShopOrder: "/api/create-shop-order",
  adminCompletePublishes: "/api/admin-complete-publishes",
  adminSetShopOrder: "/api/admin-set-shop-order",
  adminShopOrders: "/api/admin-shop-orders",
  myShopOrders: "/api/my-shop-orders",
  adminSyncShopOrders: "/api/admin-sync-shop-orders",
  adminDonations: "/api/admin-donations",
  adminSyncDonations: "/api/admin-sync-donations",
  validateShopDiscount: "/api/validate-shop-discount",
  adminDiscounts: "/api/admin-discounts",
  adminSaveDiscount: "/api/admin-save-discount",
  adminDeleteDiscount: "/api/admin-delete-discount",
  validateRegistrationDiscount: "/api/validate-registration-discount",
  adminRegistrationDiscounts: "/api/admin-registration-discounts",
  adminSaveRegistrationDiscount: "/api/admin-save-registration-discount",
  adminDeleteRegistrationDiscount: "/api/admin-delete-registration-discount",
  adminRegistrationCredits: "/api/admin-registration-credits",
  adminSaveRegistrationCredit: "/api/admin-save-registration-credit",
  adminDeleteRegistrationCredit: "/api/admin-delete-registration-credit",
  galleryPhotos: "/api/gallery-photos",
  adminUploadPhoto: "/api/admin-upload-photo",
  adminSaveGallery: "/api/admin-save-gallery",
  // User profile — saved shipping/billing addresses
  myProfile: "/api/my-profile",
  saveMyProfile: "/api/save-my-profile",
  // Admin role management (grant/revoke admin custom claim)
  adminSetRole: "/api/admin-set-role",
  // Admin "view as / edit user" — mint a custom token to impersonate a user
  adminImpersonate: "/api/admin-impersonate",
  // Admin edit-user modal — load/save a rider's profile by uid
  adminGetUserProfile: "/api/admin-user-profile",
  adminSaveUserProfile: "/api/admin-save-user-profile",
  // Accounting — per-year P&L books (admin only)
  adminAccountingSave: "/api/admin-accounting-save",
  adminAccountingSeed: "/api/admin-accounting-seed",
  adminAccountingDelete: "/api/admin-accounting-delete",
  adminAccountingAddLine: "/api/admin-accounting-add-line",
  adminAccountingUpdateLine: "/api/admin-accounting-update-line",
  adminAccountingDeleteLine: "/api/admin-accounting-delete-line",
  adminReceipt: "/api/admin-receipt",
  adminRiderCounts: "/api/admin-rider-counts"
};
