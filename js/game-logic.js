import { classStats } from "./gameData.js";

export const GameLogic = {
    // สูตรฝึกดาบ
    train(currentData) {
        const newData = { ...currentData }; // ก๊อปปี้ข้อมูลมาแกะ
        newData.lvl++;
        newData.maxHp += 10;
        newData.str += 1;
        newData.hp = newData.maxHp; // เลเวลอัปเลือดเต็ม
        return newData; // ส่งคืนค่าใหม่
    },

    // สูตรฟาร์มของ
    farm(currentData) {
        const newData = { ...currentData };
        newData.gold += 100;
        return newData;
    },

    // สูตรสร้างตัวละครใหม่
    createCharacter(name, classKey) {
        const base = classStats[classKey];
        return {
            name: name,
            classKey: classKey,
            className: base.name,
            lvl: 1,
            gold: 0,
            hp: base.hp,
            maxHp: base.maxHp,
            str: base.str,
            int: base.int,
            agi: base.agi
        };
    }
};