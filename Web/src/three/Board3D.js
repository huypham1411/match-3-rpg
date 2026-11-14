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

import { events } from '../core/EventBus.js';

// Bảng màu PBR 6 Nguyên tố
export const ELEMENT_MATERIALS = {
    1: { color: 0xef4444, emissive: 0x7f1d1d, name: 'Thermal Crimson' },   // Đỏ
    2: { color: 0x2563eb, emissive: 0x1e3a8a, name: 'Deep Cobalt' },       // Xanh Dương Đậm
    3: { color: 0x10b981, emissive: 0x064e3b, name: 'Bio Emerald' },       // Lục
    4: { color: 0xf59e0b, emissive: 0x78350f, name: 'Volt Lightning' },    // Vàng
    5: { color: 0x8b5cf6, emissive: 0x4c1d95, name: 'Graviton Amethyst' }, // Tím
    6: { color: 0x38bdf8, emissive: 0x0c4a6e, name: 'Diamond Frost' }      // Băng Tuyết
};

export class Board3D {
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
