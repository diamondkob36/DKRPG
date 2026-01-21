// js/game-logic.js
import { classStats, items } from "./gameData.js";

export const GameLogic = {
    // 🛠️ Helper: คำนวณ MaxExp ตามสูตร "คูณ 2 ทุก 10 เลเวล"
    calculateMaxExp(lvl) {
        // หารเลเวลด้วย 10 เพื่อหา Tier (เช่น เลเวล 1-10 คือ Tier 0, 11-20 คือ Tier 1)
        const tier = Math.floor((lvl - 1) / 10);
        // สูตร: 100 * (2 ยกกำลัง Tier)
        return 100 * Math.pow(2, tier);
    },

    // 🛠️ Helper: ฟังก์ชันเพิ่ม Exp และจัดการ Level Up
    addExp(data, amount) {
        // กันเหนียว: ถ้าไม่มีค่า exp ให้เริ่มที่ 0
        data.exp = (data.exp || 0) + amount;
        data.maxExp = data.maxExp || this.calculateMaxExp(data.lvl);

        // วนลูปเช็คเลเวลอัป (เผื่อได้ exp เยอะจนอัปหลายเวลรวด)
        while (data.exp >= data.maxExp) {
            data.exp -= data.maxExp; // หัก Exp ที่ใช้ไป
            data.lvl++;             // เพิ่มเลเวล
            
            // คำนวณ MaxExp ของเลเวลชั้นถัดไป
            data.maxExp = this.calculateMaxExp(data.lvl);

            // ได้แต้มอัปเกรด 5 แต้ม
            data.statPoints = (data.statPoints || 0) + 5;
            
            // เลเวลอัปเลือดเต็มทันที
            data.hp = data.maxHp;
        }
        return data;
    },

    // 1. สูตรฝึกดาบ (เปลี่ยนเป็นได้ Exp)
    train(currentData) {
        const newData = { ...currentData };
        // สมมติ: ฝึก 1 ครั้ง ได้ 20 Exp (ปรับค่านี้ได้ตามใจชอบ)
        return this.addExp(newData, 20);
    },

    // 2. สูตรอัปเกรดค่าพลัง (คงเดิม)
    upgradeStat(currentData, statType) {
        const newData = { ...currentData };
        
        if (!newData.statPoints || newData.statPoints <= 0) {
            throw new Error("แต้มไม่พอ!");
        }

        newData.statPoints--;

        switch (statType) {
            case 'str': newData.str += 1; break;
            case 'int': newData.int += 1; break;
            case 'agi': newData.agi += 1; break;
            case 'hp':  
                newData.maxHp += 10;
                newData.hp += 10;
                break;
        }
        return newData;
    },

    // 3. สูตรฟาร์ม (คงเดิม)
    farm(currentData) {
        const newData = { ...currentData };
        newData.gold += 100;
        return newData;
    },

// 👇 2. แก้ไข createCharacter (เพิ่ม inventory: {}) 👇
    createCharacter(name, classKey) {
        const base = classStats[classKey];
        return {
            name: name,
            classKey: classKey,
            className: base.name,
            lvl: 1,
            exp: 0,
            maxExp: 100,
            gold: 0,
            statPoints: 5,
            hp: base.hp,
            maxHp: base.maxHp,
            str: base.str,
            int: base.int,
            agi: base.agi,
            inventory: { "potion_s": 3 } // 🎁 แถมยาให้ 3 ขวดตอนเริ่มเกม!
        };
    },

    // 👇 เพิ่มฟังก์ชันนี้: ลดสเตตัส (คืนแต้ม) 👇
    downgradeStat(currentData, originalData, statType) {
        const newData = { ...currentData };

        // เช็คว่าค่าปัจจุบัน มากกว่า ค่าเริ่มต้นไหม? (กันไม่ให้ลดต่ำกว่าเดิม)
        let currentVal = (statType === 'hp') ? newData.maxHp : newData[statType];
        let originalVal = (statType === 'hp') ? originalData.maxHp : originalData[statType];

        if (currentVal <= originalVal) {
            throw new Error("ไม่สามารถลดต่ำกว่าค่าเริ่มต้นได้!");
        }

        // คืนแต้ม
        newData.statPoints++;

        // ลดค่าพลัง
        switch (statType) {
            case 'str': newData.str -= 1; break;
            case 'int': newData.int -= 1; break;
            case 'agi': newData.agi -= 1; break;
            case 'hp':  
                newData.maxHp -= 10;
                newData.hp -= 10; // ลดเลือดปัจจุบันด้วย
                break;
        }
        return newData;
    },
    // 👇 1. เพิ่มฟังก์ชันกดใช้ไอเทม 👇
    useItem(currentData, itemId) {
        const newData = { ...currentData };
        
        // เช็คว่ามีของไหม?
        if (!newData.inventory || !newData.inventory[itemId] || newData.inventory[itemId] <= 0) {
            throw new Error("ไม่มีไอเทมนี้!");
        }

        const itemData = items[itemId];
        if (!itemData) throw new Error("ไอเทมไม่ถูกต้อง");

        // ใช้ Effect
        if (itemData.effect.hp) {
            newData.hp = Math.min(newData.hp + itemData.effect.hp, newData.maxHp);
        }
        if (itemData.effect.str) newData.str += itemData.effect.str;
        // (เพิ่ม effect อื่นๆ ตรงนี้ได้ในอนาคต)

        // ลดจำนวนไอเทม
        newData.inventory[itemId]--;
        if (newData.inventory[itemId] <= 0) {
            delete newData.inventory[itemId]; // หมดแล้วลบออกจากกระเป๋า
        }

        return newData;
    },
    // 👇 เพิ่มฟังก์ชันนี้: ซื้อไอเทม 👇
    buyItem(currentData, itemId) {
        const newData = { ...currentData };
        const item = items[itemId];

        if (!item) throw new Error("สินค้าไม่ถูกต้อง");
        
        // 1. เช็คเงิน
        if (newData.gold < item.price) {
            throw new Error("เงินไม่พอ! (ขาดอีก " + (item.price - newData.gold) + " G)");
        }

        // 2. หักเงิน
        newData.gold -= item.price;

        // 3. เพิ่มของเข้ากระเป๋า
        newData.inventory = newData.inventory || {};
        newData.inventory[itemId] = (newData.inventory[itemId] || 0) + 1;

        return newData;
    },
    // 👇 เพิ่มฟังก์ชันนี้: ขายไอเทม 👇
    sellItem(currentData, itemId) {
        const newData = { ...currentData };
        
        // เช็คว่ามีของที่จะขายไหม
        if (!newData.inventory || !newData.inventory[itemId] || newData.inventory[itemId] <= 0) {
            throw new Error("ไม่มีไอเทมนี้ในกระเป๋า!");
        }

        const item = items[itemId];
        if (!item) throw new Error("ข้อมูลไอเทมผิดพลาด");

        // 💰 สูตรราคาขาย: ราคาเต็ม หาร 2 (ปัดเศษลง)
        // ถ้าไอเทมราคา 0 (เช่นของเควส) จะขายไม่ได้ราคา
        const sellPrice = Math.floor(item.price / 2);

        if (sellPrice <= 0) {
             throw new Error("ไอเทมนี้ขายไม่ได้!");
        }

        // 1. เพิ่มเงิน
        newData.gold += sellPrice;

        // 2. ลบของออกจากกระเป๋า
        newData.inventory[itemId]--;
        if (newData.inventory[itemId] <= 0) {
            delete newData.inventory[itemId];
        }

        return newData;
    }
};