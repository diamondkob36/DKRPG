// นำเข้า Library ของ Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ตั้งค่า Firebase (Config)
const firebaseConfig = {
    apiKey: "AIzaSyB4xTY6BTjufK9fi0YlgzllOSK2349l0Zk",
    authDomain: "dk-rpg.firebaseapp.com",
    projectId: "dk-rpg",
    storageBucket: "dk-rpg.firebasestorage.app",
    messagingSenderId: "954909256548",
    appId: "1:954909256548:web:4f347b5cbf5f55fbdc6871"
};

// เริ่มต้นระบบ
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// ส่งออกตัวแปรให้ไฟล์อื่นเอาไปใช้ต่อได้ (Export)
export { 
    db, auth, provider, 
    doc, setDoc, getDoc, 
    signInWithPopup, onAuthStateChanged, signOut 
};