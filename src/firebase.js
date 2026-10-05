import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB-xN4j3z4VtX680ZEBa3TYUH2bXsAsZaA",
  authDomain: "zee-organic.firebaseapp.com",
  projectId: "zee-organic",
  storageBucket: "zee-organic.firebasestorage.app",
  messagingSenderId: "792525653337",
  appId: "1:792525653337:web:9020069bb96e2d2a083848",
  measurementId: "G-K2D2PPP7D3",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);