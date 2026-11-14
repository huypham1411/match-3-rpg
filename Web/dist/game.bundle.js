/** RE:FRAY COMBINED GAME BUNDLE - THREE.JS MATCH-3 RPG */
(function() {
"use strict";


// --- MODULE: Web\src\core\EventBus.js ---
/**
 * Web/src/core/EventBus.js
 * ============================================================================
 * [PSTACK ARCHITECTURE]: Decoupled Event System.
 * Cho phép Tầng Mô phỏng (Core), Tầng Trình diễn 3D (Three.js), và Tầng HUD
 * giao tiếp bất đồng bộ qua Sự kiện mà không phụ thuộc trực tiếp vào nhau.
 * ============================================================================
 */

class EventBus {
    constructor() {
        this.listeners = new Map();
    }

    /** Đăng ký lắng nghe sự kiện */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
        return () => this.off(event, callback);
    }

    /** Hủy đăng ký sự kiện */
    off(event, callback) {
        if (!this.listeners.has(event)) return;
        const callbacks = this.listeners.get(event).filter(cb => cb !== callback);
        this.listeners.set(event, callbacks);
    }

    /** Phát tín hiệu sự kiện kèm dữ liệu */
    emit(event, data) {
        if (!this.listeners.has(event)) return;
        for (const cb of this.listeners.get(event)) {
            try {
                cb(data);
            } catch (err) {
                console.error(`[EventBus] Lỗi xử lý sự kiện '${event}':`, err);
            }
        }
    }
}
const events = new EventBus();


// --- MODULE: Web\src\core\GameState.js ---
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
const COLORS = {
    FIRE: 1,      // Đỏ (Attacker)
    WATER: 2,     // Xanh Cobalt (Defender/Support)
    NATURE: 3,    // Lục (Healer)
    LIGHTNING: 4, // Vàng (Attacker)
    VOID: 5,      // Tím (Supporter)
    ICE: 6        // Băng Tuyết (Defender)
};
const COLOR_NAMES = {
    1: 'Hỏa Năng (Crimson)',
    2: 'Hải Lưu (Cobalt)',
    3: 'Sinh Mệnh (Emerald)',
    4: 'Lôi Điện (Volt)',
    5: 'Trọng Lực (Amethyst)',
    6: 'Băng Tuyết (Diamond Ice)'
};
const SPECIAL_TYPES = {
    NONE: 0,
    LINE_ROW: 1,     // Quét toàn bộ hàng ngang (Match 4 ngang)
    LINE_COL: 2,     // Quét toàn bộ cột dọc (Match 4 dọc)
    BOMB_3X3: 3,     // Nổ 3x3 diện rộng (Match 5 chữ L hoặc T)
    SWAP_ALL: 4      // Lỗ đen sắc màu (Match 5 thẳng hàng): nổ tất cả ngọc cùng màu
};
const OBSTACLE_TYPES = {
    NONE: 0,
    ICE: 1,          // 2 HP - tan chảy khi có match kề cạnh
    ROCK: 2,         // 3 HP - khối đá chặn rơi, cần match kề cạnh hoặc bom phá
    CRATE: 3,        // 2 HP - hộp kim loại chặn rơi
    CHAIN: 4         // 1 HP - xích khoá ô không cho đổi chỗ
};
const STAGES_DATA = {
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
class GameState {
    constructor(width = 8, height = 8) {
        this.width = width;
        this.height = height;
        this.currentStageId = 1;
        this.turn = 1;
        this.movesLeft = 4;
        this.maxMoves = 4;
        this.score = 0;
        this.comboChain = 0;

        // Đội hình 4 Role chuẩn (kèm cờ isDefeated)
        this.heroes = [
            { id: 1, name: 'Lôi Kiếm Sĩ (Astra)', role: 'Attacker', color: COLORS.FIRE, altColor: COLORS.LIGHTNING, hp: 1000, maxHp: 1000, energy: 40, maxEnergy: 100, skillCd: 0, maxCd: 3, isDefeated: false },
            { id: 2, name: 'Tinh Linh (Elysia)', role: 'Supporter', color: COLORS.VOID, altColor: COLORS.WATER, hp: 850, maxHp: 850, energy: 20, maxEnergy: 100, skillCd: 0, maxCd: 4, isDefeated: false },
            { id: 3, name: 'Thánh Nữ (Lin)', role: 'Healer', color: COLORS.NATURE, altColor: 0, hp: 900, maxHp: 900, energy: 30, maxEnergy: 100, skillCd: 0, maxCd: 3, isDefeated: false },
            { id: 4, name: 'Thiết Giáp (Boran)', role: 'Defender', color: COLORS.ICE, altColor: COLORS.WATER, hp: 1400, maxHp: 1400, energy: 10, maxEnergy: 100, skillCd: 0, maxCd: 4, deflectorStacks: 0, isDefeated: false }
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
            this.checkHeroFaint();
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
        if (!hero || hero.isDefeated || hero.energy < hero.maxEnergy) return false;

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


// --- MODULE: Web\src\three\Engine.js ---
/**
 * Web/src/three/Engine.js
 * ============================================================================
 * [DUAL 3D ENGINE ARCHITECTURE - PSTACK RIGOR]
 * Tách biệt hoàn toàn hai miền không gian:
 *  1. ArenaEngine: Sân khấu chiến đấu 3D (Boss, Heroes, Stage) -> XOAY 360 ĐỘ TỰ DO
 *  2. BoardEngine: Bàn Match-3 8x8 (64 khối nguyên tố PBR) -> CỐ ĐỊNH HOÀN TOÀN
 * ============================================================================
 */

/** 1. LÕI 3D SÂN KHẤU CHIẾN ĐẤU (BÀN ĐẤU XOAY ĐƯỢC 360 ĐỘ) */
class ArenaEngine {
    constructor(canvasContainer) {
        this.container = canvasContainer;
        this.width = canvasContainer.clientWidth || window.innerWidth;
        this.height = canvasContainer.clientHeight || 240;

        this.updatables = [];
        this.clock = new THREE.Clock();

        this.initScene();
        this.initCamera();
        this.initRenderer();
        this.initLights();
        this.initControls();
        this.initResizeHandler();

        this.startLoop();
    }

    initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0c14);
        this.scene.fog = new THREE.FogExp2(0x0a0c14, 0.025);
    }

    initCamera() {
        const aspect = this.width / this.height;
        this.camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 100);
        this.camera.position.set(0, 5.2, 9.5);
        this.camera.lookAt(0, 1.2, 0);
    }

    initRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;

        this.container.appendChild(this.renderer.domElement);
    }

    initLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);

        const keyLight = new THREE.DirectionalLight(0xffffff, 1.3);
        keyLight.position.set(8, 15, 10);
        keyLight.castShadow = true;
        this.scene.add(keyLight);

        const cyanRim = new THREE.PointLight(0x00f0ff, 2.5, 20);
        cyanRim.position.set(-6, 4, -4);
        this.scene.add(cyanRim);

        const crimsonRim = new THREE.PointLight(0xff0055, 3.0, 25);
        crimsonRim.position.set(6, 6, -5);
        this.scene.add(crimsonRim);
    }

    initControls() {
        if (typeof THREE.OrbitControls !== 'undefined') {
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.08;
            this.controls.target.set(0, 1.2, 0);

            // BÀN ĐẤU CHIẾN ĐẤU XOAY ĐƯỢC 360 ĐỘ TỰ DO
            this.controls.enableRotate = true;
            this.controls.enableZoom = true;
            this.controls.enablePan = false;

            this.controls.minDistance = 5.0;
            this.controls.maxDistance = 16.0;
            this.controls.minPolarAngle = Math.PI * 0.15; // Giới hạn góc ngẩng
            this.controls.maxPolarAngle = Math.PI * 0.48; // Không nhìn xuyên dưới sàn
        }
    }

    initResizeHandler() {
        window.addEventListener('resize', () => {
            this.width = this.container.clientWidth || window.innerWidth;
            this.height = this.container.clientHeight || 240;
            this.camera.aspect = this.width / this.height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(this.width, this.height);
        });
    }

    addUpdatable(module) {
        this.updatables.push(module);
    }

    startLoop() {
        const loop = () => {
            requestAnimationFrame(loop);
            const delta = this.clock.getDelta();
            const elapsed = this.clock.getElapsedTime();

            if (this.controls) this.controls.update();

            for (const item of this.updatables) {
                if (typeof item.update === 'function') {
                    item.update(delta, elapsed);
                }
            }

            this.renderer.render(this.scene, this.camera);
        };
        loop();
    }
}

/** 2. LÕI 3D BÀN MATCH-3 (CỐ ĐỊNH HOÀN TOÀN, KHÔNG XOAY, KHÔNG LẮC) */
class BoardEngine {
    constructor(canvasContainer) {
        this.container = canvasContainer;
        this.width = canvasContainer.clientWidth || window.innerWidth;
        this.height = canvasContainer.clientHeight || 450;

        this.updatables = [];
        this.clock = new THREE.Clock();

        this.initScene();
        this.initCamera();
        this.initRenderer();
        this.initLights();
        // KHÔNG CÓ OrbitControls -> BÀN CỜ MATCH-3 CỐ ĐỊNH TUYỆT ĐỐI
        this.initResizeHandler();

        this.startLoop();
    }

    initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0c14);
    }

    initCamera() {
        const aspect = this.width / this.height;
        this.camera = new THREE.PerspectiveCamera(44, aspect, 0.1, 100);
        this.updateCameraForDevice(aspect);
    }

    updateCameraForDevice(aspect) {
        if (aspect < 1.0) {
            // Mobile Portrait: Góc nhìn phẳng tối ưu chạm ngón cái
            this.camera.fov = 44;
            this.camera.position.set(0, 14.5, 8.5);
            this.camera.lookAt(0, -0.2, 0);
        } else {
            // Desktop: Cân bằng góc nhìn
            this.camera.fov = 38;
            this.camera.position.set(0, 16.0, 9.0);
            this.camera.lookAt(0, 0, 0);
        }
        this.camera.updateProjectionMatrix();
    }

    initRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.25;

        this.container.appendChild(this.renderer.domElement);
    }

    initLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
        this.scene.add(ambientLight);

        const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
        keyLight.position.set(5, 18, 12);
        keyLight.castShadow = true;
        this.scene.add(keyLight);

        const topCyan = new THREE.PointLight(0x00f0ff, 1.5, 15);
        topCyan.position.set(0, 8, 4);
        this.scene.add(topCyan);
    }

    initResizeHandler() {
        window.addEventListener('resize', () => {
            this.width = this.container.clientWidth || window.innerWidth;
            this.height = this.container.clientHeight || 450;
            const aspect = this.width / this.height;
            this.camera.aspect = aspect;
            this.updateCameraForDevice(aspect);
            this.renderer.setSize(this.width, this.height);
        });
    }

    addUpdatable(module) {
        this.updatables.push(module);
    }

    startLoop() {
        const loop = () => {
            requestAnimationFrame(loop);
            const delta = this.clock.getDelta();
            const elapsed = this.clock.getElapsedTime();

            for (const item of this.updatables) {
                if (typeof item.update === 'function') {
                    item.update(delta, elapsed);
                }
            }

            this.renderer.render(this.scene, this.camera);
        };
        loop();
    }
}

/** Lớp bọc tương thích ngược */
class Engine3D extends BoardEngine {}


// --- MODULE: Web\src\three\Board3D.js ---
/**
 * Web/src/three/Board3D.js
 * ============================================================================
 * [THREE.JS FUNDAMENTAL 2]: BÀN MATCH-3 3D & TƯƠNG TÁC RAYCASTER
 * 
 * Tài liệu học tập Three.js:
 *  1. Raycasting (Bắt tương tác chuột trong không gian 3D):
 *     - Đổi toạ độ màn hình (clientX, clientY) sang Normalized Device Coordinates (NDC: -1 đến +1).
 *     - Bắn tia từ Camera xuyên qua không gian 3D bằng raycaster.setFromCamera().
 *     - Tìm khối 3D bị tia đâm xuyên bằng raycaster.intersectObjects().
 *  2. BoxGeometry & MeshStandardMaterial (Vật liệu kim loại PBR):
 *     - 6 khối nguyên tố sử dụng kim loại ánh kim (metalness = 0.35, roughness = 0.25).
 *     - Hiệu ứng phát sáng Emissive khi được người chơi click chọn.
 *  3. Animation Nội Suy (Lerp & Squash/Stretch):
 *     - Rơi tự do từ trên cao xuống vị trí hàng (Interpolation Lerp).
 *     - Tiếp đất nảy co giãn: Tạm thời scale (1.25, 0.75, 1.25) rồi đàn hồi về (1.0, 1.0, 1.0).
 * ============================================================================
 */

// Bảng màu PBR 6 Nguyên tố
const ELEMENT_MATERIALS = {
    1: { color: 0xef4444, emissive: 0x7f1d1d, name: 'Thermal Crimson' },   // Đỏ
    2: { color: 0x2563eb, emissive: 0x1e3a8a, name: 'Deep Cobalt' },       // Xanh Dương Đậm
    3: { color: 0x10b981, emissive: 0x064e3b, name: 'Bio Emerald' },       // Lục
    4: { color: 0xf59e0b, emissive: 0x78350f, name: 'Volt Lightning' },    // Vàng
    5: { color: 0x8b5cf6, emissive: 0x4c1d95, name: 'Graviton Amethyst' }, // Tím
    6: { color: 0x38bdf8, emissive: 0x0c4a6e, name: 'Diamond Frost' }      // Băng Tuyết
};
class Board3D {
    constructor(engine, gameState) {
        this.engine = engine;
        this.state = gameState;
        this.scene = engine.scene;
        this.camera = engine.camera;

        this.tileSize = 1.05;      // Kích thước mỗi khối
        this.spacing = 0.12;       // Khoảng cách giữa các khối
        this.boardGroup = new THREE.Group();
        this.scene.add(this.boardGroup);

        // Vị trí đặt bàn cờ trong BoardEngine riêng biệt: Căn giữa hoàn hảo tại (0, 0, 0)
        this.boardGroup.position.set(0, 0, 0);
        this.boardGroup.rotation.x = -Math.PI / 10; // Góc nghiêng 18 độ tối ưu cho góc nhìn từ trên xuống

        this.tileMeshes = [];      // Mảng 2 chiều 8x8 chứa THREE.Mesh
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.selectedCoord = null; // {r, c}
        this.animatingTiles = [];  // Danh sách các khối đang bay/rơi

        this.initMaterials();
        this.initBoardBase();
        this.buildInitialTiles();
        this.initRaycastInput();
        this.initEventListeners();
    }

    /** Tạo các vật liệu PBR tái sử dụng */
    initMaterials() {
        this.materials = {};
        for (const [id, cfg] of Object.entries(ELEMENT_MATERIALS)) {
            this.materials[id] = new THREE.MeshStandardMaterial({
                color: cfg.color,
                emissive: cfg.emissive,
                emissiveIntensity: 0.35,
                metalness: 0.45,
                roughness: 0.2,
                wireframe: false
            });
        }

        // Vật liệu khung viền phát sáng khi chọn
        this.selectHighlightMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            wireframe: true
        });
    }

    /** Dựng bệ đỡ (Plinth) nằm dưới bàn cờ 3D */
    initBoardBase() {
        const baseWidth = this.state.width * (this.tileSize + this.spacing) + 0.6;
        const baseHeight = this.state.height * (this.tileSize + this.spacing) + 0.6;
        
        const baseGeo = new THREE.BoxGeometry(baseWidth, baseHeight, 0.4);
        const baseMat = new THREE.MeshStandardMaterial({
            color: 0x111625,
            metalness: 0.8,
            roughness: 0.4
        });

        const baseMesh = new THREE.Mesh(baseGeo, baseMat);
        baseMesh.position.z = -0.3;
        baseMesh.receiveShadow = true;
        this.boardGroup.add(baseMesh);

        // Viền đèn neon bao quanh bệ
        const edgeGeo = new THREE.EdgesGeometry(baseGeo);
        const edgeMat = new THREE.LineBasicMaterial({ color: 0x00f0ff });
        const edgeLine = new THREE.LineSegments(edgeGeo, edgeMat);
        edgeLine.position.z = -0.3;
        this.boardGroup.add(edgeLine);
    }

    /** Chuyển toạ độ lưới (r, c) sang toạ độ Local 3D (x, y, z) */
    gridToLocalPos(r, c) {
        const totalW = (this.state.width - 1) * (this.tileSize + this.spacing);
        const totalH = (this.state.height - 1) * (this.tileSize + this.spacing);

        const x = c * (this.tileSize + this.spacing) - totalW / 2;
        const y = -(r * (this.tileSize + this.spacing) - totalH / 2); // r=0 ở đỉnh
        const z = 0;
        return { x, y, z };
    }

    /** Dựng tất cả 64 khối 3D khởi đầu */
    buildInitialTiles() {
        const geo = new THREE.BoxGeometry(this.tileSize, this.tileSize, 0.45);

        this.tileMeshes = Array(this.state.height).fill(null).map(() => Array(this.state.width).fill(null));

        for (let r = 0; r < this.state.height; r++) {
            for (let c = 0; c < this.state.width; c++) {
                const color = this.state.getTile(r, c);
                const mesh = new THREE.Mesh(geo, this.materials[color]);
                
                const pos = this.gridToLocalPos(r, c);
                mesh.position.set(pos.x, pos.y, pos.z);
                mesh.castShadow = true;
                mesh.receiveShadow = true;

                // Gắn dữ liệu toạ độ lưới vào Mesh để Raycaster đọc
                mesh.userData = { r, c, color };

                this.boardGroup.add(mesh);
                this.tileMeshes[r][c] = mesh;
            }
        }
    }

    /** 1. Tương tác Raycaster bắt sự kiện Click chuột vào khối 3D */
    initRaycastInput() {
        const dom = this.engine.renderer.domElement;

        dom.addEventListener('pointerdown', (e) => {
            if (this.state.isProcessing) return;

            const rect = dom.getBoundingClientRect();
            // Đổi toạ độ pixel sang NDC (-1.0 đến +1.0)
            this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            // Bắn tia từ camera
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects(this.boardGroup.children);

            // Tìm vật thể khối hợp lệ
            const hit = intersects.find(item => item.object.userData && typeof item.object.userData.r === 'number');

            if (hit) {
                const { r, c } = hit.object.userData;
                this.handleTileClick(r, c);
            }
        });
    }

    /** Xử lý chọn khối hoặc hoán đổi 2 khối */
    handleTileClick(r, c) {
        if (!this.selectedCoord) {
            // Lần click đầu tiên: Đánh dấu chọn
            this.selectedCoord = { r, c };
            this.setTileHighlight(r, c, true);
        } else {
            const prev = this.selectedCoord;
            this.setTileHighlight(prev.r, prev.c, false);
            this.selectedCoord = null;

            if (prev.r === r && prev.c === c) {
                // Click lại chính ô đó -> Bỏ chọn
                return;
            }

            // Thử hoán đổi
            this.state.swap(prev.r, prev.c, r, c);
        }
    }

    /** Bật/Tắt hiệu ứng phát sáng cho khối đang được chọn */
    setTileHighlight(r, c, isSelected) {
        const mesh = this.tileMeshes[r][c];
        if (!mesh) return;

        if (isSelected) {
            mesh.scale.set(1.15, 1.15, 1.4);
            mesh.material.emissiveIntensity = 0.95;
        } else {
            mesh.scale.set(1.0, 1.0, 1.0);
            mesh.material.emissiveIntensity = 0.35;
        }
    }

    /** Lắng nghe các sự kiện từ GameState để diễn hoạt 3D */
    initEventListeners() {
        // 1. Hoán đổi 2 khối (Swap Animation)
        events.on('swap_start', ({ from, to }) => {
            this.animateSwap(from, to);
        });

        // 2. Nổ vỡ khối (Shatter / Match Animation)
        events.on('match_shatter', ({ matches }) => {
            this.animateShatter(matches);
        });

        // 3. Khối rơi xuống và nạp mới (Gravity Drop)
        events.on('blocks_fall', ({ drops }) => {
            this.animateDrops(drops);
        });

        // 4. Sinh ngọc đặc biệt (Match 4, Match 5, 2x2, L/T)
        events.on('special_created', ({ r, c, specialType, color }) => {
            this.attachSpecialMarker(r, c, specialType, color);
        });
    }

    /** Gắn ký hiệu thị giác phẳng (Embossed Tactical Marker) cho Ngọc Đặc Biệt - Không xoay rối mắt */
    attachSpecialMarker(r, c, specialType, color) {
        let mesh = this.tileMeshes[r][c];
        if (!mesh) {
            // Khắc phục triệt để lỗi ô trống: Tự động hồi sinh khối nếu bị thiếu
            const col = color || (this.state && this.state.getTile(r, c)) || 1;
            const geo = new THREE.BoxGeometry(this.tileSize, this.tileSize, 0.45);
            mesh = new THREE.Mesh(geo, this.materials[col]);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.userData = { r, c, color: col };
            const pos = this.gridToLocalPos(r, c);
            mesh.position.set(pos.x, pos.y, pos.z);
            this.boardGroup.add(mesh);
            this.tileMeshes[r][c] = mesh;
        }

        // Xóa marker cũ nếu có
        const oldMarker = mesh.getObjectByName('special_marker');
        if (oldMarker) mesh.remove(oldMarker);

        let markerGeo;
        let markerMat;

        if (specialType === 1) {
            // LineRow: Vạch Laser ngang sắc nét phẳng
            markerGeo = new THREE.BoxGeometry(this.tileSize * 0.85, 0.16, 0.12);
            markerMat = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                emissive: 0x00f0ff,
                emissiveIntensity: 1.5,
                metalness: 0.9,
                roughness: 0.1
            });
        } else if (specialType === 2) {
            // LineCol: Vạch Laser dọc sắc nét phẳng
            markerGeo = new THREE.BoxGeometry(0.16, this.tileSize * 0.85, 0.12);
            markerMat = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                emissive: 0x00f0ff,
                emissiveIntensity: 1.5,
                metalness: 0.9,
                roughness: 0.1
            });
        } else if (specialType === 3) {
            // Bom 3x3: Vòng tâm ngắm đa hướng phẳng + Lõi năng lượng phát sáng
            markerGeo = new THREE.RingGeometry(0.15, 0.35, 24);
            markerMat = new THREE.MeshBasicMaterial({
                color: 0xff0055,
                side: THREE.DoubleSide
            });
        } else if (specialType === 4) {
            // SwapAll / Lỗ đen vũ trụ: Biểu tượng Kim Cương đa giác cố định (Prismatic Core)
            markerGeo = new THREE.OctahedronGeometry(0.35, 0);
            markerMat = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                emissive: 0x00f0ff,
                emissiveIntensity: 1.8,
                metalness: 0.95,
                roughness: 0.1
            });
        }

        if (markerGeo) {
            const marker = new THREE.Mesh(markerGeo, markerMat);
            marker.name = 'special_marker';
            marker.position.z = 0.28; // Nổi vừa vặn trên mặt phẳng khối
            if (specialType === 4) {
                marker.rotation.z = Math.PI / 4; // Cố định góc kim cương, không quay
            }
            marker.userData = { isSpecialMarker: true, specialType };
            mesh.add(marker);

            // Hiệu ứng bộc phát khi vừa biến hình thành ngọc đặc biệt
            mesh.scale.set(1.3, 1.3, 1.3);
            setTimeout(() => {
                if (mesh) mesh.scale.set(1.0, 1.0, 1.0);
            }, 180);
        }
    }

    /** Diễn hoạt hoán đổi 2 khối bằng toán học Lerp */
    animateSwap(from, to) {
        const m1 = this.tileMeshes[from.r][from.c];
        const m2 = this.tileMeshes[to.r][to.c];
        if (!m1 || !m2) return;

        const p1 = this.gridToLocalPos(from.r, from.c);
        const p2 = this.gridToLocalPos(to.r, to.c);

        // Đổi vị trí trong mảng
        this.tileMeshes[from.r][from.c] = m2;
        this.tileMeshes[to.r][to.c] = m1;
        m1.userData.r = to.r; m1.userData.c = to.c;
        m2.userData.r = from.r; m2.userData.c = from.c;

        m1.position.set(p2.x, p2.y, p2.z);
        m2.position.set(p1.x, p1.y, p1.z);
    }

    /** Diễn hoạt nổ thu nhỏ và biến mất */
    animateShatter(matches) {
        matches.forEach(m => {
            const mesh = this.tileMeshes[m.r][m.c];
            if (mesh) {
                // Biến mất khỏi bàn
                this.boardGroup.remove(mesh);
                mesh.geometry.dispose();
                this.tileMeshes[m.r][m.c] = null;
            }
        });
    }

    /** Diễn hoạt trọng lực rơi và nảy khối (Squash & Stretch) */
    animateDrops(drops) {
        const geo = new THREE.BoxGeometry(this.tileSize, this.tileSize, 0.45);

        drops.forEach(d => {
            let mesh = null;
            if (d.isNew) {
                // Khối mới sinh ra ở phía trên bàn cờ
                mesh = new THREE.Mesh(geo, this.materials[d.color]);
                mesh.castShadow = true;
                const startPos = this.gridToLocalPos(d.from.r, d.to.c);
                mesh.position.set(startPos.x, startPos.y + 4.0, startPos.z);
                this.boardGroup.add(mesh);
            } else {
                mesh = this.tileMeshes[d.from.r][d.from.c];
                if (!mesh) {
                    // Tự động bù đắp khối nếu bị thiếu, triệt tiêu hoàn toàn lỗi ô đen
                    mesh = new THREE.Mesh(geo, this.materials[d.color]);
                    mesh.castShadow = true;
                    const startPos = this.gridToLocalPos(d.from.r, d.from.c);
                    mesh.position.set(startPos.x, startPos.y, startPos.z);
                    this.boardGroup.add(mesh);
                }
                // Xoá tham chiếu ở ô cũ để tránh trùng lặp
                this.tileMeshes[d.from.r][d.from.c] = null;
            }

            if (mesh) {
                const targetPos = this.gridToLocalPos(d.to.r, d.to.c);
                mesh.userData = { r: d.to.r, c: d.to.c, color: d.color };
                this.tileMeshes[d.to.r][d.to.c] = mesh;

                // Đăng ký hiệu ứng rơi nảy mượt mà
                this.animatingTiles.push({
                    mesh,
                    targetY: targetPos.y,
                    speed: 16.0 + Math.random() * 4.0,
                    squashTimer: 0
                });
            }
        });
    }

    /** Vòng lặp cập nhật chuyển động mỗi frame (60 FPS) */
    update(delta, elapsed) {
        // Cập nhật các khối đang rơi
        for (let i = this.animatingTiles.length - 1; i >= 0; i--) {
            const anim = this.animatingTiles[i];
            const mesh = anim.mesh;

            if (mesh.position.y > anim.targetY) {
                mesh.position.y -= anim.speed * delta;
                if (mesh.position.y <= anim.targetY) {
                    mesh.position.y = anim.targetY;
                    // Bắt đầu pha co giãn Squash & Stretch
                    anim.squashTimer = 0.12;
                    mesh.scale.set(1.22, 0.8, 1.22);
                }
            } else if (anim.squashTimer > 0) {
                anim.squashTimer -= delta;
                if (anim.squashTimer <= 0) {
                    mesh.scale.set(1.0, 1.0, 1.0);
                    this.animatingTiles.splice(i, 1);
                }
            }
        }

        // [ANTI-VISUAL SLOP]: Hiệu ứng thở nhẹ (Subtle Pulse) thay vì xoay mòng mòng gây rối mắt
        const pulse = Math.sin(elapsed * 2.8) * 0.06 + 1.0;
        for (let r = 0; r < this.state.height; r++) {
            for (let c = 0; c < this.state.width; c++) {
                const mesh = this.tileMeshes[r][c];
                if (mesh) {
                    const marker = mesh.getObjectByName('special_marker');
                    if (marker) {
                        marker.scale.set(pulse, pulse, 1.0);
                    }
                }
            }
        }
    }
}


// --- MODULE: Web\src\three\Diorama3D.js ---
/**
 * Web/src/three/Diorama3D.js
 * ============================================================================
 * [THREE.JS FUNDAMENTAL 3]: SÂN KHẤU CHIẾN ĐẤU 3D & DIỄN HOẠ NHÂN VẬT
 * 
 * Tài liệu học tập Three.js:
 *  1. Hệ Thống Cây Phân Cấp (THREE.Group & Scene Graph):
 *     - Mỗi nhân vật là một `THREE.Group` chứa các bộ phận hình học (Thân, Đầu, Vũ khí, Hào quang).
 *     - Khi xoay hoặc di chuyển Group cha, tất cả bộ phận con sẽ chuyển động đồng bộ.
 *  2. Chuyển Động Tuần Hoàn Thủ Công (Procedural Idle Bobbing):
 *     - Dùng hàm lượng giác `Math.sin(elapsed * speed + offset)` để tạo cảm giác nhân vật thở
 *       hoặc trôi nổi lơ lửng tự nhiên mà không cần file hoạt ảnh bên ngoài.
 *  3. Hoạt Ảnh Phản Ứng Chiến Đấu (Combat Reactions):
 *     - Khi chém trúng: Nhân vật lướt tới trước (Lunge).
 *     - Boss bị dính đòn: Rung lắc ngẫu nhiên (Trauma Shake) và nhấp nháy phát sáng đỏ.
 * ============================================================================
 */
class Diorama3D {
    constructor(engine, gameState) {
        this.engine = engine;
        this.state = gameState;
        this.scene = engine.scene;

        this.stageGroup = new THREE.Group();
        this.scene.add(this.stageGroup);

        // Đặt sân khấu chiến đấu tại tâm điểm (0, 0, 0) của ArenaEngine riêng biệt
        this.stageGroup.position.set(0, 0, 0);

        this.heroes = [];
        this.boss = null;
        this.bossShakeTimer = 0;

        this.initStageFloor();
        this.buildHeroes();
        this.buildBoss();
        this.initEventListeners();
    }

    /** 1. Dựng sàn đấu tròn phong cách Cyberpunk Arena */
    initStageFloor() {
        const floorGeo = new THREE.CylinderGeometry(4.8, 5.2, 0.35, 32);
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x131828,
            metalness: 0.85,
            roughness: 0.35
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.y = -0.2;
        floor.receiveShadow = true;
        this.stageGroup.add(floor);

        // Vòng tròn ánh sáng đồng tâm trên sàn đấu
        const ringGeo = new THREE.RingGeometry(2.8, 2.95, 48);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.02;
        this.stageGroup.add(ring);
    }

    /** 2. Dựng 4 Nhân vật Chuyên Trách (Attacker, Supporter, Healer, Defender) */
    buildHeroes() {
        const heroConfigs = [
            { name: 'Lôi Kiếm Sĩ (Attacker)', color: 0xef4444, x: -2.4, z: 1.0, weapon: 'blade' },
            { name: 'Tinh Linh (Supporter)', color: 0x8b5cf6, x: -0.8, z: 1.4, weapon: 'ring' },
            { name: 'Thánh Nữ (Healer)', color: 0x10b981, x: 0.8, z: 1.4, weapon: 'staff' },
            { name: 'Thiết Giáp (Defender)', color: 0x2563eb, x: 2.4, z: 1.0, weapon: 'shield' }
        ];

        heroConfigs.forEach((cfg, idx) => {
            const heroGroup = new THREE.Group();
            heroGroup.position.set(cfg.x, 0.8, cfg.z);

            // Thân nhân vật (Cylinder)
            const bodyGeo = new THREE.CylinderGeometry(0.3, 0.4, 1.1, 16);
            const bodyMat = new THREE.MeshStandardMaterial({
                color: cfg.color,
                metalness: 0.5,
                roughness: 0.3
            });
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            body.castShadow = true;
            heroGroup.add(body);

            // Đầu nhân vật (Sphere)
            const headGeo = new THREE.SphereGeometry(0.32, 16, 16);
            const headMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
            const head = new THREE.Mesh(headGeo, headMat);
            head.position.y = 0.85;
            heroGroup.add(head);

            // Vũ khí đặc trưng
            if (cfg.weapon === 'blade') {
                // Song kiếm năng lượng
                const bladeGeo = new THREE.BoxGeometry(0.08, 1.3, 0.15);
                const bladeMat = new THREE.MeshBasicMaterial({ color: 0xff3b30 });
                const blade = new THREE.Mesh(bladeGeo, bladeMat);
                blade.position.set(0.5, 0.5, 0.3);
                blade.rotation.z = -Math.PI / 6;
                heroGroup.add(blade);
            } else if (cfg.weapon === 'shield') {
                // Khiên lục giác hạng nặng
                const shieldGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.1, 6);
                const shieldMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, metalness: 0.9, roughness: 0.2 });
                const shield = new THREE.Mesh(shieldGeo, shieldMat);
                shield.position.set(0.45, 0.3, 0.4);
                shield.rotation.x = Math.PI / 2;
                heroGroup.add(shield);
            } else if (cfg.weapon === 'ring') {
                // Vòng pháp trận trôi nổi
                const ringGeo = new THREE.TorusGeometry(0.5, 0.05, 8, 24);
                const ringMat = new THREE.MeshBasicMaterial({ color: 0xa855f7 });
                const ring = new THREE.Mesh(ringGeo, ringMat);
                ring.position.set(0, 0.5, 0);
                ring.rotation.x = Math.PI / 2;
                heroGroup.add(ring);
            }

            this.stageGroup.add(heroGroup);
            this.heroes.push({
                group: heroGroup,
                baseX: cfg.x,
                baseY: 0.8,
                baseZ: cfg.z,
                offset: idx * 0.8
            });
        });
    }

    /** 3. Dựng Boss Sentinel Unit 07 (Mecha Titan với 2 Drone trôi nổi) */
    buildBoss() {
        this.bossGroup = new THREE.Group();
        this.bossGroup.position.set(0, 1.8, -1.8);

        // Khối thân chính (Octahedron / Khối đa diện Mecha)
        const coreGeo = new THREE.OctahedronGeometry(1.6, 1);
        this.bossMat = new THREE.MeshStandardMaterial({
            color: 0x991b1b,
            emissive: 0x450a0a,
            emissiveIntensity: 0.6,
            metalness: 0.85,
            roughness: 0.25
        });
        const bossCore = new THREE.Mesh(coreGeo, this.bossMat);
        bossCore.castShadow = true;
        this.bossGroup.add(bossCore);

        // Mắt năng lượng trung tâm
        const eyeGeo = new THREE.SphereGeometry(0.45, 16, 16);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0033 });
        const eye = new THREE.Mesh(eyeGeo, eyeMat);
        eye.position.set(-0.9, 0.2, 0.8);
        this.bossGroup.add(eye);

        // 2 Drone Module trôi nổi 2 bên (Không cần xương, chuẩn ngân sách Web)
        this.drones = [];
        [-2.0, 2.0].forEach(offset => {
            const droneGeo = new THREE.ConeGeometry(0.4, 0.9, 4);
            const droneMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9 });
            const drone = new THREE.Mesh(droneGeo, droneMat);
            drone.position.set(offset, 1.2, 0);
            drone.rotation.x = Math.PI;
            this.bossGroup.add(drone);
            this.drones.push(drone);
        });

        this.stageGroup.add(this.bossGroup);
        this.boss = {
            group: this.bossGroup,
            baseX: 2.8,
            baseY: 1.8,
            baseZ: -1.5
        };
    }

    /** 4. Lắng nghe sự kiện để kích hoạt hiệu ứng hành động */
    initEventListeners() {
        // Hero lao tới chém
        events.on('damage_dealt', ({ hero }) => {
            const h = this.heroes[0]; // Attacker
            if (h) {
                // Lao tới trước 0.8 đơn vị
                h.group.position.x = h.baseX + 1.2;
                setTimeout(() => {
                    h.group.position.x = h.baseX;
                }, 180);
            }

            // Boss bị rung chấn (Trauma Shake)
            this.bossShakeTimer = 0.35;
            this.bossMat.emissiveIntensity = 2.0;
            setTimeout(() => {
                this.bossMat.emissiveIntensity = 0.6;
            }, 150);
        });

        // Boss bị vỡ Toughness (Break Stagger)
        events.on('stagger_broken', () => {
            this.bossMat.color.setHex(0x38bdf8); // Chuyển sang màu xanh đóng băng
            this.bossShakeTimer = 0.8;
        });

        events.on('stagger_recovered', () => {
            this.bossMat.color.setHex(0x991b1b); // Hồi phục màu đỏ
        });
    }

    /** 5. Vòng lặp cập nhật chuyển động Idle & Rung chấn mỗi frame */
    update(delta, elapsed) {
        // Diễn hoạt Hero thở bập bồng (Sine Wave)
        this.heroes.forEach(h => {
            h.group.position.y = h.baseY + Math.sin(elapsed * 2.5 + h.offset) * 0.08;
            h.group.rotation.y = Math.sin(elapsed * 1.2 + h.offset) * 0.05;
        });

        // Diễn hoạt Boss trôi nổi & Drone xoay quanh
        if (this.boss) {
            if (this.bossShakeTimer > 0) {
                this.bossShakeTimer -= delta;
                // Rung chấn ngẫu nhiên khi dính đòn
                this.boss.group.position.x = this.boss.baseX + (Math.random() - 0.5) * 0.25;
                this.boss.group.position.y = this.boss.baseY + (Math.random() - 0.5) * 0.25;
            } else {
                this.boss.group.position.x = this.boss.baseX;
                this.boss.group.position.y = this.boss.baseY + Math.sin(elapsed * 1.8) * 0.15;
            }

            // 2 Drone quay nhẹ
            this.drones.forEach((d, i) => {
                d.position.y = 1.2 + Math.sin(elapsed * 3.0 + i) * 0.18;
                d.rotation.y += delta * 1.5;
            });
        }
    }
}


// --- MODULE: Web\src\three\VFX.js ---
/**
 * Web/src/three/VFX.js
 * ============================================================================
 * [THREE.JS FUNDAMENTAL 4]: HỆ THỐNG HẠT NỔ VFX (PARTICLE SYSTEMS)
 * Phục vụ cả 2 miền không gian: ArenaScene và BoardScene
 * ============================================================================
 */
class VFXManager {
    constructor(arenaEngine, boardEngine) {
        this.arenaEngine = arenaEngine;
        this.boardEngine = boardEngine || arenaEngine;
        this.arenaScene = this.arenaEngine ? this.arenaEngine.scene : null;
        this.boardScene = this.boardEngine ? this.boardEngine.scene : null;
        this.emitters = [];

        this.initEventListeners();
    }

    initEventListeners() {
        // Khi nổ khối match-3 -> Bắn pháo hoa hạt trong bàn cờ
        events.on('match_shatter', ({ matches }) => {
            matches.forEach(m => {
                this.spawnShatterParticles(m.color);
            });
        });

        // Khi Boss dính đòn -> Bắn tia lửa điện tại tâm Boss trên sàn đấu
        events.on('damage_dealt', () => {
            this.spawnHitSparks(0, 1.8, -1.8, 0xff0055);
        });
    }

    /** Tạo vụ nổ hạt màu khi khối match-3 vỡ */
    spawnShatterParticles(colorId) {
        const count = 35;
        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const velocities = [];

        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 1.5;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 1.5;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 1.5;

            velocities.push({
                x: (Math.random() - 0.5) * 6.0,
                y: (Math.random() * 5.0) + 1.0,
                z: (Math.random() - 0.5) * 6.0
            });
        }

        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const mat = new THREE.PointsMaterial({
            color: 0x00f0ff,
            size: 0.22,
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending
        });

        const points = new THREE.Points(geo, mat);
        points.position.set(0, 0, 0);
        if (this.boardScene) this.boardScene.add(points);

        this.emitters.push({
            scene: this.boardScene,
            points,
            geo,
            mat,
            velocities,
            life: 0.45
        });
    }

    /** Tạo tia lửa va chạm tại toạ độ 3D */
    spawnHitSparks(x, y, z, colorHex) {
        const count = 25;
        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const velocities = [];

        for (let i = 0; i < count; i++) {
            positions[i * 3] = 0;
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = 0;

            velocities.push({
                x: (Math.random() - 0.5) * 8.0,
                y: (Math.random() - 0.5) * 8.0,
                z: (Math.random() - 0.5) * 8.0
            });
        }

        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const mat = new THREE.PointsMaterial({
            color: colorHex,
            size: 0.28,
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending
        });

        const points = new THREE.Points(geo, mat);
        points.position.set(x, y, z);
        if (this.arenaScene) this.arenaScene.add(points);

        this.emitters.push({
            scene: this.arenaScene,
            points,
            geo,
            mat,
            velocities,
            life: 0.35
        });
    }

    /** Cập nhật chuyển động hạt mỗi frame */
    update(delta) {
        for (let i = this.emitters.length - 1; i >= 0; i--) {
            const em = this.emitters[i];
            em.life -= delta;

            if (em.life <= 0) {
                if (em.scene) em.scene.remove(em.points);
                em.geo.dispose();
                em.mat.dispose();
                this.emitters.splice(i, 1);
                continue;
            }

            const positions = em.geo.attributes.position.array;
            for (let j = 0; j < em.velocities.length; j++) {
                positions[j * 3] += em.velocities[j].x * delta;
                positions[j * 3 + 1] += em.velocities[j].y * delta;
                positions[j * 3 + 2] += em.velocities[j].z * delta;

                // Trọng lực kéo xuống
                em.velocities[j].y -= 9.8 * delta;
            }
            em.geo.attributes.position.needsUpdate = true;
            em.mat.opacity = em.life / 0.45;
        }
    }
}


// --- MODULE: Web\src\ui\HUD.js ---
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
class TacticalHUD {
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

                <!-- LƯỢT ĐI & NƯỚC ĐI CÒN LẠI -->
                <div class="turn-counter-badge">
                    <span class="turn-label">TURN <b id="hudTurnNum">1</b></span>
                    <span class="moves-label">NƯỚC ĐI: <b id="hudMovesLeft" style="color:#00f0ff">4 / 4</b></span>
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
                if (hero.isDefeated) {
                    card.classList.add('hero-defeated');
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
        });

        // Kiểm tra hạ gục Boss -> Mở Modal Chiến Thắng
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


// --- MODULE: Web\src\debug\DebugInspector.js ---
/**
 * Web/src/debug/DebugInspector.js
 * ============================================================================
 * [THREE.JS FUNDAMENTAL 5]: BẢNG CÔNG CỤ HỌC TẬP & KIỂM LỖI 3D (DEBUG INSPECTOR)
 * 
 * Tính năng phục vụ người học:
 *  1. Wireframe Mode: Bật khung lưới đa giác để soi cấu trúc Vertex/Polygon của mọi vật thể.
 *  2. Hardware Monitor: Đo FPS thời gian thực, số lượng Draw Calls và Triangles mà GPU phải vẽ.
 *  3. Camera Preset: 3 góc máy chuẩn (Chiến thuật, Nhìn thẳng từ trên xuống, Cận cảnh combat).
 *  4. Sandbox Triggers: Các nút bấm kích hoạt nhanh (Phá vỡ Stagger, Xả Ultimate, Match thử).
 * ============================================================================
 */
class DebugInspector {
    constructor(arenaEngine, boardEngine, board3D, diorama3D, gameState) {
        this.arenaEngine = arenaEngine;
        this.boardEngine = boardEngine || arenaEngine;
        this.engine = this.boardEngine;
        this.board = board3D;
        this.diorama = diorama3D;
        this.state = gameState;

        this.isWireframe = false;
        this.fps = 60;
        this.frameCount = 0;
        this.lastTime = performance.now();

        this.createDebugUI();
        this.startStatsMonitor();
    }

    /** Tạo giao diện bảng điều khiển nổi trên màn hình */
    createDebugUI() {
        const panel = document.createElement('div');
        panel.id = 'debugInspectorPanel';
        panel.innerHTML = `
            <div class="debug-header">
                <span class="debug-title">🐞 THREE.JS DEBUG & LEARNING INSPECTOR</span>
                <button id="btnToggleDebug" class="debug-btn-min">Thu gọn</button>
            </div>
            <div class="debug-body" id="debugBody">
                <div class="debug-stat-row">
                    <span>⚡ FPS: <b id="statFps" style="color:#10b981">60</b></span>
                    <span>📐 Triangles: <b id="statTriangles">0</b></span>
                    <span>🎨 DrawCalls: <b id="statDrawcalls">0</b></span>
                </div>
                
                <div class="debug-section-title">CHẾ ĐỘ HIỂN THỊ ĐỒ HOẠ (3D FUNDAMENTALS)</div>
                <div class="debug-btn-row">
                    <button id="btnWireframe" class="debug-action-btn">🔲 Bật Wireframe (Khung lưới)</button>
                    <button id="btnResetCam" class="debug-action-btn">🎥 Reset Camera</button>
                </div>

                <div class="debug-section-title">GÓC QUAY CAMERA (CAMERA PRESETS)</div>
                <div class="debug-btn-row">
                    <button id="camTactical" class="debug-action-btn">1. Tactical (Mặc định)</button>
                    <button id="camTopDown" class="debug-action-btn">2. Top-down 90° (Bàn cờ)</button>
                    <button id="camCinematic" class="debug-action-btn">3. Cinematic (Cận cảnh)</button>
                </div>

                <div class="debug-section-title">SANDBOX TEST KỸ NĂNG & MATCH-3</div>
                <div class="debug-btn-row">
                    <button id="btnTestBreak" class="debug-action-btn" style="border-color:#38bdf8">⚡ Phá Stagger Boss</button>
                    <button id="btnTestUlt" class="debug-action-btn" style="border-color:#f59e0b">💥 Full Burst Ultimate</button>
                    <button id="btnTestMatch" class="debug-action-btn" style="border-color:#ef4444">🧩 Random Match-3</button>
                </div>
            </div>
        `;
        document.body.appendChild(panel);

        this.initButtons();
    }

    /** Khởi tạo các sự kiện click cho nút bấm */
    initButtons() {
        const body = document.getElementById('debugBody');
        const btnToggle = document.getElementById('btnToggleDebug');
        // Tự động thu gọn trên màn hình điện thoại để không che khuất không gian chơi
        if (window.innerWidth < 768) {
            body.style.display = 'none';
            btnToggle.textContent = 'Mở rộng';
        }

        btnToggle.addEventListener('click', () => {
            if (body.style.display === 'none') {
                body.style.display = 'block';
                btnToggle.textContent = 'Thu gọn';
            } else {
                body.style.display = 'none';
                btnToggle.textContent = 'Mở rộng';
            }
        });

        // 1. Chế độ Wireframe (Soi lưới)
        document.getElementById('btnWireframe').addEventListener('click', () => {
            this.isWireframe = !this.isWireframe;
            this.engine.scene.traverse(obj => {
                if (obj.isMesh && obj.material) {
                    if (Array.isArray(obj.material)) {
                        obj.material.forEach(m => m.wireframe = this.isWireframe);
                    } else {
                        obj.material.wireframe = this.isWireframe;
                    }
                }
            });
            document.getElementById('btnWireframe').textContent = this.isWireframe ? '⏹️ Tắt Wireframe' : '🔲 Bật Wireframe';
        });

        // 2. Camera Presets
        document.getElementById('camTactical').addEventListener('click', () => {
            const isMobile = window.innerWidth < 768 || (window.innerWidth / window.innerHeight) < 1.0;
            if (isMobile) {
                this.engine.camera.position.set(0, 16.5, 18.0);
                this.engine.camera.lookAt(0, -0.5, 0);
                if (this.engine.controls) this.engine.controls.target.set(0, -0.5, 0);
            } else {
                this.engine.camera.position.set(0, 14, 20);
                this.engine.camera.lookAt(0, 0, 0);
                if (this.engine.controls) this.engine.controls.target.set(0, 0, 0);
            }
        });

        document.getElementById('camTopDown').addEventListener('click', () => {
            this.engine.camera.position.set(0, 18, 1.5);
            this.engine.camera.lookAt(0, -0.5, 1.5);
            if (this.engine.controls) this.engine.controls.target.set(0, -0.5, 1.5);
        });

        document.getElementById('camCinematic').addEventListener('click', () => {
            this.engine.camera.position.set(-3.5, 4.0, 3.0);
            this.engine.camera.lookAt(2.8, 1.8, -1.5);
            if (this.engine.controls) this.engine.controls.target.set(2.8, 1.8, -1.5);
        });

        document.getElementById('btnResetCam').addEventListener('click', () => {
            const aspect = this.engine.width / this.engine.height;
            this.engine.updateCameraForDevice(aspect);
            if (this.engine.controls) this.engine.controls.target.set(0, -0.5, 0);
        });

        // 3. Sandbox Triggers
        document.getElementById('btnTestBreak').addEventListener('click', () => {
            this.state.boss.stagger = 0;
            this.state.boss.isBroken = true;
            this.state.boss.breakTurnsLeft = 2;
            events.emit('stagger_broken', { boss: this.state.boss });
            events.emit('state_updated', { heroes: this.state.heroes, boss: this.state.boss });
        });

        document.getElementById('btnTestUlt').addEventListener('click', () => {
            this.state.heroes.forEach(h => h.energy = h.maxEnergy);
            this.state.triggerUltimate(0); // Lôi Kiếm Sĩ
        });

        document.getElementById('btnTestMatch').addEventListener('click', () => {
            // Tự động tìm một match và kích hoạt
            const matches = this.state.findMatches();
            if (matches.length > 0) {
                this.state.resolveCascade();
            } else {
                // Tạo một match giả lập để người học xem hiệu ứng
                this.state.grid[0][0] = 1;
                this.state.grid[0][1] = 1;
                this.state.grid[0][2] = 1;
                this.state.resolveCascade();
            }
        });
    }

    /** Theo dõi hiệu năng GPU thời gian thực */
    startStatsMonitor() {
        const updateStats = () => {
            requestAnimationFrame(updateStats);
            this.frameCount++;
            const now = performance.now();

            if (now >= this.lastTime + 1000) {
                this.fps = Math.round((this.frameCount * 1000) / (now - this.lastTime));
                this.frameCount = 0;
                this.lastTime = now;

                const fpsEl = document.getElementById('statFps');
                if (fpsEl) {
                    fpsEl.textContent = this.fps;
                    fpsEl.style.color = this.fps >= 55 ? '#10b981' : (this.fps >= 30 ? '#f59e0b' : '#ef4444');
                }

                // Đọc thông số trực tiếp từ Three.js Renderer Info
                const renderInfo = this.engine.renderer.info.render;
                const triEl = document.getElementById('statTriangles');
                const callEl = document.getElementById('statDrawcalls');
                if (triEl) triEl.textContent = renderInfo.triangles;
                if (callEl) callEl.textContent = renderInfo.calls;
            }
        };
        updateStats();
    }
}


// --- MODULE: Web\src\app.js ---
/**
 * Web/src/app.js
 * ============================================================================
 * [ENTRY POINT]: ĐIỂM KHỞI CHẠY HỆ THỐNG MATCHRPG THREE.JS
 * 
 * Lắp ghép kiến trúc 2 tầng độc lập (PSTACK RIGOR):
 *  - ArenaEngine: Sân khấu chiến đấu 3D (Xoay được 360 độ, inspect nhân vật & boss)
 *  - BoardEngine: Bàn Match-3 3D (Cố định hoàn toàn, tối ưu cho ngón cái)
 *  - Core State: Luật chơi xác định (Multi-Stage, Obstacles, Special Blocks)
 * ============================================================================
 */







// Bắt lỗi toàn cục để hiển thị rõ ràng trên thiết bị di động
window.addEventListener('error', (event) => {
    const errOverlay = document.getElementById('errorOverlay');
    const errText = document.getElementById('errorText');
    if (errOverlay && errText) {
        errOverlay.style.display = 'block';
        errText.textContent = `${event.message}\nTại: ${event.filename}:${event.lineno}:${event.colno}`;
    }
});

window.addEventListener('unhandledrejection', (event) => {
    const errOverlay = document.getElementById('errorOverlay');
    const errText = document.getElementById('errorText');
    if (errOverlay && errText) {
        errOverlay.style.display = 'block';
        errText.textContent = `Lỗi Promise Unhandled: ${event.reason?.stack || event.reason}`;
    }
});

function initMatchRPG() {
    try {
        console.log('%c[MATCHRPG THREE.JS] Initializing Dual-Engine 3D Architecture...', 'color: #00f0ff; font-weight: bold; font-size: 14px;');

        const arenaContainer = document.getElementById('arenaCanvasContainer');
        const boardContainer = document.getElementById('boardCanvasContainer');

        if (!arenaContainer || !boardContainer) {
            throw new Error('Không tìm thấy container #arenaCanvasContainer hoặc #boardCanvasContainer!');
        }

        if (typeof THREE === 'undefined') {
            throw new Error('Thư viện Three.js chưa sẵn sàng! Vui lòng kiểm tra file /vendor/three.min.js.');
        }

        // 1. Khởi tạo Lõi Trạng Thái
        const gameState = new GameState(8, 8);

        // 2. Khởi tạo Sân Khấu Chiến Đấu 3D (Xoay được 360 độ)
        const arenaEngine = new ArenaEngine(arenaContainer);
        const diorama3D = new Diorama3D(arenaEngine, gameState);
        arenaEngine.addUpdatable(diorama3D);

        // 3. Khởi tạo Bàn Match-3 3D (Cố định hoàn toàn, tối ưu cảm ứng)
        const boardEngine = new BoardEngine(boardContainer);
        const board3D = new Board3D(boardEngine, gameState);
        boardEngine.addUpdatable(board3D);

        // 4. Khởi tạo Quản lý Hiệu ứng VFX
        const vfx = new VFXManager(arenaEngine, boardEngine);
        arenaEngine.addUpdatable(vfx);
        boardEngine.addUpdatable(vfx);

        // 5. Khởi tạo Giao Diện Tactical HUD
        const hud = new TacticalHUD(gameState);

        // 6. Khởi tạo Bảng Công Cụ Học & Debug 3D
        const debug = new DebugInspector(arenaEngine, boardEngine, board3D, diorama3D, gameState);

        // Lưu vào window để phục vụ kiểm tra
        window.MatchGame = {
            gameState,
            arenaEngine,
            boardEngine,
            board3D,
            diorama3D,
            vfx,
            hud,
            debug
        };

        console.log('%c[MATCHRPG THREE.JS] Hệ thống đã sẵn sàng 100%! Bàn đấu xoay 360° | Bàn cờ cố định.', 'color: #10b981; font-weight: bold;');

        // Ẩn màn hình loading tức thì khi mọi thứ đã sẵn sàng
        const loader = document.getElementById('loadingOverlay');
        if (loader) {
            loader.style.transition = 'opacity 0.25s ease-out';
            loader.style.opacity = '0';
            setTimeout(() => { if (loader.parentNode) loader.remove(); }, 250);
        }
    } catch (err) {
        console.error('Lỗi khởi chạy MatchRPG:', err);
        const errOverlay = document.getElementById('errorOverlay');
        const errText = document.getElementById('errorText');
        if (errOverlay && errText) {
            errOverlay.style.display = 'block';
            errText.textContent = err.stack || err.message || String(err);
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMatchRPG);
} else {
    initMatchRPG();
}


})();
