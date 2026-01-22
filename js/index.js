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
let buffInterval = null;
let saveTimeout = null;
let isSaving = false;
let isQuotaExceeded = false;

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
    
    // 🆕 1. ก่อนเริ่มเกม เช็คว่ามีบัพหมดอายุตอน Offline ไหม
    const result = GameLogic.checkBuffs(gameData);
    if (result.hasChanged) {
        gameData = result.newData;
        saveToFirebase(); // บันทึกค่าที่ถูกต้อง (ลบบัพออก) ทันที
    }

    UI.updateGameScreen(gameData);
    
    // 🆕 2. เริ่มตัวนับเวลา (Game Loop)
    startBuffTimer();
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

window.openProfile = () => {
    // อัปเดตข้อมูลล่าสุดก่อนเปิด
    UI.updateGameScreen(gameData); 
    UI.toggleProfile(true);
};

window.closeProfile = () => {
    UI.toggleProfile(false);
};

// ฟังก์ชันสั่งบันทึก (เรียกใช้จาก train, buyItem ฯลฯ)
async function saveToFirebase(immediate = false) {
    if(!currentUser) return;

    // ถ้าสั่งให้บันทึกทันที (เช่น ตอนปิดเกม)
    if (immediate) {
        if (saveTimeout) clearTimeout(saveTimeout);
        await performSave();
        return;
    }

    // ถ้ามีการรอ Save อยู่แล้ว ให้ยกเลิกอันเก่า (Reset เวลา)
    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }

    UI.setStatus("กำลังซิงค์...", "warning"); // สถานะรอเซฟ

    // ตั้งเวลาว่า "ถ้าไม่มีการกดเพิ่มใน 2 วินาที ให้บันทึกเลย"
    saveTimeout = setTimeout(async () => {
        await performSave();
    }, 2000); 
}

// ฟังก์ชันทำงานเบื้องหลัง (ตัวบันทึกจริง + เช็คโควตา)
async function performSave() {
    // 1. ถ้าโควตาเต็มแล้ว หรือกำลังเซฟอยู่ ไม่ต้องทำซ้ำ
    if (isSaving || isQuotaExceeded) return; 
    
    isSaving = true;
    
    try {
        UI.setStatus("กำลังบันทึก...", "");
        
        // บันทึกข้อมูล
        await setDoc(doc(db, "players", currentUser.uid), gameData);
        
        UI.setStatus("✅ บันทึกแล้ว", "success");
        setTimeout(() => UI.setStatus("", ""), 1500);
        
    } catch(e) {
        console.error("Save Error:", e);

        // 2. เช็คว่าเป็น Error เพราะโควตาเต็มหรือไม่?
        if (e.code === 'resource-exhausted') {
            isQuotaExceeded = true; // ล็อกไว้เลยว่าเต็มแล้ว
            
            await UI.alert(
                "⚠️ ระบบบันทึกเต็ม (Quota Exceeded)", 
                `ขีดจำกัดการใช้งานเซิร์ฟเวอร์ฟรีประจำวันเต็มแล้ว!<br><br>
                <b>ผลกระทบ:</b> ข้อมูลหลังจากนี้จะไม่ถูกบันทึก<br>
                <b>คำแนะนำ:</b> เล่นต่อได้ แต่ข้อมูลอาจหายเมื่อรีเฟรช<br>
                ระบบจะรีเซ็ตโควตาใหม่ในวันพรุ่งนี้`
            );
            
            UI.setStatus("⛔ เซิร์ฟเวอร์เต็ม (ไม่บันทึก)", "error");
        } else {
            UI.setStatus("⚠️ บันทึกไม่สำเร็จ: " + e.message, "error");
        }
    } finally {
        isSaving = false;
        saveTimeout = null;
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
    currentInvCategory = 'all';
    UI.switchInventoryTabUI('all');
    UI.renderInventoryModal(gameData, 'all'); // เรียกตัวเต็ม
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
    UI.renderInventoryGridOnly(gameData.inventory, category); 
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
        const item = items[itemId]; 
        
        // 🆕 
        const isConfirmed = await UI.confirm(
            "🍷 ใช้ไอเทม", 
            `ต้องการใช้งาน <b style="color:#f1c40f">${item.name}</b> หรือไม่?`
        );
        if(!isConfirmed) return;

        gameData = GameLogic.useItem(gameData, itemId);

        UI.renderInventoryModal(gameData, currentInvCategory); 
        UI.updateGameScreen(gameData);
        await saveToFirebase();

    } catch (e) {
        await UI.alert("แจ้งเตือน", e.message);
    }
}; // 👈 ปิด useItem ตรงนี้ (ของเดิมหายไป)

// 🆕 เพิ่มฟังก์ชันกดทิ้งของ (เชื่อมกับปุ่มถังขยะ)
window.dropItem = async (itemId) => {
    try {
        const item = items[itemId];
        const currentQty = gameData.inventory[itemId] || 0;

        // 🆕 ใช้ UI.prompt แทน prompt เดิม
        const amountStr = await UI.prompt(
            "🗑️ ทิ้งไอเทม", 
            `ต้องการทิ้ง <b style="color:#f1c40f">${item.name}</b><br>(มีอยู่ ${currentQty} ชิ้น)`, 
            1
        );
        
        if (amountStr === null) return; // กดยกเลิก
        
        const amount = parseInt(amountStr);
        if (isNaN(amount) || amount <= 0 || amount > currentQty) {
            return await UI.alert("ข้อผิดพลาด", "จำนวนไม่ถูกต้อง!");
        }

        // 🆕 Confirm ครั้งสุดท้าย
        const isConfirmed = await UI.confirm(
            "⚠️ คำเตือน!", 
            `คุณกำลังจะทิ้ง <b style="color:red">${item.name} x${amount}</b><br>ไอเทมจะหายไปถาวร ยืนยันหรือไม่?`
        );
        if (!isConfirmed) return;

        gameData = GameLogic.dropItem(gameData, itemId, amount);

        UI.renderInventoryModal(gameData, currentInvCategory);
        UI.updateGameScreen(gameData);
        await saveToFirebase();

    } catch (e) {
        await UI.alert("แจ้งเตือน", e.message);
    }
};

// 🆕 เพิ่มฟังก์ชันนับเวลา
function startBuffTimer() {
    if (buffInterval) clearInterval(buffInterval); // เคลียร์ของเก่าถ้ามี

    buffInterval = setInterval(async () => {
        if (!gameData.activeBuffs) return;

        // เรียก Logic เช็คเวลา
        const result = GameLogic.checkBuffs(gameData);
        
        // อัปเดตหน้าจอเฉพาะส่วน Buff (เพื่อให้ตัวเลขเวลามันวิ่ง)
        UI.renderBuffs(gameData.activeBuffs);

        // ถ้าบัพหมดอายุจริง (hasChanged = true) ค่อยอัปเดต Stat และ Save
        if (result.hasChanged) {
            gameData = result.newData;
            UI.updateGameScreen(gameData); // อัปเดต Stat ที่ลดลงกลับมา
            await saveToFirebase();
        }
        
    }, 1000); // ทำงานทุก 1 วินาที
}

// --- ระบบร้านค้า --- (ย้ายออกมาข้างนอกแล้ว)

// --- Shop System ---
window.openShop = () => {
    setShopMode('buy');
    
    // ✅ เพิ่มบรรทัดนี้: อัปเดตเงินทันทีที่เปิดร้าน
    document.getElementById('shop-gold').innerText = gameData.gold;
    
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
    // ✅ เพิ่มบรรทัดนี้: อัปเดตเงินทุกครั้งที่มีการรีเฟรชหน้าจอร้ายค้า
    if(document.getElementById('shop-gold')) {
        document.getElementById('shop-gold').innerText = gameData.gold;
    }

    if (currentShopMode === 'buy') {
        UI.renderShop(currentCategory);
    } else {
        UI.renderSellShop(gameData.inventory, currentCategory);
    }
}

window.closeShop = () => { UI.toggleShop(false); };

// 1. แก้ไข buyItem
window.buyItem = async (itemId) => {
    try {
        const qtyInput = document.getElementById(`buy-qty-${itemId}`);
        const amount = qtyInput ? parseInt(qtyInput.value) : 1;
        if(amount < 1) return await UI.alert("แจ้งเตือน", "จำนวนไม่ถูกต้อง"); // 🆕

        const item = items[itemId];
        const totalPrice = item.price * amount;

        // 🆕 ใช้ UI.confirm แทน confirm เดิม
        const isConfirmed = await UI.confirm(
            "🛒 ยืนยันการซื้อ", 
            `ต้องการซื้อ <b style="color:#f1c40f">${item.name}</b><br>จำนวน ${amount} ชิ้น<br>รวมเป็นเงิน <b style="color:gold">${totalPrice} G</b> หรือไม่?`
        );

        if(!isConfirmed) return; 

        gameData = GameLogic.buyItem(gameData, itemId, amount);
        
        if(qtyInput) qtyInput.value = 1;

        UI.updateGameScreen(gameData);
        await saveToFirebase();
        refreshShopDisplay();
        
        // 🆕 (Optional) แจ้งเตือนซื้อสำเร็จ
        // await UI.alert("สำเร็จ", `ซื้อ ${item.name} เรียบร้อยแล้ว`); 
        
    } catch (e) { 
        await UI.alert("เกิดข้อผิดพลาด", e.message); // 🆕
    }
};

window.sellItem = async (itemId) => {
    try {
        const qtyInput = document.getElementById(`sell-qty-${itemId}`);
        const amount = qtyInput ? parseInt(qtyInput.value) : 1;
        const item = items[itemId];
        
        // 🆕
        const isConfirmed = await UI.confirm(
            "💰 ยืนยันการขาย", 
            `ขาย <b style="color:#f1c40f">${item.name}</b><br>จำนวน ${amount} ชิ้น?`
        );
        if(!isConfirmed) return;

        gameData = GameLogic.sellItem(gameData, itemId, amount);
        UI.updateGameScreen(gameData);
        refreshShopDisplay();
        await saveToFirebase();
    } catch (e) { await UI.alert("ผิดพลาด", e.message); }
};

window.sellAllLoot = async (category) => {
    try {
        // 🆕
        const isConfirmed = await UI.confirm(
            "🗑️ ขายขยะทั้งหมด", 
            `⚠️ ยืนยันขายไอเทมในหมวด <b>"${category}"</b> ทั้งหมดทิ้ง?`
        );
        if(!isConfirmed) return;
        
        const result = GameLogic.sellAllItemsByCategory(gameData, category);
        gameData = result.newData;
        
        // 🆕
        await UI.alert(
            "ขายเรียบร้อย", 
            `ขายไอเทมไป ${result.soldCount} รายการ<br>ได้รับเงิน <b style="color:gold">+${result.totalGain} G</b>`
        );
        
        UI.updateGameScreen(gameData);
        refreshShopDisplay();
        await saveToFirebase();
    } catch (e) { await UI.alert("แจ้งเตือน", e.message); }
};