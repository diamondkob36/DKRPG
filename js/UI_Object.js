// 🆕 ฟังก์ชันจัดการ Custom Tooltip
    bindTooltip(element, item) {
        if (!element || !item) return;

        // ลบ title เดิมของ browser ออก
        element.removeAttribute('title');

        element.onmouseenter = () => this.showTooltip(item);
        element.onmousemove = (e) => this.moveTooltip(e);
        element.onmouseleave = () => this.hideTooltip();
    },

    showTooltip(item) {
        const tooltip = document.getElementById('item-tooltip');
        if (!tooltip) return;

        // 1. สร้าง HTML สำหรับ Stats
        let statsHTML = '';
        if (item.stats || item.effect || item.buff) {
            statsHTML += '<div class="tooltip-stats">';
            
            // Stats จากอุปกรณ์
            if (item.stats) {
                if(item.stats.str) statsHTML += `<span class="stat-str">⚔️ STR +${item.stats.str}</span>`;
                if(item.stats.int) statsHTML += `<span class="stat-int">🔥 INT +${item.stats.int}</span>`;
                if(item.stats.agi) statsHTML += `<span class="stat-agi">💨 AGI +${item.stats.agi}</span>`;
                if(item.stats.def) statsHTML += `<span class="stat-def">🛡️ DEF +${item.stats.def}</span>`;
                if(item.stats.block) statsHTML += `<span class="stat-def">🛡️ Block +${item.stats.block}%</span>`;
                if(item.stats.critRate) statsHTML += `<span class="stat-special">⚡ Crit Rate +${item.stats.critRate}%</span>`;
                if(item.stats.critDmg) statsHTML += `<span class="stat-special">💥 Crit Dmg +${item.stats.critDmg}%</span>`;
                if(item.stats.dodge) statsHTML += `<span class="stat-agi">🍃 Dodge +${item.stats.dodge}%</span>`;
                if(item.stats.maxHp) statsHTML += `<span class="stat-str">❤️ HP +${item.stats.maxHp}</span>`;
            }

            // Effect จากยา
            if (item.effect) {
                if(item.effect.hp) statsHTML += `<span class="stat-str">❤️ ฟื้นฟู HP ${item.effect.hp}</span>`;
                if(item.effect.mp) statsHTML += `<span class="stat-int">💧 ฟื้นฟู MP ${item.effect.mp}</span>`;
                if(item.effect.str) statsHTML += `<span class="stat-special">💪 เพิ่ม STR ถาวร +${item.effect.str}</span>`;
            }

            // Buff
            if (item.buff) {
                statsHTML += `<span class="stat-special">⏳ ${item.buff.type.toUpperCase()} +${item.buff.value} (${item.buff.duration}วิ)</span>`;
            }
            
            statsHTML += '</div>';
        }

        // 2. ประกอบร่าง HTML
        tooltip.innerHTML = `
            <div class="tooltip-header">
                <div class="tooltip-icon">${item.icon}</div>
                <div>
                    <div class="tooltip-title">${item.name}</div>
                    <div class="tooltip-type">${item.category || item.type}</div>
                </div>
            </div>
            ${statsHTML}
            <div class="tooltip-desc">${item.desc}</div>
            <div class="tooltip-footer">
                ⚖️ ${item.weight || 0} kg | 💰 ราคา: ${item.price} G
            </div>
        `;

        tooltip.style.display = 'block';
    },

    moveTooltip(e) {
        const tooltip = document.getElementById('item-tooltip');
        if (!tooltip) return;
        
        // คำนวณตำแหน่งไม่ให้ตกขอบจอ
        let x = e.clientX + 15;
        let y = e.clientY + 15;
        
        // ถ้าชิดขวาเกินไป ให้เด้งมาทางซ้าย
        if (x + tooltip.offsetWidth > window.innerWidth) {
            x = e.clientX - tooltip.offsetWidth - 10;
        }
        // ถ้าชิดล่างเกินไป ให้เด้งขึ้นบน
        if (y + tooltip.offsetHeight > window.innerHeight) {
            y = e.clientY - tooltip.offsetHeight - 10;
        }

        tooltip.style.top = y + 'px';
        tooltip.style.left = x + 'px';
    },

    hideTooltip() {
        const tooltip = document.getElementById('item-tooltip');
        if (tooltip) tooltip.style.display = 'none';
    },