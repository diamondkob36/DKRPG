import { classStats, items } from "./gameData.js";

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

        // 👇✅ เพิ่มบรรทัดนี้ครับ: สั่งให้อัปเดตเงินในร้านค้าด้วย!
        setText('shop-gold', gameData.gold);

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
    },

    // เปิด/ปิด Modal อัปเกรดสเตตัส

    toggleUpgradeModal(show) {
        const el = document.getElementById('upgrade-modal');
        if (el) {
            el.style.display = show ? 'flex' : 'none';
        }
    },
    // อัปเดตตัวเลขใน Modal และจัดการปุ่ม + -
    updateModalOnly(tempData, originalData) {
        setText('modal-points', tempData.statPoints);
        setText('modal-str', tempData.str);
        setText('modal-int', tempData.int);
        setText('modal-agi', tempData.agi);
        setText('modal-maxHp', tempData.maxHp);

        // รายการสเตตัส
        const stats = ['str', 'int', 'agi', 'hp'];

        stats.forEach(stat => {
            const btnPlus = document.getElementById('btn-plus-' + stat);
            const btnMinus = document.getElementById('btn-minus-' + stat);

            // 1. จัดการปุ่ม + (แต้มหมด = ซ่อน)
            if (tempData.statPoints > 0) {
                btnPlus.style.display = 'flex';
            } else {
                btnPlus.style.display = 'none';
            }

            // 2. จัดการปุ่ม - (ค่าเท่าเดิม = ซ่อน)
            // เช็คพิเศษสำหรับ HP เพราะใช้ maxHp
            let currentVal = (stat === 'hp') ? tempData.maxHp : tempData[stat];
            let originalVal = (stat === 'hp') ? originalData.maxHp : originalData[stat];

            if (currentVal > originalVal) {
                btnMinus.style.display = 'flex';
            } else {
                btnMinus.style.display = 'none';
            }
        });
    },
    // 👇 1. เปิด/ปิดหน้าต่างกระเป๋า 👇
    toggleInventory(show) {
        const el = document.getElementById('inventory-modal');
        if(el) el.style.display = show ? 'flex' : 'none';
    },

    // 👇 2. วาดไอเทมลงในตาราง 👇
    renderInventory(inventory) {
        const grid = document.getElementById('inventory-grid');
        grid.innerHTML = ""; // ล้างของเก่า

        if (!inventory || Object.keys(inventory).length === 0) {
            grid.innerHTML = '<p style="color: #ccc; grid-column: 1/-1;">(กระเป๋าว่างเปล่า)</p>';
            return;
        }

        // วนลูปไอเทมที่มี
        for (const [itemId, count] of Object.entries(inventory)) {
            const itemInfo = items[itemId];
            if (!itemInfo) continue;

            const slot = document.createElement('div');
            slot.className = 'item-slot';
            // ใส่ Tooltip ง่ายๆ
            slot.title = `${itemInfo.name}\n${itemInfo.desc}`; 
            
            // คลิกเพื่อกดใช้
            slot.onclick = () => window.useItem(itemId); 

            slot.innerHTML = `
                <span class="item-icon">${itemInfo.icon}</span>
                <span class="item-count">${count}</span>
            `;
            grid.appendChild(slot);
        }
    },
    // 👇 1. เปิด/ปิดร้านค้า 👇
    toggleShop(show) {
        const el = document.getElementById('shop-modal');
        if(el) el.style.display = show ? 'flex' : 'none';
    },

    // 🛒 หน้าซื้อ (มี Input จำนวน)
    renderShop(filterCategory = 'all') {
        const grid = document.getElementById('shop-grid');
        grid.innerHTML = "";

        for (const [key, item] of Object.entries(items)) {
            if (item.inShop === true) {
                if (filterCategory === 'all' || item.category === filterCategory) {
                    const card = document.createElement('div');
                    card.className = 'shop-item';
                    card.innerHTML = `
                        <div class="shop-icon">${item.icon}</div>
                        <div class="shop-info">
                            <b>${item.name}</b><br>
                            <small>${item.desc}</small>
                        </div>
                        <div class="action-group">
                            <input type="number" id="buy-qty-${key}" class="qty-input" value="1" min="1">
                            <button class="buy-btn" onclick="buyItem('${key}')">💰 ${item.price} G</button>
                        </div>
                    `;
                    grid.appendChild(card);
                }
            }
        }
        if (grid.innerHTML === "") grid.innerHTML = "<p style='color:#ccc;'>(ไม่มีสินค้า)</p>";
    },
    

    // 👇 3. เพิ่มฟังก์ชันสลับแท็บ (เปลี่ยนสีปุ่ม) 👇
    switchShopTab(category) {
        // อัปเดต UI ปุ่ม
        document.querySelectorAll('.shop-tab-btn').forEach(btn => {
            btn.classList.remove('active');
            // เช็คว่าปุ่มนี้กดเรียก category นี้ไหม (ดูจาก onclick text เอาแบบง่ายๆ)
            if (btn.getAttribute('onclick').includes(`'${category}'`)) {
                btn.classList.add('active');
            }
        });

        // เรียกวาดร้านค้าใหม่
        this.renderShop(category);
    },

    // 💰 หน้าขาย (มี Input + ปุ่มขายทั้งหมด)
    renderSellShop(inventory, filterCategory = 'all') {
        const grid = document.getElementById('shop-grid');
        grid.innerHTML = "";

        // ปุ่มขายทิ้งทั้งหมด (Sell All) - โชว์เมื่อเจาะจงหมวด หรือเลือก Loot
        if ((filterCategory === 'loot' || filterCategory !== 'all') && inventory) {
             const sellAllDiv = document.createElement('div');
             sellAllDiv.style.width = '100%';
             sellAllDiv.style.marginBottom = '10px';
             sellAllDiv.innerHTML = `
                <button class="sell-all-btn" onclick="sellAllLoot('${filterCategory}')">
                    🗑️ ขายไอเทมหมวด "${filterCategory}" ทั้งหมด
                </button>
             `;
             grid.appendChild(sellAllDiv);
        }

        if (!inventory || Object.keys(inventory).length === 0) {
            grid.innerHTML += '<p style="color: #ccc; width:100%;">ไม่มีไอเทมที่จะขาย</p>';
            return;
        }

        let hasItem = false;
        for (const [itemId, count] of Object.entries(inventory)) {
            const item = items[itemId];
            if (!item) continue;
            
            // กรองหมวด
            if (filterCategory !== 'all' && item.category !== filterCategory) continue;

            hasItem = true;
            let showSellPrice = (item.sellPrice !== undefined) ? item.sellPrice : Math.floor(item.price / 2);
            
            const card = document.createElement('div');
            card.className = 'shop-item';

            let actionPart = '';
            if (showSellPrice > 0) {
                actionPart = `
                    <div class="action-group">
                        <input type="number" id="sell-qty-${itemId}" class="qty-input" value="1" min="1" max="${count}">
                        <button class="sell-btn" onclick="sellItem('${itemId}')">ขาย ${showSellPrice} G</button>
                    </div>
                `;
            } else {
                actionPart = `<small style="color:red;">ขายไม่ได้</small>`;
            }

            card.innerHTML = `
                <div class="shop-icon">${item.icon}</div>
                <div class="shop-info">
                    <b>${item.name} x${count}</b><br>
                    <small>${item.desc}</small>
                </div>
                ${actionPart}
            `;
            grid.appendChild(card);
        }
        if (!hasItem) grid.innerHTML += "<p style='color:#ccc;'>(ไม่มีไอเทมในหมวดนี้)</p>";
    },

    // 👇 เพิ่มฟังก์ชันสลับโหมด UI 👇
    toggleShopModeUI(mode) {
        document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`mode-${mode}-btn`).classList.add('active');
        // โชว์ Tab หมวดหมู่เสมอ (ใช้ทั้งซื้อและขาย)
        document.getElementById('shop-cat-tabs').style.display = 'flex';
    },

    switchShopTabUI(category) {
        document.querySelectorAll('.shop-tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(`'${category}'`)) {
                btn.classList.add('active');
            }
        });
    }
};

// ฟังก์ชันช่วยใส่ข้อความ (Helper)
function setText(id, text) {
    const el = document.getElementById(id);
    if(el) el.innerText = text;
}