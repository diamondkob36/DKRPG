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
        
        if(statType === 'hp') { newData.maxHp += 10; newData.hp += 10; }
        else { newData[statType]++; }
        
        return newData;
    },

    downgradeStat(currentData, originalData, statType) {
        const newData = { ...currentData };
        let currentVal = (statType === 'hp') ? newData.maxHp : newData[statType];
        let originalVal = (statType === 'hp') ? originalData.maxHp : originalData[statType];

        if (currentVal <= originalVal) throw new Error("ลดต่ำกว่าค่าเริ่มต้นไม่ได้!");
        
        newData.statPoints++;
        if(statType === 'hp') { newData.maxHp -= 10; newData.hp -= 10; }
        else { newData[statType]--; }
        
        return newData;
    },

    farm(currentData) {
        const newData = { ...currentData };
        newData.gold += 100;
        return newData;
    },

    createCharacter(name, classKey) {
        const base = classStats[classKey];
        return {
            name: name, classKey: classKey, className: base.name,
            lvl: 1, exp: 0, maxExp: 100, gold: 0, statPoints: 5,
            hp: base.hp, maxHp: base.maxHp, str: base.str, int: base.int, agi: base.agi,
            inventory: { "potion_s": 3, "wooden_sword": 1 }, // แถมดาบ!
            equipment: {} // 🆕 เพิ่มช่องเก็บข้อมูลของที่ใส่อยู่
        };
    },

    // 🆕 ฟังก์ชันสวมใส่ไอเทม
    equipItem(currentData, itemId, targetSlot = null) {
        const newData = { ...currentData };
        newData.equipment = newData.equipment || {}; // กันเหนียว

        // 1. ตรวจสอบของในกระเป๋า
        if (!newData.inventory[itemId] || newData.inventory[itemId] <= 0) {
            throw new Error("ไม่มีไอเทมนี้!");
        }

        const item = items[itemId];
        if (item.type !== 'equipment') throw new Error("ไอเทมนี้สวมใส่ไม่ได้!");

        // 2. หาช่องที่จะใส่ (ถ้าไม่ระบุ ให้ใช้ค่า default ของไอเทม)
        // สำหรับช่อง extra อาจต้องส่ง targetSlot มาเจาะจง
        const slot = targetSlot || item.slot; 

        // 3. ถอดของเก่าออกก่อน (ถ้ามี)
        if (newData.equipment[slot]) {
            const oldItemId = newData.equipment[slot];
            // คืนของเก่าเข้ากระเป๋า
            newData.inventory[oldItemId] = (newData.inventory[oldItemId] || 0) + 1;
            
            // ลบสเตตัสของเก่า
            const oldItem = items[oldItemId];
            if(oldItem.stats) {
                if(oldItem.stats.str) newData.str -= oldItem.stats.str;
                if(oldItem.stats.int) newData.int -= oldItem.stats.int;
                if(oldItem.stats.agi) newData.agi -= oldItem.stats.agi;
                if(oldItem.stats.maxHp) newData.maxHp -= oldItem.stats.maxHp;
            }
        }

        // 4. สวมของใหม่
        newData.equipment[slot] = itemId;
        
        // ลบออกจากกระเป๋า 1 ชิ้น
        newData.inventory[itemId]--;
        if (newData.inventory[itemId] <= 0) delete newData.inventory[itemId];

        // 5. เพิ่มสเตตัสของใหม่
        if(item.stats) {
            if(item.stats.str) newData.str += item.stats.str;
            if(item.stats.int) newData.int += item.stats.int;
            if(item.stats.agi) newData.agi += item.stats.agi;
            if(item.stats.maxHp) newData.maxHp += item.stats.maxHp;
        }

        // ปรับเลือดปัจจุบันไม่ให้เกิน Max ใหม่
        newData.hp = Math.min(newData.hp, newData.maxHp);

        return newData;
    },

    // 🆕 ฟังก์ชันถอดไอเทม
    unequipItem(currentData, slot) {
        const newData = { ...currentData };
        newData.equipment = newData.equipment || {};

        const itemId = newData.equipment[slot];
        if (!itemId) throw new Error("ไม่มีไอเทมในช่องนี้");

        const item = items[itemId];

        // 1. ลบออกจากตัว
        delete newData.equipment[slot];

        // 2. คืนเข้ากระเป๋า
        newData.inventory = newData.inventory || {};
        newData.inventory[itemId] = (newData.inventory[itemId] || 0) + 1;

        // 3. ลบสเตตัสออก
        if(item.stats) {
            if(item.stats.str) newData.str -= item.stats.str;
            if(item.stats.int) newData.int -= item.stats.int;
            if(item.stats.agi) newData.agi -= item.stats.agi;
            if(item.stats.maxHp) newData.maxHp -= item.stats.maxHp;
        }

        // ปรับเลือดปัจจุบัน
        newData.hp = Math.min(newData.hp, newData.maxHp);

        return newData;
    },

    useItem(currentData, itemId) {
        const newData = { ...currentData };
        if (!newData.inventory || !newData.inventory[itemId] || newData.inventory[itemId] <= 0) {
            throw new Error("ไม่มีไอเทมนี้!");
        }
        const itemData = items[itemId];
        
        if (itemData.effect.hp) newData.hp = Math.min(newData.hp + itemData.effect.hp, newData.maxHp);
        if (itemData.effect.str) newData.str += itemData.effect.str;

        newData.inventory[itemId]--;
        if (newData.inventory[itemId] <= 0) delete newData.inventory[itemId];

        return newData;
    },

    // ✅ แก้ไข: รับ amount เพื่อซื้อทีละหลายชิ้น
    buyItem(currentData, itemId, amount = 1) {
        if (amount < 1) throw new Error("จำนวนไม่ถูกต้อง");
        const newData = { ...currentData };
        const item = items[itemId];
        if (!item) throw new Error("สินค้าไม่ถูกต้อง");
        
        const totalPrice = item.price * amount;

        if (newData.gold < totalPrice) throw new Error(`เงินไม่พอ! (ขาด ${totalPrice - newData.gold} G)`);

        newData.gold -= totalPrice;
        newData.inventory = newData.inventory || {};
        newData.inventory[itemId] = (newData.inventory[itemId] || 0) + amount;

        return newData;
    },

    // ✅ แก้ไข: รับ amount เพื่อขายทีละหลายชิ้น
    sellItem(currentData, itemId, amount = 1) {
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