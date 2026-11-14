const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const WEB_SRC = path.join(ROOT, 'Web', 'src');
const DIST_DIR = path.join(ROOT, 'Web', 'dist');

if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
}

// Danh sách file theo thứ tự phụ thuộc
const files = [
    path.join(WEB_SRC, 'core', 'EventBus.js'),
    path.join(WEB_SRC, 'core', 'GameState.js'),
    path.join(WEB_SRC, 'three', 'Engine.js'),
    path.join(WEB_SRC, 'three', 'Board3D.js'),
    path.join(WEB_SRC, 'three', 'Diorama3D.js'),
    path.join(WEB_SRC, 'three', 'VFX.js'),
    path.join(WEB_SRC, 'ui', 'HUD.js'),
    path.join(WEB_SRC, 'debug', 'DebugInspector.js'),
    path.join(WEB_SRC, 'app.js')
];

let bundleContent = '/** RE:FRAY COMBINED GAME BUNDLE - THREE.JS MATCH-3 RPG */\n(function() {\n"use strict";\n\n';

for (const filePath of files) {
    let code = fs.readFileSync(filePath, 'utf8');
    
    // Xóa tất cả các dòng import
    code = code.replace(/^\s*import\s+[^;]+;?\s*$/gm, '');
    
    // Đổi 'export class Name' -> 'class Name'
    code = code.replace(/^\s*export\s+class\s+(\w+)/gm, 'class $1');
    
    // Đổi 'export const Name' -> 'const Name'
    code = code.replace(/^\s*export\s+const\s+(\w+)/gm, 'const $1');
    
    // Đổi 'export function Name' -> 'function Name'
    code = code.replace(/^\s*export\s+function\s+(\w+)/gm, 'function $1');
    
    // Đổi 'export default' -> ''
    code = code.replace(/^\s*export\s+default\s+/gm, '');

    bundleContent += `\n// --- MODULE: ${path.relative(ROOT, filePath)} ---\n`;
    bundleContent += code + '\n';
}

bundleContent += '\n})();\n';

const outFile = path.join(DIST_DIR, 'game.bundle.js');
fs.writeFileSync(outFile, bundleContent, 'utf8');

console.log(`[BUNDLE SUCCESS] Created: ${outFile} (${(bundleContent.length / 1024).toFixed(1)} KB)`);
