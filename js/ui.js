// js/ui.js (ฉบับแก้ไข: แก้บั๊กเปิดกระเป๋าไม่ได้ + ป้องกันข้อมูล Null)

// 👇 1. ต้องมี equipmentSlots ในบรรทัด import นี้!
import { classStats, items, equipmentSlots, skills } from "./gameData.js";
import { GameLogic } from "./game-logic.js";

export const UI = {
    // สลับหน้าจอ (Login -> Create -> Game)
    showScreen(screenId) {
        // ✅ เพิ่ม 'battle-screen' เข้าไปในรายการนี้ครับ (สำคัญมาก!)
        ['login-screen', 'create-screen', 'game-screen', 'battle-screen'].forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                // ถ้า ID ตรงกับที่เรียกมา ให้ show (block/flex)
                // ถ้าไม่ตรง ให้ hide (none)
                el.style.display = (id === screenId) ? 'block' : 'none';
            }
        });
    },

    toggleAuthButton(show) {
        const el = document.getElementById('user-info-top');
        if(el) el.style.display = show ? 'block' : 'none';
    },

    // 2. แก้ไข updateGameScreen ให้เรียก renderBuffs
updateGameScreen(gameData) {
        // 1. เตรียมข้อมูลพื้นฐาน
        const baseMp = gameData.baseMp || 100;
        const maxMp = gameData.maxMp || (baseMp + (gameData.int * 10));
        const currentHp = gameData.hp || 0;
        const maxHp = gameData.maxHp || 100;
        const currentMp = gameData.mp || 0;
        
        // --- HUD ด้านบน ---
        setText('display-name', gameData.name);
        setText('lvl', gameData.lvl);
        setText('gold', gameData.gold);
        
        if(gameData.classKey && classStats[gameData.classKey]) {
            const imgSrc = classStats[gameData.classKey].img;
            const heroImg = document.getElementById('hero-img');
            if(heroImg) heroImg.src = imgSrc;
            const profileImg = document.getElementById('profile-img');
            if(profileImg) profileImg.src = imgSrc;
        }
        
        // อัปเดตหลอดเลือด/มานา
        const hpPercent = Math.max(0, Math.min((currentHp / maxHp) * 100, 100));
        const hpBar = document.getElementById('hp-bar-fill');
        if(hpBar) hpBar.style.width = hpPercent + "%";
        setText('hp-text', `${Math.floor(currentHp)}/${maxHp}`);

        const mpPercent = Math.max(0, Math.min((currentMp / maxMp) * 100, 100));
        const mpBar = document.getElementById('mp-bar-fill');
        if(mpBar) mpBar.style.width = mpPercent + "%";
        setText('mp-text', `${Math.floor(currentMp)}/${maxMp}`);

        if (gameData.maxExp > 0) {
            const expPercent = Math.min((gameData.exp / gameData.maxExp) * 100, 100);
            const expBar = document.getElementById('exp-bar-fill');
            if(expBar) expBar.style.width = expPercent + "%";
            setText('exp-text', `EXP ${Math.floor(gameData.exp)}/${gameData.maxExp}`);
        }

        // =========================================================
        // ✨ ส่วน Profile Info (เพิ่ม Dmg Red)
        // =========================================================
        
        setText('profile-name', gameData.name);
        setText('profile-class', gameData.className);

        const hpRegen = gameData.hpRegen || Math.floor(maxHp * 0.05) || 1;
        const mpRegen = gameData.mpRegen || Math.floor(maxMp * 0.05) || 1;
        const usage = GameLogic.getInventoryUsage(gameData);

        const statsContainer = document.querySelector('#profile-modal .modal-box > div[style*="grid"]');
        
        if (statsContainer) {
            statsContainer.style.background = 'none';
            statsContainer.style.boxShadow = 'none';
            statsContainer.style.border = 'none';
            statsContainer.style.padding = '5px 10px';
            statsContainer.style.display = 'block';

            // 🎨 จัด Grid 2 คอลัมน์ (เพิ่ม Dmg Red คู่กับ Block)
            statsContainer.innerHTML = `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 14px; color: #5d4037; text-align: left;">
                    
                    <div>❤️ HP: <b style="color:#c0392b">${Math.floor(currentHp)}/${maxHp}</b></div>
                    <div>🌱 Regen: <b style="color:#27ae60">+${hpRegen}</b><small>/3T</small></div>

                    <div>💧 MP: <b style="color:#2980b9">${Math.floor(currentMp)}/${maxMp}</b></div>
                    <div>✨ Regen: <b style="color:#2980b9">+${mpRegen}</b><small>/3T</small></div>

                    <div>⚔️ STR: <b style="color:#e67e22">${gameData.str}</b></div>
                    <div>🔥 INT: <b style="color:#8e44ad">${gameData.int}</b></div>

                    <div>💨 AGI: <b style="color:#27ae60">${gameData.agi}</b></div>
                    <div>🛡️ DEF: <b style="color:#7f8c8d">${gameData.def || 0}</b></div>

                </div>

                <div style="border-bottom: 1px dashed #a0744b; margin: 10px 0; opacity: 0.6;"></div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px; color: #5d4037; text-align: left;">
                    
                    <div>⚡ Crit Rate: <b style="color:#f39c12">${gameData.critRate || 0}%</b></div>
                    <div>💥 Crit Dmg: <b style="color:#c0392b">${gameData.critDmg || 150}%</b></div>
                    
                    <div>🎯 Acc: <b style="color:#e91e63">${gameData.acc || 0}%</b></div>
                    <div>🍃 Dodge: <b style="color:#2ecc71">${gameData.dodge || 0}%</b></div>
                    
                    <div>🛡️ Block: <b style="color:#7f8c8d">${gameData.block || 0}%</b></div>
                    <div>🛡️ Dmg Red: <b style="color:#7f8c8d">${gameData.dmgRed || 0}%</b></div>
                    
                    <div>💢 Pierce: <b style="color:#c0392b">${gameData.ignoreBlock || 0}%</b></div>
                    <div>⚖️ นน.: <b style="color:#5d4037">${usage.currentWeight.toFixed(1)}/${usage.limitWeight}</b></div>
                
                </div>
            `;
            
            const oldExtra = document.getElementById('extra-stats-display');
            if(oldExtra) oldExtra.remove();
        }

        // --- ส่วนที่เหลือ (Points, Buffs) ---
        const points = gameData.statPoints || 0;
        setText('profile-points', points);
        setText('hud-points', points); 

        setText('modal-points', points);
        const statsToUpdate = {
            'str': gameData.str,
            'int': gameData.int,
            'agi': gameData.agi,
            'def': gameData.def || 0,
            'maxHp': gameData.maxHp
        };
        Object.entries(statsToUpdate).forEach(([key, val]) => {
            setText('modal-' + key, val);
        });

        this.renderBuffs(gameData.activeBuffs);
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

    toggleProfile(show) {
        const el = document.getElementById('profile-modal');
        if(el) el.style.display = show ? 'flex' : 'none';
    },
    
    toggleUpgradeModal(show) {
        const el = document.getElementById('upgrade-modal');
        if (el) el.style.display = show ? 'flex' : 'none';
    },

    updateModalOnly(tempData, originalData) {
        setText('modal-points', tempData.statPoints);
        
        // ✅ 1. เพิ่ม 'def' ในรายการอัปเดตตัวเลข
        ['str', 'int', 'agi', 'def', 'maxHp'].forEach(k => setText('modal-'+k, tempData[k]));

        // ✅ 2. เพิ่ม 'def' ในรายการเช็คปุ่ม
        const stats = ['str', 'int', 'agi', 'def', 'hp']; 
        
        stats.forEach(stat => {
            const btnPlus = document.getElementById('btn-plus-' + stat);
            const btnMinus = document.getElementById('btn-minus-' + stat);
            
            // ปุ่มบวก: โชว์เมื่อมีแต้มเหลือ
            btnPlus.style.display = (tempData.statPoints > 0) ? 'flex' : 'none';
            
            // เช็คค่าปัจจุบัน vs ค่าตั้งต้น (ถ้า stat เป็น hp ต้องเช็ค maxHp)
            let currentVal = (stat === 'hp') ? tempData.maxHp : tempData[stat];
            let originalVal = (stat === 'hp') ? originalData.maxHp : originalData[stat];
            
            // ปุ่มลบ: โชว์เมื่อค่าปัจจุบันมากกว่าค่าตั้งต้น
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
        // ✅ สั่งปิด Tooltip เก่าทิ้งทันที เพื่อแก้ปัญหา Popup ค้างเวลา Refresh หน้ากระเป๋า
        this.hideTooltip();

        const safeEquipment = gameData.equipment || {}; 
        this.renderEquipment(safeEquipment);
        
        const safeInventory = gameData.inventory || {};

        // --- 🆕 ส่วนแสดงสถานะกระเป๋า (Header) ---
        // คำนวณการใช้งานกระเป๋า (ต้องมี GameLogic import เข้ามาแล้วในไฟล์นี้)
        const usage = GameLogic.getInventoryUsage(gameData); 
        
        const bagPanel = document.querySelector('.bag-panel');
        let infoDiv = document.getElementById('bag-status-info');
        
        // ถ้ายังไม่มีส่วนแสดงสถานะ ให้สร้างใหม่
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
        const equipPercent = Math.min((usage.equippedWeight / usage.limitWeight) * 100, 100);
        // ส่วน Inventory ให้ต่อจาก Equip แต่ต้องไม่เกิน 100% เมื่อรวมกัน
        const invPercent = Math.min((usage.inventoryWeight / usage.limitWeight) * 100, (100 - equipPercent));
        
        // เช็คสี: ถ้าน้ำหนักรวมเกิน 90% ให้ส่วน Inventory เป็นสีแดง
        const totalPercent = equipPercent + invPercent;
        const invColor = totalPercent > 90 ? '#e74c3c' : '#2ecc71'; // แดง หรือ เขียว

        // อัปเดต HTML ของหลอดสถานะ
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

        // เรียกวาดรายการไอเทมในกระเป๋า
        this.renderInventoryGridOnly(safeInventory, filterCategory);
    },

    renderEquipment(equipment) {
        const grid = document.getElementById('equipment-grid');
        if (!grid) return;
        grid.innerHTML = "";

        if (typeof equipmentSlots === 'undefined') {
            console.error("❌ ลืม import equipmentSlots");
            return;
        }

        equipmentSlots.forEach(slotDef => {
            const itemId = equipment[slotDef.id];
            const item = itemId ? items[itemId] : null;

            const slotEl = document.createElement('div');
            slotEl.id = `equip-slot-${slotDef.id}`;
            slotEl.className = `equip-slot ${item ? 'occupied' : ''}`;

            if (item) {
                // ✅ ใช้ Tooltip แบบใหม่ (เอาเมาส์ชี้แล้วขึ้นกล่องสวยๆ)
                this.bindTooltip(slotEl, item);

                slotEl.onclick = () => window.unequipItem(slotDef.id);
                slotEl.innerHTML = `
                    <div class="equipped-item-icon">${item.icon}</div>
                    <div class="slot-name" style="color:#f1c40f;">${item.name}</div>
                `;
            } else {
                // ถ้าไม่มีของใส่ ให้แสดงชื่อช่องปกติ
                slotEl.title = slotDef.name; 
                slotEl.innerHTML = `
                    <div class="slot-placeholder">${slotDef.icon}</div>
                    <div class="slot-name">${slotDef.name}</div>
                `;
            }
            grid.appendChild(slotEl);
        });
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
            slot.style.position = 'relative'; 
            
            // ✅ ใช้ Tooltip แบบใหม่
            this.bindTooltip(slot, item);

            // Event คลิกหลัก (ใช้/สวมใส่)
            slot.onclick = () => {
                if (item.type === 'equipment') {
                    window.equipItem(itemId);
                } else if (item.type === 'consumable') {
                    window.useItem(itemId);
                }
            };

            // ปุ่มทิ้งของ (Trash Button)
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
            trashBtn.style.zIndex = '10';

            trashBtn.onclick = (e) => {
                e.stopPropagation(); 
                window.dropItem(itemId);
            };

            slot.innerHTML += `
                <span class="item-icon">${item.icon}</span>
                <span class="item-count">${count}</span>
            `;
            
            slot.appendChild(trashBtn);
            grid.appendChild(slot);
        }
    },

    // 🆕 1. เพิ่มฟังก์ชันวาด Buff
    renderBuffs(activeBuffs) {
        const buffContainer = document.getElementById('buff-container');
        if (!buffContainer) return;

        buffContainer.innerHTML = ''; 

        if (!activeBuffs || Object.keys(activeBuffs).length === 0) {
            buffContainer.innerHTML = '<small style="color:#666;">- ไม่มีบัพ -</small>';
            return;
        }

        const now = Date.now();

        for (const [key, buff] of Object.entries(activeBuffs)) {
            const timeLeft = Math.max(0, Math.ceil((buff.expiresAt - now) / 1000));
            
            if (timeLeft > 0) {
                // คำนวณเวลา (นาที/วินาที)
                let timeString = "";
                if (timeLeft >= 60) {
                    const m = Math.floor(timeLeft / 60);
                    const s = timeLeft % 60;
                    timeString = (s === 0) ? `${m}m` : `${m}m ${s}s`;
                } else {
                    timeString = `${timeLeft}s`;
                }

                const badge = document.createElement('div');
                badge.className = 'buff-badge';
                // Style ของกล่องบัพ
                badge.style.background = 'rgba(255, 255, 255, 0.1)';
                badge.style.border = '1px solid #f1c40f';
                badge.style.borderRadius = '4px';
                badge.style.padding = '4px 8px';
                badge.style.fontSize = '12px';
                badge.style.color = '#fff';
                badge.style.display = 'flex';
                badge.style.alignItems = 'center';
                badge.style.gap = '5px';
                badge.style.cursor = 'help'; // เปลี่ยนเมาส์เป็นเครื่องหมาย ?
                
                // ✅ เพิ่ม Custom Tooltip Events ตรงนี้
                badge.onmouseenter = () => {
                    const tooltip = document.getElementById('item-tooltip');
                    if (!tooltip) return;
                    
                    // จัดรูปแบบตัวอักษร (เช่น str -> STR)
                    const typeDisplay = buff.type.toUpperCase();
                    
                    // สร้าง HTML สำหรับ Tooltip (ใช้สไตล์เดียวกับไอเทม)
                    tooltip.innerHTML = `
                        <div class="tooltip-header">
                            <div class="tooltip-icon">${buff.icon}</div>
                            <div>
                                <div class="tooltip-title">${buff.itemName}</div>
                                <div class="tooltip-type">สถานะ (Buff)</div>
                            </div>
                        </div>
                        <div class="tooltip-stats">
                            <span class="stat-special">✨ ${typeDisplay} +${buff.value}</span>
                        </div>
                        <div class="tooltip-footer" style="color:#f1c40f;">
                            ⏳ เหลือเวลา ${timeString}
                        </div>
                    `;
                    tooltip.style.display = 'block';
                };
                
                // สั่งให้ Tooltip ขยับตามเมาส์ และซ่อนเมื่อเมาส์ออก
                badge.onmousemove = (e) => this.moveTooltip(e);
                badge.onmouseleave = () => this.hideTooltip();

                // เนื้อหาภายในกล่องบัพ (แสดงแค่นี้พอ)
                badge.innerHTML = `
                    <span style="font-size:14px;">${buff.icon}</span> 
                    <span>${buff.itemName}</span>
                    <span style="color:#f1c40f; font-weight:bold;">${timeString}</span>
                `;
                buffContainer.appendChild(badge);
            }
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
                    
                    // ✅ เพิ่ม Tooltip ให้สินค้าในร้านค้า
                    this.bindTooltip(card, item);

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

            // ✅ เพิ่ม Tooltip เวลาจะขายของ
            this.bindTooltip(card, item);

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
    },

    // 🆕 เพิ่มฟังก์ชันจัดการ Custom Popup
    showPopup(title, message, type = 'alert', defaultValue = 1) {
        return new Promise((resolve) => {
            const overlay = document.getElementById('custom-popup');
            const titleEl = document.getElementById('popup-title');
            const msgEl = document.getElementById('popup-message');
            const inputEl = document.getElementById('popup-input');
            const btnConfirm = document.getElementById('popup-btn-confirm');
            const btnCancel = document.getElementById('popup-btn-cancel');

            // ตั้งค่าข้อความ
            titleEl.innerText = title;
            msgEl.innerHTML = message; // ใช้ innerHTML เผื่อใส่ตัวหนา/สี

            // รีเซ็ตการแสดงผล
            inputEl.style.display = 'none';
            btnCancel.style.display = 'none';
            btnConfirm.innerText = 'ตกลง';

            // ตั้งค่าตามประเภท
            if (type === 'confirm') {
                btnCancel.style.display = 'block';
                btnConfirm.innerText = 'ยืนยัน';
            } else if (type === 'prompt') {
                btnCancel.style.display = 'block';
                btnConfirm.innerText = 'ยืนยัน';
                inputEl.style.display = 'block';
                inputEl.value = defaultValue;
                inputEl.focus();
            }

            // แสดง Popup
            overlay.style.display = 'flex';

            // จัดการ Event (ใช้ once: true เพื่อไม่ให้ Event ซ้อนกัน)
            const closePopup = () => {
                overlay.style.display = 'none';
            };

            // สร้าง Handler ใหม่ทุกครั้งเพื่อผูกกับ resolve ของ Promise รอบนี้
            const onConfirm = () => {
                closePopup();
                if (type === 'prompt') resolve(inputEl.value); // ส่งค่าตัวเลขกลับ
                else resolve(true); // ตอบ Yes
                cleanup();
            };

            const onCancel = () => {
                closePopup();
                resolve(null); // ตอบ No หรือ Cancel
                cleanup();
            };

            // ฟังก์ชันล้าง Event Listener
            const cleanup = () => {
                btnConfirm.removeEventListener('click', onConfirm);
                btnCancel.removeEventListener('click', onCancel);
            };

            btnConfirm.addEventListener('click', onConfirm);
            btnCancel.addEventListener('click', onCancel);
        });
    },

    // Wrapper ให้เรียกใช้ง่ายๆ
    async alert(title, message) {
        return this.showPopup(title, message, 'alert');
    },

    async confirm(title, message) {
        return this.showPopup(title, message, 'confirm');
    },

    async prompt(title, message, defValue) {
        return this.showPopup(title, message, 'prompt', defValue);
    },
    // 🆕 ฟังก์ชันจัดการ Custom Tooltip
    bindTooltip(element, item) {
        if (!element || !item) return;

        // ลบ title เดิมของ browser ออก
        element.removeAttribute('title');

        element.onmouseenter = () => this.showTooltip(item);
        element.onmousemove = (e) => this.moveTooltip(e);
        element.onmouseleave = () => this.hideTooltip();
    },

    showTooltip(item) {
        const tooltip = document.getElementById('item-tooltip');
        if (!tooltip) return;

        // --- 1. สร้าง HTML สำหรับ Stats (ค่าพลัง) ---
        let statsHTML = '';
        if (item.stats || item.effect || item.buff) {
            statsHTML += '<div class="tooltip-stats">';
            
            // Stats อุปกรณ์
            if (item.stats) {
                if(item.stats.str) statsHTML += `<span class="stat-str">⚔️ STR +${item.stats.str}</span>`;
                if(item.stats.int) statsHTML += `<span class="stat-int">🔥 INT +${item.stats.int}</span>`;
                if(item.stats.agi) statsHTML += `<span class="stat-agi">💨 AGI +${item.stats.agi}</span>`;
                if(item.stats.def) statsHTML += `<span class="stat-def">🛡️ DEF +${item.stats.def}</span>`;
                if(item.stats.block) statsHTML += `<span class="stat-def">🛡️ Block +${item.stats.block}%</span>`;
                if(item.stats.critRate) statsHTML += `<span class="stat-special">⚡ Crit Rate +${item.stats.critRate}%</span>`;
                if(item.stats.critDmg) statsHTML += `<span class="stat-special">💥 Crit Dmg +${item.stats.critDmg}%</span>`;
                if(item.stats.dodge) statsHTML += `<span class="stat-agi">🍃 Dodge +${item.stats.dodge}%</span>`;
                if(item.stats.maxHp) statsHTML += `<span class="stat-str">❤️ HP +${item.stats.maxHp}</span>`;
            }

            // Effect ยา
            if (item.effect) {
                if(item.effect.hp) statsHTML += `<span class="stat-str">❤️ ฟื้นฟู HP ${item.effect.hp}</span>`;
                if(item.effect.mp) statsHTML += `<span class="stat-int">💧 ฟื้นฟู MP ${item.effect.mp}</span>`;
                if(item.effect.str) statsHTML += `<span class="stat-special">💪 เพิ่ม STR ถาวร +${item.effect.str}</span>`;
            }

            // Buff
            if (item.buff) {
                statsHTML += `<span class="stat-special">⏳ ${item.buff.type.toUpperCase()} +${item.buff.value} (${item.buff.duration}วิ)</span>`;
            }
            
            statsHTML += '</div>';
        }

        // --- 2. ส่วนแสดงตำแหน่งสวมใส่ (Slot) ---
        let slotDisplay = '';
        if (item.type === 'equipment' && item.slot) {
            // ค้นหาชื่อภาษาไทยจาก equipmentSlots
            const slotDef = (typeof equipmentSlots !== 'undefined') ? equipmentSlots.find(s => s.id === item.slot) : null;
            const slotName = slotDef ? slotDef.name : item.slot;
            
            slotDisplay = `<div style="font-size:11px; color:#f39c12; margin-top:-2px; margin-bottom: 2px;">📍 สวมใส่: ${slotName}</div>`;
        }

        // --- 3. (ส่วนที่เพิ่ม) แสดงเงื่อนไขอาชีพ ---
        let classReqDisplay = '';
        if (item.allowedClasses) {
            // แปลง key เป็นชื่อไทย (เช่น 'knight' -> 'อัศวิน')
            // ต้องมั่นใจว่าตัวแปร classStats ถูก import มาแล้ว
            const classNames = item.allowedClasses.map(key => {
                return (typeof classStats !== 'undefined' && classStats[key]) ? classStats[key].name : key;
            }).join(', ');
            
            classReqDisplay = `<div style="font-size:11px; color:#e74c3c; margin-top:2px;">⚠️ เฉพาะ: ${classNames}</div>`;
        }

        // --- 4. ประกอบร่าง HTML ---
        tooltip.innerHTML = `
            <div class="tooltip-header">
                <div class="tooltip-icon">${item.icon}</div>
                <div>
                    <div class="tooltip-title">${item.name}</div>
                    ${slotDisplay}
                    ${classReqDisplay} <div class="tooltip-type">${item.category || item.type}</div>
                </div>
            </div>
            ${statsHTML}
            <div class="tooltip-desc">${item.desc}</div>
            <div class="tooltip-footer">
                ⚖️ ${item.weight || 0} kg | 💰 ราคา: ${item.price} G
            </div>
        `;

        tooltip.style.display = 'block';
    },

    moveTooltip(e) {
        const tooltip = document.getElementById('item-tooltip');
        if (!tooltip) return;
        
        // คำนวณตำแหน่งไม่ให้ตกขอบจอ
        let x = e.clientX + 15;
        let y = e.clientY + 15;
        
        // ถ้าชิดขวาเกินไป ให้เด้งมาทางซ้าย
        if (x + tooltip.offsetWidth > window.innerWidth) {
            x = e.clientX - tooltip.offsetWidth - 10;
        }
        // ถ้าชิดล่างเกินไป ให้เด้งขึ้นบน
        if (y + tooltip.offsetHeight > window.innerHeight) {
            y = e.clientY - tooltip.offsetHeight - 10;
        }

        tooltip.style.top = y + 'px';
        tooltip.style.left = x + 'px';
    },

    hideTooltip() {
        const tooltip = document.getElementById('item-tooltip');
        if (tooltip) tooltip.style.display = 'none';
    },

    // 🆕 ฟังก์ชันวาดปุ่มสกิล
    renderSkillBar(gameData) {
        const container = document.getElementById('skill-bar');
        if (!container) return;
        container.innerHTML = '';

        const now = Date.now();
        const cooldowns = gameData.skillCooldowns || {};

        // วนลูปหาเฉพาะสกิลของอาชีพเรา
        for (const [skillId, skill] of Object.entries(skills)) {
            if (skill.classReq === gameData.classKey) {
                
                const btn = document.createElement('div');
                btn.className = 'skill-btn';
                
                // เช็ค Cooldown
                const readyTime = cooldowns[skillId] || 0;
                const isCooldown = now < readyTime;
                const timeLeft = isCooldown ? Math.ceil((readyTime - now) / 1000) : 0;

                // HTML ภายในปุ่ม
                let content = `<span class="skill-icon">${skill.icon}</span>`;
                content += `<div class="mp-cost-badge">${skill.mpCost} MP</div>`;

                if (isCooldown) {
                    btn.classList.add('cooldown');
                    // คำนวณความสูงของ Overlay ตามเวลาที่เหลือ (ลูกเล่นกราฟิก)
                    const totalCd = skill.cooldown;
                    const percent = (timeLeft / totalCd) * 100;
                    content += `<div class="cooldown-overlay" style="height:${percent}%">${timeLeft}</div>`;
                } else {
                    btn.onclick = () => window.useSkill(skillId); // เรียกใช้ฟังก์ชัน Global
                }

                btn.innerHTML = content;

                // เพิ่ม Tooltip
                this.bindTooltip(btn, {
                    name: skill.name,
                    desc: skill.desc,
                    type: "Skill",
                    icon: skill.icon,
                    price: "0", // ไม่แสดงราคา
                    weight: null,
                    effect: skill.effect, 
                    buff: skill.buff
                });

                container.appendChild(btn);
            }
        }
    },
};

function setText(id, text) {
    const el = document.getElementById(id);
    if(el) el.innerText = text;
}