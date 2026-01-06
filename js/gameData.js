// js/gameData.js
export const classStats = {
    knight: {
        name: "อัศวิน",
        hp: 150,
        maxHp: 150,
        str: 10, // โจมตีแรง
        int: 2,
        agi: 5,
        desc: "ผู้กล้าที่แข็งแกร่งและถึกทน"
    },
    mage: {
        name: "นักเวทย์",
        hp: 80,
        maxHp: 80,
        str: 3,
        int: 12, // เวทย์แรง (ใช้ตอนฮีลหรือสกิล)
        agi: 4,
        desc: "ผู้ใช้มนตรา พลังทำลายล้างสูงแต่ตัวบาง"
    },
    rogue: {
        name: "โจร",
        hp: 100,
        maxHp: 100,
        str: 6,
        int: 4,
        agi: 10, // ความเร็วสูง (อาจใช้คำนวณหลบหลีก)
        desc: "นักลอบสังหาร ว่องไวและแม่นยำ"
    }
};