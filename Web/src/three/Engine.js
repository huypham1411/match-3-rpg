/**
 * Web/src/three/Engine.js
 * ============================================================================
 * [THREE.JS FUNDAMENTAL 1]: LÕI ĐỒ HOẠ 3D (3D GRAPHICS ENGINE)
 * 
 * Tài liệu học tập Three.js:
 *  1. Scene: Không gian 3D chứa tất cả vật thể (Mesh, Lights, Camera).
 *  2. PerspectiveCamera: Giả lập mắt người với góc nhìn phối cảnh (FOV, Aspect, Near, Far).
 *  3. WebGLRenderer: Vẽ toàn bộ Scene qua GPU (hỗ trợ Antialiasing, Tone Mapping).
 *  4. Lighting (Ánh sáng PBR):
 *     - AmbientLight: Ánh sáng môi trường toả đều, giúp mặt khuất không bị đen kịt.
 *     - DirectionalLight: Ánh sáng mặt trời tạo bóng đổ (Cast Shadows).
 *     - PointLight: Đèn điểm neon tạo viền hào quang (Rim light).
 *  5. OrbitControls: Xoay, lướt và phóng to thu nhỏ góc nhìn tự do bằng chuột.
 *  6. Render Loop (Vòng lặp vẽ 60FPS): Sử dụng requestAnimationFrame và delta time.
 * ============================================================================
 */

export class Engine3D {
    constructor(canvasContainer) {
        this.container = canvasContainer;
        this.width = canvasContainer.clientWidth || window.innerWidth;
        this.height = canvasContainer.clientHeight || window.innerHeight;

        this.updatables = []; // Danh sách các module cần cập nhật frame (Board, Diorama, VFX)
        this.clock = new THREE.Clock();

        this.initScene();
        this.initCamera();
        this.initRenderer();
        this.initLights();
        this.initControls();
        this.initResizeHandler();

        this.startLoop();
    }

    /** 1. Khởi tạo Không gian 3D (Scene) & Sương mù (Fog) */
    initScene() {
        this.scene = new THREE.Scene();
        // Sương mù cyberpunk: màu tím đen đậm tạo chiều sâu điện ảnh
        this.scene.background = new THREE.Color(0x0a0c14);
        this.scene.fog = new THREE.FogExp2(0x0a0c14, 0.025);
    }

    /** 2. Khởi tạo Camera Phối Cảnh (Perspective Camera) */
    initCamera() {
        const aspect = this.width / this.height;
        // FOV: 45 độ, Near: 0.1, Far: 1000 đơn vị
        this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
        // Đặt góc camera bao quát cả Sàn Đấu 3D (trên) và Bàn Cờ 3D (dưới)
        this.camera.position.set(0, 14, 20);
        this.camera.lookAt(0, 0, 0);
    }

    /** 3. Khởi tạo Trình Render WebGL */
    initRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,              // Khử răng cưa
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // Cấu hình bóng đổ & Tone Mapping chuẩn công nghiệp
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;

        this.container.appendChild(this.renderer.domElement);
    }

    /** 4. Thiết lập Ánh sáng Môi trường & Đèn Chiếu Chi Tiết */
    initLights() {
        // Ánh sáng tỏa nhẹ toàn cảnh
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
        this.scene.add(ambientLight);

        // Ánh sáng chính (Key Light) tạo bóng đổ thực tế
        const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
        keyLight.position.set(10, 20, 15);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = 1024;
        keyLight.shadow.mapSize.height = 1024;
        keyLight.shadow.camera.near = 0.5;
        keyLight.shadow.camera.far = 50;
        this.scene.add(keyLight);

        // Đèn viền Neon Xanh Cyan phía sau (Rim Light cho Hero)
        const cyanRimLight = new THREE.PointLight(0x00f0ff, 2.5, 25);
        cyanRimLight.position.set(-8, 5, -5);
        this.scene.add(cyanRimLight);

        // Đèn viền Neon Đỏ Đô phía Boss (Rim Light cho Boss)
        const crimsonRimLight = new THREE.PointLight(0xff0055, 3.0, 30);
        crimsonRimLight.position.set(8, 7, -6);
        this.scene.add(crimsonRimLight);
    }

    /** 5. Bộ điều khiển xoay chuột (OrbitControls) */
    initControls() {
        if (typeof THREE.OrbitControls !== 'undefined') {
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true; // Chuyển động xoay mượt mà có quán tính
            this.controls.dampingFactor = 0.05;
            this.controls.maxPolarAngle = Math.PI / 2 + 0.1; // Giới hạn không bị xoay lộn ngược dưới sàn
            this.controls.minDistance = 6;
            this.controls.maxDistance = 45;
        }
    }

    /** 6. Tự động co giãn khi kích thước trình duyệt thay đổi (Window Resize) */
    initResizeHandler() {
        window.addEventListener('resize', () => {
            this.width = this.container.clientWidth || window.innerWidth;
            this.height = this.container.clientHeight || window.innerHeight;

            this.camera.aspect = this.width / this.height;
            this.camera.updateProjectionMatrix();

            this.renderer.setSize(this.width, this.height);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        });
    }

    /** Đăng ký module cần cập nhật frame (Board, Diorama, VFX) */
    addUpdatable(module) {
        this.updatables.push(module);
    }

    /** 7. Vòng lặp Render 60 FPS (Tick Loop) */
    startLoop() {
        const loop = () => {
            requestAnimationFrame(loop);

            const delta = this.clock.getDelta();
            const elapsed = this.clock.getElapsedTime();

            if (this.controls) this.controls.update();

            // Cập nhật từng module
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
