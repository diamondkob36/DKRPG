import { classStats } from "./gameData.js";

export const UI = {
    // สลับหน้าจอ (Login -> Create -> Game)
    showScreen(screenId) {
        const screens = ['login-screen', 'create-screen', 'game-screen'];
        screens.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.style.display = (id === screenId) ? 'block' : 'none';
        });
    },

    // ซ่อน/โชว์ปุ่ม Logout มุมขวาบน
    toggleAuthButton(show) {
        const el = document.getElementById('user-info-top');
        if(el) el.style.display = show ? 'block' : 'none';
    },

    // อัปเดตข้อมูลบนหน้าจอเกม
    updateGameScreen(gameData) {
        setText('display-name', gameData.name);
        setText('display-class', gameData.className);

        if(gameData.classKey && classStats[gameData.classKey]) {
            document.getElementById('hero-img').src = classStats[gameData.classKey].img;
        }

        // แสดงสเตตัสพื้นฐาน
        ['gold', 'hp', 'maxHp', 'str', 'int', 'agi'].forEach(key => {
            setText(key, gameData[key]);
        });

        // 👇 แก้ไขตรงนี้: แสดง Level คู่กับ Exp 👇
        // ตัวอย่าง: Lv: 5 (80/100)
        const currentExp = gameData.exp || 0;
        const requiredExp = gameData.maxExp || 100;
        setText('lvl', `${gameData.lvl} (${currentExp}/${requiredExp})`);

        // หลอดเลือด
        const hpPercent = (gameData.hp / gameData.maxHp) * 100;
        document.getElementById('hp-bar-fill').style.width = hpPercent + "%";

        // แต้มอัปเกรด
        const points = gameData.statPoints || 0;
        setText('hud-points', points);
        setText('modal-points', points);
        
        // Modal
        setText('modal-str', gameData.str);
        setText('modal-int', gameData.int);
        setText('modal-agi', gameData.agi);
        setText('modal-maxHp', gameData.maxHp);
    },

    // จัดการหน้าเลือกอาชีพ
    selectClass(key) {
        // เปลี่ยนสีการ์ด
        document.querySelectorAll('.class-card').forEach(el => el.classList.remove('selected'));
        document.getElementById('card-' + key).classList.add('selected');
        
        const stats = classStats[key];
        setText('class-desc', stats.desc);

        // พรีวิวสเตตัส
        setText('pre-hp', stats.maxHp);
        setText('pre-str', stats.str);
        setText('pre-int', stats.int);
        setText('pre-agi', stats.agi);
        document.getElementById('class-preview').style.display = 'block';

        // พรีวิวรูป
        const imgEl = document.getElementById('preview-img');
        imgEl.src = stats.img;
        imgEl.style.display = 'inline-block';
    },

    // แจ้งเตือนข้อความ
    setStatus(msg, type) {
        const el = document.getElementById('status');
        if(el) {
            el.innerText = msg;
            el.className = type;
        }
    },

    // เปิด/ปิด HUD
    toggleHUD() {
        document.getElementById('char-status-panel').classList.toggle('expanded');
    }
};

// ฟังก์ชันช่วยใส่ข้อความ (Helper)
function setText(id, text) {
    const el = document.getElementById(id);
    if(el) el.innerText = text;
}