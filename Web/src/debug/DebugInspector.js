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

import { events } from '../core/EventBus.js';

export class DebugInspector {
    constructor(engine, board3D, diorama3D, gameState) {
        this.engine = engine;
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
