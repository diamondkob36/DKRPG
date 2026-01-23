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
let battleState = null;
let battleTimer = null;

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
    UI.toggleUpgradeModal(false); // ปิดหน้าอัปเกรด
    
    // ✅ เพิ่มบรรทัดนี้: เพื่อให้เปิดหน้าข้อมูลตัวละครกลับขึ้นมา
    openProfile();
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
window.equipItem = (itemId) => {
    // ✅ เช็คก่อนเลยว่ามีของในกระเป๋าไหม? (ป้องกันการกดเบิ้ลแล้ว error)
    if (!gameData.inventory[itemId] || gameData.inventory[itemId] <= 0) {
        return; // ถ้าไม่มีของ (เช่น เพิ่งใส่ไปตะกี้) ให้จบการทำงานเงียบๆ
    }

    try {
        // 1. เรียก Logic เพื่อสวมใส่ไอเทม (เปลี่ยนข้อมูลใน gameData)
        gameData = GameLogic.equipItem(gameData, itemId);

        // 2. ✅ บันทึกข้อมูลลง Firebase (แก้ไขจาก saveGame() เป็น saveToFirebase())
        saveToFirebase();
        
        // 3. อัปเดตหน้าจอเกมหลัก (HUD, Profile)
        UI.updateGameScreen(gameData);
        
        // 4. รีเฟรชหน้ากระเป๋า (ถ้าเปิดอยู่) เพื่อให้ไอเทมที่ใส่หายไปจากกระเป๋า
        const invModal = document.getElementById('inventory-modal');
        if(invModal && invModal.style.display !== 'none') {
            // เช็คว่ากำลังเปิดดูแท็บไหนอยู่ จะได้รีเฟรชให้ถูกหน้า
            let currentTab = 'all';
            const activeBtn = document.querySelector('.shop-tab-btn.active');
            if (activeBtn) {
                const btnText = activeBtn.innerText;
                if (btnText.includes('อาวุธ')) currentTab = 'weapon';
                else if (btnText.includes('เกราะ')) currentTab = 'armor';
                else if (btnText.includes('ยา')) currentTab = 'potion';
            }
            UI.renderInventoryModal(gameData, currentTab);
        }

    } catch (err) {
        // 5. จัดการ Error: ถ้าใส่ไม่ได้ (เช่น เลเวลไม่ถึง, ผิดอาชีพ) ให้แจ้งเตือน
        if (typeof UI.alert === 'function') {
            UI.alert("🚫 สวมใส่ไม่ได้", `<span style="color:#e74c3c;">${err.message}</span>`);
        } else {
            alert(err.message);
        }
    }
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

// 🆕 ฟังก์ชันกดใช้สกิล (เชื่อมกับปุ่ม)
window.useSkill = async (skillId) => {
    try {
        // เรียก Logic ใช้สกิล
        gameData = GameLogic.useSkill(gameData, skillId);
        
        // Save และ Update UI
        UI.updateGameScreen(gameData);
        await saveToFirebase();

    } catch (e) {
        // แจ้งเตือนถ้าใช้ไม่ได้ (เช่น MP หมด, ติด Cooldown)
        // ถ้ามี UI.alert ให้ใช้ UI.alert ถ้าไม่มีให้ใช้ alert ธรรมดา
        if(typeof UI.alert === 'function') UI.alert("ร่ายเวทย์ล้มเหลว", e.message);
        else alert(e.message);
    }
};

// 1. เริ่มการต่อสู้ (กดจากลานฝึก)
window.startBattle = (monsterId) => {
    const monsterTemplate = monsters[monsterId];
    if (!monsterTemplate) return alert("ไม่พบมอนสเตอร์");

    // สร้างข้อมูลการต่อสู้ชั่วคราว
    battleState = {
        turn: 'player', // player หรือ enemy
        timeLeft: 15,
        monster: { ...monsterTemplate }, // Copy ข้อมูลมอนสเตอร์มา
        logs: []
    };

    // เปิดหน้าจอ
    UI.showScreen('battle-screen');
    updateBattleUI();
    
    // เริ่มนับเวลา
    runBattleTimer();
};

// 2. ตัวนับเวลา (Loop)
function runBattleTimer() {
    if (battleTimer) clearInterval(battleTimer);

    battleTimer = setInterval(() => {
        if (!battleState) return clearInterval(battleTimer);

        battleState.timeLeft--;
        updateBattleUI();

        // หมดเวลาเทิร์น
        if (battleState.timeLeft <= 0) {
            switchTurn();
        }
    }, 1000);
}

// 3. สลับเทิร์น
function switchTurn() {
    if (!battleState) return;

    // เปลี่ยนฝั่ง
    battleState.turn = (battleState.turn === 'player') ? 'enemy' : 'player';
    battleState.timeLeft = 15; // รีเซ็ตเวลา

    // แจ้งเตือน
    const turnName = (battleState.turn === 'player') ? "ตาของคุณ!" : "ตาของศัตรู!";
    logBattle(`⏳ เปลี่ยนเทิร์น: ${turnName}`);
    
    // ถ้าเป็นตา ศัตรู ให้มันโจมตีอัตโนมัติ (หน่วงเวลานิดนึงให้เหมือนคิด)
    if (battleState.turn === 'enemy') {
        setTimeout(monsterAttack, 1000);
    }

    updateBattleUI();
}

// 4. การกระทำของผู้เล่น
window.battleAction = async (action, skillId = null) => {
    // ห้ามกดถ้าระบบยังไม่พร้อม หรือไม่ใช่ตาเรา
    if (!battleState || battleState.turn !== 'player') return;

    if (action === 'attack') {
        // คำนวณดาเมจพื้นฐาน (STR * 2)
        const dmg = Math.max(1, gameData.str * 2 - battleState.monster.def);
        battleState.monster.hp -= dmg;
        logBattle(`⚔️ คุณโจมตี ${dmg} ดาเมจ!`);
        checkWinCondition();
        switchTurn(); // จบเทิร์นเรา

    } else if (action === 'skill') {
        // Logic ใช้สกิล (แบบย่อ)
        const skill = skills[skillId];
        if (gameData.mp < skill.mpCost) return alert("MP ไม่พอ!");
        
        gameData.mp -= skill.mpCost;
        // ตัวอย่าง: ถ้าเป็นสกิลโจมตี
        if (skill.effect && skill.effect.damage) {
            battleState.monster.hp -= skill.effect.damage;
            logBattle(`✨ ใช้สกิล ${skill.name} ทำดาเมจ ${skill.effect.damage}!`);
        }
        // ... (ใส่ Logic บัพตรงนี้เพิ่มได้) ...
        
        checkWinCondition();
        switchTurn();

    } else if (action === 'run') {
        clearInterval(battleTimer);
        battleState = null;
        logBattle("🏃 คุณหนีจากการต่อสู้!");
        setTimeout(() => UI.showScreen('game-screen'), 1000);
    }
};

// 5. มอนสเตอร์โจมตี
function monsterAttack() {
    if (!battleState || battleState.turn !== 'enemy') return;

    const dmg = Math.max(1, battleState.monster.atk - (gameData.def || 0));
    gameData.hp -= dmg;
    logBattle(`👾 มอนสเตอร์โจมตีคุณ ${dmg} ดาเมจ!`);

    if (gameData.hp <= 0) {
        gameData.hp = 0;
        clearInterval(battleTimer);
        alert("💀 คุณพ่ายแพ้...");
        // รีเซ็ตเลือด หรือวาร์ปกลับเมือง
        gameData.hp = gameData.maxHp * 0.5; // ฟื้นให้ครึ่งนึง
        battleState = null;
        UI.showScreen('game-screen');
    } else {
        switchTurn(); // จบเทิร์นศัตรู -> กลับมาตาเรา
    }
    
    // อัปเดต UI และบันทึกเลือดที่ลดลง
    updateBattleUI();
    saveToFirebase(); 
}

// 6. เช็คผลแพ้ชนะ
function checkWinCondition() {
    if (battleState.monster.hp <= 0) {
        battleState.monster.hp = 0;
        clearInterval(battleTimer);
        
        // รับรางวัล
        const goldGain = battleState.monster.gold;
        const expGain = battleState.monster.exp;
        gameData.gold += goldGain;
        gameData = GameLogic.addExp(gameData, expGain);

        alert(`🎉 ชนะแล้ว!\nได้รับ ${expGain} EXP และ ${goldGain} G`);
        
        battleState = null;
        UI.showScreen('game-screen');
        UI.updateGameScreen(gameData);
        saveToFirebase();
    }
}

// 7. อัปเดตหน้าจอ Battle UI
function updateBattleUI() {
    if (!battleState) return;

    // Header
    const turnText = document.getElementById('turn-indicator');
    turnText.innerText = (battleState.turn === 'player') ? "YOUR TURN" : "ENEMY TURN";
    turnText.style.color = (battleState.turn === 'player') ? "#2ecc71" : "#e74c3c";
    
    document.getElementById('battle-timer-text').innerText = battleState.timeLeft;
    document.getElementById('battle-timer-bar').style.width = (battleState.timeLeft / 15 * 100) + "%";

    // Player Status
    document.getElementById('battle-player-name').innerText = gameData.name;
    document.getElementById('battle-player-hp').style.width = (gameData.hp / gameData.maxHp * 100) + "%";
    document.getElementById('battle-player-hp-text').innerText = `${gameData.hp}/${gameData.maxHp}`;
    
    // Monster Status
    const mon = battleState.monster;
    document.getElementById('battle-monster-name').innerText = mon.name;
    document.getElementById('monster-img').innerText = (mon.id === 'dummy') ? '🪵' : '👾'; // เปลี่ยนรูปตาม ID
    document.getElementById('battle-monster-hp').style.width = (mon.hp / mon.maxHp * 100) + "%";
    document.getElementById('battle-monster-hp-text').innerText = `${mon.hp}/${mon.maxHp}`;
}

// Helper: บันทึก Log
function logBattle(msg) {
    const logBox = document.getElementById('battle-log');
    const p = document.createElement('div');
    p.innerText = msg;
    logBox.prepend(p); // ข้อความใหม่ขึ้นบนสุด
}

// Helper: เปิดเมนูสกิล
window.openSkillMenu = () => {
    const panel = document.getElementById('battle-skill-panel');
    panel.innerHTML = ''; // เคลียร์เก่า
    panel.style.display = 'block';

    // วนลูปหาสกิลที่มี
    // (ตัวอย่างนี้ดึงจาก GameData เลย แต่จริงๆ ควรเช็คว่าผู้เล่นเรียนสกิลรึยัง)
    for (const [id, skill] of Object.entries(skills)) {
        const btn = document.createElement('button');
        btn.className = 'battle-btn'; // ใช้ style ปุ่มเดิม
        btn.style.width = '100%';
        btn.style.marginTop = '5px';
        btn.style.fontSize = '12px';
        btn.innerHTML = `${skill.icon} ${skill.name} (${skill.mpCost} MP)`;
        btn.onclick = () => window.battleAction('skill', id);
        panel.appendChild(btn);
    }
};