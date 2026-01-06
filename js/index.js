// js/index.js

// 1. นำเข้า Firebase จากไฟล์ที่เราเพิ่งสร้าง (สะอาดขึ้นเยอะ!)
import { db, auth, provider, doc, setDoc, getDoc, signInWithPopup, onAuthStateChanged, signOut } from "./firebase-init.js";

// 2. นำเข้าข้อมูลอาชีพ
import { classStats } from "./gameData.js";

let currentUser = null;
let gameData = {}; 
let selectedClassKey = null;

// --- ระบบ Auth ---
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
        document.getElementById('user-info-top').style.display = 'block';
        await checkAndLoadData(user.uid);
    } else {
        document.getElementById('login-screen').style.display = 'block';
        document.getElementById('create-screen').style.display = 'none';
        document.getElementById('game-screen').style.display = 'none';
        document.getElementById('user-info-top').style.display = 'none';
    }
});

// --- ระบบโหลด/สร้างตัวละคร ---
async function checkAndLoadData(uid) {
    setStatus("กำลังตรวจสอบข้อมูลฮีโร่...", "");
    const docRef = doc(db, "players", uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        gameData = docSnap.data();
        enterGame();
        setStatus("ยินดีต้อนรับกลับมา!", "success");
        setTimeout(() => setStatus("", ""), 2000); // ซ่อนข้อความต้อนรับ
    } else {
        document.getElementById('create-screen').style.display = 'block';
        setStatus("โปรดสร้างตัวละครของท่าน", "");
    }
}

window.selectClass = function(key) {
    selectedClassKey = key;
    document.querySelectorAll('.class-card').forEach(el => el.classList.remove('selected'));
    document.getElementById('card-' + key).classList.add('selected');
    
    const stats = classStats[key];
    document.getElementById('class-desc').innerText = stats.desc;

    // พรีวิวสเตตัส
    document.getElementById('pre-hp').innerText = stats.maxHp;
    document.getElementById('pre-str').innerText = stats.str;
    document.getElementById('pre-int').innerText = stats.int;
    document.getElementById('pre-agi').innerText = stats.agi;
    document.getElementById('class-preview').style.display = 'block';

    // พรีวิวรูป
    const imgEl = document.getElementById('preview-img');
    imgEl.src = stats.img;
    imgEl.style.display = 'inline-block';
}

window.confirmCreate = async function() {
    const nameInput = document.getElementById('hero-name').value.trim();
    if (!nameInput) return alert("กรุณาตั้งชื่อตัวละคร!");
    if (!selectedClassKey) return alert("กรุณาเลือกอาชีพ!");

    setStatus("กำลังจารึกชื่อผู้กล้า...", "");
    const baseStats = classStats[selectedClassKey];

    gameData = {
        name: nameInput,
        classKey: selectedClassKey,
        className: baseStats.name,
        lvl: 1,
        gold: 0,
        hp: baseStats.hp,
        maxHp: baseStats.maxHp,
        str: baseStats.str,
        int: baseStats.int,
        agi: baseStats.agi
    };

    try {
        await setDoc(doc(db, "players", currentUser.uid), gameData);
        document.getElementById('create-screen').style.display = 'none';
        enterGame();
        setStatus("สร้างตัวละครสำเร็จ!", "success");
    } catch (e) {
        alert("Error: " + e.message);
    }
}

function enterGame() {
    document.getElementById('game-screen').style.display = 'block';
    updateUI();
}

// --- ระบบเกม (Auto Save) ---

// 1. ฝึกดาบ
window.train = async function() {
    gameData.lvl++;
    gameData.maxHp += 10;
    gameData.str += 1;
    gameData.hp = gameData.maxHp; // เลเวลอัปเลือดเต็ม
    
    updateUI();
    await saveData(); // ✅ บันทึกทันที
};

// 2. รับภารกิจ
window.farm = async function() {
    gameData.gold += 100;
    
    updateUI();
    await saveData(); // ✅ บันทึกทันที
};

// ฟังก์ชันบันทึก (ทำงานเงียบๆ)
window.saveData = async function() {
    if (!currentUser) return;
    setStatus("กำลังบันทึก...", ""); 
    try {
        await setDoc(doc(db, "players", currentUser.uid), gameData);
        setStatus("✅ บันทึกอัตโนมัติเรียบร้อย", "success");
        setTimeout(() => setStatus("", ""), 1500); // หายไปเองเร็วขึ้นนิดนึง
    } catch (e) {
        setStatus("❌ บันทึกไม่ได้: " + e.message, "error");
    }
};

// --- UI Helper ---
function updateUI() {
    document.getElementById('display-name').innerText = gameData.name;
    document.getElementById('display-class').innerText = gameData.className;

    if(gameData.classKey && classStats[gameData.classKey]) {
        document.getElementById('hero-img').src = classStats[gameData.classKey].img;
    }

    document.getElementById('lvl').innerText = gameData.lvl;
    document.getElementById('gold').innerText = gameData.gold;
    document.getElementById('hp').innerText = gameData.hp;
    document.getElementById('maxHp').innerText = gameData.maxHp;
    document.getElementById('str').innerText = gameData.str;
    document.getElementById('int').innerText = gameData.int;
    document.getElementById('agi').innerText = gameData.agi;

    const hpPercent = (gameData.hp / gameData.maxHp) * 100;
    document.getElementById('hp-bar-fill').style.width = hpPercent + "%";
}

function setStatus(msg, type) {
    const el = document.getElementById('status');
    if(el) {
        el.innerText = msg;
        el.className = type;
    }
}

window.toggleHUD = function() {
    document.getElementById('char-status-panel').classList.toggle('expanded');
};