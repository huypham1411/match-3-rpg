/**
 * Web/src/ui/HUD.js
 * ============================================================================
 * [PSTACK ARCHITECTURE]: TẦNG TRÌNH DIỄN GIAO DIỆN CHIẾN ĐẤU (TACTICAL HUD)
 * 
 * Thiết kế theo phong cách Honkai: Star Rail & Persona 5:
 *  - Không che khuất không gian 3D.
 *  - Thanh Toughness màu trắng (Break Stagger 100% -> 0%).
 *  - 4 Thẻ Hero với vòng nộ tròn SVG và nút dùng Skill có phím tắt (1..4, NumPad 1..4).
 * ============================================================================
 */

import { events } from '../core/EventBus.js';

export class TacticalHUD {
    constructor(gameState) {
        this.state = gameState;
        this.initHUD();
        this.initEventListeners();
    }

    initHUD() {
        const hudContainer = document.createElement('div');
        hudContainer.id = 'hudOverlay';
        hudContainer.innerHTML = `
            <!-- THANH TRẠNG THÁI BOSS TRÊN ĐỈNH -->
            <div class="hud-topbar">
                <div class="boss-hud-card">
                    <div class="boss-info-row">
                        <span class="boss-badge">TRÙM CHƯƠNG 1</span>
                        <span class="boss-name" id="hudBossName">${this.state.boss.name}</span>
                        <span class="boss-intent" id="hudBossIntent">⚠️ ${this.state.boss.intent}</span>
                    </div>
                    <!-- Thanh máu Boss -->
                    <div class="progress-bar-wrap hp-wrap">
                        <div class="progress-bar-fill hp-fill" id="hudBossHpFill" style="width: 100%"></div>
                        <span class="progress-text" id="hudBossHpText">${this.state.boss.hp} / ${this.state.boss.maxHp}</span>
                    </div>
                    <!-- Thanh Stagger Toughness kiểu Honkai Star Rail -->
                    <div class="progress-bar-wrap stagger-wrap">
                        <div class="progress-bar-fill stagger-fill" id="hudBossStaggerFill" style="width: 100%"></div>
                        <span class="progress-text" id="hudBossStaggerText">TOUGHNESS: 100% (STAGGER)</span>
                    </div>
                </div>

                <!-- LƯỢT ĐI & NƯỚC ĐI CÒN LẠI -->
                <div class="turn-counter-badge">
                    <span class="turn-label">TURN <b id="hudTurnNum">1</b></span>
                    <span class="moves-label">NƯỚC ĐI: <b id="hudMovesLeft" style="color:#00f0ff">4 / 4</b></span>
                </div>
            </div>

            <!-- BẢNG THÔNG TIN 4 HERO DƯỚI ĐÁY -->
            <div class="hud-bottombar">
                <div class="squad-container" id="squadContainer">
                    <!-- Sẽ render động 4 thẻ hero -->
                </div>
            </div>
        `;
        document.body.appendChild(hudContainer);

        this.renderHeroes();
    }

    /** Render 4 thẻ Hero với vòng nạp Ultimate SVG */
    renderHeroes() {
        const container = document.getElementById('squadContainer');
        if (!container) return;

        container.innerHTML = this.state.heroes.map((hero, idx) => {
            const roleIcons = { Attacker: '⚔️', Supporter: '✨', Healer: '💚', Defender: '🛡️' };
            const isUltReady = hero.energy >= hero.maxEnergy;

            return `
                <div class="hero-tactical-card ${isUltReady ? 'ult-ready' : ''}" id="heroCard_${idx}">
                    <div class="hero-avatar-wrap" onclick="window.triggerHeroUlt(${idx})">
                        <div class="hero-role-icon">${roleIcons[hero.role] || '⭐'}</div>
                        <!-- Vòng tròn năng lượng SVG -->
                        <svg class="energy-ring-svg" viewBox="0 0 44 44">
                            <circle class="energy-ring-bg" cx="22" cy="22" r="18" />
                            <circle class="energy-ring-fill" id="energyFill_${idx}" cx="22" cy="22" r="18" 
                                style="stroke-dashoffset: ${113 - (hero.energy / hero.maxEnergy) * 113}" />
                        </svg>
                        <span class="ult-kbd-tag">Num${idx + 1}</span>
                    </div>
                    <div class="hero-meta">
                        <div class="hero-name">${hero.name}</div>
                        <div class="hero-role-tag">${hero.role}</div>
                        <!-- Thanh máu Hero -->
                        <div class="hero-hp-bar">
                            <div class="hero-hp-fill" id="heroHpFill_${idx}" style="width: ${(hero.hp / hero.maxHp) * 100}%"></div>
                        </div>
                    </div>
                    <button class="hero-skill-btn" id="heroSkillBtn_${idx}" onclick="window.triggerHeroSkill(${idx})">
                        <span>SKILL</span>
                        <kbd>${idx + 1}</kbd>
                    </button>
                </div>
            `;
        }).join('');
    }

    /** Cập nhật số liệu trên giao diện */
    updateHUD() {
        // Cập nhật Boss
        const hpPercent = (this.state.boss.hp / this.state.boss.maxHp) * 100;
        const staggerPercent = (this.state.boss.stagger / this.state.boss.maxStagger) * 100;

        const hpFill = document.getElementById('hudBossHpFill');
        const hpText = document.getElementById('hudBossHpText');
        const intentEl = document.getElementById('hudBossIntent');

        if (intentEl) {
            if (this.state.boss.isBroken) {
                intentEl.innerHTML = `<span style="color:#ef4444; font-weight:800;">💫 CHOÁNG (BREAK) — ĐÒN HỦY DIỆT BỊ NGẮT!</span>`;
            } else {
                const count = this.state.boss.telegraphCountdown;
                const color = count === 1 ? '#ff0055' : '#fbbf24';
                intentEl.innerHTML = `<span style="color:${color}">⚠️ ${this.state.boss.telegraphName} [${count} TURN NỮA]</span>`;
            }
        }
        if (hpFill) hpFill.style.width = `${Math.max(0, hpPercent)}%`;
        if (hpText) hpText.textContent = `${this.state.boss.hp} / ${this.state.boss.maxHp}`;

        const staggerFill = document.getElementById('hudBossStaggerFill');
        const staggerText = document.getElementById('hudBossStaggerText');
        if (staggerFill) {
            staggerFill.style.width = `${Math.max(0, staggerPercent)}%`;
            if (this.state.boss.isBroken) {
                staggerFill.style.background = '#ef4444';
                if (staggerText) staggerText.textContent = '💥 BROKEN STAGGER (NHẬN X2 DMG!)';
            } else {
                staggerFill.style.background = '#ffffff';
                if (staggerText) staggerText.textContent = `TOUGHNESS: ${Math.round(staggerPercent)}%`;
            }
        }

        // Cập nhật Turn & Nước đi
        const turnEl = document.getElementById('hudTurnNum');
        const movesEl = document.getElementById('hudMovesLeft');
        if (turnEl) turnEl.textContent = this.state.turn;
        if (movesEl) movesEl.textContent = `${this.state.movesLeft} / ${this.state.maxMoves}`;

        // Cập nhật từng Hero
        this.state.heroes.forEach((hero, idx) => {
            const hpBar = document.getElementById(`heroHpFill_${idx}`);
            const energyBar = document.getElementById(`energyFill_${idx}`);
            const card = document.getElementById(`heroCard_${idx}`);

            if (hpBar) hpBar.style.width = `${(hero.hp / hero.maxHp) * 100}%`;
            if (energyBar) {
                const offset = 113 - (hero.energy / hero.maxEnergy) * 113;
                energyBar.style.strokeDashoffset = offset;
            }
            if (card) {
                if (hero.energy >= hero.maxEnergy) {
                    card.classList.add('ult-ready');
                } else {
                    card.classList.remove('ult-ready');
                }
            }
        });
    }

    initEventListeners() {
        events.on('state_updated', () => this.updateHUD());
        events.on('damage_dealt', () => this.updateHUD());
        events.on('heal_triggered', () => this.updateHUD());
        events.on('stagger_broken', () => {
            this.showToast('💥 BOSS BỊ STAGGER BREAK! SÁT THƯƠNG X2 & HỦY CHIÊU!', '#00f0ff');
            this.updateHUD();
        });
        events.on('new_turn_started', () => this.updateHUD());

        events.on('special_created', ({ specialType }) => {
            const names = { 1: 'LASER HÀNG', 2: 'LASER CỘT', 3: 'BOM VORTEX 3X3', 4: 'LỖ ĐEN PRISMATIC' };
            this.showToast(`✨ TẠO NGỌC ĐẶC BIỆT: ${names[specialType] || 'SPECIAL'}!`, '#fbbf24');
        });

        events.on('special_triggered', ({ type, count }) => {
            this.showToast(`🌌 KÍCH HOẠT ${type}: NỔ ${count} KHỐI LIÊN HOÀN!`, '#ec4899');
        });

        events.on('telegraph_unleashed', ({ name, damage }) => {
            this.showToast(`🚨 BOSS TUNG CHIÊU: ${name} (-${damage} DMG)!`, '#ef4444');
        });

        events.on('deflector_blocked', ({ blockedAmount }) => {
            this.showToast(`🛡️ DEFENDER CHẶN THÀNH CÔNG (-${blockedAmount} DMG)!`, '#3b82f6');
        });

        // Phím tắt bàn phím: 1..4 (Skill), NumPad 1..4 (Ultimate)
        window.addEventListener('keydown', (e) => {
            if (['1', '2', '3', '4'].includes(e.key)) {
                const idx = parseInt(e.key) - 1;
                window.triggerHeroSkill(idx);
            } else if (['Numpad1', 'Numpad2', 'Numpad3', 'Numpad4'].includes(e.code)) {
                const idx = parseInt(e.code.replace('Numpad', '')) - 1;
                window.triggerHeroUlt(idx);
            }
        });

        // Hàm toàn cục cho nút bấm HTML gọi
        window.triggerHeroUlt = (idx) => {
            this.state.triggerUltimate(idx);
        };

        window.triggerHeroSkill = (idx) => {
            const h = this.state.heroes[idx];
            if (h && h.skillCd === 0) {
                h.skillCd = h.maxCd;
                events.emit('damage_dealt', { hero: h });
                this.updateHUD();
            }
        };
    }

    /** Hiển thị thông báo chiến đấu nổi bật (Toast Banner) */
    showToast(message, color = '#00f0ff') {
        let toastContainer = document.getElementById('hudToastContainer');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'hudToastContainer';
            toastContainer.style.cssText = 'position:fixed; top:85px; left:50%; transform:translateX(-50%); z-index:100; pointer-events:none; display:flex; flex-direction:column; align-items:center; gap:8px;';
            document.body.appendChild(toastContainer);
        }

        const toast = document.createElement('div');
        toast.style.cssText = `background:rgba(15,23,42,0.92); border:1px solid ${color}; border-radius:8px; padding:8px 16px; color:#fff; font-size:13px; font-weight:700; letter-spacing:0.5px; box-shadow:0 0 16px ${color}66; animation:toastIn 0.3s ease-out;`;
        toast.textContent = message;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.4s';
            setTimeout(() => toast.remove(), 400);
        }, 2200);
    }
}
