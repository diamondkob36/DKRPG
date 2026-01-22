// js/ui.js (ฉบับแก้ไข: แก้บั๊กเปิดกระเป๋าไม่ได้ + ป้องกันข้อมูล Null)

// 👇 1. ต้องมี equipmentSlots ในบรรทัด import นี้!
import { classStats, items, equipmentSlots } from "./gameData.js";
import { GameLogic } from "./game-logic.js";

export const UI = {
    // สลับหน้าจอ (Login -> Create -> Game)
    showScreen(screenId) {
        ['login-screen', 'create-screen', 'game-screen'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.style.display = (id === screenId) ? 'block' : 'none';
        });
    },

    toggleAuthButton(show) {
        const el = document.getElementById('user-info-top');
        if(el) el.style.display = show ? 'block' : 'none';
    },

    updateGameScreen(gameData) {
        setText('display-name', gameData.name);
        setText('display-class', gameData.className);
        if(gameData.classKey && classStats[gameData.classKey]) {
            document.getElementById('hero-img').src = classStats[gameData.classKey].img;
        }
        
        ['gold', 'hp', 'maxHp', 'str', 'int', 'agi'].forEach(key => setText(key, gameData[key]));
        setText('shop-gold', gameData.gold);

        const currentExp = gameData.exp || 0;
        const requiredExp = gameData.maxExp || 100;
        setText('lvl', `${gameData.lvl} (${currentExp}/${requiredExp})`);

        const hpPercent = (gameData.hp / gameData.maxHp) * 100;
        document.getElementById('hp-bar-fill').style.width = hpPercent + "%";

        const points = gameData.statPoints || 0;
        setText('hud-points', points);
        setText('modal-points', points);
        
        ['str', 'int', 'agi', 'maxHp'].forEach(k => setText('modal-'+k, gameData[k]));
    },

    selectClass(key) {
        document.querySelectorAll('.class-card').forEach(el => el.classList.remove('selected'));
        document.getElementById('card-' + key).classList.add('selected');
        const stats = classStats[key];
        setText('class-desc', stats.desc);
        ['maxHp', 'str', 'int', 'agi'].forEach(k => setText('pre-'+k.replace('maxHp','hp'), stats[k]));
        document.getElementById('class-preview').style.display = 'block';
        document.getElementById('preview-img').src = stats.img;
        document.getElementById('preview-img').style.display = 'inline-block';
    },

    setStatus(msg, type) {
        const el = document.getElementById('status');
        if(el) { el.innerText = msg; el.className = type; }
    },

    toggleHUD() { document.getElementById('char-status-panel').classList.toggle('expanded'); },
    
    toggleUpgradeModal(show) {
        const el = document.getElementById('upgrade-modal');
        if (el) el.style.display = show ? 'flex' : 'none';
    },

    updateModalOnly(tempData, originalData) {
        setText('modal-points', tempData.statPoints);
        ['str', 'int', 'agi', 'maxHp'].forEach(k => setText('modal-'+k, tempData[k]));

        const stats = ['str', 'int', 'agi', 'hp'];
        stats.forEach(stat => {
            const btnPlus = document.getElementById('btn-plus-' + stat);
            const btnMinus = document.getElementById('btn-minus-' + stat);
            
            btnPlus.style.display = (tempData.statPoints > 0) ? 'flex' : 'none';
            
            let currentVal = (stat === 'hp') ? tempData.maxHp : tempData[stat];
            let originalVal = (stat === 'hp') ? originalData.maxHp : originalData[stat];
            btnMinus.style.display = (currentVal > originalVal) ? 'flex' : 'none';
        });
    },

    // --- Inventory System ---
    toggleInventory(show) {
        const el = document.getElementById('inventory-modal');
        if(el) el.style.display = show ? 'flex' : 'none';
    },

    // 1. ปรับปรุง renderInventoryModal: เพิ่มส่วนแสดงสถานะน้ำหนัก/ช่อง
    renderInventoryModal(gameData, filterCategory = 'all') {
        const safeEquipment = gameData.equipment || {}; 
        this.renderEquipment(safeEquipment);
        
        const safeInventory = gameData.inventory || {};

        // --- 🆕 ส่วนแสดงสถานะกระเป๋า (Header) ---
        const usage = GameLogic.getInventoryUsage(gameData); //
        
        const bagPanel = document.querySelector('.bag-panel');
        let infoDiv = document.getElementById('bag-status-info');
        
        if (!infoDiv) {
            infoDiv = document.createElement('div');
            infoDiv.id = 'bag-status-info';
            infoDiv.style.marginBottom = '10px';
            infoDiv.style.padding = '10px';
            infoDiv.style.background = 'rgba(0,0,0,0.3)';
            infoDiv.style.borderRadius = '5px';
            infoDiv.style.fontSize = '14px';
            
            const tabs = bagPanel.querySelector('.shop-tabs');
            if (tabs) bagPanel.insertBefore(infoDiv, tabs);
            else bagPanel.prepend(infoDiv);
        }

        // คำนวณ % สำหรับหลอดแต่ละส่วน
        // คำนวณความกว้างเทียบกับ Max Weight
        const equipPercent = Math.min((usage.equippedWeight / usage.limitWeight) * 100, 100);
        // ส่วน Inventory ให้ต่อจาก Equip แต่ต้องไม่เกิน 100% เมื่อรวมกัน
        const invPercent = Math.min((usage.inventoryWeight / usage.limitWeight) * 100, (100 - equipPercent));
        
        // เช็คสี: ถ้าน้ำหนักรวมเกิน 90% ให้ส่วน Inventory เป็นสีแดง
        const totalPercent = equipPercent + invPercent;
        const invColor = totalPercent > 90 ? '#e74c3c' : '#2ecc71'; // แดง หรือ เขียว

        infoDiv.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                <span>🎒 ช่อง: <b>${usage.currentSlots}</b> / ${usage.limitSlots}</span>
                <span>⚖️ นน.รวม: <b>${usage.currentWeight.toFixed(1)}</b> / ${usage.limitWeight} kg</span>
            </div>
            
            <div style="width:100%; height:8px; background:#333; border-radius:4px; overflow:hidden; display:flex;">
                
                <div style="width:${equipPercent}%; height:100%; background:#3498db;" 
                     title="สวมใส่: ${usage.equippedWeight.toFixed(1)} kg"></div>
                
                <div style="width:${invPercent}%; height:100%; background:${invColor}; transition:width 0.3s;"
                     title="ในกระเป๋า: ${usage.inventoryWeight.toFixed(1)} kg"></div>
                     
            </div>
            <div style="text-align:right; font-size:10px; color:#ccc; margin-top:2px;">
                <span style="color:#3498db;">■ สวมใส่</span> 
                <span style="color:${invColor};">■ กระเป๋า</span>
            </div>
        `;
        // ----------------------------------------

        this.renderInventoryGridOnly(safeInventory, filterCategory);
    },

    renderEquipment(equipment) {
        const grid = document.getElementById('equipment-grid');
        if (!grid) return; // ป้องกัน Error ถ้าหา element ไม่เจอ
        grid.innerHTML = "";

        // ถ้า equipmentSlots ไม่ถูก import มา จะ Error ตรงนี้
        if (typeof equipmentSlots === 'undefined') {
            console.error("❌ ลืม import equipmentSlots ใน js/ui.js หรือยังไม่มีใน js/gameData.js");
            grid.innerHTML = "<p style='color:red'>Error: Missing equipmentSlots</p>";
            return;
        }

        equipmentSlots.forEach(slotDef => {
            const itemId = equipment[slotDef.id];
            const item = itemId ? items[itemId] : null;

            const slotEl = document.createElement('div');
            slotEl.id = `equip-slot-${slotDef.id}`; // ✅ ใส่ ID เพื่อจัด Layout
            slotEl.className = `equip-slot ${item ? 'occupied' : ''}`;
            slotEl.title = item ? `${item.name}\n${item.desc}` : slotDef.name;

            if (item) {
                slotEl.onclick = () => window.unequipItem(slotDef.id);
                slotEl.innerHTML = `
                    <div class="equipped-item-icon">${item.icon}</div>
                    <div class="slot-name" style="color:#f1c40f;">${item.name}</div>
                `;
            } else {
                slotEl.innerHTML = `
                    <div class="slot-placeholder">${slotDef.icon}</div>
                    <div class="slot-name">${slotDef.name}</div>
                `;
            }
            grid.appendChild(slotEl);
        });
    },

    renderInventory(inventory, filterCategory = 'all') {
        const grid = document.getElementById('inventory-grid');
        if (!grid) return;
        grid.innerHTML = "";

        if (!inventory || Object.keys(inventory).length === 0) {
            grid.innerHTML = '<p style="color: #ccc; grid-column: 1/-1; padding: 20px;">(กระเป๋าว่างเปล่า)</p>';
            return;
        }

        for (const [itemId, count] of Object.entries(inventory)) {
            const item = items[itemId];
            if (!item) continue;

            if (filterCategory !== 'all' && item.category !== filterCategory) continue;

            const slot = document.createElement('div');
            slot.className = 'item-slot';
            slot.title = `${item.name}\n${item.desc}\n(คลิกเพื่อใช้งาน/สวมใส่)`;
            
            slot.onclick = () => {
                if (item.type === 'equipment') {
                    window.equipItem(itemId);
                } else if (item.type === 'consumable') {
                    window.useItem(itemId);
                }
            };

            slot.innerHTML = `
                <span class="item-icon">${item.icon}</span>
                <span class="item-count">${count}</span>
            `;
            grid.appendChild(slot);
        }
    },

    switchInventoryTabUI(category) {
        const tabs = document.querySelectorAll('.bag-panel .shop-tab-btn');
        tabs.forEach(btn => {
            btn.classList.remove('active');
            if(btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(`'${category}'`)) {
                btn.classList.add('active');
            }
        });
    },

    renderInventoryGridOnly(inventory, filterCategory) {
        const grid = document.getElementById('inventory-grid');
        if (!grid) return;
        grid.innerHTML = "";

        if (!inventory || Object.keys(inventory).length === 0) {
            grid.innerHTML = '<p style="color: #ccc; grid-column: 1/-1; padding: 20px;">(กระเป๋าว่างเปล่า)</p>';
            return;
        }

        for (const [itemId, count] of Object.entries(inventory)) {
            const item = items[itemId];
            if (!item) continue;

            if (filterCategory !== 'all' && item.category !== filterCategory) continue;

            const slot = document.createElement('div');
            slot.className = 'item-slot';
            // ปรับ CSS ให้ slot เป็น relative เพื่อวางปุ่มถังขยะได้
            slot.style.position = 'relative'; 
            slot.title = `${item.name}\n⚖️ ${item.weight || 0} kg\n(คลิกเพื่อใช้งาน/สวมใส่)`;
            
            // Event คลิกหลัก (ใช้/สวมใส่)
            slot.onclick = () => {
                if (item.type === 'equipment') {
                    window.equipItem(itemId);
                } else if (item.type === 'consumable') {
                    window.useItem(itemId);
                }
            };

            // --- 🆕 ปุ่มทิ้งของ (Trash Button) ---
            const trashBtn = document.createElement('div');
            trashBtn.innerHTML = '🗑️';
            trashBtn.style.position = 'absolute';
            trashBtn.style.top = '2px';
            trashBtn.style.right = '2px';
            trashBtn.style.fontSize = '12px';
            trashBtn.style.cursor = 'pointer';
            trashBtn.style.background = 'rgba(0,0,0,0.5)';
            trashBtn.style.borderRadius = '50%';
            trashBtn.style.padding = '2px';
            trashBtn.style.lineHeight = '1';
            trashBtn.style.zIndex = '10'; // ให้ลอยอยู่เหนือสุด

            // เมื่อกดปุ่มถังขยะ
            trashBtn.onclick = (e) => {
                e.stopPropagation(); // ⛔ สำคัญ: หยุดไม่ให้มันไปกดปุ่มสวมใส่/ใช้ของซ้อนกัน
                window.dropItem(itemId);
            };
            // ------------------------------------

            slot.innerHTML += `
                <span class="item-icon">${item.icon}</span>
                <span class="item-count">${count}</span>
            `;
            
            // เพิ่มปุ่มถังขยะเข้าไปใน Slot
            slot.appendChild(trashBtn);
            
            grid.appendChild(slot);
        }
    },

    // --- Shop System ---
    toggleShop(show) {
        const el = document.getElementById('shop-modal');
        if(el) el.style.display = show ? 'flex' : 'none';
    },

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

    renderSellShop(inventory, filterCategory = 'all') {
        const grid = document.getElementById('shop-grid');
        grid.innerHTML = "";

        if (filterCategory === 'loot' && inventory) {
             const sellAllDiv = document.createElement('div');
             sellAllDiv.style.width = '100%';
             sellAllDiv.style.textAlign = 'center';
             sellAllDiv.style.marginBottom = '5px';
             sellAllDiv.innerHTML = `<button class="sell-all-btn" onclick="sellAllLoot('${filterCategory}')">🗑️ ขายขยะทิ้งทั้งหมด</button>`;
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
                    </div>`;
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

    toggleShopModeUI(mode) {
        document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`mode-${mode}-btn`).classList.add('active');
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

function setText(id, text) {
    const el = document.getElementById(id);
    if(el) el.innerText = text;
}