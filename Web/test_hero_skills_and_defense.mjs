/**
 * Web/test_hero_skills_and_defense.mjs
 * ============================================================================
 * KIỂM THỬ TÍNH NĂNG CHIẾN ĐẤU:
 *  1. HỆ THỐNG KỸ NĂNG CHỦ ĐỘNG (ACTIVE SKILLS) & COOLDOWN CỦA 4 HERO
 *  2. HỆ THỐNG KẾT THÚC LƯỢT SỚM ĐỂ PHÒNG THỦ (EARLY TURN DEFENSE MITIGATION)
 *  3. HỆ THỐNG PHẢN KÍCH (COUNTER-ATTACK) TÍCH LŨY THEO COMBO
 * ============================================================================
 */

import { GameState, COLORS } from './src/core/GameState.js';
import { events } from './src/core/EventBus.js';

let passedChecks = 0;
let totalChecks = 0;

function assert(condition, message) {
    totalChecks++;
    if (condition) {
        passedChecks++;
        console.log(`  ✅ PASS: ${message}`);
    } else {
        console.error(`  ❌ FAIL: ${message}`);
        throw new Error(`Kiểm thử thất bại: ${message}`);
    }
}

console.log('='.repeat(70));
console.log('🧪 BẮT ĐẦU KIỂM THỬ: HERO SKILLS, DEFENSE MITIGATION & COMBO COUNTER');
console.log('='.repeat(70));

// ============================================================================
// [TEST GROUP 1]: KẾT THÚC LƯỢT SỚM ĐỂ PHÒNG THỦ (EARLY MITIGATION)
// ============================================================================
console.log('\n[TEST GROUP 1: PHÒNG THỦ SỚM (EARLY DEFENSE MITIGATION)]');

{
    // Test 1.1: 4/4 nước đi chưa dùng -> Đỡ 100% sát thương
    const game = new GameState(8, 8);
    game.movesLeft = 4;
    game.maxMoves = 4;
    
    // Ghi nhận máu ban đầu của đội hình
    const initialHps = game.heroes.map(h => h.hp);
    
    let blockedEventReceived = false;
    let blockedPercent = 0;
    let actualDmgReceived = -1;

    events.on('deflector_blocked', (data) => {
        blockedEventReceived = true;
        blockedPercent = data.percent;
        actualDmgReceived = data.reducedDamage;
    });

    await game.endTurnEarly();

    assert(blockedEventReceived === true, 'Sự kiện deflector_blocked phải được phát khi phòng thủ');
    assert(blockedPercent === 100, '4/4 nước đi chưa dùng phải giảm 100% sát thương boss');
    assert(actualDmgReceived === 0, 'Sát thương thực tế nhận từ Boss phải bằng 0');
    
    // Kiểm tra tất cả hero không bị trừ máu nào
    const allHpPreserved = game.heroes.every((h, i) => h.hp === initialHps[i]);
    assert(allHpPreserved, 'Tất cả hero trong đội bảo toàn 100% máu khi thủ 4/4 nước đi');
    assert(game.movesLeft === 4, 'Sau khi turn mới bắt đầu, số lượt đi hồi phục lại 4/4');
}

{
    // Test 1.2: 2/4 nước đi chưa dùng -> Đỡ 50% sát thương
    const game = new GameState(8, 8);
    game.movesLeft = 2; // Đã dùng 2 nước đi, còn lại 2 nước
    game.maxMoves = 4;

    let blockedPercent = 0;
    let actualDmgReceived = -1;
    let blockedAmount = 0;

    events.on('deflector_blocked', (data) => {
        blockedPercent = data.percent;
        actualDmgReceived = data.reducedDamage;
        blockedAmount = data.blockedAmount;
    });

    await game.endTurnEarly();

    assert(blockedPercent === 50, '2/4 nước đi chưa dùng phải giảm chính xác 50% sát thương');
    assert(blockedAmount === Math.round(450 * 0.5), 'Lượng sát thương chặn phải bằng 50% công boss');
    assert(actualDmgReceived === Math.round(450 * 0.5), 'Sát thương thực nhận phải bằng 50%');
}

{
    // Test 1.3: 0/4 nước đi (hết lượt tự nhiên) -> 0% phòng thủ sớm
    const game = new GameState(8, 8);
    game.movesLeft = 0;
    game.maxMoves = 4;

    let blockedByEarly = false;
    events.on('deflector_blocked', (data) => {
        if (data.reason.includes('PHÒNG THỦ SỚM')) {
            blockedByEarly = true;
        }
    });

    await game.endTurn();

    assert(blockedByEarly === false, 'Hết nước đi tự nhiên (0/4) không được nhận giảm sát thương phòng thủ sớm');
}

// ============================================================================
// [TEST GROUP 2]: HỆ THỐNG PHẢN KÍCH (COUNTER-ATTACK) TÍCH THEO COMBO
// ============================================================================
console.log('\n[TEST GROUP 2: PHẢN KÍCH (COUNTER-ATTACK) TÍCH LŨY THEO COMBO]');

{
    // Test 2.1: Tích lũy Counter Stacks theo combo
    const game = new GameState(8, 8);
    assert(game.counterStacks === 0, 'Khởi đầu turn, counterStacks phải bằng 0');

    // Giả lập match 3 khối ở combo 1
    const match1 = [{ r: 0, c: 0, color: COLORS.FIRE }, { r: 0, c: 1, color: COLORS.FIRE }, { r: 0, c: 2, color: COLORS.FIRE }];
    game.processCombatMath(match1, 1);
    assert(game.counterStacks === 3, 'Combo 1 với 3 khối match phải tích 3 Counter Stacks');

    // Giả lập cascade tiếp nối match 4 khối ở combo 2
    const match2 = [
        { r: 1, c: 0, color: COLORS.LIGHTNING }, { r: 1, c: 1, color: COLORS.LIGHTNING },
        { r: 1, c: 2, color: COLORS.LIGHTNING }, { r: 1, c: 3, color: COLORS.LIGHTNING }
    ];
    game.processCombatMath(match2, 2);
    // 3 + (4 * 2) = 11 stacks
    assert(game.counterStacks === 11, 'Combo 2 với 4 khối match phải tích thêm 8 Stacks (tổng 11 Stacks)');

    // Test 2.2: Phản kích tự động giáng đòn lên Boss ở cuối turn
    const bossHpBefore = game.boss.hp;
    let counterFired = false;
    let counterDmg = 0;
    let counterStacksUsed = 0;

    events.on('counter_attack', (data) => {
        counterFired = true;
        counterDmg = data.damage;
        counterStacksUsed = data.stacks;
    });

    await game.endTurn();

    assert(counterFired === true, 'Đòn phản kích phải tự động kích hoạt sau khi Boss hành động');
    assert(counterStacksUsed === 11, 'Đòn phản kích sử dụng đúng 11 Stacks đã tích lũy');
    const expectedDmg = 11 * 160; // 1760
    assert(counterDmg === expectedDmg, `Sát thương phản kích phải bằng ${expectedDmg} DMG`);
    assert(game.boss.hp === bossHpBefore - expectedDmg, 'Máu Boss phải bị trừ đúng lượng sát thương phản kích');
    assert(game.counterStacks === 0, 'Điểm phản kích phải được reset về 0 ở đầu turn tiếp theo');
}

{
    // Test 2.3: Phản kích Bộc Phá Chí Mạng khi Boss bị Stagger Break (x2.5 DMG)
    const game = new GameState(8, 8);
    game.boss.isBroken = true;
    game.counterStacks = 10;
    const bossHpBefore = game.boss.hp;

    let isCritical = false;
    let counterDmg = 0;

    events.on('counter_attack', (data) => {
        isCritical = data.isCritical;
        counterDmg = data.damage;
    });

    await game.endTurn();

    assert(isCritical === true, 'Đòn phản kích phải kích hoạt Critical khi Boss bị Break Stagger');
    const expectedCritDmg = Math.round(10 * 160 * 2.5); // 4000 DMG
    assert(counterDmg === expectedCritDmg, `Sát thương phản kích khi Break phải đạt x2.5 (${expectedCritDmg} DMG)`);
    assert(game.boss.hp === bossHpBefore - expectedCritDmg, 'Máu Boss phải bị trừ trọn vẹn sát thương Critical phản kích');
}

// ============================================================================
// [TEST GROUP 3]: KỸ NĂNG CHỦ ĐỘNG CỦA 4 HERO (MANUAL SKILLS & COOLDOWNS)
// ============================================================================
console.log('\n[TEST GROUP 3: KỸ NĂNG CHỦ ĐỘNG CỦA 4 HERO & HỒI CHIÊU]');

{
    const game = new GameState(8, 8);

    // 1. Astra (Attacker): Lôi Trảm 1800 DMG + 25 Stagger
    const astra = game.heroes[0];
    const bossHpBefore = game.boss.hp;
    const bossStaggerBefore = game.boss.stagger;

    const astraOk = game.triggerSkill(0);
    assert(astraOk === true, 'Astra tung Lôi Trảm thành công');
    assert(game.boss.hp === bossHpBefore - 1800, 'Lôi Trảm gây đúng 1800 sát thương lên Boss');
    assert(game.boss.stagger === bossStaggerBefore - 25, 'Lôi Trảm bào mòn đúng 25 điểm Stagger');
    assert(astra.skillCd === astra.maxCd, 'Kỹ năng Astra phải chuyển sang hồi chiêu (maxCd = 3)');

    // Không thể dùng tiếp khi đang hồi chiêu
    const astraRetry = game.triggerSkill(0);
    assert(astraRetry === false, 'Không thể dùng kỹ năng Astra khi đang trong thời gian hồi chiêu');

    // 2. Elysia (Supporter): Phá Giáp 40 Stagger & +20 Nộ
    const elysia = game.heroes[1];
    const bossStaggerBefore2 = game.boss.stagger;
    const astraEnergyBefore = astra.energy;

    const elysiaOk = game.triggerSkill(1);
    assert(elysiaOk === true, 'Elysia tung Phá Giáp thành công');
    assert(game.boss.stagger === bossStaggerBefore2 - 40, 'Phá Giáp bào mòn đúng 40 điểm Stagger Boss');
    assert(astra.energy === astraEnergyBefore + 20, 'Phá Giáp nạp +20 Nộ cho đồng minh');
    assert(elysia.skillCd === elysia.maxCd, 'Kỹ năng Elysia chuyển sang hồi chiêu (maxCd = 4)');

    // 3. Lin (Healer): Hồi 450 HP toàn đội
    astra.hp = 500;
    elysia.hp = 400;
    const linOk = game.triggerSkill(2);
    assert(linOk === true, 'Lin tung kỹ năng Hồi Máu thành công');
    assert(astra.hp === 500 + 450, 'Astra được hồi đúng 450 HP');
    assert(elysia.hp === 400 + 450, 'Elysia được hồi đúng 450 HP');
    assert(game.heroes[2].skillCd === game.heroes[2].maxCd, 'Lin chuyển sang hồi chiêu');

    // 4. Boran (Defender): Khiên Phản Chấn 4 Stacks (-60% DMG)
    const boranOk = game.triggerSkill(3);
    assert(boranOk === true, 'Boran tung Khiên Thủ thành công');
    assert(game.heroes[3].deflectorStacks === 4, 'Boran tích đủ 4 Stacks Khiên Deflector');
    assert(game.heroes[3].skillCd === game.heroes[3].maxCd, 'Boran chuyển sang hồi chiêu');

    // 5. Kiểm tra giảm hồi chiêu qua lượt
    await game.endTurn();
    assert(astra.skillCd === 2, 'Sau khi hết 1 turn, hồi chiêu Astra giảm từ 3 xuống 2');
    assert(elysia.skillCd === 3, 'Hồi chiêu Elysia giảm từ 4 xuống 3');
}

console.log('\n' + '='.repeat(70));
console.log(`KẾT QUẢ KIỂM THỬ: ${passedChecks} PASS / ${totalChecks - passedChecks} FAIL`);
console.log('='.repeat(70));

if (passedChecks === totalChecks) {
    console.log('\n🎉 HOÀN TẤT XÁC MINH: TẤT CẢ TÍNH NĂNG SKILL, PHÒNG THỦ & PHẢN KÍCH HOẠT ĐỘNG HOÀN HẢO!');
} else {
    process.exit(1);
}
