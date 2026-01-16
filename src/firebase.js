// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDKqOSqP7Jm_wbJMNcsBvpkaAu1RvyNB-E',
  authDomain: 'notes-plus-33d26.firebaseapp.com',
  projectId: 'notes-plus-33d26',
  storageBucket: 'notes-plus-33d26.firebasestorage.app',
  messagingSenderId: '1029106838252',
  appId: '1:1029106838252:web:904280820b14ec0cbbd3c9',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
