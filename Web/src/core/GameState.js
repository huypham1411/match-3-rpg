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

export const OBSTACLE_TYPES = {
    NONE: 0,
    ICE: 1,          // 2 HP - tan chảy khi có match kề cạnh
    ROCK: 2,         // 3 HP - khối đá chặn rơi, cần match kề cạnh hoặc bom phá
    CRATE: 3,        // 2 HP - hộp kim loại chặn rơi
    CHAIN: 4         // 1 HP - xích khoá ô không cho đổi chỗ
};

export const STAGES_DATA = {
    1: {
        id: 1,
        chapter: 'Chương 1: Tiếng Vọng Vùng Biên',
        name: 'Khu Định Cư Aster',
        boss: {
            id: 'sentinel_07',
            name: 'Sentinel Unit 07 (Thủ Vệ Rỉ Sét)',
            hp: 25000,
            maxHp: 25000,
            stagger: 100,
            maxStagger: 100,
            isBroken: false,
            breakTurnsLeft: 0,
            telegraphName: 'Hủy Diệt Pháo',
            telegraphCountdown: 2,
            telegraphDmg: 850,
            obstacleType: OBSTACLE_TYPES.ROCK,
            obstacleCount: 2
        },
        introDialogue: [
            'Astra: "Trụ canh phòng Sentinel 07 đã bị mã độc Fray xâm thực! Nó đang nạp pháo cối!"',
            'Creator: "Chuẩn bị giao thức kết nối! Astra, nhắm vào điểm yếu Stagger của nó!"'
        ]
    },
    2: {
        id: 2,
        chapter: 'Chương 2: Bức Tường Băng Giá',
        name: 'Trạm Kiểm Soát Unmapped Rim',
        boss: {
            id: 'warden_aegis',
            name: 'Đại Tá Warden Aegis (Cai Ngục Thiết Vách)',
            hp: 35000,
            maxHp: 35000,
            stagger: 120,
            maxStagger: 120,
            isBroken: false,
            breakTurnsLeft: 0,
            telegraphName: 'Làm Lạnh Tuyệt Đối',
            telegraphCountdown: 3,
            telegraphDmg: 1100,
            obstacleType: OBSTACLE_TYPES.CHAIN,
            obstacleCount: 3
        },
        introDialogue: [
            'Warden Aegis: "Lũ rác rưởi vùng biên! Bức tường này là ranh giới các ngươi không bao giờ vượt qua!"',
            'Elysia: "Hắn kích hoạt bẫy lạnh khóa ô! Lin, hãy dùng nanite sinh học hỗ trợ!"'
        ]
    },
    3: {
        id: 3,
        chapter: 'Chương 3: Ký Ức Khởi Nguyên',
        name: 'Tổ Hợp Máy Chủ Data Haven Beta',
        boss: {
            id: 'null_sovereign',
            name: 'Null Sovereign (Thực Thể Hư Vô)',
            hp: 50000,
            maxHp: 50000,
            stagger: 150,
            maxStagger: 150,
            isBroken: false,
            breakTurnsLeft: 0,
            telegraphName: 'Xóa Sổ Thực Thể (Fatal Anomaly)',
            telegraphCountdown: 2,
            telegraphDmg: 1600,
            obstacleType: OBSTACLE_TYPES.ICE,
            obstacleCount: 4
        },
        introDialogue: [
            'Null Sovereign: "Phát hiện Lỗi hệ thống: Creator. Kích hoạt quy trình tiêu hủy vĩnh viễn."',
            'Astra: "Toàn đội tập trung! Kích hoạt Ultimate Chain Burst để thanh tẩy máy chủ mẹ!"'
        ]
    }
};

export class GameState {
    constructor(width = 8, height = 8) {
        this.width = width;
        this.height = height;
        this.currentStageId = 1;
        this.turn = 1;
        this.movesLeft = 4;
        this.maxMoves = 4;
        this.score = 0;
        this.comboChain = 0;
        this.counterStacks = 0;      // Tích lũy điểm Phản kích (Counter Stacks) theo combo
        this.earlyEndMitigation = 0; // Tỷ lệ giảm sát thương khi kết thúc lượt sớm

        // Đội hình 4 Role chuẩn (kèm chiêu thức Skill & Ultimate)
        this.heroes = [
            {
                id: 1,
                name: 'Lôi Kiếm Sĩ (Astra)',
                role: 'Attacker',
                color: COLORS.FIRE,
                altColor: COLORS.LIGHTNING,
                hp: 1000,
                maxHp: 1000,
                energy: 40,
                maxEnergy: 100,
                skillName: 'Lôi Trảm',
                skillDesc: 'Gây 1800 DMG và bào mòn 25 Stagger',
                ultName: 'Vũ Điệu Lôi Quang',
                ultDesc: 'Bão kiếm laser 4500 DMG (x2 khi Broken)',
                skillCd: 0,
                maxCd: 3,
                isDefeated: false
            },
            {
                id: 2,
                name: 'Thuật Sĩ (Elysia)',
                role: 'Supporter',
                color: COLORS.VOID,
                altColor: COLORS.WATER,
                hp: 850,
                maxHp: 850,
                energy: 30,
                maxEnergy: 100,
                skillName: 'Phá Giáp',
                skillDesc: 'Bào mòn 40 điểm Stagger Boss & +20 Nộ',
                ultName: 'Chrono Burst',
                ultDesc: '+1 Lượt đi & nạp 40 Nộ toàn đội',
                skillCd: 0,
                maxCd: 4,
                isDefeated: false
            },
            {
                id: 3,
                name: 'Thánh Nữ (Lin)',
                role: 'Healer',
                color: COLORS.NATURE,
                altColor: 0,
                hp: 900,
                maxHp: 900,
                energy: 30,
                maxEnergy: 100,
                skillName: 'Hồi Máu',
                skillDesc: 'Hồi 450 HP cho tất cả đồng minh',
                ultName: 'Thánh Vực Bất Diệt',
                ultDesc: 'Hồi 100% HP & hồi sinh đồng minh',
                skillCd: 0,
                maxCd: 3,
                isDefeated: false
            },
            {
                id: 4,
                name: 'Thiết Giáp (Boran)',
                role: 'Defender',
                color: COLORS.ICE,
                altColor: COLORS.WATER,
                hp: 1400,
                maxHp: 1400,
                energy: 20,
                maxEnergy: 100,
                skillName: 'Khiên Thủ',
                skillDesc: 'Tích 4 Khiên Deflector giảm 60% sát thương',
                ultName: 'Phản Kích Bộc Phá',
                ultDesc: 'Tung đòn 3800 DMG & dựng khiên tối thượng',
                skillCd: 0,
                maxCd: 4,
                deflectorStacks: 0,
                isDefeated: false
            }
        ];

        // Khởi tạo Boss từ Stage 1
        this.boss = { ...STAGES_DATA[1].boss };

        // Bàn cờ 8x8 (Mã màu: 1..6)
        this.grid = Array(height).fill(null).map(() => Array(width).fill(0));
        // Mảng Ngọc Đặc Biệt: SPECIAL_TYPES
        this.specialGrid = Array(height).fill(null).map(() => Array(width).fill(SPECIAL_TYPES.NONE));
        // Mảng Vật Cản: OBSTACLE_TYPES { type, hp }
        this.obstacleGrid = Array(height).fill(null).map(() => Array(width).fill(null).map(() => ({ type: OBSTACLE_TYPES.NONE, hp: 0 })));

        this.selectedTile = null; // {r, c}
        this.isProcessing = false;

        this.initBoard();
    }

    /** Nạp Màn chơi mới (Stage 1 -> Stage 2 -> Stage 3) */
    loadStage(stageId) {
        const stageDef = STAGES_DATA[stageId];
        if (!stageDef) return false;

        this.currentStageId = stageId;
        this.boss = { ...stageDef.boss };
        this.turn = 1;
        this.movesLeft = this.maxMoves;

        // Reset máu và nộ các hero còn sống
        this.heroes.forEach(h => {
            h.hp = h.maxHp;
            h.isDefeated = false;
            h.skillCd = 0;
            h.energy = 30;
        });

        // Xóa sạch vật cản cũ và khởi tạo bàn mới
        this.obstacleGrid = Array(this.height).fill(null).map(() => Array(this.width).fill(null).map(() => ({ type: OBSTACLE_TYPES.NONE, hp: 0 })));
        this.specialGrid = Array(this.height).fill(null).map(() => Array(this.width).fill(SPECIAL_TYPES.NONE));
        this.initBoard();

        // Sinh vật cản đặc trưng của màn
        if (stageDef.boss.obstacleType && stageDef.boss.obstacleCount > 0) {
            for (let i = 0; i < stageDef.boss.obstacleCount; i++) {
                const r = 2 + Math.floor(Math.random() * 4);
                const c = 1 + Math.floor(Math.random() * 6);
                const hp = stageDef.boss.obstacleType === OBSTACLE_TYPES.ROCK ? 3 : 2;
                this.spawnObstacle(r, c, stageDef.boss.obstacleType, hp);
            }
        }

        events.emit('stage_loaded', { stage: stageDef, boss: this.boss, heroes: this.heroes });
        events.emit('state_updated', { heroes: this.heroes, boss: this.boss, movesLeft: this.movesLeft });
        return true;
    }

    /** Sinh vật cản tại toạ độ (r, c) */
    spawnObstacle(r, c, type, hp = 2) {
        if (r < 0 || r >= this.height || c < 0 || c >= this.width) return;
        this.obstacleGrid[r][c] = { type, hp };
        events.emit('obstacle_spawned', { r, c, type, hp });
    }

    /** Gây sát thương lên các vật cản nằm kề các ô bị nổ match */
    damageAdjacentObstacles(matchedCoords) {
        const damagedObstacles = [];
        const checked = new Set();

        matchedCoords.forEach(m => {
            const neighbors = [
                { r: m.r - 1, c: m.c },
                { r: m.r + 1, c: m.c },
                { r: m.r, c: m.c - 1 },
                { r: m.r, c: m.c + 1 }
            ];

            neighbors.forEach(n => {
                const key = `${n.r},${n.c}`;
                if (n.r >= 0 && n.r < this.height && n.c >= 0 && n.c < this.width && !checked.has(key)) {
                    checked.add(key);
                    const obs = this.obstacleGrid[n.r][n.c];
                    if (obs && obs.type !== OBSTACLE_TYPES.NONE) {
                        obs.hp -= 1;
                        damagedObstacles.push({ r: n.r, c: n.c, type: obs.type, remainingHp: obs.hp });
                        if (obs.hp <= 0) {
                            obs.type = OBSTACLE_TYPES.NONE;
                            obs.hp = 0;
                            events.emit('obstacle_destroyed', { r: n.r, c: n.c });
                        }
                    }
                }
            });
        });

        if (damagedObstacles.length > 0) {
            events.emit('obstacles_damaged', { obstacles: damagedObstacles });
        }
    }

    /** Kiểm tra tử trận nhân vật */
    checkHeroFaint() {
        let allDefeated = true;
        this.heroes.forEach(h => {
            if (h.hp <= 0) {
                h.hp = 0;
                if (!h.isDefeated) {
                    h.isDefeated = true;
                    events.emit('hero_fainted', { hero: h });
                }
            } else {
                allDefeated = false;
            }
        });

        if (allDefeated) {
            events.emit('game_over', { reason: 'TOÀN ĐỘI ĐÃ GỤC NGÃ' });
        }
    }

    /** Kiểm tra dung hợp đặc biệt khi đổi 2 ngọc đặc biệt với nhau */
    isSpecialFusion(spec1, spec2) {
        if (!spec1 || !spec2 || spec1 === SPECIAL_TYPES.NONE || spec2 === SPECIAL_TYPES.NONE) return false;
        return true;
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
        const orig1 = this.grid[r1][c1];
        const origSpec1 = this.specialGrid[r1][c1];
        const orig2 = this.grid[r2][c2];
        const origSpec2 = this.specialGrid[r2][c2];

        this.grid[r1][c1] = orig2;
        this.specialGrid[r1][c1] = origSpec2;
        this.grid[r2][c2] = orig1;
        this.specialGrid[r2][c2] = origSpec1;

        // Tìm match
        const matches = this.findMatches();
        const isFusion = this.isSpecialFusion(origSpec1, origSpec2);

        if (matches.length === 0 && !isFusion) {
            // [STRICT MATCH-3 RULE - REVERT]: Nước đi không tạo được 3-match -> Snap back về chỗ cũ
            await new Promise(res => setTimeout(res, 180));
            this.grid[r1][c1] = orig1;
            this.specialGrid[r1][c1] = origSpec1;
            this.grid[r2][c2] = orig2;
            this.specialGrid[r2][c2] = origSpec2;

            events.emit('swap_reject', { from: { r: r1, c: c1 }, to: { r: r2, c: c2 } });
            await new Promise(res => setTimeout(res, 200));
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
        const matched = new Map(); // key: "r,c" -> { r, c, color }
        const specialsToSpawn = []; // { r, c, specialType, color }
        const hMatchMap = new Map(); // key: "r,c" -> matchLen
        const vMatchMap = new Map(); // key: "r,c" -> matchLen

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
                        if (matchLen >= 5) special = SPECIAL_TYPES.SWAP_ALL;
                        else if (matchLen === 4) special = SPECIAL_TYPES.LINE_ROW;

                        for (let k = c - matchLen; k < c; k++) {
                            matched.set(`${r},${k}`, { r, c: k, color: this.grid[r][k] });
                            hMatchMap.set(`${r},${k}`, matchLen);
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
                        if (matchLen >= 5) special = SPECIAL_TYPES.SWAP_ALL;
                        else if (matchLen === 4) special = SPECIAL_TYPES.LINE_COL;

                        for (let k = r - matchLen; k < r; k++) {
                            matched.set(`${k},${c}`, { r: k, c, color: this.grid[k][c] });
                            vMatchMap.set(`${k},${c}`, matchLen);
                        }
                        if (special !== SPECIAL_TYPES.NONE) {
                            specialsToSpawn.push({ r: midR, c, specialType: special, color: this.grid[midR][c] });
                        }
                    }
                    matchLen = 1;
                }
            }
        }

        // 3. Quét hình chữ L và chữ T (giao thoa giữa hàng ngang >=3 và hàng dọc >=3) -> Bom 3x3
        for (const [key] of hMatchMap) {
            if (vMatchMap.has(key)) {
                const [r, c] = key.split(',').map(Number);
                // Ô giao thoa tạo Bom Nổ 3x3
                specialsToSpawn.push({ r, c, specialType: SPECIAL_TYPES.BOMB_3X3, color: this.grid[r][c] });
            }
        }

        // 4. Quét ô vuông 2x2 (Square Breaker -> Bom 3x3)
        for (let r = 0; r < this.height - 1; r++) {
            for (let c = 0; c < this.width - 1; c++) {
                const col = this.grid[r][c];
                if (col > 0 && col === this.grid[r + 1][c] && col === this.grid[r][c + 1] && col === this.grid[r + 1][c + 1]) {
                    matched.set(`${r},${c}`, { r, c, color: col });
                    matched.set(`${r + 1},${c}`, { r: r + 1, c, color: col });
                    matched.set(`${r},${c + 1}`, { r, c: c + 1, color: col });
                    matched.set(`${r + 1},${c + 1}`, { r: r + 1, c: c + 1, color: col });
                    specialsToSpawn.push({ r, c, specialType: SPECIAL_TYPES.BOMB_3X3, color: col });
                }
            }
        }

        // 5. Kích hoạt hiệu ứng nổ lan của các Ngọc Đặc Biệt bị dính trong vụ nổ
        const finalSet = new Map(matched);
        matched.forEach((val) => {
            const spec = this.specialGrid[val.r][val.c];
            if (spec === SPECIAL_TYPES.LINE_ROW) {
                // Quét cả hàng ngang
                for (let c = 0; c < this.width; c++) {
                    finalSet.set(`${val.r},${c}`, { r: val.r, c, color: this.grid[val.r][c] });
                }
            } else if (spec === SPECIAL_TYPES.LINE_COL) {
                // Quét cả hàng dọc
                for (let r = 0; r < this.height; r++) {
                    finalSet.set(`${r},${val.c}`, { r, c: val.c, color: this.grid[r][val.c] });
                }
            } else if (spec === SPECIAL_TYPES.BOMB_3X3) {
                // Nổ diện rộng 3x3
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

            // Lập bản đồ các ô được nâng cấp thành ngọc đặc biệt (KHÔNG BỊ PHÁ HUỶ)
            const specialSpawnMap = new Map();
            specialsToSpawn.forEach(sp => {
                specialSpawnMap.set(`${sp.r},${sp.c}`, sp);
            });

            // Chỉ nổ và xóa khỏi màn hình các khối KHÔNG PHẢI là ngọc đặc biệt mới sinh
            const shatters = matches.filter(m => !specialSpawnMap.has(`${m.r},${m.c}`));
            events.emit('match_shatter', { matches: shatters, combo: this.comboChain });

            // Tính toán sát thương & nạp nộ từng role
            this.processCombatMath(matches, this.comboChain);

            // Sát thương lên các vật cản kề bên (Đá, Băng, Hộp, Xích)
            this.damageAdjacentObstacles(matches);

            // Xóa các khối bị nổ khỏi dữ liệu grid
            shatters.forEach(m => {
                this.grid[m.r][m.c] = 0;
                this.specialGrid[m.r][m.c] = SPECIAL_TYPES.NONE;
            });

            // Nâng cấp ô giữ nguyên thành Ngọc Đặc Biệt (Match 4, 5, 2x2, L/T)
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
        if (defBlocks >= 3) {
            this.heroes[3].deflectorStacks = Math.min(4, (this.heroes[3].deflectorStacks || 0) + 1);
            events.emit('deflector_charge', { stacks: this.heroes[3].deflectorStacks });
        }

        // Tích lũy Counter Stacks theo combo và số khối nổ
        const comboMultiplier = Math.max(1, combo);
        this.counterStacks = (this.counterStacks || 0) + matches.length * comboMultiplier;

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

    /** Chủ động kết thúc lượt sớm để phòng thủ đỡ đòn (Mitigation) */
    async endTurnEarly() {
        if (this.isProcessing) return false;
        // Tỷ lệ phòng thủ tỷ lệ thuận với số lượt đi chưa dùng
        // 4/4 nước -> Đỡ 100% sát thương boss, 3/4 -> 75%, 2/4 -> 50%, 1/4 -> 25%
        this.earlyEndMitigation = Math.max(0, Math.min(1.0, this.movesLeft / this.maxMoves));
        await this.endTurn();
        return true;
    }

    /** Kết thúc lượt người chơi -> Boss hành động */
    async endTurn() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        events.emit('turn_ended', { turn: this.turn });

        // Tỷ lệ phòng thủ: Nếu người chơi kết thúc lượt sớm hoặc chưa dùng hết lượt
        const earlyPct = this.earlyEndMitigation !== undefined && this.earlyEndMitigation > 0 
            ? this.earlyEndMitigation 
            : Math.max(0, this.movesLeft / this.maxMoves);
        const deflectorStacks = this.heroes[3].deflectorStacks || 0;
        const deflectorPct = deflectorStacks >= 4 ? 0.60 : (deflectorStacks * 0.12);

        // Tổng tỷ lệ giảm sát thương (Tối đa 100%)
        const totalMitigation = Math.min(1.0, Math.max(earlyPct, deflectorPct));
        const mitigationDisplay = Math.round(totalMitigation * 100);

        // Giảm hồi chiêu kỹ năng của các hero còn sống
        this.heroes.forEach(h => {
            if (h.skillCd > 0) h.skillCd--;
        });

        const wasBossBroken = this.boss.isBroken;

        // Xử lý hành động của Boss (Boss chỉ tấn công nếu không bị Break)
        if (!wasBossBroken) {
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

            // Áp dụng cơ chế giảm sát thương theo tỷ lệ nước đi còn lại / phòng thủ sớm
            const blockedAmount = Math.round(bossDmg * totalMitigation);
            const actualDmg = Math.max(0, bossDmg - blockedAmount);

            if (totalMitigation > 0) {
                events.emit('deflector_blocked', {
                    reducedDamage: actualDmg,
                    blockedAmount,
                    percent: mitigationDisplay,
                    reason: earlyPct > 0 ? `PHÒNG THỦ SỚM (${Math.round(earlyPct * 100)}%)` : 'DEFLECTOR'
                });
            }

            if (actualDmg > 0) {
                this.heroes.forEach(h => {
                    if (!h.isDefeated) {
                        h.hp = Math.max(0, h.hp - Math.round(actualDmg * (0.85 + Math.random() * 0.3)));
                    }
                });
            }
            this.checkHeroFaint();
            events.emit('boss_attack', { damage: actualDmg, blocked: blockedAmount, isSuperAttack });
        }

        // [COUNTER ATTACK / PHẢN KÍCH TÍCH LŨY VỚI COMBO]:
        // Đòn phản kích tự động kích hoạt sau đòn đánh của boss (hoặc khi boss choáng)
        const totalCounterPoints = (this.counterStacks || 0) + (deflectorStacks * 2);
        if (totalCounterPoints > 0 && !this.heroes[0].isDefeated) {
            await new Promise(res => setTimeout(res, 250));
            const isCriticalCounter = wasBossBroken || this.boss.isBroken;
            const counterMultiplier = isCriticalCounter ? 2.5 : 1.0;
            const counterDamage = Math.round(totalCounterPoints * 160 * counterMultiplier);
            this.boss.hp = Math.max(0, this.boss.hp - counterDamage);

            if (!this.boss.isBroken) {
                this.boss.stagger = Math.max(0, this.boss.stagger - totalCounterPoints * 4);
                if (this.boss.stagger <= 0) {
                    this.boss.isBroken = true;
                    this.boss.breakTurnsLeft = 1;
                    events.emit('stagger_broken', { boss: this.boss });
                }
            }

            events.emit('counter_attack', {
                hero: this.heroes[0],
                damage: counterDamage,
                stacks: totalCounterPoints,
                isCritical: isCriticalCounter
            });
        }

        // Hồi phục trạng thái Break của Boss sau chu kỳ choáng
        if (wasBossBroken) {
            this.boss.breakTurnsLeft--;
            if (this.boss.breakTurnsLeft <= 0) {
                this.boss.isBroken = false;
                this.boss.stagger = this.boss.maxStagger; // Hồi phục Stagger
                events.emit('stagger_recovered', { boss: this.boss });
            }
        }

        // Bắt đầu turn mới và reset chỉ số lượt
        this.counterStacks = 0;
        this.earlyEndMitigation = 0;
        this.heroes[3].deflectorStacks = 0;
        this.turn++;
        this.movesLeft = this.maxMoves;

        events.emit('new_turn_started', { turn: this.turn, movesLeft: this.movesLeft });
        events.emit('state_updated', { heroes: this.heroes, boss: this.boss, movesLeft: this.movesLeft });
        this.isProcessing = false;
    }

    /** Kích hoạt Kỹ Năng Chủ Động (Manual Skill) của Hero */
    triggerSkill(heroIndex) {
        const hero = this.heroes[heroIndex];
        if (!hero || hero.isDefeated || hero.skillCd > 0) return false;

        hero.skillCd = hero.maxCd;
        let skillMsg = '';

        if (hero.role === 'Attacker') {
            // Astra: Lôi Trảm 1800 DMG + 25 Stagger
            let dmg = 1800;
            if (this.boss.isBroken) dmg *= 2.0;
            this.boss.hp = Math.max(0, this.boss.hp - dmg);
            if (!this.boss.isBroken) {
                this.boss.stagger = Math.max(0, this.boss.stagger - 25);
                if (this.boss.stagger <= 0) {
                    this.boss.isBroken = true;
                    this.boss.breakTurnsLeft = 1;
                    events.emit('stagger_broken', { boss: this.boss });
                }
            }
            skillMsg = `Lôi Trảm gây ${dmg} DMG & bào mòn 25 Stagger!`;
            events.emit('damage_dealt', { damage: dmg, hero, isCritical: this.boss.isBroken });
        } else if (hero.role === 'Supporter') {
            // Elysia: Phá Giáp 40 Stagger & +20 Nộ
            if (!this.boss.isBroken) {
                this.boss.stagger = Math.max(0, this.boss.stagger - 40);
                if (this.boss.stagger <= 0) {
                    this.boss.isBroken = true;
                    this.boss.breakTurnsLeft = 1;
                    events.emit('stagger_broken', { boss: this.boss });
                }
            }
            this.heroes.forEach((h, idx) => {
                if (idx !== heroIndex && !h.isDefeated) {
                    h.energy = Math.min(h.maxEnergy, h.energy + 20);
                }
            });
            skillMsg = `Phá Giáp bào mòn 40 Stagger & nạp +20 Nộ cho toàn đội!`;
        } else if (hero.role === 'Healer') {
            // Lin: Hồi 450 HP cho toàn đội
            this.heroes.forEach(h => {
                if (!h.isDefeated) {
                    h.hp = Math.min(h.maxHp, h.hp + 450);
                }
            });
            skillMsg = `Nanite Sinh Học hồi phục 450 HP cho cả đội!`;
            events.emit('heal_triggered', { heal: 450, hero });
        } else if (hero.role === 'Defender') {
            // Boran: Khiên Phản Chấn 4 Stacks
            hero.deflectorStacks = 4;
            skillMsg = `Dựng Khiên Phản Chấn (4 Stacks) sẵn sàng giảm 60% đòn đánh Boss!`;
            events.emit('deflector_charge', { stacks: 4 });
        }

        events.emit('skill_executed', { hero, message: skillMsg });
        events.emit('state_updated', { heroes: this.heroes, boss: this.boss });
        return true;
    }

    /** Kích hoạt Ultimate của Hero */
    triggerUltimate(heroIndex) {
        const hero = this.heroes[heroIndex];
        if (!hero || hero.isDefeated || hero.energy < hero.maxEnergy) return false;

        hero.energy = 0;
        let ultResultMsg = '';

        if (hero.role === 'Attacker') {
            let ultDmg = 4500;
            if (this.boss.isBroken) ultDmg *= 2.0;
            this.boss.hp = Math.max(0, this.boss.hp - ultDmg);
            ultResultMsg = `Vũ Điệu Lôi Quang giáng ${ultDmg} sát thương cực đại lên Boss!`;
            events.emit('ultimate_executed', { hero, damage: ultDmg, isCritical: this.boss.isBroken });
            events.emit('damage_dealt', { damage: ultDmg, hero, isCritical: this.boss.isBroken });
        } else if (hero.role === 'Supporter') {
            this.movesLeft = Math.min(this.maxMoves, this.movesLeft + 1);
            this.heroes.forEach(h => {
                if (!h.isDefeated) h.energy = Math.min(h.maxEnergy, h.energy + 40);
            });
            ultResultMsg = `Chrono Burst: +1 Lượt đi & +40 Nộ cho toàn đội!`;
            events.emit('ultimate_executed', { hero, message: ultResultMsg });
        } else if (hero.role === 'Healer') {
            this.heroes.forEach(h => {
                h.hp = h.maxHp;
                if (h.isDefeated) h.isDefeated = false;
            });
            ultResultMsg = `Thánh Vực Bất Diệt: Hồi 100% Máu & Hồi sinh đồng đội!`;
            events.emit('ultimate_executed', { hero, message: ultResultMsg });
            events.emit('heal_triggered', { heal: 1000, hero });
        } else if (hero.role === 'Defender') {
            let ultDmg = 3800;
            if (this.boss.isBroken) ultDmg *= 2.0;
            this.boss.hp = Math.max(0, this.boss.hp - ultDmg);
            hero.deflectorStacks = 4;
            ultResultMsg = `Phản Kích Bộc Phá: Giáng ${ultDmg} DMG & dựng khiên tối thượng!`;
            events.emit('ultimate_executed', { hero, damage: ultDmg });
            events.emit('deflector_charge', { stacks: 4 });
        }

        events.emit('state_updated', { heroes: this.heroes, boss: this.boss });
        return true;
    }
}
