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

import { events } from '../core/EventBus.js';

/** Bảng màu 6 nguyên tố chuẩn Flat Design */
export const ELEMENT_MATERIALS = {
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

export class Board3D {
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
