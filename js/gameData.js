// js/gameData.js
// รวบรวมข้อมูลพื้นฐานของเกม: อาชีพ, ไอเทม, และช่องสวมใส่

// ===================================================
// 1. ข้อมูลอาชีพ (Class Stats)
// ===================================================
export const classStats = {
    knight: {
        name: "อัศวิน",
        img: "image/knight.png",
        desc: "รถถังเดินได้: เกราะหนาและมีโอกาสบล็อกสูง",
        
        // Base Stats
        hp: 200, maxHp: 200,
        baseMp: 20, // ✅ เพิ่มค่านี้ (รวม INT 2 = 40 MP)
        str: 10, int: 2, agi: 3, def: 8,

        // Combat Stats
        block: 15,
        dmgRed: 2,
        critRate: 5,
        critDmg: 150,
        dodge: 0,
        ignoreBlock: 0
    },

    mage: {
        name: "นักเวทย์",
        img: "image/mage.png",
        desc: "พลังทำลายล้าง: คริติคอลรุนแรงและเจาะเกราะ",

        // Base Stats
        hp: 80, maxHp: 80,
        baseMp: 50, // ✅ เพิ่มค่านี้ (รวม INT 15 = 200 MP)
        str: 2, int: 15, agi: 4, def: 1,

        // Combat Stats
        block: 0,
        dmgRed: 0,
        critRate: 10,
        critDmg: 200,
        dodge: 5,
        ignoreBlock: 15
    },

    rogue: {
        name: "โจร",
        img: "image/rogue.png",
        desc: "เงามรณะ: หลบหลีกเก่งและโจมตีจุดตาย",

        // Base Stats
        hp: 120, maxHp: 120,
        baseMp: 30, // ✅ เพิ่มค่านี้ (รวม INT 3 = 60 MP)
        str: 7, int: 3, agi: 12, def: 3,

        // Combat Stats
        block: 5,
        dmgRed: 0,
        critRate: 25,
        critDmg: 170,
        dodge: 15,
        ignoreBlock: 10
    }
};

// ===================================================
// 2. ข้อมูลไอเทม (Items)
// ===================================================
export const items = {
    
    // --- 🍷 หมวดยา (Consumables: Potion) ---
    potion_s: {
        id: "potion_s", 
        name: "ยาแดงขวดเล็ก", icon: "🍷", desc: "ฟื้นฟูเลือด 30 หน่วย",
        type: "consumable", category: "potion", 
        price: 50, weight: 0.5, inShop: true,
        effect: { hp: 30 }
    },
    potion_l: {
        id: "potion_l", 
        name: "ยาแดงขวดใหญ่", icon: "🏺", desc: "ฟื้นฟูเลือด 100 หน่วย",
        type: "consumable", category: "potion", 
        price: 120, sellPrice: 40, weight: 1.0, inShop: true,
        effect: { hp: 100 }
    },
    potion_str_time: {
        id: "potion_str_time", 
        name: "ยาพลังฮึดสู้", icon: "💪", desc: "เพิ่ม STR +5 (3 นาที)",
        type: "consumable", category: "potion", 
        price: 2000, weight: 0.5, inShop: true,
        buff: { type: "str", value: 5, duration: 300 }
    },

    // --- 🧪 หมวดยาพิเศษ (Consumables: Special) ---
    elixir: {
        id: "elixir", 
        name: "ยาเพิ่มพลัง", icon: "🧪", desc: "เพิ่ม STR ถาวร +1",
        type: "consumable", category: "special", 
        price: 0, sellPrice: 2000, weight: 0.2, inShop: false,
        effect: { str: 1 }
    },

    // --- ⚔️ หมวดอาวุธ (Equipment: Weapon) ---
    wooden_sword: {
        id: "wooden_sword", 
        name: "ดาบไม้", icon: "🗡️", desc: "ดาบฝึกหัด (Atk +2)",
        type: "equipment", category: "weapon", slot: "main_hand", 
        price: 100, sellPrice: 20, weight: 2.0, inShop: true,
        stats: { str: 2 },
        allowedClasses: ['knight'] 
    },
    novice_dagger: {
        id: "novice_dagger",
        name: "มีดสั้นฝึกหัด", icon: "🗡️", desc: "เบาและคล่องตัว (Atk +2, Crit +2%)",
        type: "equipment", category: "weapon", slot: "main_hand",
        price: 100, sellPrice: 20, weight: 1.0, inShop: true,
        stats: { str: 2, critRate: 2 },
        allowedClasses: ['rogue']
    },
    novice_staff: {
        id: "novice_staff",
        name: "คทาไม้เก่าๆ", icon: "🪄", desc: "ไม้เท้าฝึกหัดเวทย์ (Int +3)",
        type: "equipment", category: "weapon", slot: "main_hand",
        price: 100, sellPrice: 20, weight: 1.5, inShop: true,
        stats: { int: 3 }, // นักเวทย์ต้องการ INT
        allowedClasses: ['mage']
    },

    iron_sword: {
        id: "iron_sword", 
        name: "ดาบเหล็ก", icon: "⚔️", desc: "ดาบมาตรฐาน (Atk +5)",
        type: "equipment", category: "weapon", slot: "main_hand", 
        price: 500, sellPrice: 200, weight: 5.0, inShop: true,
        stats: { str: 5 },
        allowedClasses: ['knight', 'rogue'] // ⚠️ เฉพาะ Knight และ Rogue
    },
    assassin_dagger: {
        id: "assassin_dagger", 
        name: "มีดนักฆ่า", icon: "🗡️", desc: "คมกริบ (Crit+15%, เจาะ+5%)",
        type: "equipment", category: "weapon", slot: "main_hand", 
        price: 1200, weight: 1.5, inShop: true,
        stats: { str: 10, critRate: 15, ignoreBlock: 5 },
        allowedClasses: ['rogue'] // ⚠️ เฉพาะ Rogue
    },
    wooden_shield: {
        id: "wooden_shield", 
        name: "โล่ไม้", icon: "🛡️", desc: "ป้องกันพื้นฐาน (Block +10%)",
        type: "equipment", category: "weapon", slot: "off_hand", 
        price: 300, sellPrice: 100, weight: 3.0, inShop: true,
        stats: { def: 5, block: 10 },
        allowedClasses: ['knight'] // ⚠️ เฉพาะ Knight
    },

    // --- 🛡️ หมวดเกราะ (Equipment: Armor) ---
    leather_cap: {
        id: "leather_cap", 
        name: "หมวกหนัง", icon: "🧢", desc: "หมวกธรรมดา (HP +10)",
        type: "equipment", category: "armor", slot: "head", 
        price: 150, sellPrice: 50, weight: 1.5, inShop: true,
        stats: { maxHp: 10, def: 1 }
    },
    cloth_armor: {
        id: "cloth_armor", 
        name: "เสื้อผ้าดิบ", icon: "👕", desc: "ใส่สบาย (HP +20)",
        type: "equipment", category: "armor", slot: "body", 
        price: 200, sellPrice: 60, weight: 3.0, inShop: true,
        stats: { maxHp: 20, def: 2 }
    },

    // --- 💍 หมวดเครื่องประดับ (Equipment: Accessory) ---
    ring_str: {
        id: "ring_str", 
        name: "แหวนพลัง", icon: "💍", desc: "แหวนเก่าๆ (STR +1)",
        type: "equipment", category: "accessory", slot: "accessory", 
        price: 800, sellPrice: 300, weight: 0.1, inShop: true,
        stats: { str: 1 }
    },
    ring_dodge: {
        id: "ring_dodge", 
        name: "แหวนสายลม", icon: "💍", desc: "พริ้วไหว (Dodge +5%)",
        type: "equipment", category: "accessory", slot: "accessory", 
        price: 800, weight: 0.1, inShop: true,
        stats: { dodge: 5 }
    },

    // --- 📦 หมวดขยะ/วัสดุ (Loot) ---
    slime_gel: {
        id: "slime_gel", 
        name: "เจลสไลม์", icon: "💧", desc: "ของดรอปจากสไลม์",
        type: "material", category: "loot", 
        price: 0, sellPrice: 15, weight: 0.2, inShop: false
    },
    wolf_fang: {
        id: "wolf_fang", 
        name: "เขี้ยวหมาป่า", icon: "🐺", desc: "เขี้ยวแหลมคม",
        type: "material", category: "loot", 
        price: 0, sellPrice: 30, weight: 0.1, inShop: false
    }
};

export const skills = {
    // --- 🛡️ สกิลของ Knight ---
    knight_bash: {
        id: "knight_bash", name: "Heavy Bash", icon: "💥",
        desc: "เพิ่มพลังโจมตี (STR +10) นาน 30 วิ",
        mpCost: 10, cooldown: 60,
        classReq: "knight",
        isBattleOnly: true,
        buff: { type: "str", value: 10, duration: 30 }
    },
    knight_fortify: {
        id: "knight_fortify", name: "Iron Skin", icon: "🛡️",
        desc: "ผิวเหล็กไหล (DEF +5) นาน 45 วิ",
        mpCost: 15, cooldown: 90,
        classReq: "knight",
        isBattleOnly: true,
        buff: { type: "def", value: 5, duration: 45 }
    },

    // --- 🔮 สกิลของ Mage ---
    mage_heal: {
        id: "mage_heal", name: "Minor Heal", icon: "✨",
        desc: "ฟื้นฟู HP 50 หน่วย",
        mpCost: 20, cooldown: 30,
        classReq: "mage",
        effect: { hp: 50 } // ผลทันที (Instant)
    },
    mage_meditate: {
        id: "mage_meditate", name: "Focus", icon: "🧘",
        desc: "รวบรวมสมาธิ (INT +15) นาน 20 วิ",
        mpCost: 0, cooldown: 120,
        classReq: "mage",
        isBattleOnly: true,
        buff: { type: "int", value: 15, duration: 20 }
    },

    // --- 🗡️ สกิลของ Rogue ---
    rogue_sprint: {
        id: "rogue_sprint", name: "Sprint", icon: "💨",
        desc: "เร่งความเร็ว (AGI +10) นาน 30 วิ",
        mpCost: 10, cooldown: 45,
        classReq: "rogue",
        isBattleOnly: true,
        buff: { type: "agi", value: 10, duration: 30 }
    },
    rogue_sharpen: {
        id: "rogue_sharpen", name: "Sharpen", icon: "🔪",
        desc: "ลับมีด (Crit +10%) นาน 60 วิ",
        mpCost: 15, cooldown: 90,
        classReq: "rogue",
        isBattleOnly: true,
        buff: { type: "critRate", value: 10, duration: 60 }
    }
};

export const monsters = {
    dummy: {
        id: "dummy", name: "หุ่นซ้อม", img: "image/dummy.png",
        // Base Stats (พื้นฐาน)
        hp: 500, maxHp: 500,
        mp: 100, maxMp: 100,    // ✅ เพิ่ม MP
        str: 5, int: 1, agi: 1, // ✅ เพิ่มสเตตัสหลัก
        
        // Combat Stats (ต่อสู้)
        def: 5, 
        hpRegen: 10, mpRegen: 5, // ✅ เพิ่มค่าพื้นฟู
        critRate: 0, critDmg: 150, 
        dodge: 0, block: 0, dmgRed: 0, ignoreBlock: 0,

        // Rewards
        exp: 50, gold: 10,

        // ✅ บัพติดตัว (Passive Buff)
        activeBuffs: {
            "dummy_passive": {
                itemName: "เกราะฝึกซ้อม",
                type: "def",
                value: 1000,
                expiresAt: 9999999999999, // ตลอดกาล
                icon: "🛡️"
            }
        }
    },

    slime: {
        id: "slime", name: "สไลม์", img: "image/slime.png",
        hp: 100, maxHp: 100,
        mp: 50, maxMp: 50,
        str: 8, int: 2, agi: 3,
        def: 2,
        hpRegen: 5, mpRegen: 1,
        
        // ✅ เพิ่ม/ตรวจสอบค่าเหล่านี้ให้ครบเหมือนผู้เล่น:
        critRate: 5,      // โอกาสคริติคอล (%)
        critDmg: 150,     // แรงคริติคอล (%)
        dodge: 5,         // โอกาสหลบหลีกพื้นฐาน (%)
        block: 0,         // โอกาสบล็อก (%)
        dmgRed: 0,        // ลดดาเมจคงที่
        ignoreBlock: 0,   // เจาะเกราะ/ลดโอกาสบล็อกศัตรู (%)
        
        // Rewards
        exp: 20, gold: 15,
        activeBuffs: {} 
    }
};

// ===================================================
// 3. ข้อมูลช่องสวมใส่ (Equipment Slots)
// ===================================================
export const equipmentSlots = [
    { id: "head",       icon: "🧢", name: "ศีรษะ" },
    { id: "main_hand",  icon: "⚔️", name: "มือขวา" },
    { id: "body",       icon: "👕", name: "ลำตัว" },
    { id: "off_hand",   icon: "🛡️", name: "มือซ้าย" },
    { id: "legs",       icon: "👖", name: "กางเกง" },
    { id: "feet",       icon: "👢", name: "รองเท้า" },
    { id: "accessory",  icon: "💍", name: "ประดับ" },
    { id: "extra_1",    icon: "⭐", name: "เสริม 1" },
    { id: "extra_2",    icon: "⭐", name: "เสริม 2" },
    { id: "extra_3",    icon: "⭐", name: "เสริม 3" }
];