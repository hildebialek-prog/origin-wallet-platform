import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC0qxuOWe5CboeMXWerdiP4ycKjvaj2XkY",
  authDomain: "origin-wallett.firebaseapp.com",
  projectId: "origin-wallett",
  storageBucket: "origin-wallett.firebasestorage.app",
  messagingSenderId: "250167235481",
  appId: "1:250167235481:web:c22104e2876a55f8e53908",
  measurementId: "G-7NY3FDNTJF"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
