// js/index.js

import { db, auth, provider, doc, setDoc, getDoc, signInWithPopup, onAuthStateChanged, signOut } from "./firebase-init.js";
import { GameLogic } from "./game-logic.js"; // 🧠 นำเข้าสมอง
import { UI } from "./ui.js";                // 🎨 นำเข้าหน้าตา
import { items } from "./gameData.js";

let currentUser = null;
let gameData = {}; 
let selectedClassKey = null;
let currentShopMode = 'buy';
let currentCategory = 'all';
let currentInvCategory = 'all';

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
    // รีเซ็ตหมวด
    currentInvCategory = 'all';
    UI.switchInventoryTabUI('all');
    
    // วาดทั้ง Equipment และ Inventory
    UI.renderInventoryModal(gameData, 'all');
    UI.toggleInventory(true);
};

// 2. ปิดกระเป๋า
window.closeInventory = () => {
    UI.toggleInventory(false);
};

// 2. สลับหมวดในกระเป๋า
window.switchInventoryTab = (category) => {
    currentInvCategory = category;
    UI.switchInventoryTabUI(category);
    UI.renderInventory(gameData.inventory, category);
};

// 3. สวมใส่ไอเทม
window.equipItem = async (itemId) => {
    try {
        gameData = GameLogic.equipItem(gameData, itemId);
        
        // อัปเดตหน้าจอทั้งหมด
        UI.renderInventoryModal(gameData, currentInvCategory); // รีเฟรช Modal
        UI.updateGameScreen(gameData); // รีเฟรช HUD สเตตัส
        await saveToFirebase();
        
    } catch (e) { alert(e.message); }
};

// 4. ถอดไอเทม
window.unequipItem = async (slotId) => {
    try {
        gameData = GameLogic.unequipItem(gameData, slotId);
        
        UI.renderInventoryModal(gameData, currentInvCategory);
        UI.updateGameScreen(gameData);
        await saveToFirebase();

    } catch (e) { alert(e.message); }
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

// --- Shop System ---
window.openShop = () => {
    setShopMode('buy');
    UI.toggleShop(true);
};

window.setShopMode = (mode) => {
    currentShopMode = mode;
    currentCategory = 'all'; // รีเซ็ตหมวด
    UI.toggleShopModeUI(mode);
    UI.switchShopTabUI('all');
    refreshShopDisplay();
};

window.switchShopTab = (category) => {
    currentCategory = category;
    UI.switchShopTabUI(category);
    refreshShopDisplay();
};

function refreshShopDisplay() {
    if (currentShopMode === 'buy') {
        UI.renderShop(currentCategory);
    } else {
        UI.renderSellShop(gameData.inventory, currentCategory);
    }
}

window.closeShop = () => { UI.toggleShop(false); };

window.buyItem = async (itemId) => {
    try {
        const qtyInput = document.getElementById(`buy-qty-${itemId}`);
        const amount = qtyInput ? parseInt(qtyInput.value) : 1;
        
        if(amount < 1) return alert("จำนวนไม่ถูกต้อง");

        // 👇 1. ดึงข้อมูลไอเทมเพื่อมาโชว์ชื่อและราคา
        const item = items[itemId];
        const totalPrice = item.price * amount;

        // 👇 2. สร้างกล่อง Confirm แจ้งเตือน
        if(!confirm(`ยืนยันการซื้อ "${item.name}"\nจำนวน: ${amount} ชิ้น\nราคารวม: ${totalPrice} G ใช่หรือไม่?`)) {
            return; // ถ้ากด Cancel ก็จบฟังก์ชันตรงนี้ ไม่ซื้อ
        }

        // 3. ถ้ากด OK ถึงจะเรียก Logic ซื้อของ
        gameData = GameLogic.buyItem(gameData, itemId, amount);
        
        // รีเซ็ตช่องกรอกกลับเป็น 1
        if(qtyInput) qtyInput.value = 1;

        UI.updateGameScreen(gameData);
        await saveToFirebase();
        refreshShopDisplay();
        
    } catch (e) { 
        alert(e.message); 
    }
};

window.sellItem = async (itemId) => {
    try {
        const qtyInput = document.getElementById(`sell-qty-${itemId}`);
        const amount = qtyInput ? parseInt(qtyInput.value) : 1;
        const item = items[itemId];

        if(!confirm(`ขาย ${item.name} จำนวน ${amount} ชิ้น?`)) return;

        gameData = GameLogic.sellItem(gameData, itemId, amount);
        UI.updateGameScreen(gameData);
        refreshShopDisplay();
        await saveToFirebase();
    } catch (e) { alert(e.message); }
};

window.sellAllLoot = async (category) => {
    try {
        if(!confirm(`⚠️ ยืนยันขายไอเทมในหมวด "${category}" ทั้งหมดทิ้ง?`)) return;
        
        const result = GameLogic.sellAllItemsByCategory(gameData, category);
        gameData = result.newData;
        
        alert(`ขายไอเทม ${result.soldCount} รายการ ได้เงินทั้งหมด ${result.totalGain} G`);
        
        UI.updateGameScreen(gameData);
        refreshShopDisplay();
        await saveToFirebase();
    } catch (e) { alert(e.message); }
};