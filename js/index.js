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
    if (buffInterval) clearInterval(buffInterval); 

    buffInterval = setInterval(async () => {
        if (!gameData.activeBuffs) return;

        // เรียก Logic เช็คเวลาตามปกติ
        const result = GameLogic.checkBuffs(gameData);
        
        // อัปเดตหน้าจอส่วน Buff ให้เวลาวิ่ง (UI เท่านั้น)
        UI.renderBuffs(gameData.activeBuffs);

        // ถ้าบัพหมดอายุ (hasChanged = true)
        if (result.hasChanged) {
            gameData = result.newData; // อัปเดตข้อมูลในแรม (Stat ผู้เล่นจะลดลงตามจริง)
            UI.updateGameScreen(gameData); // อัปเดตค่าพลังบนหน้าจอ
            
            // ✅ ส่วนที่แก้ไข: เช็คว่า "ไม่ได้" กำลังต่อสู้ ถึงจะบันทึก
            // ถ้ากำลังสู้ (battleState มีค่า) เราจะปล่อยผ่านไปก่อน 
            // รอไปบันทึกทีเดียวตอนจบการต่อสู้ (checkWinCondition / monsterAttack)
            if (!battleState) {
                await saveToFirebase();
            }
        }
        
    }, 1000);
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

// 3. สลับเทิร์น
function switchTurn() {
    if (!battleState) return;

    battleState.turn = (battleState.turn === 'player') ? 'enemy' : 'player';
    battleState.timeLeft = 15;

    logBattle(`⏳ เปลี่ยนเทิร์น: ${(battleState.turn === 'player') ? "ตาของคุณ!" : "ตาของศัตรู!"}`);
    
    if (battleState.turn === 'player') {
        battleState.playerTurnCount = (battleState.playerTurnCount || 0) + 1;

        if (battleState.playerTurnCount % 3 === 0) {
            const hpRegen = gameData.hpRegen || 1;
            const maxMp = gameData.maxMp || 100;
            const mpRegen = gameData.mpRegen || Math.floor(maxMp * 0.05) || 1;

            gameData.hp = Math.min(gameData.maxHp, gameData.hp + hpRegen);
            gameData.mp = Math.min(maxMp, gameData.mp + mpRegen);
            logBattle(`✨ ฟื้นฟูอัตโนมัติ: +${hpRegen} HP, +${mpRegen} MP`);
        }
    } else {
        battleState.enemyTurnCount = (battleState.enemyTurnCount || 0) + 1;

        if (battleState.enemyTurnCount % 3 === 0) {
            const mon = battleState.monster;
            const hpRegen = mon.hpRegen || 1;
            const maxMp = mon.maxMp || 100;
            const mpRegen = Math.floor(maxMp * 0.05) || 1;

            mon.hp = Math.min(mon.maxHp, mon.hp + hpRegen);
            mon.mp = Math.min(maxMp, (mon.mp || 0) + mpRegen);
            logBattle(`👾 ศัตรูฟื้นฟูอัตโนมัติ`);
        }
        setTimeout(monsterAttack, 1000);
    }
    updateBattleUI();
}
// 4. การกระทำของผู้เล่น (โจมตี / สกิล / หนี)
window.battleAction = async (action, skillId = null) => {
    // ห้ามกดถ้าระบบยังไม่พร้อม หรือไม่ใช่ตาเรา
    if (!battleState || battleState.turn !== 'player') return;

    try {
        if (action === 'attack') {
            // ✅ ใช้ GameLogic คำนวณดาเมจ (Player -> Monster)
            const result = GameLogic.calculateBattleDamage(gameData, battleState.monster);
            
            battleState.monster.hp -= result.damage;
            
            // ✅ แก้ไข: เช็คว่าตีโดนหรือไม่ (Miss)
            if (result.damage === 0 && result.text) {
                 logBattle(`💨 ${result.text} (คุณโจมตีพลาด!)`);
            } else {
                let icon = "⚔️";
                if (result.isCrit) icon = "💥 CRITICAL!";
                
                // เพิ่มข้อความถ้าถูกบล็อก
                let blockText = result.isBlocked ? "(ถูกบล็อก!)" : "";

                logBattle(`${icon} คุณโจมตี ${result.damage} ดาเมจ! ${blockText}`);
            }
            
            await checkWinCondition(); 
            switchTurn(); 

        } else if (action === 'skill') {
            const skill = skills[skillId];
            if (!skill) return;

            // ใช้สกิล (GameLogic จะจัดการเรื่อง MP/Cooldown)
            gameData = GameLogic.useSkill(gameData, skillId);

            if (skill.effect && skill.effect.damage) {
                // กรณีสกิลทำดาเมจ
                battleState.monster.hp -= skill.effect.damage;
                logBattle(`✨ ใช้สกิล ${skill.name} ทำดาเมจ ${skill.effect.damage}!`);
            } else if (skill.buff) {
                logBattle(`💪 ใช้สกิล ${skill.name} เพิ่ม ${skill.buff.type.toUpperCase()}!`);
            } else if (skill.effect && skill.effect.hp) {
                logBattle(`💚 ใช้สกิล ${skill.name} ฟื้นฟู HP!`);
            }

            updateBattleUI(); 
            await checkWinCondition(); 
            switchTurn(); 

        } else if (action === 'run') {
            // --- 🏃 หนี ---
            clearInterval(battleTimer);
            
            // ✅ ล้างบัพสกิลทิ้งก่อนออก
            clearBattleBuffs();

            battleState = null;
            
            let msg = "🏃 คุณหนีจากการต่อสู้!";
            let isDead = false;

            // สุ่ม 10% สะดุดล้ม
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
        await UI.alert("⚠️ ผิดพลาด", `<div style="text-align:center;">${e.message}</div>`);
    }
};
// 5. มอนสเตอร์โจมตีคืน
async function monsterAttack() {
    if (!battleState || battleState.turn !== 'enemy') return;

    // ✅ ใช้ GameLogic คำนวณดาเมจ (Monster -> Player)
    const result = GameLogic.calculateBattleDamage(battleState.monster, gameData);
    
    gameData.hp -= result.damage;
    
    // ✅ แก้ไข: เช็คว่าผู้เล่นหลบได้หรือไม่ (Miss)
    if (result.damage === 0 && result.text) {
        logBattle(`🍃 ${result.text} (คุณหลบการโจมตีได้!)`);
    } else {
        let icon = "👾";
        if (result.isCrit) icon = "💥";
        
        // เช็คว่าผู้เล่นบล็อกได้หรือไม่
        let blockText = result.isBlocked ? "(คุณบล็อกได้!)" : "";
        
        logBattle(`${icon} มอนสเตอร์โจมตี ${result.damage} ดาเมจ! ${blockText}`);
    }

    if (gameData.hp <= 0) {
        // --- 💀 กรณีผู้เล่นตาย ---
        gameData.hp = 0;
        clearInterval(battleTimer);

        const lostExp = Math.floor(gameData.exp * 0.10); 
        gameData.exp = Math.max(0, gameData.exp - lostExp);

        // ✅ ล้างบัพสกิลทิ้งเมื่อตาย
        clearBattleBuffs();

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

        // ✅ เรียกใช้ฟังก์ชันล้างบัพสกิลทิ้ง (ก่อนบันทึก)
        clearBattleBuffs();

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

window.showMonsterInfo = async () => {
    if (!battleState || !battleState.monster) return;
    
    const m = battleState.monster;
    
    const curHp = Math.max(0, m.hp);
    const maxHp = m.maxHp;
    const curMp = (m.mp !== undefined) ? Math.floor(m.mp) : (m.maxMp || 0);
    const maxMp = m.maxMp || (m.int * 10) || 100;
    
    const hpRegen = m.hpRegen || Math.floor(maxHp * 0.05) || 0;
    const mpRegen = m.mpRegen || Math.floor(maxMp * 0.05) || 0;

    const infoHTML = `
        <div style="text-align: left; padding: 10px; font-size: 14px; line-height: 1.6;">
            <div style="display:flex; gap:15px; margin-bottom:15px; align-items:center; background:rgba(255,255,255,0.05); padding:10px; border-radius:8px;">
                <img src="${m.img}" style="width:60px; height:60px; object-fit:contain;">
                <div>
                    <div style="font-size:18px; font-weight:bold; color:#e74c3c;">${m.name}</div>
                    <div style="font-size:12px; color:#aaa;">ID: ${m.id}</div>
                </div>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                <div>❤️ HP: <b style="color:#fff">${curHp}/${maxHp}</b></div>
                <div>🌱 Regen: <b style="color:#2ecc71">+${hpRegen}</b>/3T</div>
                
                <div>💧 MP: <b style="color:#fff">${curMp}/${maxMp}</b></div>
                <div>✨ Regen: <b style="color:#3498db">+${mpRegen}</b>/3T</div>

                <div style="margin-top:5px;">⚔️ STR: <b style="color:#e67e22">${m.str}</b></div>
                <div style="margin-top:5px;">🔥 INT: <b style="color:#9b59b6">${m.int}</b></div>
                <div>💨 AGI: <b style="color:#2ecc71">${m.agi}</b></div>
                <div>🛡️ DEF: <b style="color:#95a5a6">${m.def}</b></div>
            </div>

            <div style="margin-top: 15px; padding-top: 10px; border-top: 1px dashed #555; display:grid; grid-template-columns: 1fr 1fr; gap:5px; font-size:12px;">
                <div>⚡ Crit Rate: <b style="color:#f1c40f">${m.critRate || 0}%</b></div>
                <div>💥 Crit Dmg: <b style="color:#e74c3c">${m.critDmg || 150}%</b></div>
                
                <div>🎯 Acc: <b style="color:#e91e63">${m.acc || 0}%</b></div>
                <div>🍃 Dodge: <b style="color:#2ecc71">${m.dodge || 0}%</b></div>

                <div>🛡️ Block: <b style="color:#fff">${m.block || 0}%</b></div>
                <div>💢 Pierce: <b style="color:#c0392b">${m.ignoreBlock || 0}%</b></div>
                
                <div>🛡️ Dmg Red: <b style="color:#95a5a6">${m.dmgRed || 0}</b></div>
            </div>
            
            <div style="margin-top: 15px; background:rgba(0,0,0,0.3); padding:8px; border-radius:5px; text-align:center;">
                💰 รางวัล: <span style="color:gold">${m.gold} G</span> | <span style="color:#3498db">${m.exp} EXP</span>
            </div>
        </div>
    `;

    await UI.alert("👾 ข้อมูลศัตรู", infoHTML);
};

// 7. อัปเดต UI หน้าจอต่อสู้
function updateBattleUI() {
    if (!battleState) return;

    const now = Date.now();

    // --- 1. Header & Timer (ส่วนหัวและเวลานับถอยหลัง) ---
    const turnBadge = document.getElementById('turn-badge');
    if(turnBadge) {
        turnBadge.innerText = (battleState.turn === 'player') ? "YOUR TURN" : "ENEMY TURN";
        turnBadge.className = `turn-badge ${battleState.turn}`;
    }
    
    document.getElementById('battle-timer-text').innerText = battleState.timeLeft;
    document.getElementById('battle-timer-bar').style.width = (battleState.timeLeft / 15 * 100) + "%";

    // --- 2. Player Status (สถานะผู้เล่น) ---
    document.getElementById('battle-player-name').innerText = gameData.name;
    
    // HP Player
    const pHpPct = Math.max(0, (gameData.hp / gameData.maxHp * 100));
    document.getElementById('battle-player-hp').style.width = pHpPct + "%";
    document.getElementById('battle-player-hp-text').innerText = `${gameData.hp}/${gameData.maxHp}`;
    
    // MP Player
    const maxMp = gameData.maxMp || ((gameData.baseMp || 0) + (gameData.int * 10));
    const pMpPct = Math.max(0, (gameData.mp / maxMp * 100));
    document.getElementById('battle-player-mp').style.width = pMpPct + "%";
    document.getElementById('battle-player-mp-text').innerText = `${Math.floor(gameData.mp)}/${maxMp}`;

    if (classStats && gameData.classKey && classStats[gameData.classKey]) {
        const playerImg = document.getElementById('battle-player-img');
        if (playerImg) playerImg.src = classStats[gameData.classKey].img;
    }

    // --- 3. Monster Status (สถานะมอนสเตอร์) ---
    const mon = battleState.monster;
    
    // ชื่อและรูปภาพ (คลิกดู Info ได้)
    const monNameEl = document.getElementById('battle-monster-name');
    monNameEl.innerText = mon.name;
    monNameEl.style.cursor = "pointer";
    monNameEl.onclick = showMonsterInfo;

    const monImg = document.getElementById('battle-monster-img');
    if (monImg) {
        monImg.src = mon.img || 'image/dummy.png';
        monImg.onclick = showMonsterInfo;
        monImg.title = "คลิกเพื่อดูข้อมูล";
    }
    
    // Monster HP
    const mHpPct = Math.max(0, (mon.hp / mon.maxHp * 100));
    document.getElementById('battle-monster-hp').style.width = mHpPct + "%";
    document.getElementById('battle-monster-hp-text').innerText = `${mon.hp}/${mon.maxHp}`;

    // Monster MP
    const mMaxMp = mon.maxMp || (mon.int * 10) || 100; 
    const mMp = (mon.mp !== undefined) ? mon.mp : mMaxMp;
    const mMpPct = Math.max(0, (mMp / mMaxMp * 100));

    const mMpBar = document.getElementById('battle-monster-mp');
    const mMpText = document.getElementById('battle-monster-mp-text');
    if (mMpBar) mMpBar.style.width = mMpPct + "%";
    if (mMpText) mMpText.innerText = `${Math.floor(mMp)}/${mMaxMp}`;

    // Monster Buffs Display
    const mBuffDiv = document.getElementById('battle-monster-buffs');
    if (mBuffDiv) {
        const activeBuffs = mon.activeBuffs || {};

        for (const [k, buff] of Object.entries(activeBuffs)) {
            if (buff.expiresAt > now) {
                const timeLeft = (buff.expiresAt > 9999999999000) ? "∞" : Math.ceil((buff.expiresAt - now)/1000) + "s";
                
                let buffEl = mBuffDiv.querySelector(`.monster-buff-item[data-key="${k}"]`);
                
                if (!buffEl) {
                    buffEl = document.createElement('div');
                    buffEl.className = 'monster-buff-item';
                    buffEl.dataset.key = k;
                    buffEl.innerHTML = `
                        <span>${buff.icon || '💀'}</span>
                        <div class="buff-tooltip">
                            <span class="tooltip-header">${buff.itemName}</span>
                            <div class="tooltip-desc">
                                เพิ่ม ${buff.type.toUpperCase()} +${buff.value}<br>
                                <span style="color:#aaa; font-size:10px;">(เหลือเวลา <span class="t-left">${timeLeft}</span>)</span>
                            </div>
                        </div>
                    `;
                    mBuffDiv.appendChild(buffEl);
                } else {
                    const timeSpan = buffEl.querySelector('.t-left');
                    if(timeSpan) timeSpan.innerText = timeLeft;
                }
            }
        }
    }

    // --- 4. Cooldown & MP Check (✅ ส่วนที่แก้ไขใหม่) ---
    const cooldowns = gameData.skillCooldowns || {};
    
    for (const [id, skill] of Object.entries(skills)) {
        // หาปุ่มสกิลตาม ID (ต้องตรงกับที่สร้างใน renderBattleSkills)
        const btn = document.getElementById(`btn-skill-${id}`);
        
        if (btn) {
            const readyTime = cooldowns[id] || 0;
            const overlay = btn.querySelector('.cooldown-overlay');
            
            // 4.1 เช็ค Cooldown: แสดงตัวเลขและ Overlay
            if (now < readyTime) {
                const timeLeft = Math.ceil((readyTime - now) / 1000);
                
                btn.classList.add('cooldown');
                if(overlay) {
                    overlay.style.display = 'flex';
                    overlay.innerText = timeLeft; // แสดงตัวเลขวินาที
                }
            } else {
                btn.classList.remove('cooldown');
                if(overlay) overlay.style.display = 'none';
            }

            // 4.2 เช็ค MP: ถ้าไม่พอให้ทำเป็นสีขาว-ดำ (Grayscale)
            if (gameData.mp < skill.mpCost) {
                btn.classList.add('no-mp');
            } else {
                btn.classList.remove('no-mp');
            }
        }
    }

    // --- 5. Player Buffs (บัพผู้เล่น) ---
    const buffDiv = document.getElementById('battle-buffs');
    if (buffDiv) {
        const activeBuffs = gameData.activeBuffs || {};
        
        // ลบบัพที่หมดอายุออกจากหน้าจอ
        Array.from(buffDiv.children).forEach(child => {
            const key = child.dataset.key;
            if (!activeBuffs[key] || activeBuffs[key].expiresAt <= now) child.remove();
        });

        // แสดงบัพที่มีอยู่
        for (const [key, buff] of Object.entries(activeBuffs)) {
            if (buff.expiresAt > now) {
                const timeLeft = Math.ceil((buff.expiresAt - now) / 1000);
                let timeString = (timeLeft >= 60) ? `${Math.floor(timeLeft/60)}m` : `${timeLeft}s`;

                let buffEl = buffDiv.querySelector(`.buff-item[data-key="${key}"]`);
                if (!buffEl) {
                    buffEl = document.createElement('div');
                    buffEl.className = 'buff-item';
                    buffEl.dataset.key = key;
                    buffEl.innerHTML = `<span>${buff.icon||'✨'}</span><span class="buff-timer">${timeString}</span><div class="buff-tooltip"></div>`;
                    buffDiv.appendChild(buffEl);
                }

                buffEl.querySelector('.buff-timer').innerText = timeString;
                
                const tooltip = buffEl.querySelector('.buff-tooltip');
                if(tooltip) {
                     tooltip.innerHTML = `<span class="tooltip-header">${buff.itemName}</span><div class="tooltip-desc">เพิ่ม ${buff.type.toUpperCase()} +${buff.value}<br><span style="color:#aaa; font-size:10px;">(${timeString})</span></div>`;
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
    const monsterTemplate = monsters[monsterId];
    if (!monsterTemplate) return alert("ไม่พบข้อมูลมอนสเตอร์: " + monsterId);

    const battleScreen = document.getElementById('battle-screen');
    if (bgImage) {
        battleScreen.style.backgroundImage = `url('${bgImage}')`;
    } else {
        battleScreen.style.backgroundImage = `url('image/world_map.png')`; 
    }

    // Clone ข้อมูลมอนสเตอร์ และ activeBuffs
    let monsterInstance = { 
        ...monsterTemplate,
        activeBuffs: JSON.parse(JSON.stringify(monsterTemplate.activeBuffs || {})) 
    };

    // ✅ คำนวณบัพติดตัว (Passive) ใส่เข้าไปในสเตตัสมอนสเตอร์ทันที
    // เพื่อให้ค่าพลัง (เช่น DEF, STR) ถูกบวกเพิ่มจริงๆ ก่อนเริ่มสู้
    if (monsterInstance.activeBuffs) {
        for (const buff of Object.values(monsterInstance.activeBuffs)) {
            // เช็คว่ามีค่า stat นี้ในตัวมอนสเตอร์ไหม ถ้ามีให้บวกเพิ่ม
            if (monsterInstance[buff.type] !== undefined) {
                monsterInstance[buff.type] += buff.value;
            }
        }
    }

    battleState = {
        turn: 'player', 
        timeLeft: 15,
        monster: monsterInstance, 
        logs: [],
        playerTurnCount: 1,
        enemyTurnCount: 1
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
        // ถ้าไม่มีการต่อสู้แล้ว ให้หยุดเวลา
        if (!battleState) return clearInterval(battleTimer);

        // 1. ลดเวลาเทิร์น
        battleState.timeLeft--;

        // 2. ✅ เพิ่ม: เช็คเวลาบัพของมอนสเตอร์ (Real-time)
        // ใช้ GameLogic ช่วยคำนวณเหมือนของผู้เล่น
        if (battleState.monster && battleState.monster.activeBuffs) {
            const result = GameLogic.checkBuffs(battleState.monster);
            
            if (result.hasChanged) {
                // ถ้าบัพหมดอายุ ให้อัปเดตค่ามอนสเตอร์ทันที (เช่น เกราะกลับมาเท่าเดิม)
                battleState.monster = result.newData;
                
                // (Optional) อาจจะ Log บอกผู้เล่นว่าบัพมอนสเตอร์หมดแล้ว
                // logBattle("บัพของศัตรูหมดลงแล้ว!");
            }
        }

        // 3. อัปเดตหน้าจอ
        updateBattleUI();

        // 4. ถ้าหมดเวลาเทิร์น ให้สลับฝั่ง
        if (battleState.timeLeft <= 0) {
            switchTurn();
        }
    }, 1000);
}


function renderBattleSkills() {
    const grid = document.getElementById('battle-skills-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const availableSkills = [];
    for (const [id, skill] of Object.entries(skills)) {
        if (!skill.classReq || skill.classReq === gameData.classKey) {
            availableSkills.push({ id, ...skill });
        }
    }

    const maxSlots = 6;
    
    for (let i = 0; i < maxSlots; i++) {
        const slot = document.createElement('div');
        
        if (i < availableSkills.length) {
            const skill = availableSkills[i];
            
            slot.className = 'battle-skill-slot';
            slot.id = `btn-skill-${skill.id}`;
            
            slot.innerHTML = `
                <div>${skill.icon}</div>
                <div class="skill-cost">${skill.mpCost}</div>
                <div class="cooldown-overlay" style="display:none;"></div>
            `;
            
            if(typeof UI.bindTooltip === 'function') {
                UI.bindTooltip(slot, {
                    name: skill.name,
                    desc: skill.desc,
                    type: "Skill",
                    icon: skill.icon,
                    price: `${skill.mpCost} MP`,
                    buff: skill.buff,
                    effect: skill.effect
                });
            }

            slot.onclick = () => window.battleAction('skill', skill.id);

        } else {
            slot.className = 'battle-skill-slot empty';
        }

        grid.appendChild(slot);
    }
}

function clearBattleBuffs() {
    if (!gameData.activeBuffs) return;

    const persistentBuffs = {};

    for (const [key, buff] of Object.entries(gameData.activeBuffs)) {
        // ✅ เก็บไว้เฉพาะบัพที่ "ไม่ใช่" battleOnly (เช่น บัพจากยา)
        if (!buff.isBattleOnly) {
            persistentBuffs[key] = buff;
        } else {
            // ถ้าเป็นบัพต่อสู้ ให้ลบ Stat ที่เพิ่มไว้ออกด้วย เพื่อความถูกต้อง
            if (gameData[buff.type] !== undefined) {
                 gameData[buff.type] -= buff.value;
            }
        }
    }

    // อัปเดตรายการบัพให้เหลือแต่ของถาวร
    gameData.activeBuffs = persistentBuffs;
}