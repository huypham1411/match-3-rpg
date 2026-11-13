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

export const events = new EventBus();
