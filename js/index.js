import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
// เพิ่มบรรทัดนี้: นำเข้าระบบ Authentication
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyB4xTY6BTjufK9fi0YlgzllOSK2349l0Zk",
    authDomain: "dk-rpg.firebaseapp.com",
    projectId: "dk-rpg",
    storageBucket: "dk-rpg.firebasestorage.app",
    messagingSenderId: "954909256548",
    appId: "1:954909256548:web:4f347b5cbf5f55fbdc6871"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); // เริ่มต้นระบบ Auth
const provider = new GoogleAuthProvider(); // เตรียมล็อกอินผ่าน Google

let currentUser = null; // เก็บข้อมูลคนเล่น (UID, Email)
let gameData = { lvl: 1, gold: 0, name: "New Hero" };

// --- ฟังก์ชันล็อกอิน (Google) ---
window.loginGoogle = async function() {
    try {
        const result = await signInWithPopup(auth, provider);
        // ล็อกอินสำเร็จ Firebase จะจัดการต่อเองใน onAuthStateChanged
        console.log("Logged in:", result.user);
    } catch (error) {
        console.error(error);
        setStatus("❌ ล็อกอินไม่ผ่าน: " + error.message, "error");
    }
};

window.logout = function() {
    signOut(auth).then(() => {
        location.reload(); // รีเฟรชหน้าจอเมื่อออก
    });
};

// --- ตรวจสอบสถานะ: ว่าล็อกอินอยู่ไหม? ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // ถ้ามีคนล็อกอินอยู่
        currentUser = user;
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('game-screen').style.display = 'block';
        document.getElementById('display-name').innerText = user.displayName;
        
        // โหลดข้อมูลโดยใช้ UID (รหัสประจำตัวที่ไม่ซ้ำกัน) เป็นชื่อเซฟ
        await loadData(user.uid);
    } else {
        // ถ้ายังไม่ล็อกอิน
        document.getElementById('login-screen').style.display = 'block';
        document.getElementById('game-screen').style.display = 'none';
    }
});

// --- ฟังก์ชันเกม ---
window.train = function() {
    gameData.lvl++;
    updateUI();
};

window.farm = function() {
    gameData.gold += 100;
    updateUI();
};

function updateUI() {
    document.getElementById('lvl').innerText = gameData.lvl;
    document.getElementById('gold').innerText = gameData.gold;
    setStatus("มีการเปลี่ยนแปลง... อย่าลืมกดเซฟนะ", "");
}

function setStatus(msg, type) {
    const el = document.getElementById('status');
    el.innerText = msg;
}

// --- Save / Load (ใช้ UID เป็น Key) ---
window.saveData = async function() {
    if (!currentUser) return;
    setStatus("กำลังบันทึก...", "");
    try {
        // บันทึกชื่อคนเล่นไปด้วย
        gameData.name = currentUser.displayName;
        
        // ใช้ currentUser.uid เป็นชื่อเอกสาร (ปลอดภัยกว่าใช้ชื่อเล่น)
        await setDoc(doc(db, "players", currentUser.uid), gameData);
        setStatus("✅ บันทึกเรียบร้อย!", "success");
    } catch (e) {
        setStatus("❌ บันทึกไม่ได้: " + e.message, "error");
    }
};

async function loadData(uid) {
    setStatus("กำลังโหลดข้อมูล...", "");
    try {
        const docRef = doc(db, "players", uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            gameData = docSnap.data();
            updateUI();
            setStatus("📂 โหลดเซฟสำเร็จ พร้อมลุย!", "success");
        } else {
            // ถ้าเป็นผู้เล่นใหม่ ให้รีเซ็ตค่า
            gameData = { lvl: 1, gold: 0, name: currentUser.displayName };
            updateUI();
            setStatus("✨ ยินดีต้อนรับผู้กล้าคนใหม่!", "");
        }
    } catch (e) {
        setStatus("⚠️ โหลดเซฟไม่ได้", "error");
    }
}