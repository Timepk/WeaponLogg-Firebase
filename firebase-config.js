import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyD1ISbg_sCbhCl4HE4A7ZvfXHxCsZxBFQw",
  authDomain: "time-pk.firebaseapp.com",
  projectId: "time-pk",
  storageBucket: "time-pk.firebasestorage.app",
  messagingSenderId: "25204241407",
  appId: "1:25204241407:web:3c5dd86ca9ce8321062dca"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

console.log('[Firebase] Konfigurert');
