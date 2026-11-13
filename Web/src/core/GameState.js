/**
 * Web/src/core/GameState.js
 * ============================================================================
 * [PSTACK ARCHITECTURE]: Tầng Quản Lý Trạng Thái Game Độc Lập (Game State Machine).
 * 
 * Chức năng:
 *  - Quản lý bàn cờ 8x8 với 6 màu nguyên tố:
 *      1: Thermal Crimson (Đỏ) 🔥
 *      2: Deep Cobalt (Xanh Dương) 💧
 *      3: Bio Emerald (Lục) 🍃
 *      4: Volt Lightning (Vàng) ⚡
 *      5: Graviton Amethyst (Tím) 🔮
 *      6: Diamond Frost (Băng Tuyết) ❄️
 *  - Quản lý đội hình 4 Role: Attacker, Supporter, Healer, Defender
 *  - Quản lý Boss: HP, Stagger (Toughness bar), Trạng thái Break x2 DMG
 *  - Thuật toán tìm Match-3, Match-4 (Sét), 2x2 (Tên lửa), 5-L/T (Bom), 5 thẳng (Rainbow)
 * ============================================================================
 */

import { events } from './EventBus.js';

export const COLORS = {
    FIRE: 1,      // Đỏ (Attacker)
    WATER: 2,     // Xanh Cobalt (Defender/Support)
    NATURE: 3,    // Lục (Healer)
    LIGHTNING: 4, // Vàng (Attacker)
    VOID: 5,      // Tím (Supporter)
    ICE: 6        // Băng Tuyết (Defender)
};

export const COLOR_NAMES = {
    1: 'Hỏa Năng (Crimson)',
    2: 'Hải Lưu (Cobalt)',
    3: 'Sinh Mệnh (Emerald)',
    4: 'Lôi Điện (Volt)',
    5: 'Trọng Lực (Amethyst)',
    6: 'Băng Tuyết (Diamond Ice)'
};

export const SPECIAL_TYPES = {
    NONE: 0,
    LINE_ROW: 1,     // Quét toàn bộ hàng ngang (Match 4 ngang)
    LINE_COL: 2,     // Quét toàn bộ cột dọc (Match 4 dọc)
    BOMB_3X3: 3,     // Nổ 3x3 diện rộng (Match 5 chữ L hoặc T)
    SWAP_ALL: 4      // Lỗ đen sắc màu (Match 5 thẳng hàng): nổ tất cả ngọc cùng màu
};

export class GameState {
    constructor(width = 8, height = 8) {
        this.width = width;
        this.height = height;
        this.turn = 1;
        this.movesLeft = 4;
        this.maxMoves = 4;
        this.score = 0;
        this.comboChain = 0;

        // Đội hình 4 Role chuẩn
        this.heroes = [
            { id: 1, name: 'Lôi Kiếm Sĩ', role: 'Attacker', color: COLORS.FIRE, altColor: COLORS.LIGHTNING, hp: 1000, maxHp: 1000, energy: 40, maxEnergy: 100, skillCd: 0, maxCd: 3 },
            { id: 2, name: 'Tinh Linh Chú Thuật', role: 'Supporter', color: COLORS.VOID, altColor: COLORS.WATER, hp: 850, maxHp: 850, energy: 20, maxEnergy: 100, skillCd: 0, maxCd: 4 },
            { id: 3, name: 'Thánh Nữ Ánh Sáng', role: 'Healer', color: COLORS.NATURE, altColor: 0, hp: 900, maxHp: 900, energy: 30, maxEnergy: 100, skillCd: 0, maxCd: 3 },
            { id: 4, name: 'Thiết Giáp Vệ Binh', role: 'Defender', color: COLORS.ICE, altColor: COLORS.WATER, hp: 1400, maxHp: 1400, energy: 10, maxEnergy: 100, skillCd: 0, maxCd: 4, deflectorStacks: 0 }
        ];

        // Boss Sentinel Unit 07 với hệ thống Telegraph & Stagger Break
        this.boss = {
            id: 'sentinel_07',
            name: 'Sentinel Unit 07 (Thủ Hộ Tro Tàn)',
            hp: 30000,
            maxHp: 30000,
            stagger: 100,      // Toughness 100%
            maxStagger: 100,
            isBroken: false,   // Bị choáng (nhận x2 DMG)
            breakTurnsLeft: 0,
            // Telegraph System: Chỉ báo chiêu thức nguy hiểm sắp tới
            telegraphName: 'Tụ Năng Lượng: Hủy Diệt Pháo',
            telegraphCountdown: 2,
            telegraphDmg: 900,
            isTelegraphing: true
        };

        // Bàn cờ 8x8 (Lưu mã màu: 1..6)
        this.grid = Array(height).fill(null).map(() => Array(width).fill(0));
        // Mảng lưu loại Ngọc Đặc Biệt: SPECIAL_TYPES
        this.specialGrid = Array(height).fill(null).map(() => Array(width).fill(SPECIAL_TYPES.NONE));
        this.selectedTile = null; // {r, c}
        this.isProcessing = false;

        this.initBoard();
    }

    /** Tạo ngẫu nhiên bàn cờ khởi đầu (không có sẵn match-3) */
    initBoard() {
        for (let r = 0; r < this.height; r++) {
            for (let c = 0; c < this.width; c++) {
                let color;
                do {
                    color = Math.floor(Math.random() * 6) + 1;
                } while (
                    (c >= 2 && this.grid[r][c - 1] === color && this.grid[r][c - 2] === color) ||
                    (r >= 2 && this.grid[r - 1][c] === color && this.grid[r - 2][c] === color)
                );
                this.grid[r][c] = color;
            }
        }
    }

    /** Lấy màu tại ô (r, c) */
    getTile(r, c) {
        if (r < 0 || r >= this.height || c < 0 || c >= this.width) return 0;
        return this.grid[r][c];
    }

    /** Thử hoán đổi 2 ô lân cận */
    async swap(r1, c1, r2, c2) {
        if (this.isProcessing) return false;
        
        // Kiểm tra tính kề nhau (trên, dưới, trái, phải)
        const dist = Math.abs(r1 - r2) + Math.abs(c1 - c2);
        if (dist !== 1) return false;

        this.isProcessing = true;
        events.emit('swap_start', { from: { r: r1, c: c1 }, to: { r: r2, c: c2 } });

        // Kiểm tra kích hoạt ngọc tối thượng SWAP_ALL (Lỗ Đen Sắc Màu)
        const isSwapAll1 = this.specialGrid[r1][c1] === SPECIAL_TYPES.SWAP_ALL;
        const isSwapAll2 = this.specialGrid[r2][c2] === SPECIAL_TYPES.SWAP_ALL;

        if (isSwapAll1 || isSwapAll2) {
            const targetColor = isSwapAll1 ? this.grid[r2][c2] : this.grid[r1][c1];
            this.movesLeft--;
            this.comboChain = 1;
            events.emit('swap_accept', { from: { r: r1, c: c1 }, to: { r: r2, c: c2 } });

            // Gom tất cả các khối có cùng targetColor
            const allColorMatches = [];
            for (let r = 0; r < this.height; r++) {
                for (let c = 0; c < this.width; c++) {
                    if (this.grid[r][c] === targetColor || (r === r1 && c === c1) || (r === r2 && c === c2)) {
                        allColorMatches.push({ r, c, color: this.grid[r][c], special: this.specialGrid[r][c] });
                    }
                }
            }

            events.emit('special_triggered', { type: 'PRISMATIC_BURST', color: targetColor, count: allColorMatches.length });
            events.emit('match_shatter', { matches: allColorMatches, combo: this.comboChain });
            this.processCombatMath(allColorMatches, 3); // Sát thương cực đại

            // Xóa khối
            allColorMatches.forEach(m => {
                this.grid[m.r][m.c] = 0;
                this.specialGrid[m.r][m.c] = SPECIAL_TYPES.NONE;
            });

            await new Promise(res => setTimeout(res, 250));
            const dropDetails = this.applyGravityAndRefill();
            events.emit('blocks_fall', { drops: dropDetails });
            await new Promise(res => setTimeout(res, 300));

            await this.resolveCascade();
            if (this.movesLeft <= 0) await this.endTurn();
            this.isProcessing = false;
            return true;
        }

        // Hoán đổi tạm thời
        const temp = this.grid[r1][c1];
        const tempSpec = this.specialGrid[r1][c1];
        this.grid[r1][c1] = this.grid[r2][c2];
        this.specialGrid[r1][c1] = this.specialGrid[r2][c2];
        this.grid[r2][c2] = temp;
        this.specialGrid[r2][c2] = tempSpec;

        // Tìm match
        const matches = this.findMatches();
        if (matches.length === 0) {
            // Nước đi không hợp lệ -> Trả về vị trí cũ
            await new Promise(res => setTimeout(res, 200));
            this.grid[r2][c2] = this.grid[r1][c1];
            this.specialGrid[r2][c2] = this.specialGrid[r1][c1];
            this.grid[r1][c1] = temp;
            this.specialGrid[r1][c1] = tempSpec;
            events.emit('swap_reject', { from: { r: r1, c: c1 }, to: { r: r2, c: c2 } });
            this.isProcessing = false;
            return false;
        }

        // Nước đi hợp lệ! Trừ lượt đi
        this.movesLeft--;
        this.comboChain = 0;
        events.emit('swap_accept', { from: { r: r1, c: c1 }, to: { r: r2, c: c2 } });

        // Chạy vòng lặp cascade (nổ khối -> rơi -> nạp mới -> tìm match tiếp)
        await this.resolveCascade();

        // Kiểm tra kết thúc lượt nếu hết nước đi
        if (this.movesLeft <= 0) {
            await this.endTurn();
        }

        this.isProcessing = false;
        return true;
    }

    /** Tìm tất cả các cụm Match trên bàn và nhận diện Ngọc Đặc Biệt */
    findMatches() {
        const matched = new Map(); // key: "r,c" -> { r, c, color, willSpawnSpecial: null }
        const specialsToSpawn = []; // { r, c, specialType, color }

        // 1. Quét hàng ngang
        for (let r = 0; r < this.height; r++) {
            let matchLen = 1;
            for (let c = 1; c <= this.width; c++) {
                if (c < this.width && this.grid[r][c] > 0 && this.grid[r][c] === this.grid[r][c - 1]) {
                    matchLen++;
                } else {
                    if (matchLen >= 3) {
                        const midC = c - Math.floor(matchLen / 2) - 1;
                        let special = SPECIAL_TYPES.NONE;
                        if (matchLen === 4) special = SPECIAL_TYPES.LINE_ROW;
                        else if (matchLen >= 5) special = SPECIAL_TYPES.SWAP_ALL;

                        for (let k = c - matchLen; k < c; k++) {
                            matched.set(`${r},${k}`, { r, c: k, color: this.grid[r][k] });
                        }
                        if (special !== SPECIAL_TYPES.NONE) {
                            specialsToSpawn.push({ r, c: midC, specialType: special, color: this.grid[r][midC] });
                        }
                    }
                    matchLen = 1;
                }
            }
        }

        // 2. Quét hàng dọc
        for (let c = 0; c < this.width; c++) {
            let matchLen = 1;
            for (let r = 1; r <= this.height; r++) {
                if (r < this.height && this.grid[r][c] > 0 && this.grid[r][c] === this.grid[r - 1][c]) {
                    matchLen++;
                } else {
                    if (matchLen >= 3) {
                        const midR = r - Math.floor(matchLen / 2) - 1;
                        let special = SPECIAL_TYPES.NONE;
                        if (matchLen === 4) special = SPECIAL_TYPES.LINE_COL;
                        else if (matchLen >= 5) special = SPECIAL_TYPES.SWAP_ALL;

                        for (let k = r - matchLen; k < r; k++) {
                            matched.set(`${k},${c}`, { r: k, c, color: this.grid[k][c] });
                        }
                        if (special !== SPECIAL_TYPES.NONE) {
                            specialsToSpawn.push({ r: midR, c, specialType: special, color: this.grid[midR][c] });
                        }
                    }
                    matchLen = 1;
                }
            }
        }

        // 3. Kích hoạt hiệu ứng lan của các Ngọc Đặc Biệt bị dính trong vụ nổ
        const finalSet = new Map(matched);
        matched.forEach((val) => {
            const spec = this.specialGrid[val.r][val.c];
            if (spec === SPECIAL_TYPES.LINE_ROW) {
                // Quét cả hàng
                for (let c = 0; c < this.width; c++) {
                    finalSet.set(`${val.r},${c}`, { r: val.r, c, color: this.grid[val.r][c] });
                }
            } else if (spec === SPECIAL_TYPES.LINE_COL) {
                // Quét cả cột
                for (let r = 0; r < this.height; r++) {
                    finalSet.set(`${r},${val.c}`, { r, c: val.c, color: this.grid[r][val.c] });
                }
            } else if (spec === SPECIAL_TYPES.BOMB_3X3) {
                // Nổ 3x3
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        const nr = val.r + dr;
                        const nc = val.c + dc;
                        if (nr >= 0 && nr < this.height && nc >= 0 && nc < this.width) {
                            finalSet.set(`${nr},${nc}`, { r: nr, c: nc, color: this.grid[nr][nc] });
                        }
                    }
                }
            }
        });

        const result = Array.from(finalSet.values());
        result.specialsToSpawn = specialsToSpawn;
        return result;
    }

    /** Xử lý chuỗi nổ cascade, tính sát thương và rơi khối */
    async resolveCascade() {
        let matches = this.findMatches();
        while (matches.length > 0) {
            this.comboChain++;
            const specialsToSpawn = matches.specialsToSpawn || [];

            events.emit('match_shatter', { matches, combo: this.comboChain });

            // Tính toán sát thương & nạp nộ từng role
            this.processCombatMath(matches, this.comboChain);

            // Xóa khối bị match khỏi grid
            matches.forEach(m => {
                this.grid[m.r][m.c] = 0;
                this.specialGrid[m.r][m.c] = SPECIAL_TYPES.NONE;
            });

            // Nếu có ngọc đặc biệt được tạo ra (Match 4, 5)
            specialsToSpawn.forEach(sp => {
                this.grid[sp.r][sp.c] = sp.color;
                this.specialGrid[sp.r][sp.c] = sp.specialType;
                events.emit('special_created', { r: sp.r, c: sp.c, specialType: sp.specialType, color: sp.color });
            });

            await new Promise(res => setTimeout(res, 220));

            // Trọng lực kéo khối xuống & Refill khối mới ở đỉnh
            const dropDetails = this.applyGravityAndRefill();
            events.emit('blocks_fall', { drops: dropDetails });

            await new Promise(res => setTimeout(res, 280));

            // Quét tìm match tiếp nối (Chain Combo)
            matches = this.findMatches();
        }
    }

    /** Tính toán sát thương, hồi máu và giảm Toughness/Stagger */
    processCombatMath(matches, combo) {
        const colorCounts = {};
        matches.forEach(m => {
            colorCounts[m.color] = (colorCounts[m.color] || 0) + 1;
        });

        // Đỏ (1) & Vàng (4) -> Attacker gây sát thương bộc phát
        const atkBlocks = (colorCounts[COLORS.FIRE] || 0) + (colorCounts[COLORS.LIGHTNING] || 0);
        if (atkBlocks > 0) {
            let baseDmg = atkBlocks * 350 * (1 + (combo - 1) * 0.35);
            let staggerDmg = atkBlocks * 8;

            if (this.boss.isBroken) {
                baseDmg *= 2.0; // Break x2 Damage
            }

            this.boss.hp = Math.max(0, this.boss.hp - Math.round(baseDmg));
            
            // Giảm Stagger
            if (!this.boss.isBroken) {
                this.boss.stagger = Math.max(0, this.boss.stagger - staggerDmg);
                if (this.boss.stagger <= 0) {
                    this.boss.isBroken = true;
                    this.boss.breakTurnsLeft = 1;
                    events.emit('stagger_broken', { boss: this.boss });
                }
            }

            this.heroes[0].energy = Math.min(this.heroes[0].maxEnergy, this.heroes[0].energy + atkBlocks * 12);
            events.emit('damage_dealt', { damage: Math.round(baseDmg), hero: this.heroes[0], isCritical: this.boss.isBroken });
        }

        // Lục (3) -> Healer hồi máu theo cấp số nhân
        const healBlocks = colorCounts[COLORS.NATURE] || 0;
        if (healBlocks > 0) {
            const healAmount = Math.round(healBlocks * 120 * Math.pow(1.25, combo));
            this.heroes.forEach(h => {
                h.hp = Math.min(h.maxHp, h.hp + healAmount);
            });
            this.heroes[2].energy = Math.min(this.heroes[2].maxEnergy, this.heroes[2].energy + healBlocks * 15);
            events.emit('heal_triggered', { heal: healAmount, hero: this.heroes[2] });
        }

        // Xanh Cobalt (2) & Băng (6) -> Defender tích khiên
        const defBlocks = (colorCounts[COLORS.WATER] || 0) + (colorCounts[COLORS.ICE] || 0);
        if (defBlocks >= 4) {
            this.heroes[3].deflectorStacks = Math.min(4, this.heroes[3].deflectorStacks + 1);
            events.emit('deflector_charge', { stacks: this.heroes[3].deflectorStacks });
        }

        // Tím (5) -> Supporter nạp nộ
        const voidBlocks = colorCounts[COLORS.VOID] || 0;
        if (voidBlocks > 0) {
            this.heroes[1].energy = Math.min(this.heroes[1].maxEnergy, this.heroes[1].energy + voidBlocks * 18);
        }

        events.emit('state_updated', { heroes: this.heroes, boss: this.boss, movesLeft: this.movesLeft, combo });
    }

    /** Trọng lực rơi khối và nạp khối mới */
    applyGravityAndRefill() {
        const drops = [];

        for (let c = 0; c < this.width; c++) {
            let emptySpaces = 0;
            // Rơi các khối hiện có xuống đáy
            for (let r = this.height - 1; r >= 0; r--) {
                if (this.grid[r][c] === 0) {
                    emptySpaces++;
                } else if (emptySpaces > 0) {
                    const fromR = r;
                    const toR = r + emptySpaces;
                    this.grid[toR][c] = this.grid[fromR][c];
                    this.specialGrid[toR][c] = this.specialGrid[fromR][c];
                    this.grid[fromR][c] = 0;
                    this.specialGrid[fromR][c] = SPECIAL_TYPES.NONE;
                    drops.push({ from: { r: fromR, c }, to: { r: toR, c }, color: this.grid[toR][c], special: this.specialGrid[toR][c] });
                }
            }

            // Nạp khối mới từ đỉnh rơi xuống
            for (let k = 0; k < emptySpaces; k++) {
                const targetR = emptySpaces - 1 - k;
                const newColor = Math.floor(Math.random() * 6) + 1;
                this.grid[targetR][c] = newColor;
                this.specialGrid[targetR][c] = SPECIAL_TYPES.NONE;
                drops.push({ from: { r: -1 - k, c }, to: { r: targetR, c }, color: newColor, isNew: true, special: SPECIAL_TYPES.NONE });
            }
        }

        return drops;
    }

    /** Kết thúc lượt người chơi -> Boss hành động */
    async endTurn() {
        events.emit('turn_ended', { turn: this.turn });

        // Giảm hồi chiêu kỹ năng
        this.heroes.forEach(h => {
            if (h.skillCd > 0) h.skillCd--;
        });

        // Xử lý trạng thái Break của Boss
        if (this.boss.isBroken) {
            this.boss.breakTurnsLeft--;
            if (this.boss.breakTurnsLeft <= 0) {
                this.boss.isBroken = false;
                this.boss.stagger = this.boss.maxStagger; // Hồi phục Stagger
                events.emit('stagger_recovered', { boss: this.boss });
            }
        } else {
            // Đếm ngược đòn chí mạng Telegraph
            this.boss.telegraphCountdown--;
            let isSuperAttack = false;
            let bossDmg = 450;

            if (this.boss.telegraphCountdown <= 0) {
                // Kích hoạt Đòn Hủy Diệt Pháo
                isSuperAttack = true;
                bossDmg = this.boss.telegraphDmg;
                this.boss.telegraphCountdown = 3; // Reset chu kỳ tụ năng lượng
                events.emit('telegraph_unleashed', { name: this.boss.telegraphName, damage: bossDmg });
            }

            if (this.heroes[3].deflectorStacks > 0) {
                // Defender kích hoạt khiên giảm 50% sát thương
                const blocked = Math.round(bossDmg * 0.5);
                bossDmg -= blocked;
                this.heroes[3].deflectorStacks = 0;
                events.emit('deflector_blocked', { reducedDamage: bossDmg, blockedAmount: blocked });
            }

            this.heroes.forEach(h => {
                h.hp = Math.max(0, h.hp - Math.round(bossDmg * (0.85 + Math.random() * 0.3)));
            });
            events.emit('boss_attack', { damage: bossDmg, isSuperAttack });
        }

        // Bắt đầu turn mới
        this.turn++;
        this.movesLeft = this.maxMoves;
        events.emit('new_turn_started', { turn: this.turn, movesLeft: this.movesLeft });
        events.emit('state_updated', { heroes: this.heroes, boss: this.boss, movesLeft: this.movesLeft });
    }

    /** Kích hoạt Ultimate của Hero */
    triggerUltimate(heroIndex) {
        const hero = this.heroes[heroIndex];
        if (!hero || hero.energy < hero.maxEnergy) return false;

        hero.energy = 0;
        let ultDmg = 2500;
        if (hero.role === 'Attacker') ultDmg = 4500;
        if (this.boss.isBroken) ultDmg *= 2.0;

        this.boss.hp = Math.max(0, this.boss.hp - ultDmg);
        events.emit('ultimate_executed', { hero, damage: ultDmg });
        events.emit('state_updated', { heroes: this.heroes, boss: this.boss });
        return true;
    }
}
