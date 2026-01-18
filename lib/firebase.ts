import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDakTEN2xkmYPR6ZAUUq3e1fXojAuY3E7M",
    authDomain: "mep-v2.firebaseapp.com",
    projectId: "mep-v2",
    storageBucket: "mep-v2.firebasestorage.app",
    messagingSenderId: "828311508339",
    appId: "1:828311508339:web:720ef081a08fe3d3372106",
    measurementId: "G-PRRRT1N7LQ"
};

// Initialize Firebase for Next.js (client-side safe)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
