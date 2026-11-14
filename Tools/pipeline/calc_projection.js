const THREE = require('../../Web/vendor/three.min.js');
const sizes = [
    { name: 'iPhone 14 (390x844)', w: 390, h: 844 },
    { name: 'iPhone SE (375x667)', w: 375, h: 667 },
    { name: 'Pixel 7 (412x915)', w: 412, h: 915 },
    { name: 'Samsung S20 (360x800)', w: 360, h: 800 }
];

for (const s of sizes) {
    const aspect = s.w / s.h;
    const camera = new THREE.PerspectiveCamera(54, aspect, 0.1, 100);
    camera.position.set(0, 16.5, 18.0);
    camera.lookAt(0, -0.5, 0);
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();

    const boardGroup = new THREE.Group();
    boardGroup.position.set(0, -0.5, 1.5);
    boardGroup.rotation.x = -Math.PI / 10;
    boardGroup.updateMatrixWorld();

    const stageGroup = new THREE.Group();
    stageGroup.position.set(0, 3.8, -8.5);
    stageGroup.updateMatrixWorld();

    function proj(v) {
        const p = v.clone().project(camera);
        return { x: ((p.x * 0.5 + 0.5) * s.w).toFixed(0), y: ((-(p.y * 0.5) + 0.5) * s.h).toFixed(0) };
    }

    const tSize = 1.05 + 0.12;
    const r0c0 = new THREE.Vector3(-3.5 * tSize, 3.5 * tSize, 0).applyMatrix4(boardGroup.matrixWorld);
    const r7c7 = new THREE.Vector3(3.5 * tSize, -3.5 * tSize, 0).applyMatrix4(boardGroup.matrixWorld);
    const stageFront = new THREE.Vector3(0, -0.2, 4.8).applyMatrix4(stageGroup.matrixWorld);

    const pR0 = proj(r0c0);
    const pR7 = proj(r7c7);
    const pStage = proj(stageFront);

    console.log(`[${s.name}] StageFront Y=${pStage.y} | Board Top Y=${pR0.y}, Bottom Y=${pR7.y}, Left X=${pR0.x}, Right X=${pR7.x}`);
}
