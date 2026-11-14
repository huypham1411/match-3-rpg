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
        this.camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 100);
        this.camera.position.set(0, 0, 10);
        this.camera.lookAt(0, 0, 0);
        this.updateCameraForDevice(aspect);
    }

    updateCameraForDevice(aspect) {
        // [FLAT 2D VIEWPORT]: Khóa hoàn toàn góc nhìn phẳng trực diện, triệt tiêu chiều sâu 3D gây mỏi mắt
        // Đảm bảo toàn bộ 64 ô bàn cờ hiển thị vuông vức, kích thước đều tăm tắp như Candy Crush
        const boardDimension = 10.0;
        let viewW, viewH;
        if (aspect < 1.0) {
            // Mobile Portrait: Vừa khít bề ngang màn hình, dịch nhẹ tâm góc nhìn lên để chừa không gian thoải mái cho dock Hero bên dưới
            viewW = boardDimension * 1.04;
            viewH = viewW / aspect;
            this.camera.position.set(0, -0.65, 10);
            this.camera.lookAt(0, -0.65, 0);
        } else {
            // Desktop: Vừa khít chiều cao container
            viewH = boardDimension * 1.06;
            viewW = viewH * aspect;
            this.camera.position.set(0, 0, 10);
            this.camera.lookAt(0, 0, 0);
        }
        this.camera.left = -viewW / 2;
        this.camera.right = viewW / 2;
        this.camera.top = viewH / 2;
        this.camera.bottom = -viewH / 2;
        this.camera.updateProjectionMatrix();
    }

    initRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = false; // Bàn cờ phẳng 2D không cần shadow map gây nhoè góc
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.1;

        this.container.appendChild(this.renderer.domElement);
    }

    initLights() {
        // Chiếu sáng phẳng 2D đồng đều trên toàn bộ 64 ô cờ
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
        this.scene.add(ambientLight);

        const keyLight = new THREE.DirectionalLight(0xffffff, 0.5);
        keyLight.position.set(0, 0, 10);
        this.scene.add(keyLight);
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
 * [FLAT 2D MATCH-3 PRESENTATION ENGINE - CANDY CRUSH / DIAMOND STANDARD]
 * 
 * Nâng cấp toàn diện theo chỉ thị của Director:
 *  1. [FLAT 2D AESTHETIC]: Bàn cờ phẳng 2D 100%, khóa hoàn toàn góc nhìn trực diện,
 *     triệt tiêu mọi chiều sâu 3D và bóng đổ gắt gây mỏi mắt người chơi.
 *  2. [HIGH-CLARITY 2D GEMS]: 6 nguyên tố được tạo tác bằng Canvas 2D Procedural
 *     Textures siêu nét (Color-blind friendly icons, bo góc mềm, vệt bóng gương).
 *  3. [STRICT MATCH-3 REVERT]: Nước đi chỉ được chấp thuận khi tạo ra cụm Match-3.
 *     Nếu không tạo được match, hai khối lập tức Snap-back (Revert) về chỗ cũ
 *     kèm hiệu ứng đàn hồi Recoil Bounce, không tiêu hao lượt đi.
 *  4. [TOUCH SWIPE & TAP DUAL-MODE]: Hỗ trợ cả vuốt lướt ngón tay (Candy Crush style)
 *     lẫn chạm chọn tuần tự (Tap-to-Swap), tối ưu hóa tuyệt đối cho màn hình di động.
 * ============================================================================
 */

/** Bảng màu 6 nguyên tố chuẩn Flat Design */
const ELEMENT_MATERIALS = {
    1: { color: 0xef4444, emissive: 0x7f1d1d, name: 'Thermal Crimson' },
    2: { color: 0x2563eb, emissive: 0x1e3a8a, name: 'Deep Cobalt' },
    3: { color: 0x10b981, emissive: 0x064e3b, name: 'Bio Emerald' },
    4: { color: 0xf59e0b, emissive: 0x78350f, name: 'Volt Lightning' },
    5: { color: 0x8b5cf6, emissive: 0x4c1d95, name: 'Graviton Amethyst' },
    6: { color: 0x38bdf8, emissive: 0x0c4a6e, name: 'Diamond Frost' }
};

/**
 * Hàm sinh Texture 2D phẳng siêu nét (192x192) cho từng loại ngọc
 */
function createFlatGemTexture(colorId) {
    if (typeof document === 'undefined') return null;

    const size = 192;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const half = size / 2;
    const margin = 10;
    const w = size - margin * 2;
    const r = 28; // Bo góc mềm

    // Bảng màu rực rỡ với độ tương phản cao
    const palette = {
        1: { top: '#f87171', bot: '#dc2626', border: '#fecaca', glow: '#ef4444' }, // Đỏ Lửa 🔥
        2: { top: '#60a5fa', bot: '#1d4ed8', border: '#bfdbfe', glow: '#2563eb' }, // Xanh Nước 💧
        3: { top: '#34d399', bot: '#059669', border: '#a7f3d0', glow: '#10b981' }, // Lục Sinh Mệnh 🍃
        4: { top: '#fbbf24', bot: '#d97706', border: '#fef08a', glow: '#f59e0b' }, // Vàng Lôi Điện ⚡
        5: { top: '#c084fc', bot: '#7e22ce', border: '#f3e8ff', glow: '#8b5cf6' }, // Tím Trọng Lực 🔮
        6: { top: '#38bdf8', bot: '#0284c7', border: '#e0f2fe', glow: '#06b6d4' }  // Băng Tuyết ❄️
    }[colorId] || { top: '#94a3b8', bot: '#475569', border: '#cbd5e1', glow: '#64748b' };

    // 1. Thân thẻ ngọc 2D bo góc
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(margin, margin, w, w, r);
    const grad = ctx.createLinearGradient(0, margin, 0, margin + w);
    grad.addColorStop(0, palette.top);
    grad.addColorStop(1, palette.bot);
    ctx.fillStyle = grad;
    ctx.fill();

    // Viền sáng bóng tạo độ nổi phẳng (Subtle Bevel)
    ctx.lineWidth = 5;
    ctx.strokeStyle = palette.border;
    ctx.stroke();

    // Vệt bóng gương phía trên (Glossy highlight)
    ctx.beginPath();
    ctx.ellipse(half, margin + 28, w * 0.38, 14, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
    ctx.fill();
    ctx.restore();

    // 2. Biểu tượng nguyên tố 2D sắc nét (Color-Blind Friendly Iconography)
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;

    if (colorId === 1) {
        // 🔥 Ngọn lửa / Lưỡi kiếm
        ctx.beginPath();
        ctx.moveTo(half, 48);
        ctx.bezierCurveTo(half + 32, 75, half + 36, 115, half, 144);
        ctx.bezierCurveTo(half - 12, 130, half - 16, 110, half - 6, 95);
        ctx.bezierCurveTo(half - 24, 110, half - 28, 130, half - 22, 142);
        ctx.bezierCurveTo(half - 42, 120, half - 36, 85, half, 48);
        ctx.fill();
    } else if (colorId === 2) {
        // 💧 Giọt nước Cobalt
        ctx.beginPath();
        ctx.moveTo(half, 48);
        ctx.bezierCurveTo(half + 34, 90, half + 34, 142, half, 144);
        ctx.bezierCurveTo(half - 34, 142, half - 34, 90, half, 48);
        ctx.fill();
    } else if (colorId === 3) {
        // 🍃 Chiếc lá Emerald
        ctx.beginPath();
        ctx.moveTo(half - 28, 140);
        ctx.quadraticCurveTo(half - 36, 80, half + 28, 52);
        ctx.quadraticCurveTo(half + 36, 110, half - 28, 140);
        ctx.fill();
        ctx.strokeStyle = palette.bot;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(half - 26, 138);
        ctx.quadraticCurveTo(half - 6, 102, half + 26, 54);
        ctx.stroke();
    } else if (colorId === 4) {
        // ⚡ Tia sét Volt
        ctx.beginPath();
        ctx.moveTo(half + 8, 45);
        ctx.lineTo(half - 22, 95);
        ctx.lineTo(half - 2, 95);
        ctx.lineTo(half - 14, 145);
        ctx.lineTo(half + 22, 88);
        ctx.lineTo(half + 2, 88);
        ctx.closePath();
        ctx.fill();
    } else if (colorId === 5) {
        // 🔮 Ngôi sao trọng lực Graviton
        ctx.beginPath();
        const spikes = 4;
        const outerR = 40;
        const innerR = 14;
        let rot = Math.PI / 2 * 3;
        let x = half, y = half;
        const step = Math.PI / spikes;
        ctx.moveTo(half, half - outerR);
        for (let i = 0; i < spikes; i++) {
            x = half + Math.cos(rot) * outerR;
            y = half + Math.sin(rot) * outerR;
            ctx.lineTo(x, y);
            rot += step;
            x = half + Math.cos(rot) * innerR;
            y = half + Math.sin(rot) * innerR;
            ctx.lineTo(x, y);
            rot += step;
        }
        ctx.closePath();
        ctx.fill();
    } else if (colorId === 6) {
        // ❄️ Tinh thể băng Diamond Frost
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#ffffff';
        for (let a = 0; a < 3; a++) {
            ctx.save();
            ctx.translate(half, half);
            ctx.rotate((a * 60) * Math.PI / 180);
            ctx.beginPath();
            ctx.moveTo(0, -36);
            ctx.lineTo(0, 36);
            ctx.moveTo(-10, -20); ctx.lineTo(0, -28); ctx.lineTo(10, -20);
            ctx.moveTo(-10, 20); ctx.lineTo(0, 28); ctx.lineTo(10, 20);
            ctx.stroke();
            ctx.restore();
        }
    }
    ctx.restore();

    const tex = new THREE.CanvasTexture(canvas);
    tex.generateMipmaps = true;
    return tex;
}

/**
 * Hàm sinh Texture 2D cho biểu tượng Ngọc Đặc Biệt
 */
function createSpecialOverlayTexture(specialType) {
    if (typeof document === 'undefined') return null;

    const size = 192;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const half = size / 2;

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.shadowBlur = 10;

    if (specialType === 1) {
        // LINE_ROW: Mũi tên laser ngang ◄━━━━►
        ctx.shadowColor = '#00f0ff';
        ctx.fillStyle = '#00f0ff';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 6;
        // Đường laser ngang
        ctx.beginPath();
        ctx.moveTo(35, half);
        ctx.lineTo(157, half);
        ctx.stroke();
        // Mũi tên trái
        ctx.beginPath();
        ctx.moveTo(25, half);
        ctx.lineTo(48, half - 18);
        ctx.lineTo(48, half + 18);
        ctx.closePath();
        ctx.fill();
        // Mũi tên phải
        ctx.beginPath();
        ctx.moveTo(167, half);
        ctx.lineTo(144, half - 18);
        ctx.lineTo(144, half + 18);
        ctx.closePath();
        ctx.fill();
    } else if (specialType === 2) {
        // LINE_COL: Mũi tên laser dọc ▲ ┃ ▼
        ctx.shadowColor = '#00f0ff';
        ctx.fillStyle = '#00f0ff';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 6;
        // Đường laser dọc
        ctx.beginPath();
        ctx.moveTo(half, 35);
        ctx.lineTo(half, 157);
        ctx.stroke();
        // Mũi tên trên
        ctx.beginPath();
        ctx.moveTo(half, 25);
        ctx.lineTo(half - 18, 48);
        ctx.lineTo(half + 18, 48);
        ctx.closePath();
        ctx.fill();
        // Mũi tên dưới
        ctx.beginPath();
        ctx.moveTo(half, 167);
        ctx.lineTo(half - 18, 144);
        ctx.lineTo(half + 18, 144);
        ctx.closePath();
        ctx.fill();
    } else if (specialType === 3) {
        // BOMB_3X3: Tâm ngắm bom đa hướng 🎯
        ctx.shadowColor = '#ff0055';
        ctx.strokeStyle = '#ff0055';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(half, half, 45, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(half, half, 25, 0, Math.PI * 2);
        ctx.stroke();

        // 4 râu tâm ngắm
        ctx.beginPath();
        ctx.moveTo(half - 58, half); ctx.lineTo(half - 32, half);
        ctx.moveTo(half + 32, half); ctx.lineTo(half + 58, half);
        ctx.moveTo(half, half - 58); ctx.lineTo(half, half - 32);
        ctx.moveTo(half, half + 32); ctx.lineTo(half, half + 58);
        ctx.stroke();

        // Điểm tâm đỏ phát sáng
        ctx.fillStyle = '#ff0055';
        ctx.beginPath();
        ctx.arc(half, half, 8, 0, Math.PI * 2);
        ctx.fill();
    } else if (specialType === 4) {
        // SWAP_ALL: Lỗ đen đa sắc / Ngôi sao cầu vồng ⭐
        const radGrad = ctx.createRadialGradient(half, half, 10, half, half, 60);
        radGrad.addColorStop(0, '#ffffff');
        radGrad.addColorStop(0.3, '#fde047');
        radGrad.addColorStop(0.6, '#ec4899');
        radGrad.addColorStop(1, '#06b6d4');

        ctx.fillStyle = radGrad;
        ctx.shadowColor = '#fde047';
        ctx.beginPath();
        const spikes = 8;
        const outerR = 52;
        const innerR = 24;
        let rot = Math.PI / 2 * 3;
        let x = half, y = half;
        const step = Math.PI / spikes;
        ctx.moveTo(half, half - outerR);
        for (let i = 0; i < spikes; i++) {
            x = half + Math.cos(rot) * outerR;
            y = half + Math.sin(rot) * outerR;
            ctx.lineTo(x, y);
            rot += step;
            x = half + Math.cos(rot) * innerR;
            y = half + Math.sin(rot) * innerR;
            ctx.lineTo(x, y);
            rot += step;
        }
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();

    const tex = new THREE.CanvasTexture(canvas);
    tex.generateMipmaps = true;
    return tex;
}
class Board3D {
    constructor(engine, gameState) {
        this.engine = engine;
        this.state = gameState;
        this.scene = engine.scene;
        this.camera = engine.camera;

        this.tileSize = 1.05;      // Kích thước ô cờ
        this.spacing = 0.12;       // Khoảng cách giữa các ô
        this.boardGroup = new THREE.Group();
        this.scene.add(this.boardGroup);

        // [FLAT 2D ORIENTATION]: Căn giữa và khóa 100% góc nghiêng = 0
        this.boardGroup.position.set(0, 0, 0);
        this.boardGroup.rotation.set(0, 0, 0);

        this.tileMeshes = [];      // Mảng 2 chiều 8x8 chứa THREE.Mesh
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.selectedCoord = null; // Ô đang chọn {r, c}
        this.animatingTiles = [];  // Danh sách các khối đang rơi tự do
        this.slidingTiles = [];    // Danh sách các khối đang trượt hoán đổi / revert
        this.lastSwap = null;      // Lưu trữ trạng thái swap để revert khi bị từ chối

        this.initTextures();
        this.initBoardBase();
        this.buildInitialTiles();
        this.initRaycastInput();
        this.initEventListeners();
    }

    /** Khởi tạo bộ nhớ Texture 2D tái sử dụng */
    initTextures() {
        this.gemTextures = {};
        for (let id = 1; id <= 6; id++) {
            this.gemTextures[id] = createFlatGemTexture(id);
        }

        this.specialTextures = {};
        for (let sId = 1; sId <= 4; sId++) {
            this.specialTextures[sId] = createSpecialOverlayTexture(sId);
        }

        // Texture khung viền phát sáng khi người chơi chạm chọn ô
        const selectCanvas = document.createElement('canvas');
        selectCanvas.width = 192; selectCanvas.height = 192;
        const sCtx = selectCanvas.getContext('2d');
        sCtx.strokeStyle = '#00f0ff';
        sCtx.lineWidth = 10;
        sCtx.roundRect(10, 10, 172, 172, 30);
        sCtx.stroke();
        sCtx.strokeStyle = '#ffffff';
        sCtx.lineWidth = 4;
        sCtx.roundRect(14, 14, 164, 164, 26);
        sCtx.stroke();
        this.selectTexture = new THREE.CanvasTexture(selectCanvas);
    }

    /** Dựng nền bàn cờ phẳng 2D và 64 ô lõm (Recessed Grid Slots) */
    initBoardBase() {
        const totalW = this.state.width * (this.tileSize + this.spacing) + 0.4;
        const totalH = this.state.height * (this.tileSize + this.spacing) + 0.4;

        // 1. Khung nền phẳng 2D bàn cờ
        const baseGeo = new THREE.PlaneGeometry(totalW, totalH);
        const baseMat = new THREE.MeshBasicMaterial({ color: 0x0a0e1a });
        const baseMesh = new THREE.Mesh(baseGeo, baseMat);
        baseMesh.position.z = -0.06;
        this.boardGroup.add(baseMesh);

        // 2. Viền bo khung ngoài neon
        const borderGeo = new THREE.PlaneGeometry(totalW + 0.12, totalH + 0.12);
        const borderMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
        const borderMesh = new THREE.Mesh(borderGeo, borderMat);
        borderMesh.position.z = -0.07;
        this.boardGroup.add(borderMesh);

        // 3. 64 Ô lưới lõm phẳng 2D (Cell slots)
        const slotGeo = new THREE.PlaneGeometry(this.tileSize, this.tileSize);
        const slotMat = new THREE.MeshBasicMaterial({ color: 0x131a29 });

        for (let r = 0; r < this.state.height; r++) {
            for (let c = 0; c < this.state.width; c++) {
                const slot = new THREE.Mesh(slotGeo, slotMat);
                const pos = this.gridToLocalPos(r, c);
                slot.position.set(pos.x, pos.y, -0.03);
                this.boardGroup.add(slot);
            }
        }

        // Khung viền chọn (Selection Highlight Mesh)
        const highlightGeo = new THREE.PlaneGeometry(this.tileSize * 1.12, this.tileSize * 1.12);
        const highlightMat = new THREE.MeshBasicMaterial({
            map: this.selectTexture,
            transparent: true,
            opacity: 0
        });
        this.highlightMesh = new THREE.Mesh(highlightGeo, highlightMat);
        this.highlightMesh.position.z = 0.05;
        this.highlightMesh.visible = false;
        this.boardGroup.add(this.highlightMesh);
    }

    /** Chuyển toạ độ lưới (r, c) sang toạ độ phẳng 2D (x, y, 0) */
    gridToLocalPos(r, c) {
        const totalW = (this.state.width - 1) * (this.tileSize + this.spacing);
        const totalH = (this.state.height - 1) * (this.tileSize + this.spacing);

        const x = c * (this.tileSize + this.spacing) - totalW / 2;
        const y = -(r * (this.tileSize + this.spacing) - totalH / 2); // r=0 ở đỉnh
        const z = 0;
        return { x, y, z };
    }

    /** Tạo 1 khối ngọc phẳng 2D */
    createTileMesh(r, c, color) {
        const geo = new THREE.PlaneGeometry(this.tileSize, this.tileSize);
        const tex = this.gemTextures[color] || this.gemTextures[1];
        const mat = new THREE.MeshBasicMaterial({
            map: tex,
            transparent: true
        });

        const mesh = new THREE.Mesh(geo, mat);
        const pos = this.gridToLocalPos(r, c);
        mesh.position.set(pos.x, pos.y, 0);
        mesh.userData = { r, c, color };
        return mesh;
    }

    /** Dựng tất cả 64 khối phẳng 2D khởi đầu */
    buildInitialTiles() {
        this.tileMeshes = Array(this.state.height).fill(null).map(() => Array(this.state.width).fill(null));

        for (let r = 0; r < this.state.height; r++) {
            for (let c = 0; c < this.state.width; c++) {
                const color = this.state.getTile(r, c);
                const mesh = this.createTileMesh(r, c, color);
                this.boardGroup.add(mesh);
                this.tileMeshes[r][c] = mesh;
            }
        }
    }

    /**
     * BẮT TƯƠNG TÁC KÉP: VUỐT (SWIPE / DRAG) VÀ CHẠM (TAP-TO-SWAP)
     */
    initRaycastInput() {
        const dom = this.engine.renderer.domElement;

        let isPointerDown = false;
        let startClientX = 0;
        let startClientY = 0;
        let startTileCoord = null;
        let hasSwiped = false;

        const getTileAtPointer = (clientX, clientY) => {
            const rect = dom.getBoundingClientRect();
            this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects(this.boardGroup.children, true);
            const hit = intersects.find(item => {
                let obj = item.object;
                while (obj && (!obj.userData || typeof obj.userData.r !== 'number')) {
                    obj = obj.parent;
                }
                return obj && typeof obj.userData.r === 'number';
            });
            if (hit) {
                let obj = hit.object;
                while (obj && (!obj.userData || typeof obj.userData.r !== 'number')) {
                    obj = obj.parent;
                }
                return { r: obj.userData.r, c: obj.userData.c };
            }
            return null;
        };

        dom.addEventListener('pointerdown', (e) => {
            if (this.state.isProcessing) return;
            isPointerDown = true;
            hasSwiped = false;
            startClientX = e.clientX;
            startClientY = e.clientY;
            startTileCoord = getTileAtPointer(e.clientX, e.clientY);

            if (startTileCoord) {
                if (!this.selectedCoord) {
                    this.setTileHighlight(startTileCoord.r, startTileCoord.c, true);
                }
            }
        });

        dom.addEventListener('pointermove', (e) => {
            if (!isPointerDown || hasSwiped || !startTileCoord || this.state.isProcessing) return;

            const dx = e.clientX - startClientX;
            const dy = e.clientY - startClientY;
            const threshold = 20; // Ngưỡng vuốt cảm ứng nhạy và chính xác (20px)

            if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
                hasSwiped = true;
                let targetR = startTileCoord.r;
                let targetC = startTileCoord.c;

                if (Math.abs(dx) > Math.abs(dy)) {
                    targetC += (dx > 0 ? 1 : -1);
                } else {
                    targetR += (dy > 0 ? 1 : -1); // Vuốt xuống thì hàng r tăng
                }

                // Kiểm tra giới hạn bàn cờ 8x8
                if (targetR >= 0 && targetR < this.state.height && targetC >= 0 && targetC < this.state.width) {
                    if (this.selectedCoord) {
                        this.setTileHighlight(this.selectedCoord.r, this.selectedCoord.c, false);
                        this.selectedCoord = null;
                    }
                    this.setTileHighlight(startTileCoord.r, startTileCoord.c, false);
                    this.state.swap(startTileCoord.r, startTileCoord.c, targetR, targetC);
                }
            }
        });

        const handlePointerEnd = (e) => {
            if (!isPointerDown) return;
            isPointerDown = false;

            if (this.state.isProcessing) return;

            // Nếu không vuốt (người chơi chỉ chạm một điểm)
            if (!hasSwiped && startTileCoord) {
                this.handleTileClick(startTileCoord.r, startTileCoord.c);
            }
        };

        dom.addEventListener('pointerup', handlePointerEnd);
        dom.addEventListener('pointercancel', () => { isPointerDown = false; });
    }

    /** Xử lý chạm chọn khối hoặc hoán đổi tuần tự 2 khối */
    handleTileClick(r, c) {
        if (!this.selectedCoord) {
            this.selectedCoord = { r, c };
            this.setTileHighlight(r, c, true);
        } else {
            const prev = this.selectedCoord;
            this.setTileHighlight(prev.r, prev.c, false);
            this.selectedCoord = null;

            if (prev.r === r && prev.c === c) {
                return; // Chạm lại chính ô đó -> Bỏ chọn
            }

            const dist = Math.abs(prev.r - r) + Math.abs(prev.c - c);
            if (dist === 1) {
                // Ô kề bên -> Thử hoán đổi
                this.state.swap(prev.r, prev.c, r, c);
            } else {
                // Không kề bên -> Chuyển vùng chọn sang ô mới
                this.selectedCoord = { r, c };
                this.setTileHighlight(r, c, true);
            }
        }
    }

    /** Bật/Tắt hiệu ứng khung viền phát sáng cho ô đang được chọn */
    setTileHighlight(r, c, isSelected) {
        if (!this.highlightMesh) return;

        if (isSelected) {
            const pos = this.gridToLocalPos(r, c);
            this.highlightMesh.position.set(pos.x, pos.y, 0.05);
            this.highlightMesh.material.opacity = 1.0;
            this.highlightMesh.visible = true;
        } else {
            this.highlightMesh.visible = false;
        }
    }

    /** Lắng nghe các sự kiện từ GameState để diễn hoạt 2D */
    initEventListeners() {
        // 1. Bắt đầu hoán đổi 2 khối (Forward Swap)
        events.on('swap_start', ({ from, to }) => {
            this.animateSwap(from, to);
        });

        // 2. NƯỚC ĐI BỊ TỪ CHỐI (REVERT): Không tạo được Match-3 -> Snap back về chỗ cũ!
        events.on('swap_reject', ({ from, to }) => {
            this.animateSwapRevert(from, to);
        });

        // 3. Nước đi hợp lệ được chấp thuận
        events.on('swap_accept', ({ from, to }) => {
            this.confirmSwap(from, to);
        });

        // 4. Nổ vỡ khối (Match Shatter)
        events.on('match_shatter', ({ matches }) => {
            this.animateShatter(matches);
        });

        // 5. Khối rơi xuống và nạp mới (Gravity Drop)
        events.on('blocks_fall', ({ drops }) => {
            this.animateDrops(drops);
        });

        // 6. Sinh ngọc đặc biệt (Line, Bomb, SwapAll)
        events.on('special_created', ({ r, c, specialType, color }) => {
            this.attachSpecialMarker(r, c, specialType, color);
        });
    }

    /** Gắn ký hiệu thị giác phẳng 2D cho Ngọc Đặc Biệt */
    attachSpecialMarker(r, c, specialType, color) {
        let mesh = this.tileMeshes[r][c];
        if (!mesh) {
            const col = color || (this.state && this.state.getTile(r, c)) || 1;
            mesh = this.createTileMesh(r, c, col);
            this.boardGroup.add(mesh);
            this.tileMeshes[r][c] = mesh;
        }

        // Xóa marker cũ nếu có
        const oldMarker = mesh.getObjectByName('special_marker');
        if (oldMarker) mesh.remove(oldMarker);

        const tex = this.specialTextures[specialType];
        if (!tex) return;

        const markerGeo = new THREE.PlaneGeometry(this.tileSize, this.tileSize);
        const markerMat = new THREE.MeshBasicMaterial({
            map: tex,
            transparent: true
        });

        const marker = new THREE.Mesh(markerGeo, markerMat);
        marker.name = 'special_marker';
        marker.position.set(0, 0, 0.02);
        marker.userData = { isSpecialMarker: true, specialType };
        mesh.add(marker);
    }

    /** Diễn hoạt hoán đổi 2 khối phẳng */
    animateSwap(from, to) {
        const m1 = this.tileMeshes[from.r][from.c];
        const m2 = this.tileMeshes[to.r][to.c];
        if (!m1 || !m2) return;

        const p1 = this.gridToLocalPos(from.r, from.c);
        const p2 = this.gridToLocalPos(to.r, to.c);

        // Lưu thông tin hoán đổi để có thể Revert hoàn hảo nếu không match
        this.lastSwap = {
            m1, m2,
            fromPos: { x: p1.x, y: p1.y },
            toPos: { x: p2.x, y: p2.y },
            fromCoord: { r: from.r, c: from.c },
            toCoord: { r: to.r, c: to.c }
        };

        // Cập nhật tham chiếu trong mảng
        this.tileMeshes[from.r][from.c] = m2;
        this.tileMeshes[to.r][to.c] = m1;
        m1.userData.r = to.r; m1.userData.c = to.c;
        m2.userData.r = from.r; m2.userData.c = from.c;

        // Trượt nhẹ nhàng sang vị trí mới
        this.slideTile(m1, p2.x, p2.y, 0.16);
        this.slideTile(m2, p1.x, p1.y, 0.16);
    }

    /**
     * [CANDY CRUSH SPEC]: Diễn hoạt Snap-Back (Revert) khi nước đi không tạo được Match-3
     */
    animateSwapRevert(from, to) {
        if (!this.lastSwap) return;
        const { m1, m2, fromPos, toPos, fromCoord, toCoord } = this.lastSwap;

        // Hoàn trả tham chiếu mảng chính xác về vị trí ban đầu
        this.tileMeshes[fromCoord.r][fromCoord.c] = m1;
        this.tileMeshes[toCoord.r][toCoord.c] = m2;
        m1.userData.r = fromCoord.r; m1.userData.c = fromCoord.c;
        m2.userData.r = toCoord.r; m2.userData.c = toCoord.c;

        // Trượt giật lùi đàn hồi (Elastic Snap-back with recoil bounce)
        this.slideTile(m1, fromPos.x, fromPos.y, 0.18, true);
        this.slideTile(m2, toPos.x, toPos.y, 0.18, true);

        this.lastSwap = null;
    }

    /** Xác nhận nước đi hợp lệ */
    confirmSwap(from, to) {
        this.lastSwap = null;
    }

    /** Đăng ký trượt khối mượt mà */
    slideTile(mesh, targetX, targetY, duration = 0.16, isBounce = false) {
        this.slidingTiles.push({
            mesh,
            startX: mesh.position.x,
            startY: mesh.position.y,
            targetX,
            targetY,
            duration,
            elapsed: 0,
            isBounce
        });
    }

    /** Diễn hoạt nổ thu nhỏ và biến mất phẳng 2D */
    animateShatter(matches) {
        matches.forEach(m => {
            const mesh = this.tileMeshes[m.r][m.c];
            if (mesh) {
                this.boardGroup.remove(mesh);
                if (mesh.geometry) mesh.geometry.dispose();
                this.tileMeshes[m.r][m.c] = null;
            }
        });
    }

    /** Diễn hoạt trọng lực rơi và nảy khối phẳng 2D (Squash & Stretch) */
    animateDrops(drops) {
        drops.forEach(d => {
            let mesh = null;
            if (d.isNew) {
                mesh = this.createTileMesh(d.from.r, d.to.c, d.color);
                const startPos = this.gridToLocalPos(d.from.r, d.to.c);
                mesh.position.set(startPos.x, startPos.y + 4.5, 0);
                this.boardGroup.add(mesh);
            } else {
                mesh = this.tileMeshes[d.from.r][d.from.c];
                if (!mesh) {
                    mesh = this.createTileMesh(d.from.r, d.from.c, d.color);
                    const startPos = this.gridToLocalPos(d.from.r, d.from.c);
                    mesh.position.set(startPos.x, startPos.y, 0);
                    this.boardGroup.add(mesh);
                }
                this.tileMeshes[d.from.r][d.from.c] = null;
            }

            if (mesh) {
                const targetPos = this.gridToLocalPos(d.to.r, d.to.c);
                mesh.userData = { r: d.to.r, c: d.to.c, color: d.color };
                this.tileMeshes[d.to.r][d.to.c] = mesh;

                this.animatingTiles.push({
                    mesh,
                    targetY: targetPos.y,
                    speed: 18.0 + Math.random() * 3.0,
                    squashTimer: 0
                });
            }
        });
    }

    /** Vòng lặp cập nhật chuyển động mỗi frame (60 FPS) */
    update(delta, elapsed) {
        // 1. Cập nhật các khối đang trượt hoán đổi / revert
        for (let i = this.slidingTiles.length - 1; i >= 0; i--) {
            const s = this.slidingTiles[i];
            s.elapsed += delta;
            const t = Math.min(1.0, s.elapsed / s.duration);
            // Smooth easing
            const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            s.mesh.position.x = s.startX + (s.targetX - s.startX) * ease;
            s.mesh.position.y = s.startY + (s.targetY - s.startY) * ease;

            // Recoil shake nhẹ khi bị Revert
            if (s.isBounce && t > 0.75) {
                const shake = Math.sin((t - 0.75) * Math.PI * 12) * 0.05;
                s.mesh.position.x += shake;
            }

            if (t >= 1.0) {
                s.mesh.position.x = s.targetX;
                s.mesh.position.y = s.targetY;
                this.slidingTiles.splice(i, 1);
            }
        }

        // 2. Cập nhật các khối đang rơi tự do và nảy
        for (let i = this.animatingTiles.length - 1; i >= 0; i--) {
            const anim = this.animatingTiles[i];
            const mesh = anim.mesh;

            if (mesh.position.y > anim.targetY) {
                mesh.position.y -= anim.speed * delta;
                if (mesh.position.y <= anim.targetY) {
                    mesh.position.y = anim.targetY;
                    anim.squashTimer = 0.10;
                    mesh.scale.set(1.15, 0.88, 1.0); // Co giãn tiếp đất 2D
                }
            } else if (anim.squashTimer > 0) {
                anim.squashTimer -= delta;
                if (anim.squashTimer <= 0) {
                    mesh.scale.set(1.0, 1.0, 1.0);
                    this.animatingTiles.splice(i, 1);
                }
            }
        }

        // 3. Hiệu ứng thở nhẹ trên ô đang chọn và ngọc đặc biệt
        if (this.highlightMesh && this.highlightMesh.visible) {
            const pulse = Math.sin(elapsed * 6.0) * 0.06 + 1.0;
            this.highlightMesh.scale.set(pulse, pulse, 1.0);
        }

        const specialPulse = Math.sin(elapsed * 3.5) * 0.05 + 1.0;
        for (let r = 0; r < this.state.height; r++) {
            for (let c = 0; c < this.state.width; c++) {
                const mesh = this.tileMeshes[r][c];
                if (mesh) {
                    const marker = mesh.getObjectByName('special_marker');
                    if (marker) {
                        marker.scale.set(specialPulse, specialPulse, 1.0);
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
 *  - Không che khuất không gian 3D và bàn Match-3.
 *  - Thanh Toughness màu trắng (Break Stagger 100% -> 0%).
 *  - Cụm điều khiển Turn, Nước đi, Nút Phòng Thủ Sớm (Mitigation) & Điểm Phản Kích (Counter Stacks).
 *  - 4 Thẻ Hero với vòng nộ tròn SVG và nút dùng Skill trực quan (có hiển thị cooldown và phím tắt).
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
