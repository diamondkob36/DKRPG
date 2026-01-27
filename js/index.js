// js/index.js

import { db, auth, provider, doc, setDoc, getDoc, signInWithPopup, onAuthStateChanged, signOut } from "./firebase-init.js";
import { GameLogic } from "./game-logic.js"; // 🧠 นำเข้าสมอง
import { UI } from "./ui.js";                // 🎨 นำเข้าหน้าตา
import { items, monsters, skills, classStats } from "./gameData.js"; // ✅ เพิ่ม classStats เข้าไป

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
        gameData = GameLogic.useSkill(gameData, skillId);
        UI.updateGameScreen(gameData);
        await saveToFirebase();
    } catch (e) {
        // ✅ Popup แจ้งเตือนเมื่อกดใช้สกิลไม่ได้
        await UI.alert(
            "ร่ายเวทย์ล้มเหลว", 
            `<div style="text-align:center;">
                <span style="font-size:30px;">🔮</span><br>
                <span style="color:#f1c40f;">${e.message}</span>
             </div>`
        );
    }
};

// 1. เริ่มการต่อสู้
window.startBattle = (monsterId, bgImage = null) => {
    const monsterTemplate = monsters[monsterId];
    if (!monsterTemplate) return alert("ไม่พบข้อมูลมอนสเตอร์: " + monsterId);

    const battleScreen = document.getElementById('battle-screen');
    if (bgImage) {
        battleScreen.style.backgroundImage = `url('${bgImage}')`;
    } else {
        battleScreen.style.backgroundImage = `url('image/world_map.png')`; 
    }

    battleState = {
        turn: 'player', 
        timeLeft: 15,
        monster: { ...monsterTemplate }, 
        logs: [],
        
        // ✅ แก้ไข: เริ่มนับที่ 1 เพื่อให้การคำนวณรอบแม่นยำขึ้น
        playerTurnCount: 1 
    };

    UI.showScreen('battle-screen');
    renderBattleSkills(); 
    updateBattleUI();
    runBattleTimer();
};

// 2. ตัวนับเวลา
function runBattleTimer() {
    if (battleTimer) clearInterval(battleTimer);
    battleTimer = setInterval(() => {
        if (!battleState) return clearInterval(battleTimer);

        battleState.timeLeft--;
        updateBattleUI();

        if (battleState.timeLeft <= 0) {
            switchTurn();
        }
    }, 1000);
}

// 3. สลับเทิร์น
function switchTurn() {
    if (!battleState) return;

    battleState.turn = (battleState.turn === 'player') ? 'enemy' : 'player';
    battleState.timeLeft = 15;

    const turnName = (battleState.turn === 'player') ? "ตาของคุณ!" : "ตาของศัตรู!";
    logBattle(`⏳ เปลี่ยนเทิร์น: ${turnName}`);
    
    // ✅ Logic รีเจ้นท์ (ทำงานเฉพาะเมื่อวนกลับมาตาเรา)
    if (battleState.turn === 'player') {
        
        // ป้องกันค่าเป็น undefined
        if (!battleState.playerTurnCount) battleState.playerTurnCount = 0;

        // บวกเทิร์นเพิ่ม
        battleState.playerTurnCount++;

        // เช็คว่าหาร 3 ลงตัวไหม (รอบที่ 3, 6, 9...)
        if (battleState.playerTurnCount % 3 === 0) {
            
            // ป้องกันกรณีตัวละครเก่าไม่มีค่า Regen ให้ใช้ Default = 1
            const hpRegen = gameData.hpRegen || Math.floor(gameData.maxHp * 0.05) || 1;
            const mpRegen = gameData.mpRegen || Math.floor((gameData.int * 10) * 0.05) || 1;
            const maxMp = (gameData.int * 10) || 10;

            let msg = `✨ ครบ 3 เทิร์น: `;
            let hasRegen = false;

            // ฟื้นฟู HP (ถ้าเลือดไม่เต็ม)
            if (gameData.hp < gameData.maxHp) {
                gameData.hp = Math.min(gameData.maxHp, gameData.hp + hpRegen);
                msg += `+${hpRegen} HP `;
                hasRegen = true;
            }
            
            // ฟื้นฟู MP (ถ้ามานาไม่เต็ม)
            if (gameData.mp < maxMp) {
                gameData.mp = Math.min(maxMp, gameData.mp + mpRegen);
                msg += `+${mpRegen} MP`;
                hasRegen = true;
            }

            // แสดง Log เมื่อมีการฟื้นฟู
            if (hasRegen) logBattle(msg);
        }
    }
    
    // AI Action
    if (battleState.turn === 'enemy') {
        setTimeout(monsterAttack, 1000);
    }
    updateBattleUI();
}
// 4. การกระทำของผู้เล่น (โจมตี / สกิล / หนี)
window.battleAction = async (action, skillId = null) => {
    if (!battleState || battleState.turn !== 'player') return;

    try { // ✅ ใช้ try-catch ครอบเพื่อดัก Error (เช่น MP ไม่พอ)

        if (action === 'attack') {
            const dmg = Math.max(1, gameData.str * 2 - battleState.monster.def);
            battleState.monster.hp -= dmg;
            logBattle(`⚔️ คุณโจมตี ${dmg} ดาเมจ!`);
            await checkWinCondition(); // ✅ ใส่ await
            switchTurn(); 

        } else if (action === 'skill') {
            const skill = skills[skillId];
            if (!skill) return;

            // ⚠️ จุดนี้ถ้า MP ไม่พอ GameLogic จะ throw Error ออกมา
            gameData = GameLogic.useSkill(gameData, skillId);

            if (skill.effect && skill.effect.damage) {
                battleState.monster.hp -= skill.effect.damage;
                logBattle(`✨ ใช้สกิล ${skill.name} ทำดาเมจ ${skill.effect.damage}!`);
            } else if (skill.buff) {
                logBattle(`💪 ใช้สกิล ${skill.name} เพิ่ม ${skill.buff.type.toUpperCase()}!`);
            } else if (skill.effect && skill.effect.hp) {
                logBattle(`💚 ใช้สกิล ${skill.name} ฟื้นฟู HP!`);
            }

            updateBattleUI(); 
            await checkWinCondition(); // ✅ ใส่ await
            switchTurn(); 

        } else if (action === 'run') {
            clearInterval(battleTimer);
            battleState = null;
            
            let msg = "🏃 คุณหนีจากการต่อสู้!";
            let isDead = false;

            if (Math.random() < 0.1) {
                const damagePenalty = Math.floor(gameData.maxHp * 0.10); 
                gameData.hp -= damagePenalty; 
                msg += `\n💥 แต่สะดุดล้ม! เสียเลือด ${damagePenalty} หน่วย`;

                if (gameData.hp <= 0) {
                    isDead = true;
                    msg += `\n💀 (บาดเจ็บสาหัส...)`;
                }
            }
            
            logBattle(msg);
            
            setTimeout(async () => {
                if (isDead) {
                    gameData.hp = 0;
                    const lostExp = Math.floor(gameData.exp * 0.10); 
                    gameData.exp = Math.max(0, gameData.exp - lostExp);

                    // ✅ Popup ตายตอนหนี
                    await UI.alert(
                        "💀 อุบัติเหตุ!",
                        `<div style="text-align:center;">
                            <span style="font-size:40px;">🤕</span><br>
                            <b>สะดุดล้มหัวฟาดพื้นดับอนาถ...</b><br>
                            <span style="color:#e74c3c;">เสีย ${lostExp} EXP</span>
                         </div>`
                    );
                    
                    gameData.hp = Math.floor(gameData.maxHp * 0.5); 
                }

                UI.showScreen('game-screen');
                UI.updateGameScreen(gameData);
                saveToFirebase(); 
            }, 1000);
        }

    } catch (e) {
        // ✅ ดักจับ Error ทั้งหมด (เช่น MP ไม่พอ, Cooldown) แล้วแสดง Popup
        await UI.alert(
            "⚠️ ผิดพลาด", 
            `<div style="text-align:center;">
                <span style="font-size:30px;">🚫</span><br>
                <b style="color:#f1c40f;">${e.message}</b>
             </div>`
        );
    }
};
// 5. มอนสเตอร์โจมตีคืน
async function monsterAttack() {
    if (!battleState || battleState.turn !== 'enemy') return;

    // คำนวณดาเมจ
    const dmg = Math.max(1, battleState.monster.atk - (gameData.def || 0));
    gameData.hp -= dmg;
    logBattle(`👾 มอนสเตอร์โจมตีคุณ ${dmg} ดาเมจ!`);

    if (gameData.hp <= 0) {
        // --- 💀 กรณีผู้เล่นตาย ---
        gameData.hp = 0;
        clearInterval(battleTimer);

        // หัก EXP 10%
        const lostExp = Math.floor(gameData.exp * 0.10); 
        gameData.exp = Math.max(0, gameData.exp - lostExp);

        // ✅ Popup แจ้งเตือนการตาย
        await UI.alert(
            "💀 พ่ายแพ้...", 
            `<div style="text-align:center; color:#e74c3c;">
                <div style="font-size:50px; margin-bottom:10px;">🪦</div>
                <b style="font-size:18px;">คุณหมดสภาพการต่อสู้!</b><br>
                <span style="color:#aaa; font-size:12px;">ถูกส่งกลับไปยังจุดปลอดภัย...</span><br><br>
                <div style="border:1px solid #e74c3c; padding:5px; border-radius:5px; display:inline-block;">
                    📉 เสียค่าประสบการณ์ <b style="color:#fff;">${lostExp} EXP</b>
                </div>
             </div>`
        );
        
        // บทลงโทษ: ฟื้นเลือดครึ่งหลอด
        gameData.hp = Math.floor(gameData.maxHp * 0.5); 
        
        battleState = null;
        UI.showScreen('game-screen');
        UI.updateGameScreen(gameData);
        saveToFirebase(); 
    } else {
        // ยังไม่ตาย -> สลับเทิร์น
        switchTurn();
    }
    
    updateBattleUI();
}
// 6. เช็คชนะ
async function checkWinCondition() {
    if (battleState.monster.hp <= 0) {
        battleState.monster.hp = 0;
        clearInterval(battleTimer);
        
        const goldGain = battleState.monster.gold;
        const expGain = battleState.monster.exp;
        gameData.gold += goldGain;
        gameData = GameLogic.addExp(gameData, expGain);

        // ✅ เรียกใช้ UI.alert แบบใส่ HTML
        await UI.alert(
            "🏆 ชัยชนะ!", 
            `<div style="text-align:center;">
                <img src="${battleState.monster.img}" style="width:80px; height:80px; object-fit:contain; margin-bottom:10px; filter:drop-shadow(0 0 5px gold);"><br>
                กำจัด <b style="color:#e74c3c; font-size:18px;">${battleState.monster.name}</b> สำเร็จ!<br>
                <div style="background:rgba(255,255,255,0.1); padding:10px; border-radius:8px; margin-top:10px;">
                    ได้รับ: <b style="color:gold">+${goldGain} G</b><br>
                    ได้รับ: <b style="color:#3498db">+${expGain} EXP</b>
                </div>
             </div>`
        );
        
        battleState = null;
        UI.showScreen('game-screen');
        UI.updateGameScreen(gameData);
        saveToFirebase();
    }
}

// 7. อัปเดต UI หน้าจอต่อสู้
function updateBattleUI() {
    if (!battleState) return;

    // --- 1. Header & Timer ---
    const turnBadge = document.getElementById('turn-badge');
    if(turnBadge) {
        turnBadge.innerText = (battleState.turn === 'player') ? "YOUR TURN" : "ENEMY TURN";
        turnBadge.className = `turn-badge ${battleState.turn}`;
    }
    
    document.getElementById('battle-timer-text').innerText = battleState.timeLeft;
    document.getElementById('battle-timer-bar').style.width = (battleState.timeLeft / 15 * 100) + "%";

    // --- 2. Player Status ---
    document.getElementById('battle-player-name').innerText = gameData.name;
    
    // HP
    const pHpPct = Math.max(0, (gameData.hp / gameData.maxHp * 100));
    document.getElementById('battle-player-hp').style.width = pHpPct + "%";
    document.getElementById('battle-player-hp-text').innerText = `${gameData.hp}/${gameData.maxHp}`;
    
    // MP
    const maxMp = (gameData.int * 10) || 10;
    const pMpPct = Math.max(0, (gameData.mp / maxMp * 100));
    document.getElementById('battle-player-mp').style.width = pMpPct + "%";
    document.getElementById('battle-player-mp-text').innerText = `${Math.floor(gameData.mp)}/${maxMp}`;

    // Render รูปตัวละคร
    if (classStats && gameData.classKey && classStats[gameData.classKey]) {
        const playerImg = document.getElementById('battle-player-img');
        if (playerImg) playerImg.src = classStats[gameData.classKey].img;
    }

    // --- 3. Monster Status ---
    const mon = battleState.monster;
    document.getElementById('battle-monster-name').innerText = mon.name;
    const monImg = document.getElementById('battle-monster-img');
    if (monImg) monImg.src = battleState.monster.img || 'image/dummy.png';
    
    const mHpPct = Math.max(0, (mon.hp / mon.maxHp * 100));
    document.getElementById('battle-monster-hp').style.width = mHpPct + "%";
    document.getElementById('battle-monster-hp-text').innerText = `${mon.hp}/${mon.maxHp}`;

    // --- 4. Cooldown Check ---
    const now = Date.now();
    const cooldowns = gameData.skillCooldowns || {};
    
    for (const [id, skill] of Object.entries(skills)) {
        const btn = document.getElementById(`btn-skill-${id}`);
        if (btn) {
            const readyTime = cooldowns[id] || 0;
            if (now < readyTime) {
                btn.classList.add('cooldown');
            } else {
                btn.classList.remove('cooldown');
            }
        }
    }

    // --- 5. Render Buffs (✅ แก้ไขใหม่: สวยงาม + ตรงช่องสกิล + เวลานับถอยหลัง) ---
    const buffDiv = document.getElementById('battle-buffs');
    if (buffDiv) {
        buffDiv.innerHTML = ''; // เคลียร์ของเก่า
        if (gameData.activeBuffs) {
            for (const [k, buff] of Object.entries(gameData.activeBuffs)) {
                if (buff.expiresAt > now) {
                    const timeLeft = Math.ceil((buff.expiresAt - now) / 1000);
                    
                    // สร้างกล่องบัพ
                    const buffEl = document.createElement('div');
                    buffEl.className = 'buff-item';
                    
                    // ไอคอน
                    const iconSpan = document.createElement('span');
                    iconSpan.innerHTML = buff.icon || '✨';
                    buffEl.appendChild(iconSpan);

                    // ✅ ตัวนับเวลาถอยหลัง (ใต้ไอคอน)
                    const timerSpan = document.createElement('span');
                    timerSpan.className = 'buff-timer';
                    timerSpan.innerText = `${timeLeft}s`; // แสดงหน่วยวินาที
                    buffEl.appendChild(timerSpan);

                    // ✅ Tooltip รายละเอียด (แสดงเมื่อ Hover)
                    const tooltip = document.createElement('div');
                    tooltip.className = 'buff-tooltip';
                    
                    // ข้อความอธิบายผลลัพธ์
                    let effectText = `เพิ่ม ${buff.type.toUpperCase()} +${buff.value}`;
                    
                    tooltip.innerHTML = `
                        <span class="tooltip-header">${buff.itemName}</span>
                        <div class="tooltip-desc">
                            ${effectText}<br>
                            <span style="color:#aaa; font-size:10px;">(เหลือเวลา ${timeLeft} วินาที)</span>
                        </div>
                    `;
                    buffEl.appendChild(tooltip);

                    buffDiv.appendChild(buffEl);
                }
            }
        }
    }
}

// Helper: Log
function logBattle(msg) {
    const logBox = document.getElementById('battle-log');
    if(logBox) {
        const p = document.createElement('div');
        p.innerText = msg;
        logBox.prepend(p);
    }
}

// Helper: เมนูสกิล
window.openSkillMenu = () => {
    const panel = document.getElementById('battle-skill-panel');
    if(!panel) return;
    
    panel.innerHTML = ''; 
    panel.style.display = 'block';

    // วนลูปสกิลทั้งหมด (จริงๆ ควรเช็คว่าเรียนรึยัง)
    for (const [id, skill] of Object.entries(skills)) {
        // กรองเอาเฉพาะสกิลอาชีพเรา (หรือสกิลทั่วไป)
        // ถ้าอยากให้โชว์หมดก็เอา if ออก
        if (!skill.classReq || skill.classReq === gameData.classKey) {
            const btn = document.createElement('button');
            btn.className = 'battle-btn'; 
            btn.style.width = '100%';
            btn.style.marginTop = '5px';
            btn.style.fontSize = '12px';
            btn.innerHTML = `${skill.icon} ${skill.name} (${skill.mpCost} MP)`;
            btn.onclick = () => window.battleAction('skill', id);
            panel.appendChild(btn);
        }
    }
};

window.startBattle = (monsterId, bgImage = null) => {
    // ต้องมี monsters import เข้ามาแล้วถึงจะทำงานได้
    const monsterTemplate = monsters[monsterId];
    if (!monsterTemplate) return alert("ไม่พบข้อมูลมอนสเตอร์: " + monsterId);

    // ✅ ตั้งค่าพื้นหลัง (ถ้ามีส่งมา) หรือใช้ค่า Default
    const battleScreen = document.getElementById('battle-screen');
    if (bgImage) {
        battleScreen.style.backgroundImage = `url('${bgImage}')`;
    } else {
        // Default Background (เช่น ลานฝึก)
        battleScreen.style.backgroundImage = `url('image/world_map.png')`; 
    }

    // สร้าง State การต่อสู้
    battleState = {
        turn: 'player', 
        timeLeft: 15,
        monster: { ...monsterTemplate }, 
        logs: []
    };

    UI.showScreen('battle-screen');
    
    // ✅ เรียกฟังก์ชันวาดสกิลครั้งแรก (เตรียมไว้ก่อน)
    renderBattleSkills();
    
    updateBattleUI();
    runBattleTimer();
};

function renderBattleSkills() {
    const grid = document.getElementById('battle-skills-grid');
    if (!grid) return;
    grid.innerHTML = '';

    // 1. ดึงสกิลที่ใช้ได้ออกมาใส่ Array ก่อน
    const availableSkills = [];
    for (const [id, skill] of Object.entries(skills)) {
        // เช็คอาชีพ (ถ้าไม่มี classReq หรือตรงกับอาชีพเรา)
        if (!skill.classReq || skill.classReq === gameData.classKey) {
            availableSkills.push({ id, ...skill });
        }
    }

    // 2. วนลูปสร้างช่องให้ครบ 6 ช่อง (Fixed Slots)
    const maxSlots = 6;
    
    for (let i = 0; i < maxSlots; i++) {
        const slot = document.createElement('div');
        
        // กรณีมีสกิลในลำดับนี้
        if (i < availableSkills.length) {
            const skill = availableSkills[i];
            
            slot.className = 'battle-skill-slot';
            slot.id = `btn-skill-${skill.id}`; // ไอดีสำหรับเช็ค Cooldown
            
            slot.innerHTML = `
                <div>${skill.icon}</div>
                <div class="skill-cost">${skill.mpCost}</div>
            `;
            
            // ใส่ Tooltip
            if(typeof UI.bindTooltip === 'function') {
                UI.bindTooltip(slot, {
                    name: skill.name,
                    desc: skill.desc,
                    type: "Skill",
                    icon: skill.icon,
                    price: "0",
                    buff: skill.buff,
                    effect: skill.effect
                });
            }

            // กดใช้สกิล
            slot.onclick = () => window.battleAction('skill', skill.id);

        } else {
            // กรณีช่องว่าง (Empty Slot)
            slot.className = 'battle-skill-slot empty';
            // ไม่ต้องใส่อะไรข้างใน หรือใส่ icon จางๆ ก็ได้
        }

        grid.appendChild(slot);
    }
}