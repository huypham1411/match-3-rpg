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

import { GameState } from './core/GameState.js';
import { ArenaEngine, BoardEngine } from './three/Engine.js';
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
