// firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import admin from "firebase-admin";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const serviceAccount = JSON.parse(readFileSync(join(__dirname, "firebase-service-account.json"), "utf8"));

// --- Client SDK config ---
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyBb8A2i7jQ7g5qZGT24FKQgBDvLHtdTt_o",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "invmanagement-774b6.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "invmanagement-774b6",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "invmanagement-774b6.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "891974729305",
  appId: process.env.FIREBASE_APP_ID || "1:891974729305:web:f7bdc44b57b9d13063fb48",
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-VJRVCW7CPK",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();

// --- Admin SDK config ---
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export default admin;
