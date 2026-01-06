// นำเข้า Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- Config ของคุณ (dk-rpg) ---
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

// ตัวแปรเกม
let currentUser = "";
let gameData = { lvl: 1, gold: 0 };

// --- ฟังก์ชันควบคุมเกม ---
// หมายเหตุ: ต้องใช้ window.xxxx เพื่อให้ HTML มองเห็นฟังก์ชันใน Module
window.login = async function() {
    const nameInput = document.getElementById('username');
    const name = nameInput.value.trim();
    
    if(!name) return alert("กรุณาตั้งชื่อก่อนครับ!");

    currentUser = name;
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
    document.getElementById('display-name').innerText = currentUser;

    await loadData();
};

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
    el.className = type;
}

// --- ระบบบันทึก (Save) ---
window.saveData = async function() {
    setStatus("กำลังส่งข้อมูลไป Cloud...", "");
    try {
        await setDoc(doc(db, "players", currentUser), gameData);
        setStatus("✅ บันทึกข้อมูลขึ้น dk-rpg สำเร็จ!", "success");
    } catch (e) {
        console.error("Save Error:", e);
        setStatus("❌ บันทึกไม่ได้: " + e.message, "error");
    }
};

// --- ระบบโหลด (Load) ---
async function loadData() {
    setStatus("กำลังค้นหาเซฟเก่า...", "");
    try {
        const docRef = doc(db, "players", currentUser);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            gameData = docSnap.data();
            updateUI();
            setStatus("📂 พบเซฟเก่า! โหลดข้อมูลเรียบร้อย", "success");
        } else {
            setStatus("✨ ไม่พบเซฟ เป็นผู้เล่นใหม่สินะ", "");
        }
    } catch (e) {
        console.error("Load Error:", e);
        setStatus("⚠️ โหลดเซฟไม่ได้ (อาจเป็นเน็ต หรือ Permission)", "error");
    }
}