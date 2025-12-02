// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyA2--BUB04WYbNQ2aNJYrnCax-Dqk5q5rs",
  authDomain: "investorpracticeapp.firebaseapp.com",
  projectId: "investorpracticeapp",
  storageBucket: "investorpracticeapp.firebasestorage.app",
  messagingSenderId: "886563907377",
  appId: "1:886563907377:web:bfd3364c8cf87feb22f210",
  measurementId: "G-P4MNTVCY12"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const firestore = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, firestore, googleProvider };