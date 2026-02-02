// js/game-logic.js (ฉบับแก้ไขสมบูรณ์)
import { classStats, items, skills } from "./gameData.js";

export const getMaxMp = (baseMp, int) => {
    return (baseMp || 100) + (int * 10); 
};
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
            data.mp = getMaxMp(data.int); // รีมานาให้เต็มตามขีดจำกัดใหม่
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
            newData.hpRegen = Math.floor(newData.maxHp * 0.05) || 1;
        } else { 
            newData[statType]++; 
            if (statType === 'int') {
                const newMaxMp = getMaxMp(newData.baseMp, newData.int);
                newData.maxMp = newMaxMp;
                newData.mp += 10; // เพิ่ม 10 หน่วยต่อ 1 INT
                newData.mpRegen = Math.floor(newMaxMp * 0.05) || 1;
            }
        }
        return newData;
    }, 

    downgradeStat(currentData, originalData, statType) {
        const newData = { ...currentData };
        let currentVal = (statType === 'hp') ? newData.maxHp : newData[statType];
        let originalVal = (statType === 'hp') ? originalData.maxHp : originalData[statType];

        if (currentVal <= originalVal) throw new Error("ลดต่ำกว่าค่าเริ่มต้นไม่ได้!");
        
        newData.statPoints++;

        if(statType === 'hp') { 
            newData.maxHp -= 10; 
            newData.hp = Math.max(1, newData.hp - 10); 
            
            // ✅ คำนวณ HP Regen ใหม่
            newData.hpRegen = Math.floor(newData.maxHp * 0.05) || 1;
            
        } else { 
            newData[statType]--; 
            if (statType === 'int') {
                // ✅ คำนวณ MP Regen ใหม่
                const maxMp = newData.int * 10;
                newData.mpRegen = Math.floor(maxMp * 0.05) || 1;
            }
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
        const initialMaxMp = getMaxMp(base.baseMp, base.int);

        let startWeaponId = 'wooden_sword';
        if (classKey === 'mage') startWeaponId = 'novice_staff';
        else if (classKey === 'rogue') startWeaponId = 'novice_dagger';

        // --- 🆕 ส่วนที่เพิ่ม: แจกสกิลเริ่มต้นเลเวล 1 ---
        const startingSkills = {};
        const startingLoadout = [null, null, null, null, null, null]; // 6 ช่อง
        
        let slotIndex = 0;
        for (const [id, skill] of Object.entries(skills)) {
            // เรียนสกิลทั้งหมดของอาชีพตัวเอง เริ่มที่ Lv.1
            if (skill.classReq === classKey) {
                startingSkills[id] = 1;
                // ติดตั้งลงช่องว่างให้อัตโนมัติ (ไม่เกิน 6 ช่อง)
                if (slotIndex < 6) {
                    startingLoadout[slotIndex] = id;
                    slotIndex++;
                }
            }
        }

        return {
            name: name, 
            classKey: classKey, 
            className: base.name,
            lvl: 1, exp: 0, maxExp: 100, 
            gold: 0, statPoints: 5,
            
            // Stats พื้นฐาน
            baseMp: base.baseMp || 100, 
            hp: base.hp, maxHp: base.maxHp, 
            mp: initialMaxMp, maxMp: initialMaxMp,
            str: base.str, int: base.int, agi: base.agi, def: base.def || 0,
            
            // Combat Stats
            block: base.block || 0, dmgRed: base.dmgRed || 0,
            critRate: base.critRate || 0, critDmg: base.critDmg || 150,
            dodge: base.dodge || 0, ignoreBlock: base.ignoreBlock || 0, acc: base.acc || 0,

            hpRegen: Math.floor(base.maxHp * 0.05) || 1,
            mpRegen: Math.floor(initialMaxMp * 0.05) || 1,
            
            inventory: { "potion_s": 3, [startWeaponId]: 1 },
            equipment: {},
            activeBuffs: {},
            maxSlots: 32, maxWeight: 60,

            // ✅ บันทึกข้อมูลสกิล
            skills: startingSkills,   
            loadout: startingLoadout 
        };
    },

    upgradeSkill(currentData, skillId) {
        const newData = { ...currentData };
        newData.skills = newData.skills || {};
        
        const currentLevel = newData.skills[skillId] || 0;
        const skill = skills[skillId];

        if (!skill) throw new Error("ไม่พบข้อมูลสกิล");
        if (currentLevel === 0) throw new Error("คุณยังไม่ได้เรียนสกิลนี้");
        if (currentLevel >= (skill.maxLevel || 10)) throw new Error("สกิลเลเวลตันแล้ว!");

        // สูตรคำนวณราคา: (Level + 1) * 200 Gold
        const cost = (currentLevel + 1) * 200;

        if (newData.gold < cost) throw new Error(`เงินไม่พอ! (ต้องการ ${cost} G)`);

        newData.gold -= cost;
        newData.skills[skillId] = currentLevel + 1; // เพิ่มเลเวล

        return newData;
    },

    equipSkillToSlot(currentData, skillId, slotIndex) {
        const newData = { ...currentData };
        // Clone array เพื่อความปลอดภัย
        newData.loadout = [...(newData.loadout || [null,null,null,null,null,null])];

        if (slotIndex < 0 || slotIndex >= 6) throw new Error("ช่องสกิลไม่ถูกต้อง");

        // กรณีถอดสกิล (skillId เป็น null)
        if (skillId === null) {
            newData.loadout[slotIndex] = null;
            return newData;
        }

        // กรณีใส่สกิล: ต้องเช็คว่าเรียนหรือยัง
        if (!newData.skills || !newData.skills[skillId]) {
            throw new Error("คุณยังไม่ได้เรียนสกิลนี้");
        }

        // ถ้าสกิลนี้ถูกใส่อยู่ช่องอื่น ให้ลบออกจากช่องเดิมก่อน (ย้ายช่อง)
        const existingIndex = newData.loadout.indexOf(skillId);
        if (existingIndex !== -1 && existingIndex !== slotIndex) {
            newData.loadout[existingIndex] = null;
        }

        newData.loadout[slotIndex] = skillId;
        return newData;
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
        // ✅ 1. ทำ Deep Copy (สร้างกระเป๋าและช่องสวมใส่ใบใหม่ แยกจากของเดิมขาดจากกัน)
        const newData = { 
            ...currentData,
            inventory: { ...currentData.inventory }, 
            equipment: { ...currentData.equipment }
        };

        // 2. เช็คว่ามีของในกระเป๋าไหม (เช็คจากกระเป๋าใบใหม่)
        if (!newData.inventory[itemId] || newData.inventory[itemId] <= 0) {
             throw new Error("ไม่มีไอเทมนี้!");
        }

        const item = items[itemId];
        
        // 3. เช็คเงื่อนไขต่างๆ
        if (item.type !== 'equipment') throw new Error("ไอเทมนี้สวมใส่ไม่ได้!");

        if (item.allowedClasses) {
            if (!item.allowedClasses.includes(newData.classKey)) {
                throw new Error(`อาชีพของคุณไม่สามารถสวมใส่ไอเทมนี้ได้!`);
            }
        }

        const slot = targetSlot || item.slot;

        // 4. ถอดของเก่า (ถ้ามี)
        if (newData.equipment[slot]) {
            const oldItemId = newData.equipment[slot];
            
            // คืนของเก่าเข้ากระเป๋า (ปลอดภัยแล้ว เพราะเป็นกระเป๋าใบใหม่)
            newData.inventory[oldItemId] = (newData.inventory[oldItemId] || 0) + 1;
            
            // ลบ Stat ของเก่า
            const oldItem = items[oldItemId];
            if(oldItem.stats) {
                for (const [key, val] of Object.entries(oldItem.stats)) {
                    if (newData[key] !== undefined) newData[key] -= val;
                }
            }
        }

        // 5. สวมของใหม่
        newData.equipment[slot] = itemId;
        
        // ลดจำนวนในกระเป๋า
        newData.inventory[itemId]--;
        
        // ถ้าเหลือ 0 ให้ลบ key ทิ้ง
        if (newData.inventory[itemId] <= 0) delete newData.inventory[itemId];

        // 6. บวก Stat ของใหม่
        if(item.stats) {
            for (const [key, val] of Object.entries(item.stats)) {
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
        // ✅ ทำ Deep Copy เหมือนกัน
        const newData = { 
            ...currentData,
            inventory: { ...currentData.inventory },
            equipment: { ...currentData.equipment }
        };

        const itemId = newData.equipment[slot];
        if (!itemId) throw new Error("ไม่มีไอเทม");
        const item = items[itemId];

        // ถอดของ
        delete newData.equipment[slot];
        
        // คืนของเข้ากระเป๋า
        newData.inventory[itemId] = (newData.inventory[itemId] || 0) + 1;

        // ลบ Stat
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
        // 1. Base Damage
        let baseDmg = 0;
        if (attacker.atk) {
            baseDmg = attacker.atk;
        } else if (attacker.classKey === 'mage' || (attacker.int || 0) > (attacker.str || 0)) {
            baseDmg = (attacker.int || 0) * 2;
        } else {
            baseDmg = (attacker.str || 0) * 2;
        }
        baseDmg = baseDmg || 0;

        // 2. Dodge & Accuracy
        const agiBonus = Math.floor((defender.agi || 0) / 4);
        const totalDodge = (defender.dodge || 0) + agiBonus;
        // โอกาสหลบ = Dodgeศัตรู - Accเรา (ต่ำสุดคือ 0)
        const effectiveDodge = Math.max(0, totalDodge - (attacker.acc || 0));
        
        const hitChance = 100 - effectiveDodge;

        if (Math.random() * 100 > Math.max(5, hitChance)) {
            return { damage: 0, text: "MISS!", isCrit: false, isBlocked: false };
        }

        // 3. Block & Crit
        let finalDmg = baseDmg;
        let isCrit = false;
        
        let blockChance = (defender.block || 0) - (attacker.ignoreBlock || 0);
        let isBlocked = (Math.random() * 100 < blockChance);

        if (isBlocked) {
            finalDmg = Math.floor(finalDmg * 0.5);
        } else {
            if (Math.random() * 100 < (attacker.critRate || 0)) {
                isCrit = true;
                finalDmg = Math.floor(finalDmg * ((attacker.critDmg || 150) / 100));
            }
        }

        // 4. Defense & Pierce
        let def = defender.def || 0;
        
        // Pierce: เจาะเกราะ 60%
        if ((attacker.ignoreBlock || 0) > 0) {
            def = Math.floor(def * 0.4); 
        }
        
        // หักลบพลังป้องกันก่อน
        finalDmg -= def;

        // ✅ แก้ไข: คำนวณ DmgRed เป็น % (สูงสุด 40%)
        // ค่านี้จะลดดาเมจในตอนท้ายสุด โดยไม่สน Def
        let dmgRedPct = defender.dmgRed || 0;
        dmgRedPct = Math.min(40, dmgRedPct); // ล็อคเพดานที่ 40%

        if (dmgRedPct > 0) {
            finalDmg = Math.floor(finalDmg * (1 - (dmgRedPct / 100)));
        }

        // การันตีดาเมจขั้นต่ำ 1
        finalDmg = Math.max(1, finalDmg);
        if (isNaN(finalDmg)) finalDmg = 1;

        return { 
            damage: finalDmg, 
            isCrit: isCrit, 
            isBlocked: isBlocked 
        };
    },

    useItem(currentData, itemId) {
        const newData = { ...currentData };
        
        // ตรวจสอบไอเทม
        if (!newData.inventory || !newData.inventory[itemId] || newData.inventory[itemId] <= 0) {
            throw new Error("ไม่มีไอเทมนี้!");
        }
        const item = items[itemId];

        // 1. กรณีเป็นยาเพิ่มค่าทันที (Effect)
        if (item.effect) {
            if (item.effect.hp) newData.hp = Math.min(newData.hp + item.effect.hp, newData.maxHp);
            
            if (item.effect.mp) { 
                const maxMp = (newData.baseMp || 100) + (newData.int * 10);
                newData.mp = Math.min((newData.mp || 0) + item.effect.mp, maxMp);
            }
            
            if (item.effect.str) newData.str += item.effect.str;
        }

        // 2. กรณีเป็นยาบัพต่อเนื่อง (Buff)
        if (item.buff) {
            const buffKey = `buff_${item.buff.type}`;
            const currentTime = Date.now();
            const expireTime = currentTime + (item.buff.duration * 1000);

            newData.activeBuffs = newData.activeBuffs || {};
            
            // ถ้ามีบัพเดิมซ้ำ ให้ลบค่าเก่าออกก่อน
            if (newData.activeBuffs[buffKey]) {
                newData[item.buff.type] -= newData.activeBuffs[buffKey].value;
            }

            // บวกค่า Stat ใหม่
            newData[item.buff.type] += item.buff.value;

            // ✅ บันทึกข้อมูลลง Active Buffs
            newData.activeBuffs[buffKey] = {
                itemName: item.name,
                type: item.buff.type,
                value: item.buff.value,
                expiresAt: expireTime,
                icon: item.icon,
                
                // ✅ จุดที่แก้ไข: เลือกรูปภาพบัพเฉพาะ (buffImg) ก่อน -> ถ้าไม่มีใช้รูปยา (img)
                img: item.buffImg || item.img 
            };
        }

        // ตัดของออกจากกระเป๋า
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
    },
    // 🆕 ฟังก์ชันกดใช้สกิล
    useSkill(currentData, skillId) {
        const newData = { ...currentData };
        const skill = skills[skillId];
        
        if (!skill) throw new Error("ไม่พบสกิล!");

        // --- 🆕 เช็คว่าเรียนหรือยัง ---
        if (!newData.skills || !newData.skills[skillId]) {
            throw new Error("คุณยังไม่ได้เรียนสกิลนี้!");
        }

        if (skill.classReq && skill.classReq !== newData.classKey) {
            throw new Error(`อาชีพของคุณใช้สกิลนี้ไม่ได้`);
        }

        // (อนาคต: สามารถเพิ่ม MP Cost ตามเลเวลได้ตรงนี้)
        const realMpCost = skill.mpCost;

        if ((newData.mp || 0) < realMpCost) {
            throw new Error("MP ไม่พอ!");
        }

        const now = Date.now();
        newData.skillCooldowns = newData.skillCooldowns || {}; 
        const readyTime = newData.skillCooldowns[skillId] || 0;

        if (now < readyTime) {
            const waitSec = Math.ceil((readyTime - now) / 1000);
            throw new Error(`สกิลยังไม่พร้อม (เหลือ ${waitSec} วิ)`);
        }

        // --- ใช้สกิล ---
        newData.mp -= realMpCost;
        newData.skillCooldowns[skillId] = now + (skill.cooldown * 1000);

        // ดึงเลเวลสกิลมาใช้คำนวณ
        const skillLvl = newData.skills[skillId];
        const multiplier = 1 + ((skillLvl - 1) * 0.1); // ตัวคูณ 10% ต่อเลเวล

        // Effect (Heal/Mana)
        if (skill.effect) {
            if (skill.effect.hp) {
                // ฮีลแรงขึ้นตามเลเวล
                const healAmt = Math.floor(skill.effect.hp * multiplier);
                newData.hp = Math.min(newData.hp + healAmt, newData.maxHp);
            }
            if (skill.effect.mp) {
                const manaAmt = Math.floor(skill.effect.mp * multiplier);
                newData.mp = Math.min(newData.mp + manaAmt, (newData.int * 10));
            }
        }

        // Buff (Status)
        if (skill.buff) {
            const buffKey = `skill_${skill.id}`;
            const expireTime = now + (skill.buff.duration * 1000);
            
            // บัพเพิ่มค่าสถานะแรงขึ้น 5% ต่อเลเวล
            const buffValue = Math.floor(skill.buff.value * (1 + (skillLvl-1)*0.05));

            newData.activeBuffs = newData.activeBuffs || {};
            
            if (newData.activeBuffs[buffKey]) {
                newData[skill.buff.type] -= newData.activeBuffs[buffKey].value;
            }

            newData[skill.buff.type] = (newData[skill.buff.type] || 0) + buffValue;

            newData.activeBuffs[buffKey] = {
                itemName: skill.name,
                type: skill.buff.type,
                value: buffValue,
                expiresAt: expireTime,
                icon: skill.icon,
                isBattleOnly: skill.isBattleOnly || skill.buff.isBattleOnly || false,
                img: skill.img 
            };
        }

        return newData;
    },
    // ✅ ฟังก์ชันคำนวณดาเมจสกิล (ใช้ Stat ผู้เล่น 100% + คิด Hit/Block/Crit/Def)
    calculateSkillDamage(attacker, defender, skill) {
        // หาเลเวลของสกิล (ถ้าเป็นมอนสเตอร์ให้ถือว่าเป็นเลเวล 1)
        const skillLvl = (attacker.skills && attacker.skills[skill.id]) ? attacker.skills[skill.id] : 1;
        
        // 1. คำนวณดาเมจตั้งต้น (Scaling)
        let dmg = 0;
        if (skill.scale) {
            if (skill.scale.str) dmg += (attacker.str || 0) * skill.scale.str;
            if (skill.scale.int) dmg += (attacker.int || 0) * skill.scale.int;
        }
        if (dmg === 0) dmg = (attacker.str || 0);

        // --- 🆕 ส่วนที่เพิ่ม: Level Multiplier (+10% ต่อเลเวล) ---
        // สูตร: Damage * (1 + (Level - 1) * 0.1)
        const levelMultiplier = 1 + ((skillLvl - 1) * 0.1);
        dmg = Math.floor(dmg * levelMultiplier);
        // -----------------------------------------------------

        // 2. Hit Chance
        const agiBonus = Math.floor((defender.agi || 0) / 4);
        const totalDodge = (defender.dodge || 0) + agiBonus;
        const effectiveDodge = Math.max(0, totalDodge - (attacker.acc || 0));
        const hitChance = 100 - effectiveDodge;

        if (Math.random() * 100 > Math.max(5, hitChance)) {
            return { damage: 0, text: "MISS!", isCrit: false, isBlocked: false };
        }

        // 3. Block
        let isBlocked = false;
        let blockChance = (defender.block || 0) - (attacker.ignoreBlock || 0);
        if (Math.random() * 100 < blockChance) {
            isBlocked = true;
            dmg = Math.floor(dmg * 0.5);
        }

        // 4. Crit
        let isCrit = false;
        if (Math.random() * 100 < (attacker.critRate || 0)) {
            isCrit = true;
            dmg = Math.floor(dmg * ((attacker.critDmg || 150) / 100));
        }

        // 5. Def & Pierce
        let def = defender.def || 0;
        if ((attacker.ignoreBlock || 0) > 0) def = Math.floor(def * 0.4); 
        dmg -= def;

        // 6. DmgRed
        let dmgRed = Math.min(40, defender.dmgRed || 0);
        if (dmgRed > 0) dmg = Math.floor(dmg * (1 - dmgRed/100));

        return { damage: Math.max(1, dmg), isCrit, isBlocked };
    },
};