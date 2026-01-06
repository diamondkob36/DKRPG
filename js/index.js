import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// นำเข้าข้อมูลอาชีพจากไฟล์ใหม่
import { classStats } from "./gameData.js";

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
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

let currentUser = null;
let gameData = {}; // รอโหลดข้อมูล
let selectedClassKey = null; // เก็บอาชีพที่เลือกชั่วคราว

// --- 1. ระบบ Auth ---
window.loginGoogle = async function() {
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        alert("Login Failed: " + error.message);
    }
};

window.logout = function() {
    signOut(auth).then(() => location.reload());
};

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        document.getElementById('login-screen').style.display = 'none';

        // 👇 เพิ่มบรรทัดนี้ครับ: โชว์ปุ่มออกจากระบบบน Top Bar 👇
        document.getElementById('user-info-top').style.display = 'block';
        
        // เช็คว่ามีเซฟหรือไม่?
        await checkAndLoadData(user.uid);
    } else {
        document.getElementById('login-screen').style.display = 'block';
        document.getElementById('create-screen').style.display = 'none';
        document.getElementById('game-screen').style.display = 'none';

        // 👇 เพิ่มบรรทัดนี้ครับ: ซ่อนปุ่มออกจากระบบบน Top Bar 👇
        document.getElementById('user-info-top').style.display = 'none';
    }
});

// --- 2. ระบบเช็คข้อมูล & สร้างตัวละคร ---
async function checkAndLoadData(uid) {
    setStatus("กำลังตรวจสอบข้อมูลฮีโร่...", "");
    const docRef = doc(db, "players", uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        // มีเซฟแล้ว -> โหลดเลย
        gameData = docSnap.data();
        enterGame();
        setStatus("ยินดีต้อนรับกลับมา!", "success");
    } else {
        // ยังไม่มีเซฟ -> ไปหน้าสร้างตัวละคร
        document.getElementById('create-screen').style.display = 'block';
        setStatus("โปรดสร้างตัวละครของท่าน", "");
    }
}

window.selectClass = function(key) {
    selectedClassKey = key;
    
    // 1. จัดการเรื่อง UI การ์ด (เหมือนเดิม)
    document.querySelectorAll('.class-card').forEach(el => el.classList.remove('selected'));
    document.getElementById('card-' + key).classList.add('selected');
    
    // 2. ดึงข้อมูลอาชีพจาก gameData (import มาแล้ว)
    const stats = classStats[key];

    // 3. อัปเดตคำอธิบาย
    document.getElementById('class-desc').innerText = stats.desc;

    // 4. (ใหม่!) อัปเดตค่าสถานะในกล่องพรีวิว
    document.getElementById('pre-hp').innerText = stats.maxHp;
    document.getElementById('pre-str').innerText = stats.str;
    document.getElementById('pre-int').innerText = stats.int;
    document.getElementById('pre-agi').innerText = stats.agi;

    // 5. เปิดโชว์กล่องพรีวิว (เผื่อมันซ่อนอยู่)
    document.getElementById('class-preview').style.display = 'block';

    const imgEl = document.getElementById('preview-img');
    imgEl.src = stats.img;       // เอารูปจาก gameData มาใส่
    imgEl.style.display = 'inline-block'; // เปิดการแสดงผล
    imgEl.onerror = function() { this.src = 'https://placehold.co/100x100?text=No+Image'; }; // กันภาพแตกถ้ายังไม่มีไฟล์
}

// ฟังก์ชันยืนยันสร้างตัวละคร
window.confirmCreate = async function() {
    const nameInput = document.getElementById('hero-name').value.trim();
    
    if (!nameInput) return alert("กรุณาตั้งชื่อตัวละคร!");
    if (!selectedClassKey) return alert("กรุณาเลือกอาชีพ!");

    setStatus("กำลังจารึกชื่อผู้กล้า...", "");

    // ดึงค่าสเตตัสเริ่มต้นมาจาก gameData.js
    const baseStats = classStats[selectedClassKey];

    // สร้าง Object ข้อมูลใหม่
    gameData = {
        name: nameInput,
        classKey: selectedClassKey,
        className: baseStats.name,
        lvl: 1,
        gold: 0,
        // ก๊อปปี้สเตตัสเริ่มต้นมาใส่
        hp: baseStats.hp,
        maxHp: baseStats.maxHp,
        str: baseStats.str,
        int: baseStats.int,
        agi: baseStats.agi
    };

    try {
        // บันทึกลง Database ทันที
        await setDoc(doc(db, "players", currentUser.uid), gameData);
        
        document.getElementById('create-screen').style.display = 'none';
        enterGame();
        setStatus("สร้างตัวละครสำเร็จ!", "success");
    } catch (e) {
        alert("Error creating char: " + e.message);
    }
}

// --- 3. ระบบเกม (UI Update) ---
function enterGame() {
    document.getElementById('game-screen').style.display = 'block';
    updateUI();
}

window.train = function() {
    gameData.lvl++;
    // เลเวลอัปเพิ่มสเตตัสนิดหน่อย (ตัวอย่าง)
    gameData.maxHp += 10;
    gameData.str += 1;
    updateUI();
};

window.farm = function() {
    gameData.gold += 100;
    updateUI();
};

window.saveData = async function() {
    if (!currentUser) return;
    setStatus("กำลังบันทึก...", "");
    try {
        await setDoc(doc(db, "players", currentUser.uid), gameData);
        setStatus("✅ บันทึกเรียบร้อย!", "success");
    } catch (e) {
        setStatus("❌ บันทึกไม่ได้", "error");
    }
};

function updateUI() {
    // โชว์ชื่อและอาชีพ
    document.getElementById('display-name').innerText = gameData.name;
    document.getElementById('display-class').innerText = gameData.className;

    if(gameData.classKey && classStats[gameData.classKey]) {
        document.getElementById('hero-img').src = classStats[gameData.classKey].img;
    } else {
        // กรณีเซฟเก่าไม่มี classKey
        document.getElementById('hero-img').src = 'https://placehold.co/100x100?text=Hero';
    }
    
    // โชว์สเตตัส
    document.getElementById('lvl').innerText = gameData.lvl;
    document.getElementById('gold').innerText = gameData.gold;
    document.getElementById('hp').innerText = gameData.hp;
    document.getElementById('maxHp').innerText = gameData.maxHp;
    document.getElementById('str').innerText = gameData.str;
    document.getElementById('int').innerText = gameData.int;
    document.getElementById('agi').innerText = gameData.agi;
}

function setStatus(msg, type) {
    const el = document.getElementById('status');
    if(el) {
        el.innerText = msg;
        el.className = type;
    }
}