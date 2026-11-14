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
        // FOV & Vị trí tối ưu hóa cho màn hình dọc (Mobile Portrait) và ngang (Desktop)
        this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
        this.updateCameraForDevice(aspect);
    }

    /** Tự động cân chỉnh góc nhìn Camera theo kích thước thiết bị */
    updateCameraForDevice(aspect) {
        if (aspect < 1.0) {
            // Mobile Portrait: Mở rộng góc FOV 54 độ để bàn 8x8 hiển thị trọn vẹn, không bị tràn viền
            this.camera.fov = 54;
            this.camera.position.set(0, 16.5, 18.0);
            this.camera.lookAt(0, -0.5, 0);
        } else {
            // Desktop / Landscape: Góc nhìn điện ảnh chuẩn 45 độ
            this.camera.fov = 45;
            this.camera.position.set(0, 14, 20);
            this.camera.lookAt(0, 0, 0);
        }
        this.camera.updateProjectionMatrix();
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

    /** 5. Bộ điều khiển xoay chuột (OrbitControls) - Khóa xoay để bàn cờ match-3 luôn ổn định tuyệt đối */
    initControls() {
        if (typeof THREE.OrbitControls !== 'undefined') {
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.target.set(0, -0.5, 0);
            
            // [TIÊU CHUẨN MOBILE GAME UX]: KHÓA XOAY CAMERA
            // Người chơi vuốt chạm màn hình là để hoán đổi ngọc, không được để camera bị lắc lư hoặc xoay đảo
            this.controls.enableRotate = false;
            this.controls.enablePan = false;
            this.controls.enableZoom = false;
            if (THREE.TOUCH) {
                this.controls.touches = { ONE: THREE.TOUCH.NONE, TWO: THREE.TOUCH.DOLLY_PAN };
            }

            this.controls.maxPolarAngle = Math.PI / 2 + 0.1;
            this.controls.minDistance = 6;
            this.controls.maxDistance = 45;
        }
    }

    /** 6. Tự động co giãn khi kích thước trình duyệt thay đổi (Window Resize) */
    initResizeHandler() {
        window.addEventListener('resize', () => {
            this.width = this.container.clientWidth || window.innerWidth;
            this.height = this.container.clientHeight || window.innerHeight;

            const aspect = this.width / this.height;
            this.camera.aspect = aspect;
            this.updateCameraForDevice(aspect);

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
