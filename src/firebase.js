
import { initializeApp } from "firebase/app";

import {
  getAuth,
  GoogleAuthProvider,
  browserLocalPersistence,
  setPersistence,
} from "firebase/auth";

// Firebase configuration is supplied through Vite environment variables.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Identify missing or empty configuration values.
const missingConfig = Object.entries(firebaseConfig)
  .filter(([, value]) => typeof value !== "string" || !value.trim())
  .map(([key]) => key);

// Export a readable error instead of crashing the application at import time.
export const firebaseConfigError =
  missingConfig.length > 0
    ? `Missing Firebase configuration: ${missingConfig.join(", ")}. ` +
      "Check your GitHub repository secrets and deployment build."
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
    googleProvider.setCustomParameters({
      prompt: "select_account",
    });

    // Preserve the user's login session between page refreshes.
    authReady = setPersistence(auth, browserLocalPersistence).catch(
      (error) => {
        console.warn(
          "ENEMIND could not set Firebase authentication persistence:",
          error
        );
      }
    );
  } catch (error) {
    console.error("ENEMIND Firebase initialization failed:", error);

    app = null;
    auth = null;
    googleProvider = null;
  }
}

export { auth, googleProvider, authReady };

export default app;
