/**
 * Web/src/ui/HUD.js
 * ============================================================================
 * [PSTACK ARCHITECTURE]: TẦNG TRÌNH DIỄN GIAO DIỆN CHIẾN ĐẤU (TACTICAL HUD)
 * 
 * Thiết kế theo phong cách Honkai: Star Rail & Persona 5:
 *  - Không che khuất không gian 3D và bàn Match-3.
 *  - Thanh Toughness màu trắng (Break Stagger 100% -> 0%).
 *  - Cụm điều khiển Turn, Nước đi, Nút Phòng Thủ Sớm (Mitigation) & Điểm Phản Kích (Counter Stacks).
 *  - 4 Thẻ Hero với vòng nộ tròn SVG và nút dùng Skill trực quan (có hiển thị cooldown và phím tắt).
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
                        <span class="boss-badge" id="hudBossBadge">CHƯƠNG ${this.state.currentStageId}</span>
                        <span class="boss-name" id="hudBossName">${this.state.boss.name}</span>
                        <span class="boss-intent" id="hudBossIntent">⚠️ ${this.state.boss.telegraphName || 'Tụ Năng Lượng'}</span>
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

                <!-- CỤM ĐIỀU KHIỂN CHIẾN THUẬT: LƯỢT ĐI, NƯỚC ĐI, PHẢN KÍCH & PHÒNG THỦ -->
                <div class="tactical-command-box">
                    <div class="turn-status-row">
                        <div class="turn-pill">TURN <b id="hudTurnNum">${this.state.turn}</b></div>
                        <div class="moves-pill">NƯỚC ĐI: <b id="hudMovesLeft" style="color:#00f0ff">${this.state.movesLeft} / ${this.state.maxMoves}</b></div>
                        <div class="counter-badge" id="hudCounterBadge" title="Tích lũy từ Match & Combo trong lượt để phản kích sau khi Boss hành động">
                            ⚔️ PHẢN KÍCH: 0
                        </div>
                    </div>
                    <!-- Nút chủ động phòng thủ / kết thúc lượt sớm -->
                    <button id="btnEndTurnEarly" class="defense-hud-btn" onclick="window.endTurnEarly()" title="Kết thúc lượt sớm để giảm sát thương Boss tương ứng với số nước đi chưa dùng">
                        <span class="defense-icon">🛡️</span>
                        <span class="defense-text" id="btnDefenseText">KẾT THÚC LƯỢT (THỦ 100%)</span>
                    </button>
                </div>
            </div>

            <!-- MODAL CHIẾN THẮNG MÀN CHƠI & CHUYỂN CHƯƠNG -->
            <div id="stageVictoryModal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(10,15,30,0.88); z-index:999; justify-content:center; align-items:center; flex-direction:column; gap:16px;">
                <div style="background:#111827; border:2px solid #00f0ff; border-radius:12px; padding:24px; max-width:440px; text-align:center; box-shadow:0 0 30px rgba(0,240,255,0.4);">
                    <div style="font-size:32px; margin-bottom:8px;">🏆</div>
                    <h2 style="color:#00f0ff; margin-bottom:8px;" id="victoryModalTitle">CHIẾN THẮNG CHƯƠNG 1!</h2>
                    <p style="color:#94a3b8; font-size:13px; line-height:1.6; margin-bottom:16px;" id="victoryModalDesc">Trụ canh phòng Sentinel Unit 07 đã bị vô hiệu hóa hoàn toàn.</p>
                    <button onclick="window.loadNextStage()" style="background:linear-gradient(135deg, #00f0ff, #0077ff); color:#000; border:none; padding:12px 28px; border-radius:8px; font-weight:800; font-size:14px; cursor:pointer; box-shadow:0 0 15px rgba(0,240,255,0.6);">
                        TIẾP TỤC CHƯƠNG TIẾP THEO ➔
                    </button>
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

    /** Render 4 thẻ Hero với vòng nạp Ultimate SVG & nút Skill nổi bật */
    renderHeroes() {
        const container = document.getElementById('squadContainer');
        if (!container) return;

        container.innerHTML = this.state.heroes.map((hero, idx) => {
            const roleIcons = { Attacker: '⚔️', Supporter: '✨', Healer: '💚', Defender: '🛡️' };
            const isUltReady = hero.energy >= hero.maxEnergy;
            const isSkillOnCd = hero.skillCd > 0;
            const skillBtnLabel = isSkillOnCd ? `⏳ ${hero.skillCd}T` : `⚡ ${hero.skillName || 'SKILL'}`;

            return `
                <div class="hero-tactical-card ${isUltReady ? 'ult-ready' : ''} ${hero.isDefeated ? 'hero-defeated' : ''}" id="heroCard_${idx}">
                    <div class="hero-avatar-wrap" onclick="window.triggerHeroUlt(${idx})" title="Nhấn để tung Nộ (Ultimate) hoặc nhấn phím NumPad ${idx + 1}">
                        <div class="hero-role-icon">${roleIcons[hero.role] || '⭐'}</div>
                        <!-- Vòng tròn năng lượng SVG -->
                        <svg class="energy-ring-svg" viewBox="0 0 44 44">
                            <circle class="energy-ring-bg" cx="22" cy="22" r="18" />
                            <circle class="energy-ring-fill" id="energyFill_${idx}" cx="22" cy="22" r="18" 
                                style="stroke-dashoffset: ${113 - (hero.energy / hero.maxEnergy) * 113}" />
                        </svg>
                        <span class="ult-label-tag">ULT</span>
                        <span class="ult-kbd-tag">Num${idx + 1}</span>
                    </div>
                    <div class="hero-meta">
                        <div class="hero-header-line">
                            <span class="hero-name">${hero.name.split(' ')[0]}</span>
                            <span class="hero-role-badge role-${hero.role.toLowerCase()}">${hero.role}</span>
                        </div>
                        <!-- Thanh máu Hero -->
                        <div class="hero-hp-bar">
                            <div class="hero-hp-fill" id="heroHpFill_${idx}" style="width: ${(hero.hp / hero.maxHp) * 100}%"></div>
                        </div>
                        <div class="hero-hp-text" id="heroHpText_${idx}">${hero.hp}/${hero.maxHp}</div>
                    </div>
                    <button class="hero-skill-btn ${isSkillOnCd ? 'on-cd' : ''}" id="heroSkillBtn_${idx}" onclick="window.triggerHeroSkill(${idx})" title="${hero.skillDesc || 'Kỹ năng'} (Phím ${idx + 1})">
                        <span class="skill-name-label">${skillBtnLabel}</span>
                        <kbd>${idx + 1}</kbd>
                    </button>
                </div>
            `;
        }).join('');
    }

    /** Cập nhật toàn bộ số liệu thời gian thực trên giao diện */
    updateHUD() {
        // 1. Cập nhật Boss
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

        // 2. Cập nhật Turn & Nước đi
        const turnEl = document.getElementById('hudTurnNum');
        const movesEl = document.getElementById('hudMovesLeft');
        if (turnEl) turnEl.textContent = this.state.turn;
        if (movesEl) movesEl.textContent = `${this.state.movesLeft} / ${this.state.maxMoves}`;

        // 3. Cập nhật Điểm Phản Kích (Counter Stacks)
        const counterBadge = document.getElementById('hudCounterBadge');
        if (counterBadge) {
            const stacks = this.state.counterStacks || 0;
            counterBadge.innerHTML = `⚔️ PHẢN KÍCH: <b>${stacks}</b>`;
            if (stacks > 0) {
                counterBadge.classList.add('has-stacks');
            } else {
                counterBadge.classList.remove('has-stacks');
            }
        }

        // 4. Cập nhật Nút Phòng Thủ Sớm (Mitigation)
        const btnDefense = document.getElementById('btnEndTurnEarly');
        const btnDefenseText = document.getElementById('btnDefenseText');
        if (btnDefense && btnDefenseText) {
            const movesLeft = this.state.movesLeft;
            const pct = Math.round((movesLeft / this.state.maxMoves) * 100);
            if (movesLeft > 0) {
                btnDefense.disabled = false;
                btnDefense.classList.remove('disabled');
                btnDefenseText.textContent = `KẾT THÚC LƯỢT (THỦ ${pct}%)`;
            } else {
                btnDefense.disabled = true;
                btnDefense.classList.add('disabled');
                btnDefenseText.textContent = `⏳ HẾT NƯỚC ĐI`;
            }
        }

        // 5. Cập nhật từng Hero trong đội hình
        this.state.heroes.forEach((hero, idx) => {
            const hpBar = document.getElementById(`heroHpFill_${idx}`);
            const hpText = document.getElementById(`heroHpText_${idx}`);
            const energyBar = document.getElementById(`energyFill_${idx}`);
            const card = document.getElementById(`heroCard_${idx}`);
            const skillBtn = document.getElementById(`heroSkillBtn_${idx}`);

            if (hpBar) hpBar.style.width = `${Math.max(0, (hero.hp / hero.maxHp) * 100)}%`;
            if (hpText) hpText.textContent = `${Math.max(0, hero.hp)}/${hero.maxHp}`;
            if (energyBar) {
                const offset = 113 - (hero.energy / hero.maxEnergy) * 113;
                energyBar.style.strokeDashoffset = offset;
            }
            if (card) {
                if (hero.isDefeated) {
                    card.classList.add('hero-defeated');
                    card.classList.remove('ult-ready');
                    card.style.opacity = '0.4';
                    card.style.filter = 'grayscale(100%)';
                } else {
                    card.classList.remove('hero-defeated');
                    card.style.opacity = '1.0';
                    card.style.filter = 'none';
                    if (hero.energy >= hero.maxEnergy) {
                        card.classList.add('ult-ready');
                    } else {
                        card.classList.remove('ult-ready');
                    }
                }
            }
            if (skillBtn) {
                if (hero.isDefeated) {
                    skillBtn.disabled = true;
                    skillBtn.classList.add('disabled');
                    skillBtn.innerHTML = `<span>HẠ GỤC</span>`;
                } else if (hero.skillCd > 0) {
                    skillBtn.disabled = true;
                    skillBtn.classList.add('on-cd');
                    skillBtn.innerHTML = `<span>⏳ ${hero.skillCd} TURN</span>`;
                } else {
                    skillBtn.disabled = false;
                    skillBtn.classList.remove('on-cd', 'disabled');
                    skillBtn.innerHTML = `<span>⚡ ${hero.skillName || 'SKILL'}</span><kbd>${idx + 1}</kbd>`;
                }
            }
        });

        // 6. Kiểm tra hạ gục Boss -> Mở Modal Chiến Thắng
        if (this.state.boss.hp <= 0) {
            const victoryModal = document.getElementById('stageVictoryModal');
            const titleEl = document.getElementById('victoryModalTitle');
            const descEl = document.getElementById('victoryModalDesc');
            if (victoryModal && victoryModal.style.display !== 'flex') {
                victoryModal.style.display = 'flex';
                if (titleEl) titleEl.textContent = `CHIẾN THẮNG CHƯƠNG ${this.state.currentStageId}!`;
                if (descEl) descEl.textContent = `Trùm ${this.state.boss.name} đã bị đánh bại! Bản đồ tiếp theo đã sẵn sàng.`;
            }
        }
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

        events.on('deflector_blocked', ({ reducedDamage, blockedAmount, percent, reason }) => {
            this.showToast(`🛡️ ${reason}: CHẶN ${blockedAmount} DMG (${percent}%)!`, '#38bdf8');
            this.updateHUD();
        });

        events.on('counter_attack', ({ hero, damage, stacks, isCritical }) => {
            const critMsg = isCritical ? ' 💥 BỘC PHÁ BREAK x2.5!' : '';
            this.showToast(`⚔️ PHẢN KÍCH COMBO: ${stacks} STACKS ➔ ${damage} DMG LÊN BOSS!${critMsg}`, '#fbbf24');
            this.updateHUD();
        });

        events.on('skill_executed', ({ hero, message }) => {
            this.showToast(`✨ ${hero.name}: ${message}`, '#00f0ff');
            this.updateHUD();
        });

        events.on('ultimate_executed', ({ hero, damage, message, isCritical }) => {
            const msg = message || `Tung chiêu nộ cực đại gây ${damage} DMG!`;
            this.showToast(`🌌 ${hero.name}: ${msg}`, '#a855f7');
            this.updateHUD();
        });

        // Phím tắt bàn phím: 1..4 (Skill), NumPad 1..4 (Ultimate), Space (Phòng thủ sớm)
        window.addEventListener('keydown', (e) => {
            if (['1', '2', '3', '4'].includes(e.key)) {
                const idx = parseInt(e.key) - 1;
                window.triggerHeroSkill(idx);
            } else if (['Numpad1', 'Numpad2', 'Numpad3', 'Numpad4'].includes(e.code)) {
                const idx = parseInt(e.code.replace('Numpad', '')) - 1;
                window.triggerHeroUlt(idx);
            } else if (e.code === 'Space') {
                e.preventDefault();
                window.endTurnEarly();
            }
        });

        // Hàm chuyển sang màn tiếp theo
        window.loadNextStage = () => {
            const nextStage = this.state.currentStageId >= 3 ? 1 : this.state.currentStageId + 1;
            const victoryModal = document.getElementById('stageVictoryModal');
            if (victoryModal) victoryModal.style.display = 'none';

            this.state.loadStage(nextStage);
            const badgeEl = document.getElementById('hudBossBadge');
            const nameEl = document.getElementById('hudBossName');
            if (badgeEl) badgeEl.textContent = `CHƯƠNG ${nextStage}`;
            if (nameEl) nameEl.textContent = this.state.boss.name;

            this.showToast(`🚀 BẮT ĐẦU CHƯƠNG ${nextStage}: ${this.state.boss.name}`, '#00f0ff');
            this.renderHeroes();
            this.updateHUD();
        };

        // Hàm toàn cục cho nút bấm HTML gọi
        window.triggerHeroUlt = (idx) => {
            const ok = this.state.triggerUltimate(idx);
            if (ok) this.updateHUD();
        };

        window.triggerHeroSkill = (idx) => {
            const ok = this.state.triggerSkill(idx);
            if (ok) this.updateHUD();
        };

        window.endTurnEarly = async () => {
            if (this.state.isProcessing) return;
            const pct = Math.round((this.state.movesLeft / this.state.maxMoves) * 100);
            this.showToast(`🛡️ KÍCH HOẠT PHÒNG THỦ SỚM (GIẢM ${pct}% SÁT THƯƠNG BOSS)!`, '#38bdf8');
            await this.state.endTurnEarly();
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
