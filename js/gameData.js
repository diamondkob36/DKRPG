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
        str: 10, int: 2, agi: 3,def: 8,

        // Combat Stats (เอกลักษณ์: ถึกทน)
        block: 15,       // บล็อก 15%
        dmgRed: 2,       // ลดดาเมจ 2 หน่วย
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
        str: 2, int: 15, agi: 4, def: 1,

        // Combat Stats (เอกลักษณ์: ตีแรงทะลุเกราะ)
        block: 0,
        dmgRed: 0,
        critRate: 10,
        critDmg: 200,    // คริแรง 200%
        dodge: 5,
        ignoreBlock: 15  // เจาะเกราะ 15%
    },

    rogue: {
        name: "โจร",
        img: "image/rogue.png",
        desc: "เงามรณะ: หลบหลีกเก่งและโจมตีจุดตาย",

        // Base Stats
        hp: 120, maxHp: 120,
        str: 7, int: 3, agi: 12, def: 3,

        // Combat Stats (เอกลักษณ์: พริ้วไหว)
        block: 5,
        dmgRed: 0,
        critRate: 25,    // คริบ่อย 25%
        critDmg: 170,
        dodge: 15,       // หลบ 15%
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
        name: "ยาพลังฮึดสู้", icon: "💪", desc: "เพิ่ม STR +5 (60 วิ)",
        type: "consumable", category: "potion", 
        price: 300, weight: 0.5, inShop: true,
        buff: { type: "str", value: 5, duration: 60 }
    },

    // --- 🧪 หมวดยาพิเศษ (Consumables: Special) ---
    elixir: {
        id: "elixir", 
        name: "ยาเพิ่มพลัง", icon: "🧪", desc: "เพิ่ม STR ถาวร +1",
        type: "consumable", category: "special", 
        price: 500, sellPrice: 200, weight: 0.2, inShop: true,
        effect: { str: 1 }
    },

    // --- ⚔️ หมวดอาวุธ (Equipment: Weapon) ---
    wooden_sword: {
        id: "wooden_sword", 
        name: "ดาบไม้", icon: "🗡️", desc: "ดาบฝึกหัด (Atk +2)",
        type: "equipment", category: "weapon", slot: "main_hand", 
        price: 100, sellPrice: 20, weight: 2.0, inShop: true,
        stats: { str: 2 }
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