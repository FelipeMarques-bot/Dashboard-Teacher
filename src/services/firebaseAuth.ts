import { initializeApp } from 'firebase/app'
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const isFirebaseConfigured = Object.values(firebaseConfig).every(
  (value) => typeof value === 'string' && value.trim().length > 0,
)

const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null
const auth = app ? getAuth(app) : null
const googleProvider = app ? new GoogleAuthProvider() : null

function requireAuthReady() {
  if (!auth || !googleProvider) {
    throw new Error(
      'Firebase não configurado. Defina as variáveis VITE_FIREBASE_* no ambiente.',
    )
  }

  return { auth, googleProvider }
}

export function observeAuthState(callback: (user: User | null) => void) {
  if (!auth) {
    callback(null)
    return () => undefined
  }

  return onAuthStateChanged(auth, callback)
}

export async function signInWithGoogle() {
  const { auth: resolvedAuth, googleProvider: provider } = requireAuthReady()
  await signInWithPopup(resolvedAuth, provider)
}

export async function signOutFromGoogle() {
  const { auth: resolvedAuth } = requireAuthReady()
  await signOut(resolvedAuth)
}
