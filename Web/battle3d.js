/* ============================================================================
   battle3d.js — Real-Time 3D Battlefield Diorama (Three.js WebGL Engine)
   ----------------------------------------------------------------------------
   Directly renders 3D Concept Art Models and Animations for RE:FRAY:
   - Heroes: Astra (Striker), Boran (Guardian), Elysia (Chrono), Lin (Hacker)
   - Boss: Sentinel Unit 07 (3.2m Mechanoid with Dual Railguns & Plasma Core)
   - Interactive Diorama: Camera Orbit, Slash VFX, Projectiles, Stagger State
   ============================================================================ */

let scene, camera, renderer, controls;
let heroGroup, bossGroup, stageGroup, fxGroup;
let astraMesh, boranMesh, elysiaMesh, linMesh, bossMesh;
let bossCoreMesh;
let isInitialized = false;

export function initBattle3D() {
  const container = document.getElementById('battle3dStage');
  const canvas = document.getElementById('battleCanvas3d');
  if (!container || !canvas || typeof THREE === 'undefined') return false;

  const width = container.clientWidth || 600;
  const height = container.clientHeight || 280;

  // 1. Scene & Camera
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0c10);
  scene.fog = new THREE.FogExp2(0x0a0c10, 0.05);

  camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
  // Diorama framing: Pitch -26°, positioned to view both teams
  camera.position.set(0, 3.4, 7.8);

  // 2. Renderer
  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  // 3. Orbit Controls
  if (typeof THREE.OrbitControls !== 'undefined') {
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.target.set(0, 1.1, 0);
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // Don't go below ground
    controls.minDistance = 4;
    controls.maxDistance = 14;
  }

  // 4. Lighting
  const ambient = new THREE.AmbientLight(0xffffff, 0.75);
  scene.add(ambient);

  const mainLight = new THREE.DirectionalLight(0xffffff, 1.3);
  mainLight.position.set(4, 10, 6);
  mainLight.castShadow = true;
  scene.add(mainLight);

  // Cyberpunk Rim Lights
  const cyanRim = new THREE.PointLight(0x00d2ff, 2.0, 15);
  cyanRim.position.set(-6, 3, -3);
  scene.add(cyanRim);

  const redRim = new THREE.PointLight(0xff2e55, 2.2, 15);
  redRim.position.set(6, 2, -2);
  scene.add(redRim);

  // 5. Build Arena Stage
  buildDioramaStage();

  // 6. Build Actors
  buildActors();

  // 7. Render Loop
  animate();

  window.addEventListener('resize', onResize);

  // 8. Tương tác Raycaster: Rê chuột & Click chọn trực tiếp quái 3D trên đấu trường
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  function getIntersectedEnemy(e) {
    if (!camera || enemyMeshes.length === 0) return null;
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(enemyMeshes, true);
    if (intersects.length > 0) {
      let obj = intersects[0].object;
      while (obj && obj.userData.enemyIndex === undefined && obj.parent) {
        obj = obj.parent;
      }
      return obj;
    }
    return null;
  }

  canvas.addEventListener('pointermove', (e) => {
    const enemy = getIntersectedEnemy(e);
    canvas.style.cursor = enemy ? 'pointer' : 'default';
  });

  canvas.addEventListener('pointerdown', (e) => {
    const enemy = getIntersectedEnemy(e);
    if (enemy && enemy.userData.enemyIndex !== undefined) {
      if (typeof window.__on3DEnemyClick === 'function') {
        window.__on3DEnemyClick(enemy.userData.enemyIndex);
      }
    }
  });

  isInitialized = true;
  return true;
}

function buildDioramaStage() {
  stageGroup = new THREE.Group();

  // Arena platform: Octagon / Cylinder
  const stageGeo = new THREE.CylinderGeometry(5.2, 5.5, 0.4, 32);
  const stageMat = new THREE.MeshStandardMaterial({
    color: 0x141720,
    metalness: 0.6,
    roughness: 0.4
  });
  const stage = new THREE.Mesh(stageGeo, stageMat);
  stage.position.y = -0.2;
  stage.receiveShadow = true;
  stageGroup.add(stage);

  // Neon Edge Ring
  const ringGeo = new THREE.RingGeometry(4.9, 5.1, 32);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x00d2ff,
    side: THREE.DoubleSide
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.01;
  stageGroup.add(ring);

  // Grid lines
  const grid = new THREE.GridHelper(9, 18, 0x00d2ff, 0x1f2638);
  grid.position.y = 0.02;
  stageGroup.add(grid);

  scene.add(stageGroup);

  fxGroup = new THREE.Group();
  scene.add(fxGroup);
}

function buildActors() {
  heroGroup = new THREE.Group();
  bossGroup = new THREE.Group();

  // === HERO 1: ASTRA (Striker Leader) ===
  astraMesh = createHeroAstra();
  astraMesh.position.set(-2.0, 0, 0.3);
  astraMesh.rotation.y = Math.PI * 0.4;
  heroGroup.add(astraMesh);

  // === HERO 2: BORAN (Heavy Guardian) ===
  boranMesh = createHeroBoran();
  boranMesh.position.set(-2.8, 0, -1.0);
  boranMesh.rotation.y = Math.PI * 0.35;
  heroGroup.add(boranMesh);

  // === HERO 3: ELYSIA (Chrono Mage) ===
  elysiaMesh = createHeroElysia();
  elysiaMesh.position.set(-3.2, 0, 0.8);
  elysiaMesh.rotation.y = Math.PI * 0.42;
  heroGroup.add(elysiaMesh);

  // === HERO 4: LIN (Tactical Hacker) ===
  linMesh = createHeroLin();
  linMesh.position.set(-1.4, 0, -1.2);
  linMesh.rotation.y = Math.PI * 0.38;
  heroGroup.add(linMesh);

  // === BOSS: SENTINEL UNIT 07 ===
  bossMesh = createBossSentinel07();
  bossMesh.position.set(2.2, 0, 0);
  bossMesh.rotation.y = -Math.PI * 0.4;
  bossGroup.add(bossMesh);

  scene.add(heroGroup);
  scene.add(bossGroup);
}

// ---------------------------------------------------------------------------
// 3D MODEL GENERATION PROCEDURAL MESHES (Concept-Accurate)
// ---------------------------------------------------------------------------

function createHeroAstra() {
  const g = new THREE.Group();
  const matBody = new THREE.MeshStandardMaterial({ color: 0x181a20, roughness: 0.5, metalness: 0.4 });
  const matCoat = new THREE.MeshStandardMaterial({ color: 0x121316, roughness: 0.7, metalness: 0.2 });
  const matAccent = new THREE.MeshStandardMaterial({ color: 0xff2e55, emissive: 0xff2e55, emissiveIntensity: 0.8 });
  const matSkin = new THREE.MeshStandardMaterial({ color: 0xf5d6c6, roughness: 0.6 });

  // Head & Ponytail
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), matSkin);
  head.position.y = 1.62;
  g.add(head);

  const hair = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.015, 0.48, 8), matAccent);
  hair.position.set(0, 1.58, -0.16);
  hair.rotation.x = -0.4;
  g.add(hair);

  // Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.45, 0.18), matCoat);
  torso.position.y = 1.30;
  g.add(torso);

  const neonStripe = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.42, 0.19), matAccent);
  neonStripe.position.y = 1.30;
  g.add(neonStripe);

  // Legs
  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.045, 0.88, 12), matBody);
  legL.position.set(-0.09, 0.55, 0);
  g.add(legL);

  const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.045, 0.88, 12), matBody);
  legR.position.set(0.09, 0.55, 0);
  g.add(legR);

  // Twin Plasma Vibro-Blades
  const bladeMat = new THREE.MeshStandardMaterial({
    color: 0xff2e55,
    emissive: 0xff2e55,
    emissiveIntensity: 1.0,
    transparent: true,
    opacity: 0.88
  });
  const swordL = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.95, 0.06), bladeMat);
  swordL.position.set(-0.35, 1.15, 0.2);
  swordL.rotation.z = 0.35;
  swordL.name = "swordL";
  g.add(swordL);

  const swordR = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.95, 0.06), bladeMat);
  swordR.position.set(0.35, 1.15, 0.2);
  swordR.rotation.z = -0.35;
  swordR.name = "swordR";
  g.add(swordR);

  g.userData = { originalPos: g.position.clone(), isAttacking: false };
  return g;
}

function createHeroBoran() {
  const g = new THREE.Group();
  const matArmor = new THREE.MeshStandardMaterial({ color: 0x2c3038, roughness: 0.4, metalness: 0.7 });
  const matAmber = new THREE.MeshStandardMaterial({ color: 0xffb800, emissive: 0xffb800, emissiveIntensity: 0.7 });

  // Heavy Body (2.1m scale)
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.3), matArmor);
  torso.position.y = 1.45;
  g.add(torso);

  const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), matAmber);
  helmet.position.y = 1.85;
  g.add(helmet);

  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.95, 0.2), matArmor);
  legL.position.set(-0.16, 0.6, 0);
  g.add(legL);

  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.95, 0.2), matArmor);
  legR.position.set(0.16, 0.6, 0);
  g.add(legR);

  // Tower Shield
  const shield = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.4, 0.7), matAmber);
  shield.position.set(0.4, 1.1, 0.2);
  shield.name = "shield";
  g.add(shield);

  g.userData = { originalPos: g.position.clone() };
  return g;
}

function createHeroElysia() {
  const g = new THREE.Group();
  const matWhite = new THREE.MeshStandardMaterial({ color: 0xeceff1, roughness: 0.6 });
  const matCyan = new THREE.MeshStandardMaterial({ color: 0x00d2ff, emissive: 0x00d2ff, emissiveIntensity: 0.9 });

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 0.55, 12), matWhite);
  torso.position.y = 1.35;
  g.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 14), matWhite);
  head.position.y = 1.68;
  g.add(head);

  // Floating Chrono Catalyst Ring
  const catalyst = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.03, 8, 24), matCyan);
  catalyst.position.set(0.35, 1.4, 0.1);
  catalyst.name = "catalyst";
  g.add(catalyst);

  g.userData = { originalPos: g.position.clone() };
  return g;
}

function createHeroLin() {
  const g = new THREE.Group();
  const matDark = new THREE.MeshStandardMaterial({ color: 0x111215, roughness: 0.6 });
  const matGreen = new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 0.9 });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.42, 0.16), matDark);
  torso.position.y = 1.25;
  g.add(torso);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.12), matGreen);
  visor.position.set(0, 1.55, 0.06);
  g.add(visor);

  // Dual Data Daggers
  const dagL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.4, 0.04), matGreen);
  dagL.position.set(-0.25, 0.95, 0.15);
  g.add(dagL);

  const dagR = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.4, 0.04), matGreen);
  dagR.position.set(0.25, 0.95, 0.15);
  g.add(dagR);

  g.userData = { originalPos: g.position.clone() };
  return g;
}

function createBossSentinel07() {
  const g = new THREE.Group();
  const matChassis = new THREE.MeshStandardMaterial({ color: 0x2e323b, roughness: 0.4, metalness: 0.8 });
  const matHazard = new THREE.MeshStandardMaterial({ color: 0xff9900, roughness: 0.5, metalness: 0.3 });
  const matCore = new THREE.MeshStandardMaterial({ color: 0xff3d00, emissive: 0xff3d00, emissiveIntensity: 1.5 });

  // Heavy Upper Torso (3.2m tall mech)
  const chest = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.95, 1.1), matChassis);
  chest.position.y = 2.45;
  chest.castShadow = true;
  g.add(chest);

  // Glowing Overheat Core (Lõi Lồng Ngực)
  bossCoreMesh = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 16), matCore);
  bossCoreMesh.position.set(0, 2.4, 0.56);
  g.add(bossCoreMesh);

  // Dual Shoulder Railgun Cannons
  const railL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 2.4, 12), matChassis);
  railL.position.set(-0.95, 2.9, 0.5);
  railL.rotation.x = Math.PI / 2;
  g.add(railL);

  const railR = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 2.4, 12), matChassis);
  railR.position.set(0.95, 2.9, 0.5);
  railR.rotation.x = Math.PI / 2;
  g.add(railR);

  // Bipedal Heavy Legs
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.85, 0.5), matHazard);
  legL.position.set(-0.65, 0.95, 0);
  g.add(legL);

  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.85, 0.5), matHazard);
  legR.position.set(0.65, 0.95, 0);
  g.add(legR);

  g.userData = { originalPos: g.position.clone(), type: 'boss' };
  return g;
}

// ---------------------------------------------------------------------------
// CÁC MODEL 3D QUÁI & MINION (PHONG CÁCH MECHA / CYBER BEAST)
// ---------------------------------------------------------------------------

function createMinionDrone() {
  const g = new THREE.Group();
  const matChassis = new THREE.MeshStandardMaterial({ color: 0x1f2430, roughness: 0.5, metalness: 0.7 });
  const matEye = new THREE.MeshStandardMaterial({ color: 0xff1744, emissive: 0xff1744, emissiveIntensity: 2.2 });
  const matBlade = new THREE.MeshStandardMaterial({ color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 1.0, transparent: true, opacity: 0.85 });

  // Drone Body Orb
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), matChassis);
  body.position.y = 1.35;
  g.add(body);

  // Glowing Cyber Eye Lens
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), matEye);
  eye.position.set(0, 1.35, 0.28);
  g.add(eye);

  // Dual Rotary Blades
  const rotorL = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.02, 0.08), matBlade);
  rotorL.position.set(-0.45, 1.45, 0);
  rotorL.name = "rotorL";
  g.add(rotorL);

  const rotorR = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.02, 0.08), matBlade);
  rotorR.position.set(0.45, 1.45, 0);
  rotorR.name = "rotorR";
  g.add(rotorR);

  // Underbelly Blaster
  const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.4, 8), matChassis);
  gun.position.set(0, 0.95, 0.15);
  gun.rotation.x = Math.PI / 2;
  g.add(gun);

  g.userData = { originalPos: g.position.clone(), type: 'drone' };
  return g;
}

function createMinionBeast() {
  const g = new THREE.Group();
  const matPlates = new THREE.MeshStandardMaterial({ color: 0x252a36, roughness: 0.4, metalness: 0.8 });
  const matSpine = new THREE.MeshStandardMaterial({ color: 0xff3d00, emissive: 0xff3d00, emissiveIntensity: 1.8 });

  // Beast Torso
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.45, 0.9), matPlates);
  body.position.y = 0.75;
  g.add(body);

  // Spiky Spine Fins
  const spine = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.38, 4), matSpine);
  spine.position.set(0, 1.15, 0);
  spine.rotation.x = -0.3;
  g.add(spine);

  // Head / Cyber Snout
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.28, 0.42), matPlates);
  head.position.set(0, 0.85, 0.55);
  g.add(head);

  const eye = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.05), matSpine);
  eye.position.set(0, 0.9, 0.75);
  g.add(eye);

  // 4 Angular Legs
  const legFL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.65, 0.12), matPlates);
  legFL.position.set(-0.24, 0.32, 0.35);
  g.add(legFL);

  const legFR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.65, 0.12), matPlates);
  legFR.position.set(0.24, 0.32, 0.35);
  g.add(legFR);

  const legBL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.65, 0.14), matPlates);
  legBL.position.set(-0.24, 0.32, -0.35);
  g.add(legBL);

  const legBR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.65, 0.14), matPlates);
  legBR.position.set(0.24, 0.32, -0.35);
  g.add(legBR);

  g.userData = { originalPos: g.position.clone(), type: 'beast' };
  return g;
}

function createEliteEnforcer() {
  const g = new THREE.Group();
  const matArmor = new THREE.MeshStandardMaterial({ color: 0x222630, roughness: 0.4, metalness: 0.8 });
  const matVisor = new THREE.MeshStandardMaterial({ color: 0xff0055, emissive: 0xff0055, emissiveIntensity: 2.2 });

  // Heavy Body (2.2m tall)
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.7, 0.3), matArmor);
  torso.position.y = 1.45;
  g.add(torso);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.24), matArmor);
  head.position.y = 1.95;
  g.add(head);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.06, 0.12), matVisor);
  visor.position.set(0, 1.95, 0.12);
  g.add(visor);

  // Legs
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.95, 0.2), matArmor);
  legL.position.set(-0.16, 0.55, 0);
  g.add(legL);

  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.95, 0.2), matArmor);
  legR.position.set(0.16, 0.55, 0);
  g.add(legR);

  // Plasma Blade
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.1, 0.12), matVisor);
  blade.position.set(-0.4, 1.1, 0.2);
  g.add(blade);

  g.userData = { originalPos: g.position.clone(), type: 'enforcer' };
  return g;
}

function createCyberGolem() {
  const g = new THREE.Group();
  const matStone = new THREE.MeshStandardMaterial({ color: 0x2b313d, roughness: 0.8, metalness: 0.3 });
  const matCore = new THREE.MeshStandardMaterial({ color: 0xffab00, emissive: 0xffab00, emissiveIntensity: 1.8 });

  // Heavy Basalt Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.7, 0.5), matStone);
  torso.position.y = 1.15;
  g.add(torso);

  // Glowing Core Slit
  const core = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.1), matCore);
  core.position.set(0, 1.15, 0.26);
  g.add(core);

  // Monolithic Head
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 0.35), matStone);
  head.position.y = 1.65;
  g.add(head);

  // Broad Shoulders & Fists
  const shoulderL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.35), matStone);
  shoulderL.position.set(-0.52, 1.35, 0);
  g.add(shoulderL);

  const fistL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.45, 0.3), matStone);
  fistL.position.set(-0.52, 0.8, 0.1);
  g.add(fistL);

  const shoulderR = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.35), matStone);
  shoulderR.position.set(0.52, 1.35, 0);
  g.add(shoulderR);

  const fistR = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.45, 0.3), matStone);
  fistR.position.set(0.52, 0.8, 0.1);
  g.add(fistR);

  // Sturdy Legs
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.75, 0.3), matStone);
  legL.position.set(-0.24, 0.4, 0);
  g.add(legL);

  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.75, 0.3), matStone);
  legR.position.set(0.24, 0.4, 0);
  g.add(legR);

  g.userData = { originalPos: g.position.clone(), type: 'golem' };
  return g;
}

// ---------------------------------------------------------------------------
// QUẢN LÝ QUÂN ĐOÀN ĐỊCH 3D (ĐỒNG BỘ THEO DỮ LIỆU TRẬN ĐẤU)
// ---------------------------------------------------------------------------
let enemyMeshes = [];
let targetReticleMesh = null;
let lastEnemySig = '';

function updateTargetReticle(targetIdx) {
  const targetEnemy = getEnemyMesh(targetIdx);
  if (!targetEnemy || !bossGroup) return;

  if (!targetReticleMesh) {
    const reticleGeo = new THREE.RingGeometry(0.55, 0.75, 32);
    const reticleMat = new THREE.MeshBasicMaterial({ color: 0xff1744, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
    targetReticleMesh = new THREE.Mesh(reticleGeo, reticleMat);
    targetReticleMesh.rotation.x = -Math.PI / 2;
    bossGroup.add(targetReticleMesh);
  }

  targetReticleMesh.position.set(targetEnemy.position.x, 0.04, targetEnemy.position.z);
  targetReticleMesh.visible = targetEnemy.visible !== false;
}

export function syncEnemies3D(enemiesList, targetIdx = 0) {
  if (!isInitialized || !bossGroup) return;

  const count = enemiesList ? enemiesList.length : 1;
  const currentSig = (enemiesList || []).map(e => `${e.index}:${e.alive}:${e.tier}:${e.name}`).join('|');

  // Nếu danh sách quái không đổi cấu trúc thì chỉ chuyển vòng target reticle
  if (currentSig === lastEnemySig && enemyMeshes.length > 0) {
    updateTargetReticle(targetIdx);
    return;
  }
  lastEnemySig = currentSig;

  // Xóa toàn bộ mesh địch cũ
  while (bossGroup.children.length > 0) {
    const child = bossGroup.children[0];
    bossGroup.remove(child);
  }
  enemyMeshes = [];
  bossMesh = null;
  targetReticleMesh = null;

  for (let i = 0; i < count; i++) {
    const info = enemiesList[i] || { name: 'Sentinel', tier: 2, alive: 1, index: i };
    if (info.alive === 0) continue;

    const name = (info.name || '').toLowerCase();
    let mesh;
    if (info.tier >= 3 || count === 1) {
      mesh = createBossSentinel07();
    } else if (info.tier === 2) {
      if (name.includes('titan') || name.includes('thạch') || name.includes('golem') || name.includes('warden')) {
        mesh = createCyberGolem();
      } else {
        mesh = createBossSentinel07();
      }
    } else if (info.tier === 1) {
      if (name.includes('golem') || name.includes('thạch')) {
        mesh = createCyberGolem();
      } else {
        mesh = createEliteEnforcer();
      }
    } else {
      if (name.includes('sói') || name.includes('wolf') || name.includes('beast')) {
        mesh = createMinionBeast();
      } else {
        mesh = (i % 2 === 0) ? createMinionDrone() : createMinionBeast();
      }
    }

    // Tọa độ đội hình địch 3D
    let posX = 2.4, posZ = 0;
    if (count === 2) {
      posX = 2.3;
      posZ = (i === 0) ? -1.15 : 1.15;
    } else if (count >= 3) {
      if (i === 0) { posX = 2.7; posZ = 0; }
      else if (i === 1) { posX = 1.9; posZ = -1.35; }
      else if (i === 2) { posX = 1.9; posZ = 1.35; }
      else { posX = 2.3; posZ = (i % 2 === 0 ? 2.1 : -2.1); }
    }

    mesh.position.set(posX, 0, posZ);
    mesh.rotation.y = -Math.PI * 0.42;
    mesh.userData.originalPos = mesh.position.clone();
    mesh.userData.enemyIndex = info.index !== undefined ? info.index : i;

    bossGroup.add(mesh);
    enemyMeshes.push(mesh);
    if (info.tier >= 2 || !bossMesh) {
      bossMesh = mesh;
    }
  }

  updateTargetReticle(targetIdx);
}

function getEnemyMesh(idx) {
  if (enemyMeshes.length === 0) return bossMesh;
  for (const m of enemyMeshes) {
    if (m.userData.enemyIndex === idx) return m;
  }
  return enemyMeshes[0] || bossMesh;
}

// ---------------------------------------------------------------------------
// ĐẠO DIỄN CAMERA 3D ĐỘNG (POKÉMON DYNAMIC BATTLE CAMERA SYSTEM)
// Camera liên tục lượn quanh đội hình (Party Orbit Idle), khi ra chiêu thì
// lia cận cảnh nhân vật (Hero Action), và đổi góc nhìn về phía địch (Enemy POV).
// ---------------------------------------------------------------------------
let camMode = 'POKEMON_IDLE'; // 'POKEMON_IDLE', 'HERO_ACTION', 'ENEMY_HIT', 'ENEMY_ATTACK', 'ULTIMATE'
let camTargetPos = new THREE.Vector3(0, 3.4, 7.8);
let camTargetLook = new THREE.Vector3(0, 1.1, 0);
let currentCamLook = new THREE.Vector3(0, 1.1, 0);
let camActionTimer = null;

export function trigger3DAttack(memberIdx, enemyIdx = 0) {
  if (!isInitialized) return;
  const hero = getHeroByIndex(memberIdx);
  if (!hero) return;

  const targetEnemy = getEnemyMesh(enemyIdx);
  const targetPos = targetEnemy ? targetEnemy.position : new THREE.Vector3(2.2, 0, 0);
  const startPos = hero.userData.originalPos || hero.position.clone();

  // Chuyển Camera sang góc cận cảnh nhân vật (Hero Action Zoom kiểu Pokémon)
  camMode = 'HERO_ACTION';
  camTargetPos.set(hero.position.x - 1.2, 1.6, hero.position.z + 2.2);
  camTargetLook.set(targetPos.x, 1.2, targetPos.z);

  if (camActionTimer) clearTimeout(camActionTimer);

  // 1. Lao lên chém địch
  const forwardPos = new THREE.Vector3(
    startPos.x + (targetPos.x - startPos.x) * 0.65,
    startPos.y + 0.15,
    startPos.z
  );

  let step = 0;
  const animInterval = setInterval(() => {
    step++;
    if (step <= 5) {
      hero.position.lerp(forwardPos, 0.45);
    } else if (step === 6) {
      spawn3DSlash(forwardPos);
      trigger3DEnemyHit(false, enemyIdx);
      // Chuyển camera lia sang hướng địch trúng đòn (Enemy Hit Snap)
      camMode = 'ENEMY_HIT';
      camTargetPos.set(targetPos.x + 1.2, 2.0, targetPos.z + 3.2);
      camTargetLook.set(targetPos.x, 1.4, targetPos.z);
    } else if (step <= 12) {
      hero.position.lerp(startPos, 0.35);
    } else {
      hero.position.copy(startPos);
      clearInterval(animInterval);
      // Trả lại camera về chế độ Pokémon Idle lượn quanh đội hình
      camActionTimer = setTimeout(() => {
        camMode = 'POKEMON_IDLE';
      }, 350);
    }
  }, 25);
}

export function trigger3DEnemyAttack(enemyIdx = 0) {
  if (!isInitialized) return;
  const actingEnemy = getEnemyMesh(enemyIdx);
  if (!actingEnemy) return;
  const orig = actingEnemy.userData.originalPos || actingEnemy.position.clone();

  // Chuyển camera về phía sau lưng Địch nhìn sang phe ta (Enemy POV góc Pokémon)
  camMode = 'ENEMY_ATTACK';
  camTargetPos.set(orig.x + 1.6, 2.4, orig.z + 1.8);
  camTargetLook.set(-2.0, 1.0, 0);

  if (camActionTimer) clearTimeout(camActionTimer);

  // Địch lao lên tấn công
  const strikePos = new THREE.Vector3(orig.x - 1.2, orig.y + 0.2, orig.z);
  let step = 0;
  const attackInterval = setInterval(() => {
    step++;
    if (step <= 6) {
      actingEnemy.position.lerp(strikePos, 0.4);
      if (bossCoreMesh) bossCoreMesh.material.emissiveIntensity = 3.0;
    } else if (step === 7) {
      spawn3DShockwave(new THREE.Vector3(-1.5, 0.2, 0));
    } else if (step <= 14) {
      actingEnemy.position.lerp(orig, 0.3);
    } else {
      actingEnemy.position.copy(orig);
      clearInterval(attackInterval);
      camActionTimer = setTimeout(() => {
        camMode = 'POKEMON_IDLE';
      }, 400);
    }
  }, 25);
}

export function trigger3DSkill(memberIdx, enemyIdx = 0) {
  if (!isInitialized) return;
  const hero = getHeroByIndex(memberIdx);
  if (!hero) return;

  camMode = 'HERO_ACTION';
  camTargetPos.set(hero.position.x - 1.0, 1.8, hero.position.z + 2.0);
  camTargetLook.set(hero.position.x, 1.1, hero.position.z);

  const ringGeo = new THREE.RingGeometry(0.2, 0.9, 24);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x00d2ff, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(hero.position.x, 0.05, hero.position.z);
  fxGroup.add(ring);

  let scale = 1.0;
  const ringTimer = setInterval(() => {
    scale += 0.15;
    ring.scale.set(scale, scale, 1);
    ring.material.opacity -= 0.08;
    if (ring.material.opacity <= 0) {
      clearInterval(ringTimer);
      fxGroup.remove(ring);
    }
  }, 30);

  setTimeout(() => {
    trigger3DAttack(memberIdx, enemyIdx);
  }, 180);
}

export function trigger3DUltimate(memberIdx, enemyIdx = 0) {
  if (!isInitialized) return;
  const hero = getHeroByIndex(memberIdx);
  if (!hero) return;

  camMode = 'ULTIMATE';
  camTargetPos.set(hero.position.x - 0.8, 1.2, hero.position.z + 1.6);
  camTargetLook.set(hero.position.x, 1.4, hero.position.z);

  trigger3DAttack(memberIdx, enemyIdx);
  setTimeout(() => trigger3DAttack(memberIdx, enemyIdx), 220);
  setTimeout(() => trigger3DAttack(memberIdx, enemyIdx), 440);
}

export function trigger3DEnemyHit(isBig, enemyIdx = 0) {
  if (!isInitialized) return;
  const targetEnemy = getEnemyMesh(enemyIdx);
  if (!targetEnemy) return;
  const orig = targetEnemy.userData.originalPos || targetEnemy.position.clone();

  let frame = 0;
  const shakeTimer = setInterval(() => {
    frame++;
    const offset = (Math.random() - 0.5) * (isBig ? 0.35 : 0.18);
    targetEnemy.position.set(orig.x + offset, orig.y, orig.z + offset);

    if (bossCoreMesh) {
      bossCoreMesh.material.emissiveIntensity = 2.8;
    }

    if (frame >= 8) {
      clearInterval(shakeTimer);
      targetEnemy.position.copy(orig);
      if (bossCoreMesh) bossCoreMesh.material.emissiveIntensity = 1.4;
    }
  }, 30);
}

function spawn3DShockwave(pos) {
  const waveGeo = new THREE.RingGeometry(0.3, 1.8, 32);
  const waveMat = new THREE.MeshBasicMaterial({ color: 0xff1744, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
  const wave = new THREE.Mesh(waveGeo, waveMat);
  wave.rotation.x = -Math.PI / 2;
  wave.position.set(pos.x, 0.05, pos.z);
  fxGroup.add(wave);

  let scale = 1.0;
  const timer = setInterval(() => {
    scale += 0.2;
    wave.scale.set(scale, scale, 1);
    wave.material.opacity -= 0.1;
    if (wave.material.opacity <= 0) {
      clearInterval(timer);
      fxGroup.remove(wave);
    }
  }, 30);
}

function spawn3DSlash(pos) {
  const arcGeo = new THREE.TorusGeometry(0.75, 0.08, 6, 20, Math.PI * 0.85);
  const arcMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.95 });
  const arc = new THREE.Mesh(arcGeo, arcMat);
  arc.position.set(pos.x + 0.6, pos.y + 1.2, pos.z);
  arc.rotation.y = Math.PI * 0.5;
  fxGroup.add(arc);

  setTimeout(() => {
    fxGroup.remove(arc);
  }, 220);
}

function getHeroByIndex(idx) {
  switch (idx % 4) {
    case 0: return astraMesh;
    case 1: return boranMesh;
    case 2: return elysiaMesh;
    case 3: return linMesh;
    default: return astraMesh;
  }
}

function onResize() {
  const container = document.getElementById('battle3dStage');
  if (!container || !renderer || !camera) return;
  const width = container.clientWidth || 600;
  const height = container.clientHeight || 280;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function animate() {
  requestAnimationFrame(animate);

  const t = performance.now() * 0.001;

  // 1. CHUYỂN ĐỘNG CAMERA ĐỘNG KIỂU POKÉMON (POKÉMON DYNAMIC CAMERA ORBIT)
  if (camera) {
    if (camMode === 'POKEMON_IDLE') {
      // Camera lượn sóng nhịp nhàng quanh đội hình (party orbit góc 3/4 qua vai)
      const partyCenterX = -2.2;
      const partyCenterZ = 0.0;
      const orbitAngle = Math.sin(t * 0.35) * 0.28 + 0.15; // Dao động nhẹ ~18 độ
      const camX = partyCenterX + Math.sin(orbitAngle) * 3.8 + 0.8;
      const camZ = partyCenterZ + Math.cos(orbitAngle) * 4.2 + 1.2;
      const camY = 2.4 + Math.sin(t * 0.7) * 0.18; // Thở nhẹ theo phương đứng

      camTargetPos.set(camX, camY, camZ);
      camTargetLook.set(0.6, 1.15, 0.0); // Nhìn hướng qua vai đội hình về phía địch
    }

    // Lerp camera mượt mà tới vị trí mục tiêu
    camera.position.lerp(camTargetPos, 0.08);
    currentCamLook.lerp(camTargetLook, 0.1);
    camera.lookAt(currentCamLook);
  }

  // 2. Chuyển động thở của các nhân vật 3D
  if (astraMesh) {
    astraMesh.position.y = Math.sin(t * 2.2) * 0.035;
  }
  if (boranMesh) {
    boranMesh.position.y = Math.sin(t * 1.8 + 0.5) * 0.025;
  }
  if (elysiaMesh) {
    elysiaMesh.position.y = Math.sin(t * 2.0 + 1.0) * 0.04;
  }
  if (linMesh) {
    linMesh.position.y = Math.sin(t * 2.4 + 1.5) * 0.03;
  }
  if (bossMesh) {
    bossMesh.position.y = Math.sin(t * 1.6) * 0.05;
  }
  if (bossCoreMesh) {
    bossCoreMesh.material.emissiveIntensity = 1.3 + Math.sin(t * 3.5) * 0.5;
  }

  // 3. Chuyển động thở & xoay cánh của các quái 3D
  enemyMeshes.forEach((em, i) => {
    if (em.userData.type === 'drone') {
      const baseY = em.userData.originalPos ? em.userData.originalPos.y : 0;
      em.position.y = baseY + Math.sin(t * 2.8 + i) * 0.08;
      const rL = em.getObjectByName("rotorL");
      const rR = em.getObjectByName("rotorR");
      if (rL) rL.rotation.y += 0.25;
      if (rR) rR.rotation.y += 0.25;
    } else if (em !== bossMesh) {
      const baseY = em.userData.originalPos ? em.userData.originalPos.y : 0;
      em.position.y = baseY + Math.sin(t * 1.8 + i) * 0.035;
    }
  });
  if (targetReticleMesh) {
    targetReticleMesh.rotation.z += 0.02;
  }

  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}
