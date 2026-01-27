// js/game-logic.js (ฉบับแก้ไขสมบูรณ์)
import { classStats, items, skills } from "./gameData.js";

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
            
            // ✅ รี HP เต็ม
            data.hp = data.maxHp;
            
            // ✅ [ใหม่] รี MP เต็ม (สูตร: INT * 10 หรืออย่างน้อย 10)
            data.mp = (data.int * 10) || 10;
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
            
            // ✅ คำนวณ HP Regen ใหม่ (5% ของ MaxHP)
            newData.hpRegen = Math.floor(newData.maxHp * 0.05) || 1;
            
        } else { 
            newData[statType]++; 
            // ถ้าอัป INT ให้เพิ่ม MaxMP และ MP Regen
            if (statType === 'int') {
                newData.mp = (newData.mp || 0) + 10;
                
                // ✅ คำนวณ MP Regen ใหม่ (5% ของ MaxMP)
                const maxMp = newData.int * 10;
                newData.mpRegen = Math.floor(maxMp * 0.05) || 1;
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
        const startMp = base.int * 10;

        // เลือกอาวุธเริ่มต้น
        let startWeaponId = 'wooden_sword';
        if (classKey === 'mage') startWeaponId = 'novice_staff';
        else if (classKey === 'rogue') startWeaponId = 'novice_dagger';

        return {
            name: name, classKey: classKey, className: base.name,
            lvl: 1, exp: 0, maxExp: 100, gold: 0, statPoints: 5,
            hp: base.hp, maxHp: base.maxHp, mp: startMp,
            str: base.str, int: base.int, agi: base.agi,
            
            // ค่า Regen (คงเดิม)
            hpRegen: Math.floor(base.maxHp * 0.05) || 1,
            mpRegen: Math.floor(startMp * 0.05) || 1,

            // ✅ แก้ไข: ดึงค่าจาก base แทนการใส่เลข 0
            def: base.def || 0, 
            critRate: base.critRate || 5, 
            critDmg: base.critDmg || 150, 
            dodge: base.dodge || 0, 
            block: base.block || 0, 
            dmgRed: base.dmgRed || 0, 
            ignoreBlock: base.ignoreBlock || 0,

            inventory: { "potion_s": 3, [startWeaponId]: 1 },
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
        // 1. หาค่าพลังโจมตีพื้นฐาน (Base Damage)
        // มอนสเตอร์อาจใช้ atk, ผู้เล่นใช้ str/int
        let baseDmg = 0;
        
        if (attacker.atk) {
            baseDmg = attacker.atk; // กรณีเป็นมอนสเตอร์ที่มีค่า ATK
        } else if (attacker.classKey === 'mage') {
            baseDmg = (attacker.int || 0) * 2;
        } else {
            baseDmg = (attacker.str || 0) * 2;
        }
        
        // ป้องกัน NaN
        baseDmg = baseDmg || 0;

        // 2. คำนวณ Dodge (หลบหลีก)
        // สูตร: AGI / 4 = โอกาสหลบเพิ่ม 1%
        const agiBonus = Math.floor((defender.agi || 0) / 4);
        const totalDodge = (defender.dodge || 0) + agiBonus;
        
        // สุ่มหลบ (Hit Check)
        const hitChance = 100 - totalDodge;
        // ยอมให้มีโอกาสโดนอย่างน้อย 5% เสมอ
        if (Math.random() * 100 > Math.max(5, hitChance)) {
            return { damage: 0, text: "MISS!", isCrit: false, isBlocked: false };
        }

        // 3. เริ่มคำนวณ Block & Critical
        let finalDmg = baseDmg;
        let isCrit = false;
        
        // เช็ค Block (เอา Ignore Block ของคนตี มาลบโอกาส Block ของคนรับ)
        let blockChance = (defender.block || 0) - (attacker.ignoreBlock || 0);
        let isBlocked = (Math.random() * 100 < blockChance);

        if (isBlocked) {
            // ถ้าบล็อกได้ ลดดาเมจ 50% และไม่ติดคริ
            finalDmg = Math.floor(finalDmg * 0.5);
        } else {
            // ถ้าไม่บล็อก -> เช็คคริติคอล
            if (Math.random() * 100 < (attacker.critRate || 0)) {
                isCrit = true;
                finalDmg = Math.floor(finalDmg * ((attacker.critDmg || 150) / 100));
            }
        }

        // 4. หักลบพลังป้องกัน (Defense)
        // สูตร: Damage - (Def + DmgRed)
        const def = defender.def || 0;
        const dmgRed = defender.dmgRed || 0;
        
        finalDmg -= (def + dmgRed);

        // ✅ รับประกันว่าดาเมจขั้นต่ำคือ 1 (ถ้าโดนตี) และเป็นตัวเลขแน่นอน
        finalDmg = Math.max(1, finalDmg);
        if (isNaN(finalDmg)) finalDmg = 1; // กันเหนียว

        return { 
            damage: finalDmg, 
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
    },
    // 🆕 ฟังก์ชันกดใช้สกิล
    useSkill(currentData, skillId) {
        const newData = { ...currentData };
        const skill = skills[skillId];
        
        if (!skill) throw new Error("ไม่พบสกิล!");

        // 1. เช็คอาชีพ
        if (skill.classReq && skill.classReq !== newData.classKey) {
            throw new Error(`อาชีพของคุณใช้สกิลนี้ไม่ได้ (ต้องการ ${skill.classReq})`);
        }

        // 2. เช็ค MP
        if ((newData.mp || 0) < skill.mpCost) {
            throw new Error("MP ไม่พอ!");
        }

        // 3. เช็ค Cooldown
        const now = Date.now();
        newData.skillCooldowns = newData.skillCooldowns || {}; // สร้างถังเก็บ Cooldown ถ้ายังไม่มี
        const readyTime = newData.skillCooldowns[skillId] || 0;

        if (now < readyTime) {
            const waitSec = Math.ceil((readyTime - now) / 1000);
            throw new Error(`สกิลยังไม่พร้อม (เหลือ ${waitSec} วิ)`);
        }

        // --- ผ่านทุกเงื่อนไข เริ่มร่ายสกิล ---
        
        // หัก MP
        newData.mp -= skill.mpCost;

        // ตั้ง Cooldown ใหม่
        newData.skillCooldowns[skillId] = now + (skill.cooldown * 1000);

        // แสดงผลสกิล (Effect: ฟื้นฟูทันที)
        if (skill.effect) {
            if (skill.effect.hp) newData.hp = Math.min(newData.hp + skill.effect.hp, newData.maxHp);
            if (skill.effect.mp) newData.mp = Math.min(newData.mp + skill.effect.mp, (newData.int * 10));
        }

        // แสดงผลสกิล (Buff: เพิ่มสถานะชั่วคราว)
        if (skill.buff) {
            const buffKey = `skill_${skill.id}`;
            const expireTime = now + (skill.buff.duration * 1000);

            newData.activeBuffs = newData.activeBuffs || {};
            
            // ถ้ามีบัพเดิมอยู่ ให้ลบค่าเก่าออกก่อน (กันทับซ้อน)
            if (newData.activeBuffs[buffKey]) {
                newData[skill.buff.type] -= newData.activeBuffs[buffKey].value;
            }

            // บวกค่าใหม่เข้าไป
            newData[skill.buff.type] = (newData[skill.buff.type] || 0) + skill.buff.value;

            // บันทึกลงรายการ Active Buffs
            newData.activeBuffs[buffKey] = {
                itemName: skill.name,
                type: skill.buff.type,
                value: skill.buff.value,
                expiresAt: expireTime,
                icon: skill.icon
            };
        }

        return newData;
    },
};