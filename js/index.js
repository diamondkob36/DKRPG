// js/index.js

import { db, auth, provider, doc, setDoc, getDoc, signInWithPopup, onAuthStateChanged, signOut } from "./firebase-init.js";
import { GameLogic } from "./game-logic.js"; // 🧠 นำเข้าสมอง
import { UI } from "./ui.js";                // 🎨 นำเข้าหน้าตา
import { items } from "./gameData.js";

let currentUser = null;
let gameData = {}; 
let selectedClassKey = null;
let currentShopMode = 'buy';

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

// --- ระบบปุ่มอัปเกรด (แบบมี Temp State) ---

let tempGameData = null; // ตัวแปรเก็บข้อมูลชั่วคราว

// 1. เปิด Popup
window.openUpgradeModal = () => {
    tempGameData = { ...gameData }; 
    // ส่งทั้ง "ค่าชั่วคราว" และ "ค่าจริง" ไปให้ UI เปรียบเทียบ
    UI.updateModalOnly(tempGameData, gameData);
    UI.toggleUpgradeModal(true);
};

// 2. ปิด Popup (ยกเลิกการทำรายการ)
window.closeUpgradeModal = () => {
    tempGameData = null; // ล้างค่าทิ้ง
    UI.toggleUpgradeModal(false);
};

// 3. กดปุ่มบวก (+)
window.addTempStat = (type) => {
    try {
        tempGameData = GameLogic.upgradeStat(tempGameData, type);
        UI.updateModalOnly(tempGameData, gameData); // ส่งค่าจริงไปด้วย
    } catch (e) {
        alert(e.message);
    }
};

// 4. กดปุ่มลบ (-)
window.removeTempStat = (type) => {
    try {
        // เรียก Logic ลดค่า (ส่งค่าจริงไปเช็คด้วยว่าห้ามต่ำกว่าเดิม)
        tempGameData = GameLogic.downgradeStat(tempGameData, gameData, type);
        UI.updateModalOnly(tempGameData, gameData);
    } catch (e) {
        console.error(e.message); // ปกติจะไม่ error เพราะปุ่มมันซ่อนอยู่แล้ว
    }
};

// 5. ปุ่มรีเซ็ต
window.resetTempStats = () => {
    tempGameData = { ...gameData };
    UI.updateModalOnly(tempGameData, gameData);
};

// 6. ปุ่มยืนยัน (บันทึกจริง)
window.saveUpgrade = async () => {
    // เอาข้อมูลชั่วคราว มาเป็นข้อมูลจริง
    gameData = { ...tempGameData };
    
    // อัปเดตหน้าจอหลัก
    UI.updateGameScreen(gameData);
    
    // ปิด Modal
    closeUpgradeModal();
    
    // บันทึกลง Firebase
    await saveToFirebase();
};

// --- ระบบกระเป๋าไอเทม ---

// 1. เปิดกระเป๋า
window.openInventory = () => {
    // วาดไอเทมล่าสุดก่อนเปิด
    UI.renderInventory(gameData.inventory);
    UI.toggleInventory(true);
};

// 2. ปิดกระเป๋า
window.closeInventory = () => {
    UI.toggleInventory(false);
};

// 3. กดใช้ไอเทม
window.useItem = async (itemId) => {
    try {
        if(!confirm("ต้องการใช้ไอเทมนี้หรือไม่?")) return;

        // เรียก Logic ใช้ของ
        gameData = GameLogic.useItem(gameData, itemId);

        // อัปเดตหน้าจอ (ทั้งกระเป๋า และ HP ที่เพิ่มขึ้น)
        UI.renderInventory(gameData.inventory);
        UI.updateGameScreen(gameData);
        
        // บันทึก
        await saveToFirebase();

    } catch (e) {
        alert(e.message);
    }
}; // 👈 ปิด useItem ตรงนี้ (ของเดิมหายไป)

// --- ระบบร้านค้า --- (ย้ายออกมาข้างนอกแล้ว)

window.openShop = () => {
    // เปิดมาให้เป็นหน้าซื้อก่อน
    setShopMode('buy');
    UI.toggleShop(true);
    UI.updateGameScreen(gameData); 
};

// 👇 ฟังก์ชันสลับโหมด 👇
window.setShopMode = (mode) => {
    currentShopMode = mode;
    UI.toggleShopModeUI(mode);

    if (mode === 'buy') {
        UI.switchShopTab('all'); // โหลดหน้าซื้อ
    } else {
        UI.renderSellShop(gameData.inventory); // โหลดหน้าขาย
    }
};

// 👇 เพิ่มฟังก์ชันนี้ 👇
window.switchShopTab = (category) => {
    UI.switchShopTab(category);
};

window.closeShop = () => {
    UI.toggleShop(false);
};

window.buyItem = async (itemId) => {
    try {
        // เรียก Logic ซื้อของ
        gameData = GameLogic.buyItem(gameData, itemId);

        // อัปเดตหน้าจอ (เงินลด, ของเพิ่ม)
        UI.updateGameScreen(gameData);
        
        // บันทึก
        await saveToFirebase();
        
        // แจ้งเตือนเล็กน้อย (Optional)
        // alert("ซื้อสำเร็จ!"); 

    } catch (e) {
        alert(e.message);
    }
};

// 👇 ฟังก์ชันขายของ 👇
window.sellItem = async (itemId) => {
    try {
        const item = items[itemId]; 
        
        if(!confirm(`ยืนยันการขายไอเทมนี้ใช่หรือไม่?`)) return;

        gameData = GameLogic.sellItem(gameData, itemId);

        // อัปเดตหน้าจอ (รีเฟรชหน้าขายของ)
        UI.renderSellShop(gameData.inventory);
        UI.updateGameScreen(gameData);
        
        await saveToFirebase();

    } catch (e) {
        alert(e.message);
    }
};