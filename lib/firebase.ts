"use client"

import { getApps, initializeApp } from "firebase/app"
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCP1DcZNh_XeueQCqVqbVRWFhcp6KK6Qts",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "recipe-ai-app-n5qjhbnn4a-du.a.run.app",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "bask-eat",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "bask-eat.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "579953258832",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:579953258832:web:10860856b7e9b8ae527c55",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-8DH02RGPQD",
}

export function getFirebaseAuth() {
  if (getApps().length === 0) {
    initializeApp(firebaseConfig)
  }
  return getAuth()
}

export async function signInWithGoogleAndGetIdToken(): Promise<string> {
  const auth = getFirebaseAuth()
  const provider = new GoogleAuthProvider()
  const result = await signInWithPopup(auth, provider)
  const idToken = await result.user.getIdToken()
  return idToken
}


