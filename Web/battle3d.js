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

  g.userData = { originalPos: g.position.clone() };
  return g;
}

// ---------------------------------------------------------------------------
// 3D COMBAT EVENT TRIGGERS (Invoked by m3ui.js on WASM Events)
// ---------------------------------------------------------------------------

export function trigger3DAttack(memberIdx, enemyIdx) {
  if (!isInitialized) return;
  const hero = getHeroByIndex(memberIdx);
  if (!hero) return;

  const targetPos = bossMesh ? bossMesh.position : new THREE.Vector3(1.5, 0, 0);
  const startPos = hero.userData.originalPos || hero.position.clone();

  // 1. Lunge Forward towards boss
  const forwardPos = new THREE.Vector3(
    startPos.x + (targetPos.x - startPos.x) * 0.55,
    startPos.y + 0.2,
    startPos.z
  );

  let step = 0;
  const animInterval = setInterval(() => {
    step++;
    if (step <= 5) {
      hero.position.lerp(forwardPos, 0.45);
      if (hero.name === "astra") {
        hero.rotation.y = Math.PI * 0.5;
      }
    } else if (step === 6) {
      // Spawn 3D Energy Slash Arc
      spawn3DSlash(forwardPos);
    } else if (step <= 12) {
      hero.position.lerp(startPos, 0.35);
    } else {
      hero.position.copy(startPos);
      clearInterval(animInterval);
    }
  }, 25);
}

export function trigger3DSkill(memberIdx, enemyIdx) {
  if (!isInitialized) return;
  const hero = getHeroByIndex(memberIdx);
  if (!hero) return;

  // Expanding Magic Ring below hero in 3D
  const ringGeo = new THREE.RingGeometry(0.2, 0.8, 24);
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
}

export function trigger3DUltimate(memberIdx, enemyIdx) {
  if (!isInitialized) return;
  const hero = getHeroByIndex(memberIdx);
  if (!hero) return;

  // Camera Dynamic Action Zoom
  if (camera) {
    const origCamPos = camera.position.clone();
    camera.position.set(0, 2.2, 5.2);
    setTimeout(() => {
      camera.position.lerp(origCamPos, 0.5);
    }, 450);
  }

  // Multi-burst slashes
  trigger3DAttack(memberIdx, enemyIdx);
  setTimeout(() => trigger3DAttack(memberIdx, enemyIdx), 220);
  setTimeout(() => trigger3DAttack(memberIdx, enemyIdx), 440);
}

export function trigger3DEnemyHit(isBig) {
  if (!isInitialized || !bossMesh) return;
  const orig = bossMesh.userData.originalPos || bossMesh.position.clone();

  // Boss recoil & shake
  let frame = 0;
  const shakeTimer = setInterval(() => {
    frame++;
    const offset = (Math.random() - 0.5) * (isBig ? 0.35 : 0.18);
    bossMesh.position.set(orig.x + offset, orig.y, orig.z + offset);

    if (bossCoreMesh) {
      bossCoreMesh.material.emissiveIntensity = 2.5;
    }

    if (frame >= 8) {
      clearInterval(shakeTimer);
      bossMesh.position.copy(orig);
      if (bossCoreMesh) bossCoreMesh.material.emissiveIntensity = 1.5;
    }
  }, 30);
}

function spawn3DSlash(pos) {
  const arcGeo = new THREE.TorusGeometry(0.65, 0.06, 6, 16, Math.PI * 0.8);
  const arcMat = new THREE.MeshBasicMaterial({ color: 0xff2e55, transparent: true, opacity: 0.95 });
  const arc = new THREE.Mesh(arcGeo, arcMat);
  arc.position.set(pos.x + 0.8, pos.y + 1.2, pos.z);
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

  const t = performance.now() * 0.002;

  // Gentle idle animation
  if (astraMesh) {
    astraMesh.position.y = Math.sin(t * 1.5) * 0.04;
  }
  if (elysiaMesh) {
    const cat = elysiaMesh.getObjectByName("catalyst");
    if (cat) cat.rotation.z += 0.03;
  }
  if (bossCoreMesh) {
    bossCoreMesh.material.emissiveIntensity = 1.2 + Math.sin(t * 3.0) * 0.4;
  }

  if (controls) controls.update();
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}
