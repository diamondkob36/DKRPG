// js/index.js

import { db, auth, provider, doc, setDoc, getDoc, signInWithPopup, onAuthStateChanged, signOut } from "./firebase-init.js";
import { GameLogic } from "./game-logic.js"; // 🧠 นำเข้าสมอง
import { UI } from "./ui.js";                // 🎨 นำเข้าหน้าตา

let currentUser = null;
let gameData = {}; 
let selectedClassKey = null;

// --- 1. ระบบ Auth (เชื่อมต่อ Google) ---
window.loginGoogle = async () => {
    try { await signInWithPopup(auth, provider); } 
    catch (e) { alert(e.message); }
};

window.logout = () => signOut(auth).then(() => location.reload());

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        // ซ่อนหน้า Login ระหว่างโหลด
        UI.showScreen(''); 
        UI.toggleAuthButton(true);
        await checkAndLoadData(user.uid);
    } else {
        UI.showScreen('login-screen');
        UI.toggleAuthButton(false);
    }
});

// --- 2. ตัวควบคุมหลัก (Controller) ---
async function checkAndLoadData(uid) {
    UI.setStatus("กำลังโหลด...", "");
    const snapshot = await getDoc(doc(db, "players", uid));
    
    if (snapshot.exists()) {
        gameData = snapshot.data();
        enterGame();
        UI.setStatus("ยินดีต้อนรับ!", "success");
        setTimeout(() => UI.setStatus("", ""), 2000);
    } else {
        UI.showScreen('create-screen');
        UI.setStatus("สร้างตัวละครใหม่", "");
    }
}

// เมื่อกดเลือกอาชีพ
window.selectClass = (key) => {
    selectedClassKey = key;
    UI.selectClass(key);
}

// เมื่อกดยืนยันสร้างตัวละคร
window.confirmCreate = async () => {
    const name = document.getElementById('hero-name').value.trim();
    if(!name || !selectedClassKey) return alert("กรุณากรอกข้อมูลให้ครบ");
    
    UI.setStatus("กำลังสร้างตัวละคร...", "");
    
    // เรียกใช้ Logic สร้างข้อมูล
    gameData = GameLogic.createCharacter(name, selectedClassKey);

    // บันทึกและเข้าเกม
    await saveToFirebase();
    enterGame();
    UI.setStatus("สร้างสำเร็จ!", "success");
};

function enterGame() {
    UI.showScreen('game-screen');
    UI.updateGameScreen(gameData);
}

// --- 3. ระบบเกม (Game Actions) ---
window.train = async () => {
    // 1. ให้ Logic คำนวณค่าใหม่
    gameData = GameLogic.train(gameData);
    // 2. ให้ UI อัปเดตหน้าจอ
    UI.updateGameScreen(gameData);
    // 3. บันทึกลง Database
    await saveToFirebase();
};

window.farm = async () => {
    gameData = GameLogic.farm(gameData);
    UI.updateGameScreen(gameData);
    await saveToFirebase();
};

window.toggleHUD = () => UI.toggleHUD();

// ฟังก์ชันบันทึก
async function saveToFirebase() {
    if(!currentUser) return;
    UI.setStatus("กำลังบันทึก...", "");
    try {
        await setDoc(doc(db, "players", currentUser.uid), gameData);
        UI.setStatus("✅ บันทึกแล้ว", "success");
        setTimeout(() => UI.setStatus("", ""), 1500);
    } catch(e) {
        UI.setStatus("Error: " + e.message, "error");
    }
}