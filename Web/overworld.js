/* ============================================================================
   overworld.js — Chibi Overworld Exploration Mode for RE:FRAY
   ----------------------------------------------------------------------------
   Allows player to control Chibi Astra exploring the world map (Sector 7 Aster):
   - Controls: WASD / Arrow Keys / Click-to-Move / On-Screen Joystick
   - Interactive NPCs (Chibi Boran), Supply Crates (Loot), Patrolling Enemies
   - Proximity Encounter: Touching patrol mobs triggers seamless Match-3 Combat!
   ============================================================================ */

let owScene, owCamera, owRenderer;
let chibiAstra, chibiAstraGroup;
let chibiBoran, supplyCrate, patrolMech;
let keysDown = {};
let playerPos = { x: 0, z: 2, rot: 0 };
let playerSpeed = 0.08;
let isOverworldActive = false;
let walkAnimTime = 0;
let crateOpened = false;
let onStartBattleCallback = null;

export function initOverworld(canvasId, containerId, startBattleCallback) {
  const canvas = document.getElementById(canvasId);
  const container = document.getElementById(containerId);
  if (!canvas || !container || typeof THREE === 'undefined') return false;

  onStartBattleCallback = startBattleCallback;
  const width = container.clientWidth || 800;
  const height = container.clientHeight || 500;

  // Scene & Camera
  owScene = new THREE.Scene();
  owScene.background = new THREE.Color(0x0c0e14);
  owScene.fog = new THREE.FogExp2(0x0c0e14, 0.04);

  owCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  // Isometric diorama angle looking down at Chibi hero
  owCamera.position.set(0, 7.5, 9.5);
  owCamera.lookAt(0, 0, 0);

  // Renderer
  owRenderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  owRenderer.setSize(width, height);
  owRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  owRenderer.shadowMap.enabled = true;

  // Lights
  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  owScene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffeedd, 1.2);
  sun.position.set(6, 12, 8);
  sun.castShadow = true;
  owScene.add(sun);

  // Atmosphere rim lights (Orange sunset & cyan cyber glow)
  const amberRim = new THREE.PointLight(0xff8c42, 2.0, 20);
  amberRim.position.set(-8, 3, -6);
  owScene.add(amberRim);

  const cyanRim = new THREE.PointLight(0x00d2ff, 1.8, 18);
  cyanRim.position.set(8, 2, 6);
  owScene.add(cyanRim);

  // Build Environment
  buildTownEnvironment();

  // Build Chibi Astra
  chibiAstraGroup = createChibiAstra();
  chibiAstraGroup.position.set(playerPos.x, 0, playerPos.z);
  owScene.add(chibiAstraGroup);

  // Build NPC Boran
  chibiBoran = createChibiBoran();
  chibiBoran.position.set(-3.2, 0, -1.5);
  owScene.add(chibiBoran);

  // Build Supply Crate
  supplyCrate = createSupplyCrate();
  supplyCrate.position.set(3.5, 0, -2.0);
  owScene.add(supplyCrate);

  // Build Patrol Enemy Mech (Chibi Sentinel Unit 07)
  patrolMech = createPatrolMech();
  patrolMech.position.set(2.0, 0, 2.5);
  owScene.add(patrolMech);

  // Keyboard Listeners
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('resize', onResize);

  isOverworldActive = true;
  loop();
  return true;
}

function buildTownEnvironment() {
  const g = new THREE.Group();

  // Ground plane: Sector 7 Metallic Settlement Floor
  const floorGeo = new THREE.PlaneGeometry(24, 24);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x141822,
    roughness: 0.7,
    metalness: 0.3
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  g.add(floor);

  // Grid circuit paths
  const grid = new THREE.GridHelper(24, 24, 0x00d2ff, 0x1f2738);
  grid.position.y = 0.01;
  g.add(grid);

  // Roadway border strips
  const roadMat = new THREE.MeshBasicMaterial({ color: 0xffb800 });
  const line1 = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 18), roadMat);
  line1.rotation.x = -Math.PI / 2;
  line1.position.set(-1.8, 0.02, 0);
  g.add(line1);

  const line2 = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 18), roadMat);
  line2.rotation.x = -Math.PI / 2;
  line2.position.set(1.8, 0.02, 0);
  g.add(line2);

  // Futuristic Building Blocks / Shelters
  const bldgMat = new THREE.MeshStandardMaterial({ color: 0x222634, metalness: 0.5, roughness: 0.4 });
  const bldg1 = new THREE.Mesh(new THREE.BoxGeometry(3.5, 3.2, 4.0), bldgMat);
  bldg1.position.set(-6.5, 1.6, -4.5);
  g.add(bldg1);

  const bldg2 = new THREE.Mesh(new THREE.BoxGeometry(4.0, 2.8, 3.5), bldgMat);
  bldg2.position.set(6.8, 1.4, -4.0);
  g.add(bldg2);

  // Street Light Posts with glowing top
  createLampPost(g, -2.5, 0);
  createLampPost(g, 2.5, 0);
  createLampPost(g, -2.5, -4);
  createLampPost(g, 2.5, -4);

  owScene.add(g);
}

function createLampPost(group, x, z) {
  const postMat = new THREE.MeshStandardMaterial({ color: 0x333a4d, metalness: 0.8 });
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.4, 8), postMat);
  post.position.set(x, 1.2, z);
  group.add(post);

  const lampMat = new THREE.MeshBasicMaterial({ color: 0x00d2ff });
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), lampMat);
  lamp.position.set(x, 2.4, z);
  group.add(lamp);
}

// ---------------------------------------------------------------------------
// CHIBI 3D MODELS (2.8 Heads Cute Action Aesthetic)
// ---------------------------------------------------------------------------

function createChibiAstra() {
  const g = new THREE.Group();

  const skinMat = new THREE.MeshStandardMaterial({ color: 0xf5d6c6, roughness: 0.6 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x1a1c22, roughness: 0.5 });
  const redMat = new THREE.MeshStandardMaterial({ color: 0xff2e55, emissive: 0xff2e55, emissiveIntensity: 0.7 });
  const coatMat = new THREE.MeshStandardMaterial({ color: 0x16181f, roughness: 0.6 });

  // 1. Oversized Chibi Head (Cute 2.8 ratio)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 16), skinMat);
  head.position.y = 0.95;
  head.name = "head";
  g.add(head);

  // Anime Eyes
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2e55 });
  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.03), eyeMat);
  eyeL.position.set(-0.16, 0.95, 0.38);
  g.add(eyeL);

  const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.03), eyeMat);
  eyeR.position.set(0.16, 0.95, 0.38);
  g.add(eyeR);

  // Big Bouncy Ponytail
  const ponytail = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.03, 0.6, 8), redMat);
  ponytail.position.set(0, 1.0, -0.45);
  ponytail.rotation.x = -0.5;
  ponytail.name = "ponytail";
  g.add(ponytail);

  // 2. Compact Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.42, 0.26), coatMat);
  body.position.y = 0.52;
  g.add(body);

  const redBelt = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.28), redMat);
  redBelt.position.y = 0.42;
  g.add(redBelt);

  // 3. Short Legs
  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.32, 8), coatMat);
  legL.position.set(-0.12, 0.16, 0);
  legL.name = "legL";
  g.add(legL);

  const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.32, 8), coatMat);
  legR.position.set(0.12, 0.16, 0);
  legR.name = "legR";
  g.add(legR);

  // 4. Twin Mini Plasma Swords Sheathed on Back
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0xff2e55, emissive: 0xff2e55, emissiveIntensity: 0.9 });
  const swL = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.55, 0.06), bladeMat);
  swL.position.set(-0.16, 0.68, -0.18);
  swL.rotation.z = 0.4;
  g.add(swL);

  const swR = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.55, 0.06), bladeMat);
  swR.position.set(0.16, 0.68, -0.18);
  swR.rotation.z = -0.4;
  g.add(swR);

  return g;
}

function createChibiBoran() {
  const g = new THREE.Group();
  const matArmor = new THREE.MeshStandardMaterial({ color: 0x2c3038, roughness: 0.4 });
  const matAmber = new THREE.MeshStandardMaterial({ color: 0xffb800, emissive: 0xffb800, emissiveIntensity: 0.6 });

  // Big Square Chibi Head with Amber Visor
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.45, 0.42), matArmor);
  head.position.y = 1.05;
  g.add(head);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.04), matAmber);
  visor.position.set(0, 1.05, 0.22);
  g.add(visor);

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.52, 0.38), matArmor);
  body.position.y = 0.55;
  g.add(body);

  // Huge Tower Shield on back
  const shield = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.95, 0.65), matAmber);
  shield.position.set(0.35, 0.65, 0.15);
  g.add(shield);

  // Speech bubble above Boran
  const bubble = createSpeechBubble("🛡️ Boran [NPC]");
  bubble.position.set(0, 1.8, 0);
  g.add(bubble);

  return g;
}

function createSupplyCrate() {
  const g = new THREE.Group();
  const crateMat = new THREE.MeshStandardMaterial({ color: 0x8a5b28, roughness: 0.7 });
  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), crateMat);
  crate.position.y = 0.4;
  crate.castShadow = true;
  g.add(crate);

  const bandMat = new THREE.MeshBasicMaterial({ color: 0xffb800 });
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.14, 0.84), bandMat);
  band.position.y = 0.4;
  g.add(band);

  const bubble = createSpeechBubble("📦 Rương Tiếp Tế");
  bubble.position.set(0, 1.3, 0);
  bubble.name = "crateBubble";
  g.add(bubble);

  return g;
}

function createPatrolMech() {
  const g = new THREE.Group();
  const matMech = new THREE.MeshStandardMaterial({ color: 0x363b47, metalness: 0.7 });
  const matHazard = new THREE.MeshStandardMaterial({ color: 0xff9900, roughness: 0.4 });
  const matCore = new THREE.MeshStandardMaterial({ color: 0xff3d00, emissive: 0xff3d00, emissiveIntensity: 1.4 });

  // Chibi Sentinel 07: Rounder, slightly oversized head/torso
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.8, 0.85), matMech);
  body.position.y = 1.1;
  g.add(body);

  const core = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), matCore);
  core.position.set(0, 1.05, 0.44);
  g.add(core);

  // Dual Mini Cannons
  const canL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.0, 8), matHazard);
  canL.position.set(-0.65, 1.4, 0.2);
  canL.rotation.x = Math.PI / 2;
  g.add(canL);

  const canR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.0, 8), matHazard);
  canR.position.set(0.65, 1.4, 0.2);
  canR.rotation.x = Math.PI / 2;
  g.add(canR);

  // Warning Alert Bubble above Mech
  const alertBubble = createSpeechBubble("⚠️ SENTINEL 07 [BOSS]");
  alertBubble.position.set(0, 2.1, 0);
  g.add(alertBubble);

  // Danger Vision Radius Circle on Floor
  const circleGeo = new THREE.RingGeometry(1.8, 2.0, 32);
  const circleMat = new THREE.MeshBasicMaterial({ color: 0xff2e55, side: THREE.DoubleSide });
  const circle = new THREE.Mesh(circleGeo, circleMat);
  circle.rotation.x = -Math.PI / 2;
  circle.position.y = 0.03;
  g.add(circle);

  return g;
}

function createSpeechBubble(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'rgba(12, 16, 26, 0.85)';
  ctx.strokeStyle = '#00d2ff';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(8, 8, 240, 48, 12);
  ctx.fill();
  ctx.stroke();

  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 32);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.8, 0.45, 1);
  return sprite;
}

// ---------------------------------------------------------------------------
// INPUT & UPDATE LOOP
// ---------------------------------------------------------------------------

function onKeyDown(e) {
  if (!isOverworldActive) return;
  keysDown[e.key.toLowerCase()] = true;
  keysDown[e.code] = true;

  // Interaction Key (E or F)
  if (e.key === 'e' || e.key === 'E' || e.key === 'f' || e.key === 'F') {
    handleInteraction();
  }
}

function onKeyUp(e) {
  keysDown[e.key.toLowerCase()] = false;
  keysDown[e.code] = false;
}

function handleInteraction() {
  // Check Distance to Crate
  if (supplyCrate && !crateOpened) {
    const dist = Math.hypot(chibiAstraGroup.position.x - supplyCrate.position.x, chibiAstraGroup.position.z - supplyCrate.position.z);
    if (dist < 1.8) {
      crateOpened = true;
      supplyCrate.position.y += 0.2;
      const b = supplyCrate.getObjectByName("crateBubble");
      if (b) b.material.color.set(0x00ff88);
      showOverworldPrompt("🎉 ĐÃ MỞ RƯƠNG: Nhận được +100 Aether Shards & +500 Hợp Kim Titan!");
      return;
    }
  }

  // Check Distance to Boran
  if (chibiBoran) {
    const dist = Math.hypot(chibiAstraGroup.position.x - chibiBoran.position.x, chibiAstraGroup.position.z - chibiBoran.position.z);
    if (dist < 2.0) {
      showOverworldPrompt("🛡️ Boran: 'Astra! Lũ Sentinel ngoại vi đang áp sát Sector 7. Hãy cẩn thận khi tiến lại gần vòng đỏ của chúng!'");
      return;
    }
  }
}

export function showOverworldPrompt(text) {
  const el = document.getElementById('overworldPrompt');
  if (!el) return;
  el.textContent = text;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3500);
}

function onResize() {
  const container = document.getElementById('overworldContainer');
  if (!container || !owRenderer || !owCamera) return;
  const width = container.clientWidth || 800;
  const height = container.clientHeight || 500;
  owCamera.aspect = width / height;
  owCamera.updateProjectionMatrix();
  owRenderer.setSize(width, height);
}

function loop() {
  if (!isOverworldActive) return;
  requestAnimationFrame(loop);

  let dx = 0;
  let dz = 0;

  if (keysDown['w'] || keysDown['arrowup']) dz -= 1;
  if (keysDown['s'] || keysDown['arrowdown']) dz += 1;
  if (keysDown['a'] || keysDown['arrowleft']) dx -= 1;
  if (keysDown['d'] || keysDown['arrowright']) dx += 1;

  const isMoving = dx !== 0 || dz !== 0;

  if (isMoving) {
    const len = Math.hypot(dx, dz);
    dx = (dx / len) * playerSpeed;
    dz = (dz / len) * playerSpeed;

    playerPos.x += dx;
    playerPos.z += dz;

    // Bounds limit
    playerPos.x = Math.max(-9, Math.min(9, playerPos.x));
    playerPos.z = Math.max(-9, Math.min(9, playerPos.z));

    playerPos.rot = Math.atan2(dx, dz);

    walkAnimTime += 0.22;
  }

  if (chibiAstraGroup) {
    chibiAstraGroup.position.x = playerPos.x;
    chibiAstraGroup.position.z = playerPos.z;
    chibiAstraGroup.rotation.y = playerPos.rot;

    // Chibi Bobbing Animation (Cute walk bounce)
    if (isMoving) {
      chibiAstraGroup.position.y = Math.abs(Math.sin(walkAnimTime)) * 0.12;
      const legL = chibiAstraGroup.getObjectByName("legL");
      const legR = chibiAstraGroup.getObjectByName("legR");
      if (legL && legR) {
        legL.rotation.x = Math.sin(walkAnimTime) * 0.6;
        legR.rotation.x = -Math.sin(walkAnimTime) * 0.6;
      }
    } else {
      chibiAstraGroup.position.y = 0;
    }
  }

  // Camera Follow Player Smoothly
  if (owCamera && chibiAstraGroup) {
    const targetCamX = chibiAstraGroup.position.x;
    const targetCamZ = chibiAstraGroup.position.z + 8.5;
    owCamera.position.x += (targetCamX - owCamera.position.x) * 0.08;
    owCamera.position.z += (targetCamZ - owCamera.position.z) * 0.08;
    owCamera.lookAt(chibiAstraGroup.position.x, 0.8, chibiAstraGroup.position.z);
  }

  // Patrol Mech Movement (Left/Right patrol)
  if (patrolMech) {
    const t = performance.now() * 0.001;
    patrolMech.position.x = 2.0 + Math.sin(t * 1.2) * 2.5;

    // Check Distance between Player and Patrol Boss
    const distToBoss = Math.hypot(chibiAstraGroup.position.x - patrolMech.position.x, chibiAstraGroup.position.z - patrolMech.position.z);
    if (distToBoss < 2.0) {
      // Trigger Battle!
      triggerCombatEncounter();
    }
  }

  if (owRenderer && owScene && owCamera) {
    owRenderer.render(owScene, owCamera);
  }
}

function triggerCombatEncounter() {
  isOverworldActive = false;
  showOverworldPrompt("⚠️ CẢNH BÁO: ĐÃ CHẠM TRÁN SENTINEL UNIT 07! BẮT ĐẦU TRẬN ĐẤU!");
  
  const flash = document.getElementById('encounterFlash');
  if (flash) {
    flash.classList.add('flash');
    setTimeout(() => flash.classList.remove('flash'), 600);
  }

  setTimeout(() => {
    if (typeof onStartBattleCallback === 'function') {
      onStartBattleCallback();
    }
  }, 400);
}

export function setOverworldActive(active) {
  isOverworldActive = active;
  if (active) {
    loop();
    onResize();
  }
}
