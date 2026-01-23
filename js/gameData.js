export const classStats = {
    knight: {
        name: "อัศวิน",
        img: "image/knight.png",
        hp: 200,        // เลือดเยอะสุด
        maxHp: 200,
        str: 10,
        int: 2,
        agi: 3,         // ช้า
        def: 8,          // เกราะหนา (ลดดาเมจตรงๆ 8 หน่วย)
        // ✅ เอกลักษณ์: ถึกทน ยืนชนได้
        block: 15,       // โอกาสบล็อก 15% (ลดดาเมจ 50% เมื่อบล็อกติด)
        dmgRed: 2,       // ลดความเสียหายทุกชนิด 2 หน่วย
        critRate: 5,     // คริยาก (5%)
        critDmg: 150,    // ความแรงคริมาตรฐาน (150%)
        dodge: 0,        // หลบไม่ได้เลย
        ignoreBlock: 0,
        
        desc: "รถถังเดินได้: เกราะหนาและมีโอกาสบล็อกสูง"
    },
    mage: {
        name: "นักเวทย์",
        img: "image/mage.png",
        hp: 80,         // ตัวบางเฉียบ
        maxHp: 80,
        str: 2,
        int: 15,        // เวทย์แรง
        agi: 4,
        def: 1,          // เกราะบางมาก
        // ✅ เอกลักษณ์: ตีแรงทะลุเกราะ (Glass Cannon)
        block: 0,        
        dmgRed: 0,
        critRate: 10,    // คริปานกลาง
        critDmg: 200,    // คริแรงมาก! (200% หรือ 2 เท่า)
        dodge: 5,        // หลบนิดหน่อย
        ignoreBlock: 15, // เจาะเกราะ/เจาะบล็อก 15% (เวทย์ทะลุการป้องกัน)
        
        desc: "พลังทำลายล้าง: คริติคอลรุนแรงและเจาะเกราะ"
    },
    rogue: {
        name: "โจร",
        img: "image/rogue.png",
        hp: 120,        // เลือดปานกลาง
        maxHp: 120,
        str: 7,
        int: 3,
        agi: 12,        // เร็วสุดๆ
        def: 3,
        // ✅ เอกลักษณ์: พริ้วไหวและแม่นยำ
        block: 5,
        dmgRed: 0,
        critRate: 25,    // ติดคริบ่อยสุด (25% หรือ 1 ใน 4)
        critDmg: 170,    // คริแรงใช้ได้
        dodge: 15,       // โอกาสหลบหลีก 15% (ไม่ต้องรับดาเมจเลย)
        ignoreBlock: 10, // ตีจุดอ่อน (เจาะบล็อก 10%)
        desc: "เงามรณะ: หลบหลีกเก่งและโจมตีจุดตาย"
    }
};

// js/gameData.js

export const items = {
    // --- ยา (เบา) ---
    potion_s: {
        id: "potion_s", name: "ยาแดงขวดเล็ก", icon: "🍷", desc: "ฟื้นฟูเลือด 30 หน่วย",
        type: "consumable", price: 50, effect: { hp: 30 }, category: "potion", inShop: true,
        weight: 0.5 // ⚖️ ครึ่งโล
    },
    potion_l: {
        id: "potion_l", name: "ยาแดงขวดใหญ่", icon: "🏺", desc: "ฟื้นฟูเลือด 100 หน่วย",
        type: "consumable", price: 120, sellPrice: 40, effect: { hp: 100 }, category: "potion", inShop: true,
        weight: 1.0 // ⚖️ 1 โล
    },
    elixir: {
        id: "elixir", name: "ยาเพิ่มพลัง", icon: "🧪", desc: "เพิ่ม STR ถาวร +1",
        type: "consumable", price: 500, sellPrice: 200, effect: { str: 1 }, category: "special", inShop: true,
        weight: 0.2
    },
    potion_str_time: {
        id: "potion_str_time", 
        name: "ยาพลังฮึดสู้", 
        icon: "💪", 
        desc: "เพิ่ม STR +5 เป็นเวลา 60 วินาที",
        type: "consumable", 
        price: 300, 
        category: "potion", 
        inShop: true,
        weight: 0.5,
        // ✨ ค่าพิเศษสำหรับบัพ
        buff: {
            type: "str",    // ค่าที่จะเพิ่ม
            value: 5,       // เพิ่มเท่าไหร่
            duration: 60  // อยู่ได้กี่วินาที
        }
    },

// --- อาวุธ (Weapons) ---
    wooden_sword: {
        id: "wooden_sword", name: "ดาบไม้", icon: "🗡️", desc: "ดาบฝึกหัด (Atk +2)",
        type: "equipment", slot: "main_hand", price: 100, sellPrice: 20,
        stats: { str: 2 }, category: "weapon", inShop: true, weight: 2.0
    },
    iron_sword: {
        id: "iron_sword", name: "ดาบเหล็ก", icon: "⚔️", desc: "ดาบมาตรฐาน (Atk +5)",
        type: "equipment", slot: "main_hand", price: 500, sellPrice: 200,
        stats: { str: 5 }, category: "weapon", inShop: true, weight: 5.0
    },
    // 🆕 อาวุธใหม่ (Stat เสริม)
    assassin_dagger: {
        id: "assassin_dagger", name: "มีดนักฆ่า", icon: "🗡️", desc: "คมกริบ (Crit+15%, เจาะ+5%)",
        type: "equipment", slot: "main_hand", price: 1200,
        stats: { str: 10, critRate: 15, ignoreBlock: 5 }, category: "weapon", inShop: true, weight: 1.5
    },

    // --- ชุดเกราะ (Armor) ---
    leather_cap: {
        id: "leather_cap", name: "หมวกหนัง", icon: "🧢", desc: "หมวกธรรมดา (HP +10)",
        type: "equipment", slot: "head", price: 150, sellPrice: 50,
        stats: { maxHp: 10, def: 1 }, category: "armor", inShop: true, weight: 1.5
    },
    cloth_armor: {
        id: "cloth_armor", name: "เสื้อผ้าดิบ", icon: "👕", desc: "ใส่สบาย (HP +20)",
        type: "equipment", slot: "body", price: 200, sellPrice: 60,
        stats: { maxHp: 20, def: 2 }, category: "armor", inShop: true, weight: 3.0
    },
    // 🆕 โล่ใหม่
    wooden_shield: {
        id: "wooden_shield", name: "โล่ไม้", icon: "🛡️", desc: "ป้องกันพื้นฐาน (Block +10%)",
        type: "equipment", slot: "off_hand", price: 300, sellPrice: 100,
        stats: { def: 5, block: 10 }, category: "armor", inShop: true, weight: 3.0
    },

    // --- เครื่องประดับ (Accessory) ---
    ring_str: {
        id: "ring_str", name: "แหวนพลัง", icon: "💍", desc: "แหวนเก่าๆ (STR +1)",
        type: "equipment", slot: "accessory", price: 800, sellPrice: 300,
        stats: { str: 1 }, category: "accessory", inShop: true, weight: 0.1
    },
    // 🆕 แหวนหลบหลีก
    ring_dodge: {
        id: "ring_dodge", name: "แหวนสายลม", icon: "💍", desc: "พริ้วไหว (Dodge +5%)",
        type: "equipment", slot: "accessory", price: 800,
        stats: { dodge: 5 }, category: "accessory", inShop: true, weight: 0.1
    },
    
    // --- ขยะ (Loot) ---
    slime_gel: {
        id: "slime_gel", name: "เจลสไลม์", icon: "💧", desc: "ของดรอปจากสไลม์",
        type: "material", price: 0, sellPrice: 15, category: "loot", inShop: false,
        weight: 0.2
    },
    wolf_fang: {
        id: "wolf_fang", name: "เขี้ยวหมาป่า", icon: "🐺", desc: "เขี้ยวแหลมคม",
        type: "material", price: 0, sellPrice: 30, category: "loot", inShop: false,
        weight: 0.1
    }
};

// นิยามช่องสวมใส่ (Slot Definition) เพื่อใช้สร้าง UI
export const equipmentSlots = [
    { id: "head", icon: "🧢", name: "ศีรษะ" },
    { id: "main_hand", icon: "⚔️", name: "มือขวา" },
    { id: "body", icon: "👕", name: "ลำตัว" },
    { id: "off_hand", icon: "🛡️", name: "มือซ้าย" },
    { id: "legs", icon: "👖", name: "กางเกง" },
    { id: "feet", icon: "👢", name: "รองเท้า" },
    { id: "accessory", icon: "💍", name: "ประดับ" },
    { id: "extra_1", icon: "⭐", name: "เสริม 1" },
    { id: "extra_2", icon: "⭐", name: "เสริม 2" },
    { id: "extra_3", icon: "⭐", name: "เสริม 3" }
];