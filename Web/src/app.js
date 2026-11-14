/**
 * Web/src/app.js
 * ============================================================================
 * [ENTRY POINT]: ĐIỂM KHỞI CHẠY HỆ THỐNG MATCHRPG THREE.JS
 * 
 * Lắp ghép tất cả các khối module độc lập:
 *  - Core State (Lõi mô phỏng trạng thái)
 *  - Three.js Engine (Scene, Camera, Renderer)
 *  - Board3D (Bàn match-3 tương tác raycaster)
 *  - Diorama3D (Dàn nhân vật & Boss)
 *  - VFXManager (Hiệu ứng hạt)
 *  - TacticalHUD (Giao diện chiến đấu)
 *  - DebugInspector (Bảng công cụ học 3D & kiểm lỗi)
 * ============================================================================
 */

import { GameState } from './core/GameState.js';
import { Engine3D } from './three/Engine.js';
import { Board3D } from './three/Board3D.js';
import { Diorama3D } from './three/Diorama3D.js';
import { VFXManager } from './three/VFX.js';
import { TacticalHUD } from './ui/HUD.js';
import { DebugInspector } from './debug/DebugInspector.js';

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
        console.log('%c[MATCHRPG THREE.JS] Initializing modular 3D architecture...', 'color: #00f0ff; font-weight: bold; font-size: 14px;');

        const container = document.getElementById('canvasContainer');
        if (!container) {
            throw new Error('Không tìm thấy phần tử #canvasContainer trên trang!');
        }

        if (typeof THREE === 'undefined') {
            throw new Error('Thư viện Three.js chưa sẵn sàng! Vui lòng kiểm tra file /vendor/three.min.js.');
        }

        // 1. Khởi tạo Lõi Trạng Thái (Phase 3 Multi-Stage & Obstacles)
        const gameState = new GameState(8, 8);

        // 2. Khởi tạo Engine Đồ Hoạ 3D
        const engine = new Engine3D(container);

        // 3. Khởi tạo Bàn Match-3 3D
        const board3D = new Board3D(engine, gameState);
        engine.addUpdatable(board3D);

        // 4. Khởi tạo Sân Khấu Nhân Vật & Boss
        const diorama3D = new Diorama3D(engine, gameState);
        engine.addUpdatable(diorama3D);

        // 5. Khởi tạo Hiệu Ứng Hạt VFX
        const vfx = new VFXManager(engine);
        engine.addUpdatable(vfx);

        // 6. Khởi tạo Giao Diện Tactical HUD
        const hud = new TacticalHUD(gameState);

        // 7. Khởi tạo Bảng Công Cụ Học & Debug 3D
        const debug = new DebugInspector(engine, board3D, diorama3D, gameState);

        // Lưu vào window để phục vụ kiểm tra trên DevTools
        window.MatchGame = {
            gameState,
            engine,
            board3D,
            diorama3D,
            vfx,
            hud,
            debug
        };

        console.log('%c[MATCHRPG THREE.JS] Hệ thống đã sẵn sàng 100%! Truy cập window.MatchGame để debug trực tiếp.', 'color: #10b981; font-weight: bold;');

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
