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
        acc: 0,
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
        acc: 5,
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
        acc: 10,
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
        name: "ยาแดงขวดเล็ก", img: "image/items/potion_s.png", icon: "🍷", desc: "ฟื้นฟูเลือด 30 หน่วย",
        type: "consumable", category: "potion", 
        price: 50, weight: 0.5, inShop: true,
        effect: { hp: 30 }
    },
    potion_l: {
        id: "potion_l", 
        name: "ยาแดงขวดใหญ่", img: "image/items/potion_l.png", icon: "🏺", desc: "ฟื้นฟูเลือด 100 หน่วย",
        type: "consumable", category: "potion", 
        price: 120, sellPrice: 40, weight: 1.0, inShop: true,
        effect: { hp: 100 }
    },
    potion_str_time: {
        id: "potion_str_time", 
        name: "ยาพลังฮึดสู้", img: "image/items/potion_str_time.png", icon: "💪", desc: "เพิ่ม STR +5 (3 นาที)",buffImg: "image/buffs/str_time.png",
        type: "consumable", category: "potion", 
        price: 2000, weight: 0.5, inShop: true,
        buff: { type: "str", value: 5, duration: 300 }
    },

    // --- 🧪 หมวดยาพิเศษ (Consumables: Special) ---
    elixir: {
        id: "elixir", 
        name: "ยาเพิ่มพลัง", img: "image/items/elixir.png", icon: "🧪", desc: "เพิ่ม STR ถาวร +1",
        type: "consumable", category: "special", 
        price: 0, sellPrice: 2000, weight: 0.2, inShop: false,
        effect: { str: 1 }
    },

    // --- ⚔️ หมวดอาวุธ (Equipment: Weapon) ---
    wooden_sword: {
        id: "wooden_sword", 
        name: "ดาบไม้", img: "image/items/wooden_sword.png", icon: "🗡️", desc: "ดาบฝึกหัด (Atk +2)",
        type: "equipment", category: "weapon", slot: "main_hand", 
        price: 100, sellPrice: 20, weight: 2.0, inShop: true,
        stats: { str: 2 },
        allowedClasses: ['knight'] 
    },
    novice_dagger: {
        id: "novice_dagger",
        name: "มีดสั้นฝึกหัด", img: "image/items/novice_dagger.png", icon: "🗡️", desc: "เบาและคล่องตัว (Atk +2, Crit +2%)",
        type: "equipment", category: "weapon", slot: "main_hand",
        price: 100, sellPrice: 20, weight: 1.0, inShop: true,
        stats: { str: 2, critRate: 2 },
        allowedClasses: ['rogue']
    },
    novice_staff: {
        id: "novice_staff",
        name: "คทาไม้เก่าๆ", img: "image/items/novice_staff.png", icon: "🪄", desc: "ไม้เท้าฝึกหัดเวทย์ (Int +3)",
        type: "equipment", category: "weapon", slot: "main_hand",
        price: 100, sellPrice: 20, weight: 1.5, inShop: true,
        stats: { int: 3 }, // นักเวทย์ต้องการ INT
        allowedClasses: ['mage']
    },

    iron_sword: {
        id: "iron_sword", 
        name: "ดาบเหล็ก", img: "image/items/iron_sword.png", icon: "⚔️", desc: "ดาบมาตรฐาน (Atk +5)",
        type: "equipment", category: "weapon", slot: "main_hand", 
        price: 500, sellPrice: 200, weight: 5.0, inShop: true,
        stats: { str: 5 },
        allowedClasses: ['knight', 'rogue'] // ⚠️ เฉพาะ Knight และ Rogue
    },
    assassin_dagger: {
        id: "assassin_dagger", 
        name: "มีดนักฆ่า", img: "image/items/assassin_dagger.png", icon: "🗡️", desc: "คมกริบ (Crit+15%, เจาะ+5%)",
        type: "equipment", category: "weapon", slot: "main_hand", 
        price: 1200, weight: 1.5, inShop: true,
        stats: { str: 10, critRate: 15, ignoreBlock: 5 },
        allowedClasses: ['rogue'] // ⚠️ เฉพาะ Rogue
    },
    wooden_shield: {
        id: "wooden_shield", 
        name: "โล่ไม้", img: "image/items/wooden_shield.png", icon: "🛡️", desc: "ป้องกันพื้นฐาน (Block +10%)",
        type: "equipment", category: "weapon", slot: "off_hand", 
        price: 300, sellPrice: 100, weight: 3.0, inShop: true,
        stats: { def: 5, block: 10 },
        allowedClasses: ['knight'] // ⚠️ เฉพาะ Knight
    },

    // --- 🛡️ หมวดเกราะ (Equipment: Armor) ---
    leather_cap: {
        id: "leather_cap", 
        name: "หมวกหนัง", img: "image/items/leather_cap.png", icon: "🧢", desc: "หมวกธรรมดา (HP +10)",
        type: "equipment", category: "armor", slot: "head", 
        price: 150, sellPrice: 50, weight: 1.5, inShop: true,
        stats: { maxHp: 10, def: 1 }
    },
    cloth_armor: {
        id: "cloth_armor", 
        name: "เสื้อผ้าดิบ", img: "image/items/cloth_armor.png", icon: "👕", desc: "ใส่สบาย (HP +20)",
        type: "equipment", category: "armor", slot: "body", 
        price: 200, sellPrice: 60, weight: 3.0, inShop: true,
        stats: { maxHp: 20, def: 2 }
    },

    // --- 💍 หมวดเครื่องประดับ (Equipment: Accessory) ---
    ring_str: {
        id: "ring_str", 
        name: "แหวนพลัง", img: "image/items/ring_str.png", icon: "💍", desc: "แหวนเก่าๆ (STR +1)",
        type: "equipment", category: "accessory", slot: "accessory", 
        price: 800, sellPrice: 300, weight: 0.1, inShop: true,
        stats: { str: 1 }
    },
    ring_dodge: {
        id: "ring_dodge", 
        name: "แหวนสายลม", img: "image/items/ring_dodge.png", icon: "💍", desc: "พริ้วไหว (Dodge +5%)",
        type: "equipment", category: "accessory", slot: "accessory", 
        price: 800, weight: 0.1, inShop: true,
        stats: { dodge: 5 }
    },

    // --- 📦 หมวดขยะ/วัสดุ (Loot) ---
    slime_gel: {
        id: "slime_gel", 
        name: "เจลสไลม์", img: "image/items/slime_gel.png", icon: "💧", desc: "ของดรอปจากสไลม์",
        type: "material", category: "loot", 
        price: 0, sellPrice: 15, weight: 0.2, inShop: false
    },
    wolf_fang: {
        id: "wolf_fang", 
        name: "เขี้ยวหมาป่า", img: "image/items/wolf_fang.png", icon: "🐺", desc: "เขี้ยวแหลมคม",
        type: "material", category: "loot", 
        price: 0, sellPrice: 30, weight: 0.1, inShop: false
    }
};

export const skills = {
    // --- 🛡️ สกิลของ Knight ---
    knight_bash: {
        id: "knight_bash", name: "Heavy Bash", img: "image/skulls/knight_bash.png", icon: "💥",
        desc: "เพิ่มพลังโจมตี (STR +15) นาน 30 วิ",
        mpCost: 10, cooldown: 60,
        classReq: "knight",
        isBattleOnly: true,
        buff: { type: "str", value: 15, duration: 30 }
    },
    knight_fortify: {
        id: "knight_fortify", name: "Iron Skin", img: "image/skulls/knight_fortify.png", icon: "🛡️",
        desc: "ผิวเหล็กไหล (DEF +20) นาน 45 วิ",
        mpCost: 15, cooldown: 90,
        classReq: "knight",
        isBattleOnly: true,
        buff: { type: "def", value: 20, duration: 45 }
    },
    Cross_Cut: {
        id: "Cross_Cut", name: "Cross Cut", img: "image/skulls/Cross_Cut.png", icon: "⚔️",
        desc: "ทุบอย่างแรง (Dmg 180% STR)",
        mpCost: 10, cooldown: 15,
        classReq: "knight",
        isBattleOnly: true,
        scale: { str: 1.8 } // ✅ ใช้ scaling
    },
    knight_break: {
        id: "knight_break", name: "Armor Break", img: "image/skulls/knight_break.png", icon: "🔨",
        desc: "ลดเกราะศัตรู (Dmg 120% STR, Def -15)",
        mpCost: 15, cooldown: 20,
        classReq: "knight",
        isBattleOnly: true,
        scale: { str: 1.2 }, // ✅ scaling
        debuff: { type: "def", value: -15, duration: 20 }
    },

    // --- 🔮 สกิลของ Mage ---
    mage_heal: {
        id: "mage_heal", name: "Minor Heal", img: "image/skulls/mage_heal.png", icon: "✨",
        desc: "ฟื้นฟู HP 50 หน่วย",
        mpCost: 20, cooldown: 30,
        classReq: "mage",
        effect: { hp: 50 } // ผลทันที (Instant)
    },
    mage_meditate: {
        id: "mage_meditate", name: "Focus", img: "image/skulls/mage_meditate.png", icon: "🧘",
        desc: "รวบรวมสมาธิ (INT +15) นาน 20 วิ",
        mpCost: 30, cooldown: 60,
        classReq: "mage",
        isBattleOnly: true,
        buff: { type: "int", value: 15, duration: 20 }
    },
    mage_fireball: {
        id: "mage_fireball", name: "Fireball", img: "image/skulls/mage_fireball.png", icon: "🔥",
        desc: "ปาลูกไฟ (Dmg 250% INT)",
        mpCost: 25, cooldown: 20,
        classReq: "mage",
        isBattleOnly: true,
        scale: { int: 2.5 } // ✅ scaling
    },

    // --- 🗡️ สกิลของ Rogue ---
    rogue_sprint: {
        id: "rogue_sprint", name: "Sprint", img: "image/skulls/rogue_sprint.png", icon: "💨",
        desc: "เร่งความเร็ว (AGI +10) นาน 30 วิ",
        mpCost: 10, cooldown: 45,
        classReq: "rogue",
        isBattleOnly: true,
        buff: { type: "agi", value: 10, duration: 30 }
    },
    rogue_sharpen: {
        id: "rogue_sharpen", name: "Sharpen", img: "image/skulls/rogue_sharpen.png", icon: "🔪",
        desc: "ลับมีด (Crit +10%) นาน 60 วิ",
        mpCost: 15, cooldown: 90,
        classReq: "rogue",
        isBattleOnly: true,
        buff: { type: "critRate", value: 10, duration: 60 }
    },
    rogue_sand: {
        id: "rogue_sand", name: "Sand Throw", img: "image/skulls/rogue_sand.png", icon: "🌫️",
        desc: "ปาทราย (Dmg 120% AGI, Acc -20%)",
        mpCost: 10, cooldown: 30,
        classReq: "rogue",
        isBattleOnly: true,
        scale: { agi: 1.2 }, // ✅ scaling
        debuff: { type: "acc", value: -20, duration: 15 }
    },
};

export const monsters = {
    dummy: {
        id: "dummy", name: "หุ่นซ้อม", img: "image/dummy.png",
        // Base Stats (พื้นฐาน)
        hp: 500, maxHp: 500,
        mp: 100, maxMp: 100,    // ✅ เพิ่ม MP
        str: 5, int: 1, agi: 1, // ✅ เพิ่มสเตตัสหลัก
        
        // Combat Stats (ต่อสู้)
        def: 5, acc: 0,
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
                img: "image/buffs/dummy_passive.png",
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
        acc: 0,
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