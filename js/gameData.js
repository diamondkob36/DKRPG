export const classStats = {
    knight: {
        name: "อัศวิน",
        img: "image/knight.png", // <-- เพิ่มบรรทัดนี้
        hp: 150,
        maxHp: 150,
        str: 10,
        int: 2,
        agi: 5,
        desc: "ผู้กล้าที่แข็งแกร่งและถึกทน"
    },
    mage: {
        name: "นักเวทย์",
        img: "image/mage.png", // <-- เพิ่มบรรทัดนี้
        hp: 80,
        maxHp: 80,
        str: 3,
        int: 12,
        agi: 4,
        desc: "ผู้ใช้มนตรา พลังทำลายล้างสูงแต่ตัวบาง"
    },
    rogue: {
        name: "โจร",
        img: "image/rogue.png", // <-- เพิ่มบรรทัดนี้
        hp: 100,
        maxHp: 100,
        str: 6,
        int: 4,
        agi: 10,
        desc: "นักลอบสังหาร ว่องไวและแม่นยำ"
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

    // --- อุปกรณ์ (หนักหน่อย) ---
    wooden_sword: {
        id: "wooden_sword", name: "ดาบไม้", icon: "🗡️", desc: "ดาบฝึกหัด (Atk +2)",
        type: "equipment", slot: "main_hand", price: 100, sellPrice: 20,
        stats: { str: 2 }, category: "weapon", inShop: true,
        weight: 2.0 // ⚖️ 2 โล
    },
    iron_sword: {
        id: "iron_sword", name: "ดาบเหล็ก", icon: "⚔️", desc: "ดาบมาตรฐาน (Atk +5)",
        type: "equipment", slot: "main_hand", price: 500, sellPrice: 200,
        stats: { str: 5 }, category: "weapon", inShop: true,
        weight: 5.0
    },
    leather_cap: {
        id: "leather_cap", name: "หมวกหนัง", icon: "🧢", desc: "หมวกธรรมดา (HP +10)",
        type: "equipment", slot: "head", price: 150, sellPrice: 50,
        stats: { maxHp: 10 }, category: "armor", inShop: true,
        weight: 1.5
    },
    cloth_armor: {
        id: "cloth_armor", name: "เสื้อผ้าดิบ", icon: "👕", desc: "ใส่สบาย (HP +20)",
        type: "equipment", slot: "body", price: 200, sellPrice: 60,
        stats: { maxHp: 20 }, category: "armor", inShop: true,
        weight: 3.0
    },
    ring_str: {
        id: "ring_str", name: "แหวนพลัง", icon: "💍", desc: "แหวนเก่าๆ (STR +1)",
        type: "equipment", slot: "accessory", price: 800, sellPrice: 300,
        stats: { str: 1 }, category: "accessory", inShop: true,
        weight: 0.1 // เบาหวิว
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