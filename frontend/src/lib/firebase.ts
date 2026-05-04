import { initializeApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const requiredKeys = [
  { name: "VITE_FIREBASE_API_KEY", value: firebaseConfig.apiKey },
  { name: "VITE_FIREBASE_AUTH_DOMAIN", value: firebaseConfig.authDomain },
  { name: "VITE_FIREBASE_PROJECT_ID", value: firebaseConfig.projectId },
  { name: "VITE_FIREBASE_APP_ID", value: firebaseConfig.appId },
];

export function isFirebaseConfigured(): boolean {
  return requiredKeys.every((item) => Boolean(item.value));
}

export function getMissingFirebaseConfigKeys(): string[] {
  return requiredKeys.filter((item) => !item.value).map((item) => item.name);
}

let authInstance: Auth | null = null;

export function getFirebaseAuth(): Auth {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase nao configurado no frontend.");
  }

  if (authInstance) {
    return authInstance;
  }

  const app = initializeApp(firebaseConfig);
  authInstance = getAuth(app);
  return authInstance;
}
