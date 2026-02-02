// js/firebase-init.js

// Import Firebase SDK (แบบ Modular)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, collection, query,where, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

// =========================================================
// ⚠️ สำคัญ: ใส่ Config ของคุณตรงนี้ (เอามาจาก Firebase Console)
// =========================================================
const firebaseConfig = {
    apiKey: "AIzaSyB4xTY6BTjufK9fi0YlgzllOSK2349l0Zk",
    authDomain: "dk-rpg.firebaseapp.com",
    projectId: "dk-rpg",
    storageBucket: "dk-rpg.firebasestorage.app",
    messagingSenderId: "954909256548",
    appId: "1:954909256548:web:4f347b5cbf5f55fbdc6871"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Export ฟังก์ชันต่างๆ ให้ไฟล์อื่น (js/index.js) เรียกใช้ได้
export { db, auth, provider, doc, setDoc, getDoc, signInWithPopup, onAuthStateChanged, signOut,collection, query, where, getDocs };