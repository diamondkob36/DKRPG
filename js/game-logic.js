// js/game-logic.js (ฉบับแก้ไขสมบูรณ์)
import { classStats, items } from "./gameData.js";

export const GameLogic = {
    calculateMaxExp(lvl) {
        const tier = Math.floor((lvl - 1) / 10);
        return 100 * Math.pow(2, tier);
    },

    addExp(data, amount) {
        data.exp = (data.exp || 0) + amount;
        data.maxExp = data.maxExp || this.calculateMaxExp(data.lvl);

        while (data.exp >= data.maxExp) {
            data.exp -= data.maxExp;
            data.lvl++;
            data.maxExp = this.calculateMaxExp(data.lvl);
            data.statPoints = (data.statPoints || 0) + 5;
            data.hp = data.maxHp;
        }
        return data;
    },

    train(currentData) {
        return this.addExp({ ...currentData }, 20);
    },

    upgradeStat(currentData, statType) {
        const newData = { ...currentData };
        if (!newData.statPoints || newData.statPoints <= 0) throw new Error("แต้มไม่พอ!");
        newData.statPoints--;
        
        if(statType === 'hp') { 
            newData.maxHp += 10; 
            newData.hp += 10; 
        } else { 
            newData[statType]++; 
            // 🆕 ถ้าอัป INT ให้เพิ่ม MaxMP และ MP ด้วย (1 INT = 10 MP)
            if (statType === 'int') {
                newData.mp = (newData.mp || 0) + 10;
            }
        }
        
        return newData;
    },

    downgradeStat(currentData, originalData, statType) {
        const newData = { ...currentData };
        let currentVal = (statType === 'hp') ? newData.maxHp : newData[statType];
        let originalVal = (statType === 'hp') ? originalData.maxHp : originalData[statType];

        // ตรวจสอบว่าค่าปัจจุบันต่ำกว่าค่าเริ่มต้นหรือไม่
        if (currentVal <= originalVal) throw new Error("ลดต่ำกว่าค่าเริ่มต้นไม่ได้!");
        
        // คืนแต้ม Stat
        newData.statPoints++;

        if(statType === 'hp') { 
            newData.maxHp -= 10; 
            // ✅ แก้ไข: ป้องกันเลือดติดลบ โดยให้เหลืออย่างน้อย 1
            newData.hp = Math.max(1, newData.hp - 10); 
        } else { 
            newData[statType]--; 
        }
        
        return newData;
    },

    farm(currentData) {
        const newData = { ...currentData };
        newData.gold += 100;
        return newData;
    },

    // 1. แก้ไข createCharacter ให้มีสเตตัสใหม่
    createCharacter(name, classKey) {
        const base = classStats[classKey];
        const startMp = base.int * 10;

        return {
            name: name, classKey: classKey, className: base.name,
            lvl: 1, exp: 0, maxExp: 100, gold: 0, statPoints: 5,
            hp: base.hp, maxHp: base.maxHp, mp: startMp,
            str: base.str, int: base.int, agi: base.agi,
            
            // ✅ เพิ่มสเตตัสรอง (Secondary Stats)
            def: 0,             // ค่าป้องกัน (ลดดาเมจแบบลบตรงๆ)
            critRate: 5,        // อัตราคริ (5%)
            critDmg: 150,       // ความแรงคริ (150%)
            dodge: 0,           // อัตราหลบหลีก
            block: 0,           // อัตราบล็อก
            dmgRed: 0,          // ลดความเสียหาย (แบบหน่วย หรือ %)
            ignoreBlock: 0,     // เจาะเกราะ/จุดอ่อน (ลดโอกาสบล็อกศัตรู)

            inventory: { "potion_s": 3, "wooden_sword": 1 },
            equipment: {},
            activeBuffs: {},
            maxSlots: 32, maxWeight: 60 
        };
    },

    // 🆕 Helper: คำนวณการใช้งานกระเป๋า (Slots & Weight)
    getInventoryUsage(data) {
        let currentSlots = 0;
        let inventoryWeight = 0;
        let equippedWeight = 0;

        // 1. คำนวณน้ำหนักของในกระเป๋า (Inventory)
        if (data.inventory) {
            currentSlots = Object.keys(data.inventory).length;
            for (const [itemId, count] of Object.entries(data.inventory)) {
                const item = items[itemId];
                // ตรวจสอบว่ามีไอเทมและมีค่าน้ำหนัก (แก้เรื่องยาไม่ถูกคำนวณ)
                if (item && item.weight) {
                    inventoryWeight += item.weight * count;
                }
            }
        }
        // 2. คำนวณน้ำหนักของที่สวมใส่อยู่ (Equipment) - เพิ่มใหม่
        if (data.equipment) {
            for (const itemId of Object.values(data.equipment)) {
                const item = items[itemId];
                if (item && item.weight) {
                    equippedWeight += item.weight;
                }
            }
        }
        // 3. คำนวณ Max Weight (เอา Logic + STR * 2 ออกไปแล้ว)
        const limitWeight = data.maxWeight || 60; 
        const limitSlots = data.maxSlots || 32;

        const totalWeight = inventoryWeight + equippedWeight;

        return { 
            currentSlots, 
            inventoryWeight, 
            equippedWeight, 
            currentWeight: totalWeight, // น้ำหนักรวมทั้งหมด
            limitSlots, 
            limitWeight 
        };
    },

    // 🆕 ฟังก์ชันสวมใส่ไอเทม
    equipItem(currentData, itemId, targetSlot = null) {
        const newData = { ...currentData };
        newData.equipment = newData.equipment || {};

        if (!newData.inventory[itemId] || newData.inventory[itemId] <= 0) throw new Error("ไม่มีไอเทมนี้!");

        const item = items[itemId];
        if (item.type !== 'equipment') throw new Error("ไอเทมนี้สวมใส่ไม่ได้!");

        const slot = targetSlot || item.slot;

        // ถอดของเก่า (และลบสเตตัสเก่า)
        if (newData.equipment[slot]) {
            const oldItemId = newData.equipment[slot];
            newData.inventory[oldItemId] = (newData.inventory[oldItemId] || 0) + 1;
            
            const oldItem = items[oldItemId];
            if(oldItem.stats) {
                // วนลูปเพื่อลบค่าทุกอย่างที่ไอเทมให้มา
                for (const [key, val] of Object.entries(oldItem.stats)) {
                    if (newData[key] !== undefined) newData[key] -= val;
                }
            }
        }

        // สวมของใหม่
        newData.equipment[slot] = itemId;
        newData.inventory[itemId]--;
        if (newData.inventory[itemId] <= 0) delete newData.inventory[itemId];

        // ✅ บวกสเตตัสใหม่ (แบบอัตโนมัติ ไม่ต้อง if ทีละอัน)
        if(item.stats) {
            for (const [key, val] of Object.entries(item.stats)) {
                // ถ้ายังไม่มีค่านั้นในตัวละคร ให้เริ่มที่ 0
                if (newData[key] === undefined) newData[key] = 0;
                newData[key] += val;
            }
        }

        // ป้องกันเลือดเกิน Max
        newData.hp = Math.min(newData.hp, newData.maxHp);
        return newData;
    },

    // 🆕 ฟังก์ชันถอดไอเทม
    unequipItem(currentData, slot) {
        const newData = { ...currentData };
        const itemId = newData.equipment[slot];
        if (!itemId) throw new Error("ไม่มีไอเทม");
        const item = items[itemId];

        // (ข้ามส่วนเช็คน้ำหนักไปก่อน เพื่อความกระชับ) ...

        delete newData.equipment[slot];
        newData.inventory[itemId] = (newData.inventory[itemId] || 0) + 1;

        // ✅ ลบสเตตัสออกแบบ Dynamic
        if(item.stats) {
            for (const [key, val] of Object.entries(item.stats)) {
                if (newData[key] !== undefined) newData[key] -= val;
            }
        }
        
        newData.hp = Math.min(newData.hp, newData.maxHp);
        return newData;
    },

    // ✅ แถม: ฟังก์ชันคำนวณดาเมจ (Battle System) ตามสูตรที่คุณขอ
    calculateBattleDamage(attacker, defender) {
        // 1. ตรวจสอบหลบหลีก (Dodge)
        const hitChance = 100 - (defender.dodge || 0);
        if (Math.random() * 100 > hitChance) {
            return { damage: 0, text: "MISS!" };
        }

        // 2. คำนวณดาเมจพื้นฐาน (สมมติมาจาก STR)
        let dmg = attacker.str * 2; // หรือสูตรอื่นตามชอบ

        // 3. ตรวจสอบบล็อก (Block)
        // จุดอ่อน (Ignore Block) จะไปหักลบโอกาสบล็อก
        let blockChance = (defender.block || 0) - (attacker.ignoreBlock || 0);
        let isBlocked = (Math.random() * 100 < blockChance);

        // 4. ตรวจสอบคริติคอล (Critical)
        let isCrit = false;
        if (!isBlocked) { // ถ้าบล็อกติด จะไม่ติดคริ (ตามเงื่อนไขของคุณ)
            if (Math.random() * 100 < (attacker.critRate || 0)) {
                isCrit = true;
                dmg *= (attacker.critDmg / 100); // คูณด้วย % คริดาเมจ (เช่น 150%)
            }
        }

        // 5. คำนวณบล็อกลดดาเมจ
        if (isBlocked) {
            dmg *= 0.5; // ลด 50%
        }

        // 6. หักลบค่าป้องกัน (Defense) และ ลดความเสียหาย (Dmg Red)
        dmg -= (defender.def || 0);
        dmg -= (defender.dmgRed || 0);

        return { 
            damage: Math.max(1, Math.floor(dmg)), 
            isCrit: isCrit, 
            isBlocked: isBlocked 
        };
    },

    useItem(currentData, itemId) {
        const newData = { ...currentData };
        if (!newData.inventory || !newData.inventory[itemId] || newData.inventory[itemId] <= 0) {
            throw new Error("ไม่มีไอเทมนี้!");
        }
        const item = items[itemId];

        // กรณีเป็นยาเพิ่มเลือด/Stat/MP
        if (item.effect) {
            if (item.effect.hp) newData.hp = Math.min(newData.hp + item.effect.hp, newData.maxHp);
            
            // 🆕 เพิ่มการเช็ค MP
            if (item.effect.mp) { 
                const maxMp = newData.int * 10;
                newData.mp = Math.min((newData.mp || 0) + item.effect.mp, maxMp);
            }
            
            if (item.effect.str) newData.str += item.effect.str;
        }

        // กรณีเป็นยาบัพ (มีระยะเวลา)
        if (item.buff) {
            const buffKey = `buff_${item.buff.type}`;
            const currentTime = Date.now();
            const expireTime = currentTime + (item.buff.duration * 1000);

            newData.activeBuffs = newData.activeBuffs || {};
            if (newData.activeBuffs[buffKey]) {
                newData[item.buff.type] -= newData.activeBuffs[buffKey].value;
            }

            newData[item.buff.type] += item.buff.value;

            newData.activeBuffs[buffKey] = {
                itemName: item.name,
                type: item.buff.type,
                value: item.buff.value,
                expiresAt: expireTime,
                icon: item.icon
            };
        }

        newData.inventory[itemId]--;
        if (newData.inventory[itemId] <= 0) delete newData.inventory[itemId];

        return newData;
    },

    dropItem(currentData, itemId, amount = 1) {
        if (amount < 1) throw new Error("จำนวนไม่ถูกต้อง");
        
        const newData = { ...currentData };
        
        if (!newData.inventory || !newData.inventory[itemId] || newData.inventory[itemId] < amount) {
            throw new Error("ไอเทมไม่พอที่จะทิ้ง!");
        }

        // ลดจำนวนไอเทม
        newData.inventory[itemId] -= amount;
        
        // ถ้าเหลือ 0 ให้ลบ key ออกจาก object
        if (newData.inventory[itemId] <= 0) {
            delete newData.inventory[itemId];
        }

        return newData;
    },

    // 🆕 ฟังก์ชันใหม่: เช็คเวลาบัพ (เรียกทุกวินาที หรือตอนโหลดเกม)
    checkBuffs(currentData) {
        const newData = { ...currentData };
        let hasChanged = false; // เช็คว่ามีการเปลี่ยนแปลงไหม (จะได้ไม่ต้อง Save บ่อยๆ)

        if (!newData.activeBuffs) return { newData, hasChanged: false };

        const now = Date.now();

        // วนลูปเช็คบัพทุกตัวที่มี
        for (const [key, buff] of Object.entries(newData.activeBuffs)) {
            // ถ้าเวลาปัจจุบัน เลยเวลาหมดอายุ
            if (now > buff.expiresAt) {
                // ลบค่า Stat ที่เคยเพิ่มไว้ออก
                newData[buff.type] -= buff.value;
                
                // ลบบัพออกจากรายการ
                delete newData.activeBuffs[key];
                
                hasChanged = true;
            }
        }

        return { newData, hasChanged };
    },

    // ✅ แก้ไข: รับ amount เพื่อซื้อทีละหลายชิ้น
    buyItem(currentData, itemId, amount = 1) {
        if (amount < 1) throw new Error("จำนวนไม่ถูกต้อง");
        const newData = { ...currentData };
        const item = items[itemId];
        
        const totalPrice = item.price * amount;

        if (newData.gold < totalPrice) throw new Error(`เงินไม่พอ! (ขาด ${totalPrice - newData.gold} G)`);

        // --- 🆕 ส่วนเช็คลิมิต ---
        const usage = this.getInventoryUsage(newData);
        const itemWeight = (item.weight || 0) * amount;

        // เช็คช่อง: ถ้าเป็นไอเทมใหม่ที่ยังไม่มีในตัว และช่องเต็มแล้ว
        if (!newData.inventory[itemId] && usage.currentSlots >= usage.limitSlots) {
            throw new Error("❌ กระเป๋าเต็ม! (ช่องไม่พอ)");
        }

        // เช็คน้ำหนัก: ถ้าน้ำหนักรวมเกินขีดจำกัด
        if (usage.currentWeight + itemWeight > usage.limitWeight) {
            throw new Error("❌ แบกไม่ไหว! (น้ำหนักเกิน)");
        }
        // ----------------------

        newData.gold -= totalPrice;
        newData.inventory = newData.inventory || {};
        newData.inventory[itemId] = (newData.inventory[itemId] || 0) + amount;

        return newData;
    },

    // ✅ แก้ไข: รับ amount เพื่อขายทีละหลายชิ้น
    sellItem(currentData, itemId, amount = 1) {
        // ... (คงเดิม การขายของทำให้ที่ว่างเพิ่ม ไม่ต้องเช็ค) ...
        if (amount < 1) throw new Error("จำนวนไม่ถูกต้อง");
        const newData = { ...currentData };
        if (!newData.inventory || !newData.inventory[itemId] || newData.inventory[itemId] < amount) {
            throw new Error("ไอเทมไม่พอขาย!");
        }
        const item = items[itemId];
        let unitPrice = (item.sellPrice !== undefined) ? item.sellPrice : Math.floor(item.price / 2);
        if (unitPrice <= 0) throw new Error("ไอเทมนี้ขายไม่ได้!");

        newData.gold += unitPrice * amount;
        newData.inventory[itemId] -= amount;
        if (newData.inventory[itemId] <= 0) delete newData.inventory[itemId];
        return newData;
    },

    // ✅ เพิ่มใหม่: ฟังก์ชันขายเหมาหมวด (Sell All)
    sellAllItemsByCategory(currentData, category) {
        let newData = { ...currentData };
        let totalGain = 0;
        let soldCount = 0;

        if (newData.inventory) {
            for (const [itemId, count] of Object.entries(newData.inventory)) {
                const item = items[itemId];
                if (!item) continue;

                if (item.category === category) {
                    let unitPrice = (item.sellPrice !== undefined) ? item.sellPrice : Math.floor(item.price / 2);
                    
                    if (unitPrice > 0) {
                        totalGain += unitPrice * count;
                        delete newData.inventory[itemId];
                        soldCount++;
                    }
                }
            }
        }

        if (soldCount === 0) throw new Error("ไม่มีไอเทมในหมวดนี้ให้ขาย");
        
        newData.gold += totalGain;
        return { newData, totalGain, soldCount };
    }
};