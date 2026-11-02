import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  browserLocalPersistence,
  setPersistence,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const missingConfig = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

// IMPORTANT: never throw at import time. A throw here stops the whole
// bundle from running and leaves GitHub Pages showing a blank page.
// Instead we export a readable error and let the UI display it.
export const firebaseConfigError =
  missingConfig.length > 0
    ? `Missing Firebase configuration (${missingConfig.join(", ")}). ` +
      `Add the VITE_FIREBASE_* values as GitHub repository secrets and redeploy.`
    : "";

let app = null;
let auth = null;
let googleProvider = null;
let authReady = Promise.resolve();

if (!firebaseConfigError) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);

    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: "select_account" });

    // Keep the user's login session between page refreshes.
    authReady = setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.warn("ENEMIND could not set auth persistence:", err);
    });
  } catch (err) {
    console.error("ENEMIND Firebase initialization failed:", err);
    app = null;
    auth = null;
    googleProvider = null;
  }
}

export { auth, googleProvider, authReady };
export default app;
