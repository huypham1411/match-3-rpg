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
export class ArenaEngine {
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
export class BoardEngine {
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
export class Engine3D extends BoardEngine {}
