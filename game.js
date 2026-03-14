// ============================================================
// game.js
// キャンバス・入力・ゲームループ・描画・物理・敵・弾・パーティクル
// startGame / gameOver / チュートリアル / 難易度倍率
// ============================================================

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
let W, H, cx, cy;

function resize(){
  W = canvas.width  = canvas.clientWidth;
  H = canvas.height = canvas.clientHeight;
  cx = W / 2; cy = H / 2;
}
resize();
window.addEventListener('resize', resize);

// ============================================================
// ゲーム状態変数
// ============================================================
let gameRunning = false, score = 0, gameCoins = 0, gameMedals = 0, pieces = 0;
let combo = 0, comboTimer = 0, maxCombo = 0;
let wave = 1, waveTimer = 0, enemiesInWave = 0;
let playerHP = 100, playerMaxHP = 100, livesMax = 50, livesCurrent = 50;
let bossActive = false, boss = null;
let items = [null,null,null,null,null];
let lastTime = 0, dt = 0, zOffset = 0;
let moveLevel = 1, orbs = 0, orbsTarget = 30;
let dropUpActive = 0;
let difficulty = 'normal';
let damageMultiplier = 1, fireRateMultiplier = 1;
let tutorialMode = false, tutorialKills = 0, tutorialPhase = 0;
let skillUses = 0, itemUses = 0, enemiesKilled = 0;
let totalDamageDealt = 0;
let finalExpGained = 0, finalExpMult = 1, finalCoinMult = 1, finalMedalMult = 1;

// ボーナス（Coming Soon につき全て 1）
let bonusExpMult = 1, bonusCoinMult = 1, bonusMedalMult = 1;
let bonusComboNeverReset = false, bonusItemDropRate = 0;

// 難易度倍率
let diffMult = {
  playerMaxHP:1, playerDmg:1, enemySpeed:1, bulletSpeed:1,
  bossHP:1, lives:1, expMult:1, coinMult:1, enemyBulletSpeed:1, fireRate:1
};

// レベル倍率
let lvl = { speed:1, fire:1, size:1, shots:1, hp:0, comboT:3, dmg:1 };

// 敵ステータス変化テーブル（弱化・ソフト弾用）
// enemyId -> { attackMult, speedMult, hpMult, expires }
const enemyDebuffs = new Map();

// ============================================================
// オブジェクトプール
// ============================================================
let bullets=[], enemies=[], particles=[], coins_obj=[], powerups=[], ebullets=[], stars=[];
let traps=[], bigBombs=[], magnets=[];
const MAX_P = 200;

// ============================================================
// 入力
// ============================================================
const keys = {};
let mouseX=0, mouseY=0, mouseDown=false, touchActive=false, touchX=0, touchY=0;

document.addEventListener('keydown', e => {
  const key = (e.key || '').toLowerCase();
  if(!key) return;
  keys[key] = true;
  if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(key)) e.preventDefault();
  // キャラスキル E / R
  if(key === 'e') useCharSkill('e');
  if(key === 'r') useCharSkill('r');
});
document.addEventListener('keyup', e => {
  const key = (e.key || '').toLowerCase();
  if(!key) return;
  keys[key] = false;
  if(['1','2','3','4','5'].includes(e.key)) useItem(parseInt(e.key) - 1);
});

canvas.addEventListener('mousemove', e => {
  mouseX = e.offsetX * (W / canvas.clientWidth);
  mouseY = e.offsetY * (H / canvas.clientHeight);
});
canvas.addEventListener('mousedown', e => { mouseDown = true; e.preventDefault(); });
canvas.addEventListener('mouseup',   () => { mouseDown = false; });
canvas.addEventListener('touchstart', e => {
  touchActive = true;
  const t = e.touches[0], r = canvas.getBoundingClientRect();
  touchX = (t.clientX - r.left) * (W / r.width);
  touchY = (t.clientY - r.top)  * (H / r.height);
  mouseDown = true;
  e.preventDefault();
}, { passive:false });
canvas.addEventListener('touchmove', e => {
  const t = e.touches[0], r = canvas.getBoundingClientRect();
  touchX = (t.clientX - r.left) * (W / r.width);
  touchY = (t.clientY - r.top)  * (H / r.height);
  e.preventDefault();
}, { passive:false });
canvas.addEventListener('touchend', () => { touchActive = false; mouseDown = false; });

// ============================================================
// プレイヤー
// ============================================================
let player = {
  x:0, y:0, speed:280, fireRate:0.12, fireTimer:0,
  invincible:0, shield:false, rapidFire:0, spread:0,
  speedBoost:1.0, extraShots:0
};

// ============================================================
// 星初期化
// ============================================================
function initStars(){
  stars = [];
  for(let i = 0; i < 100; i++){
    stars.push({ x:Math.random()*2-1, y:Math.random()*2-1, z:Math.random()*3+0.5, b:Math.random() });
  }
}

// ============================================================
// 難易度倍率設定
// ============================================================
function setDifficultyMultipliers(){
  if(difficulty === 'easy'){
    diffMult = { playerMaxHP:1.5, playerDmg:1, enemySpeed:0.8, bulletSpeed:0.9,
                 bossHP:0.8, lives:1.5, expMult:0.25, coinMult:0.25, enemyBulletSpeed:0.5, fireRate:1 };
  } else if(difficulty === 'normal'){
    diffMult = { playerMaxHP:1, playerDmg:1, enemySpeed:1, bulletSpeed:1,
                 bossHP:1, lives:1, expMult:1, coinMult:1, enemyBulletSpeed:1, fireRate:1.2 };
  } else if(difficulty === 'hard'){
    diffMult = { playerMaxHP:0.8, playerDmg:1.0, enemySpeed:1.5, bulletSpeed:1,
                 bossHP:1.25, lives:0.5, expMult:1.25, coinMult:1.25, enemyBulletSpeed:1.15, fireRate:1.2 };
  } else if(difficulty === 'expert'){
    diffMult = { playerMaxHP:0.3, playerDmg:1.0, enemySpeed:2, bulletSpeed:1.5,
                 bossHP:2, lives:0.4, expMult:2, coinMult:2, enemyBulletSpeed:1.95, fireRate:1.5 };
  } else if(difficulty === 'nightmare'){
    diffMult = { playerMaxHP:1, playerDmg:1.0, enemySpeed:2.5, bulletSpeed:2,
                 bossHP:3.0, lives:1, expMult:5, coinMult:10, enemyBulletSpeed:2.0, fireRate:3 };
  }
}

// ============================================================
// 弾生成
// ============================================================
function spawnBullet(x, y, a, sp, enemy, col){
  const arr = enemy ? ebullets : bullets;
  if(arr.length >= 250) return;
  let sz = 3;
  if(!enemy) sz = 3 + lvl.size * 2;
  const actualSp = enemy ? sp * diffMult.enemyBulletSpeed : sp * diffMult.bulletSpeed;
  arr.push({ x, y, vx:Math.cos(a)*actualSp, vy:Math.sin(a)*actualSp, life:3, color:col||(enemy?'#ff4444':'#0cf'), size:sz });
}

// ============================================================
// 敵描画
// ============================================================
function drawEnemyShape(e){
  const sh = e.shape || 'square';
  ctx.fillStyle   = e.color || '#ff6644';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth   = 1.5;

  if(sh === 'square'){
    ctx.fillRect(-e.size/2,-e.size/2,e.size,e.size);
    ctx.strokeRect(-e.size/2,-e.size/2,e.size,e.size);
  } else if(sh === 'triangle'){
    ctx.beginPath();
    ctx.moveTo(0,-e.size/2); ctx.lineTo(e.size/2,e.size/2); ctx.lineTo(-e.size/2,e.size/2);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if(sh === 'diamond'){
    ctx.beginPath();
    ctx.moveTo(0,-e.size/2); ctx.lineTo(e.size/2,0); ctx.lineTo(0,e.size/2); ctx.lineTo(-e.size/2,0);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if(sh === 'hexagon'){
    ctx.beginPath();
    for(let i = 0; i < 6; i++){
      const a = (i/6)*Math.PI*2;
      ctx[i===0?'moveTo':'lineTo'](Math.cos(a)*e.size/2, Math.sin(a)*e.size/2);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if(sh === 'star'){
    ctx.beginPath();
    for(let i = 0; i < 10; i++){
      const a = (i/10)*Math.PI*2-Math.PI/2;
      const r = i%2===0 ? e.size/2 : e.size/4;
      ctx[i===0?'moveTo':'lineTo'](Math.cos(a)*r, Math.sin(a)*r);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(0,0,e.size/2,0,Math.PI*2); ctx.fill(); ctx.stroke();
  }

  if(e.maxHp > 1 && !e.isBoss){
    const bw = e.size * 1.6;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(-bw/2, -e.size/2-6, bw, 3);
    ctx.fillStyle = '#0f0';
    ctx.fillRect(-bw/2, -e.size/2-6, bw*(e.hp/e.maxHp), 3);
  }
}

// ============================================================
// 敵生成
// ============================================================
function spawnEnemy(t){
  let e = { x:cx+(Math.random()-0.5)*W*0.6, y:-40, hp:1, maxHp:1,
            speed:(60+Math.random()*40)*diffMult.enemySpeed, type:t,
            fireTimer:Math.random()*2, score:100, size:18, isBoss:false,
            angle:0, shape:'square', pattern:Math.floor(Math.random()*3),
            id: Math.random().toString(36).slice(2) };

  if(tutorialMode && tutorialPhase < 2){
    e.speed *= 0.5; e.hp = 1; e.maxHp = 1; e.fireTimer = 1000;
  } else if(wave < 11){
    const shapes = ['square','triangle','diamond'];
    const colors = ['#ff8833','#33ff00','#00ffff'];
    e.shape = shapes[Math.floor(Math.random()*shapes.length)];
    e.color = colors[Math.floor(Math.random()*colors.length)];
    if(t==='fast')         { e.speed=80+Math.random()*40; e.size=16; e.score=120; e.shape='triangle'; }
    else if(t==='tank')    { e.hp=2+Math.floor(wave/4); e.maxHp=e.hp; e.speed=45; e.size=24; e.score=220; e.shape='hexagon'; }
    else if(t==='shooter') { e.hp=1; e.maxHp=1; e.speed=50; e.size=20; e.score=180; e.shape='diamond'; }
    else { e.hp=1; e.maxHp=e.hp; }
  } else if(wave < 31){
    e.shape = ['triangle','diamond','hexagon'][Math.floor(Math.random()*3)];
    if(t==='purple'){ e.hp=Math.max(2,Math.floor((4+wave)*1.0)); e.maxHp=e.hp; e.speed=Math.max(50,Math.floor((80+wave)*0.85));    e.size=22; e.score=400; e.color='#9933ff'; }
    else if(t==='black'){ e.hp=Math.max(2,Math.floor((3+wave/2)*1.0)); e.maxHp=e.hp; e.speed=Math.max(60,Math.floor((100+wave*1.5)*1.0)); e.size=20; e.score=350; e.color='#333333'; }
  } else if(wave < 61){
    e.shape = ['square','star','hexagon'][Math.floor(Math.random()*3)];
    if(t==='gold')  { e.hp=Math.max(3,Math.floor((5+wave/2)*1.0)); e.maxHp=e.hp; e.speed=Math.max(70,Math.floor((120+wave*2)*1.0));  e.size=24; e.score=600; e.color='#ffdd00'; }
    else if(t==='silver'){ e.hp=Math.max(3,Math.floor((4+wave/3)*1.0)); e.maxHp=e.hp; e.speed=Math.max(65,Math.floor((110+wave*1.8)*1.0)); e.size=20; e.score=500; e.color='#cccccc'; }
    else if(t==='bronze'){ e.hp=Math.max(2,Math.floor((3+wave/4)*1.0)); e.maxHp=e.hp; e.speed=Math.max(60,Math.floor((100+wave)*1.0));    e.size=18; e.score=400; e.color='#cc8844'; }
  } else {
    e.shape = ['star','hexagon','diamond'][Math.floor(Math.random()*3)];
    if(t==='rainbow'){ e.hp=Math.max(4,Math.floor((6+wave/5)*1.0)); e.maxHp=e.hp; e.speed=Math.max(80,Math.floor((130+Math.random()*20)*1.0)); e.size=26; e.score=800; e.color='#'+Math.floor(Math.random()*16777215).toString(16); }
  }
  enemies.push(e);
}

// ============================================================
// ボス生成
// ============================================================
function spawnBoss(w){
  let hp = 80 + w * 40;
  if(w >= 30) hp = 300 + w * 100;
  hp = Math.max(27, Math.floor(hp * diffMult.bossHP));
  boss = { x:cx, y:-60, targetY:H*0.18, hp, maxHp:hp, speed:50, size:52,
           isBoss:true, fireTimer:0, phaseTimer:0, moveDir:1,
           score:2000+w*500, isMegaBoss:w>=30, shape:'hexagon', angle:0,
           id: 'boss_' + w };
  if(w >= 30){
    boss.color = ['#9933ff','#ffdd00','#ff00ff','#ff0088'][Math.min(3, Math.floor((w-30)/10))];
  } else { boss.color = '#dd0000'; }
  enemies.push(boss);
  bossActive = true;
  document.getElementById('bossHpContainer').style.display = 'flex';
  document.getElementById('bossName').textContent = `⚠ WAVE ${w} BOSS ⚠`;
  announceWave(`⚠ MEGA BOSS ⚠`);
}

// ============================================================
// パーティクル・コイン・ピース・パワーアップ生成
// ============================================================
function spawnExp(x, y, col, c){
  for(let i = 0; i < Math.min(c, 15); i++){
    if(particles.length >= MAX_P) break;
    const a = Math.random()*Math.PI*2, sp = 50+Math.random()*180;
    particles.push({ x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, life:0.5+Math.random()*0.5, maxLife:1, color:col, size:2+Math.random()*3 });
  }
}

function spawnCoin(x, y, isMedal){
  coins_obj.push({ x, y, vy:-30-Math.random()*40, vx:(Math.random()-0.5)*60, life:10, size:10, bobPhase:Math.random()*Math.PI*2, value:isMedal?1:10, isMedal });
}

function spawnPiece(x, y){
  coins_obj.push({ x, y, vy:-30-Math.random()*40, vx:(Math.random()-0.5)*60, life:10, size:10, bobPhase:Math.random()*Math.PI*2, value:10, isPiece:true });
}

function spawnPowerup(x, y){
  if(tutorialMode) return;
  const baseChance = difficulty === 'nightmare' ? 0.9 : 0.25;
  if(Math.random() > (1 - (1 - baseChance) + bonusItemDropRate)) return;
  const t = ITEMS[Math.floor(Math.random() * ITEMS.length)];
  powerups.push({ x, y, vy:40, type:t, life:10, size:18, bobPhase:Math.random()*Math.PI*2 });
}

// ============================================================
// コンボ・オーブ・ダメージ
// ============================================================
function addCombo(){
  combo++;
  comboTimer = lvl.comboT;
  if(combo > maxCombo) maxCombo = combo;
  const el = document.getElementById('comboDisplay');
  el.textContent = `${combo}x COMBO!`;
  el.style.display = 'block';
}

function resetCombo(){
  if(bonusComboNeverReset) return;
  combo = 0;
  document.getElementById('comboDisplay').style.display = 'none';
}

function addOrbs(a){
  const diff_inc = 1 + (moveLevel - 1) * 0.05;
  let amount = a * diffMult.expMult / diff_inc;
  orbs += amount;
  updateMissionProgress('piece', a);
  if(orbs >= orbsTarget) moveLevelUp();
  updateHUD();
}

function moveLevelUp(){
  moveLevel++;
  orbs = 0;
  orbsTarget += 3;
  playerMaxHP += 10;
  if(difficulty !== 'nightmare') playerHP = playerMaxHP;
  livesCurrent += 5;
  livesMax     += 5;
  lvl.speed += 0.05;
  lvl.fire  += 0.05;
  lvl.size  += 0.05;
  lvl.comboT += difficulty === 'nightmare' ? 0.15 : 0.3;
  lvl.dmg   += 0.3;
  damageMultiplier = lvl.dmg;

  if(moveLevel === 2) lvl.shots = 2;
  else if(moveLevel === 3) lvl.shots = 3;
  else if(moveLevel === 5) playerMaxHP = Math.max(playerMaxHP, 150);
  else if(moveLevel === 6) lvl.shots = 3;

  const fl = document.getElementById('levelUpFlash');
  fl.style.opacity = '1';
  setTimeout(() => fl.style.opacity = '0', 400);

  const pop = document.getElementById('levelUpPopup');
  document.getElementById('levelUpTitle').textContent = `ムーブ ${moveLevel}!`;
  document.getElementById('levelUpDesc').textContent  =
    `SPEED+0.05 FIRE+0.05 SIZE+0.05 DMG+0.3${difficulty==='nightmare'?' (HP回復なし)':''}`;
  pop.style.opacity = '1';
  setTimeout(() => pop.style.opacity = '0', 3000);
  updateHUD();
}

function damagePlayer(d){
  if(player.invincible > 0) return;
  if(difficulty === 'nightmare') playerHP = 0;
  else playerHP = Math.max(0, playerHP - d);
  player.invincible = 0.5;
  const fl = document.getElementById('dmgFlash');
  fl.style.opacity = '1';
  setTimeout(() => fl.style.opacity = '0', 120);
  if(playerHP <= 0) gameOver();
  updateHUD();
}

// ============================================================
// アナウンス・チュートリアルTIP
// ============================================================
function announceWave(t){
  const el = document.getElementById('waveAnnounce');
  el.textContent = t;
  el.style.opacity = '1';
  setTimeout(() => el.style.opacity = '0', 2000);
}

function showTutorialTip(title, text){
  const box = document.getElementById('tutorialTipBox');
  document.getElementById('tipTitle').textContent = title;
  document.getElementById('tipText').textContent  = text;
  box.style.display = 'block';
  setTimeout(() => box.style.display = 'none', 4000);
}

// ============================================================
// 描画関数
// ============================================================
function drawTunnel(){
  const d = 25, t = zOffset % 1;
  for(let i = 0; i < d; i++){
    const z = (i+t)/d, sc = 1/(z*4+0.2);
    const baseY = cy-(cy*0.8)*(1-z);
    const screenY = cy+(baseY-cy)*(1+(z-0.5)*0.4);
    const w = W*sc*0.5;
    const alpha = (1-z)*0.15;
    ctx.strokeStyle = `rgba(0,180,255,${alpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx-w, screenY);
    ctx.lineTo(cx+w, screenY);
    ctx.stroke();
  }
}

function drawStars(){
  for(const s of stars){
    s.z -= dt * 1.5;
    if(s.z <= 0.1){ s.z = 3+Math.random(); s.x = Math.random()*2-1; s.y = Math.random()*2-1; s.b = Math.random(); }
    const sc = 1/s.z;
    const sx = cx + s.x*W*sc*0.3;
    const sy = cy + (s.y*H*sc*0.3)*(1+(1/s.z-0.3)*0.3);
    if(sx<0||sx>W||sy<0||sy>H) continue;
    const sz    = Math.max(0.5, (1/s.z)*1.5);
    const alpha = Math.min(1, (3-s.z)/2) * s.b;
    ctx.fillStyle = `rgba(200,220,255,${alpha})`;
    ctx.beginPath(); ctx.arc(sx, sy, sz, 0, Math.PI*2); ctx.fill();
  }
}

function drawPlayer(){
  const px = player.x, py = player.y;
  ctx.save();
  ctx.translate(px, py);
  const glowR = 20 + Math.sin(Date.now()*0.01)*5;
  const grd = ctx.createRadialGradient(0,12,2,0,12,glowR);
  grd.addColorStop(0,'rgba(0,200,255,0.7)');
  grd.addColorStop(0.5,'rgba(0,100,255,0.2)');
  grd.addColorStop(1,'rgba(0,50,200,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(-glowR, 12-glowR, glowR*2, glowR*2);
  const shipSz = 22;
  ctx.fillStyle   = '#0cf';
  ctx.strokeStyle = '#0af';
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.moveTo(0,-shipSz);
  ctx.lineTo(-shipSz*0.7, shipSz*0.7);
  ctx.lineTo(-shipSz*0.3, shipSz*0.4);
  ctx.lineTo(0, shipSz*0.6);
  ctx.lineTo(shipSz*0.3, shipSz*0.4);
  ctx.lineTo(shipSz*0.7, shipSz*0.7);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(0,-5,4,0,Math.PI*2); ctx.fill();
  if(player.shield && player.invincible > 0){
    ctx.strokeStyle = `rgba(0,255,200,${0.5+Math.sin(Date.now()*0.01)*0.3})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0,0,30,0,Math.PI*2); ctx.stroke();
  }
  if(player.invincible > 0 && !player.shield) ctx.globalAlpha = 0.4+Math.sin(Date.now()*0.02)*0.3;
  ctx.restore();
}

function drawEnemy(e){
  ctx.save();
  ctx.translate(e.x, e.y);
  e.angle = (e.angle||0) + dt*2;
  if(e.isBoss){
    const pls = Math.sin(Date.now()*0.003)*5;
    const aura = ctx.createRadialGradient(0,0,e.size*0.5,0,0,e.size+25+pls);
    aura.addColorStop(0,'rgba(255,0,0,0.2)');
    aura.addColorStop(1,'rgba(255,0,0,0)');
    ctx.fillStyle = aura;
    ctx.fillRect(-e.size-35,-e.size-35,(e.size+35)*2,(e.size+35)*2);
  }
  // デバフ表示
  if(enemyDebuffs.has(e.id)){
    ctx.strokeStyle = 'rgba(100,100,255,0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4,4]);
    ctx.beginPath(); ctx.arc(0,0,e.size*0.7,0,Math.PI*2); ctx.stroke();
    ctx.setLineDash([]);
  }
  drawEnemyShape(e);
  ctx.restore();
}

function drawBullet(b){
  // マジック弾は時間で成長
  let sz = b.size;
  if(b.magic && b.spawnTime){
    const elapsed = (performance.now() - b.spawnTime) / 1000;
    const growth  = 1 + elapsed * (b.growthPerSecond || 0.1) * 10;
    sz = b.size * growth;
    b.vx *= 1 + (b.growthPerSecond || 0.1) * dt;
    b.vy *= 1 + (b.growthPerSecond || 0.1) * dt;
  }
  ctx.fillStyle   = b.color;
  ctx.shadowColor = b.color;
  ctx.shadowBlur  = 6;
  ctx.beginPath(); ctx.arc(b.x, b.y, sz, 0, Math.PI*2); ctx.fill();
  ctx.shadowBlur  = 0;
}

function drawCoin(c){
  const bob = Math.sin(c.bobPhase + Date.now()*0.005)*3;
  ctx.save();
  ctx.translate(c.x, c.y+bob);
  if(c.isMedal){
    ctx.fillStyle = '#c0c0c0'; ctx.shadowColor = '#c0c0c0'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(0,0,c.size*0.8,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#aaa';
    ctx.beginPath(); ctx.arc(-2,-2,c.size*0.4,0,Math.PI*2); ctx.fill();
  } else if(c.isPiece){
    ctx.fillStyle = '#ff69b4'; ctx.shadowColor = '#ff69b4'; ctx.shadowBlur = 6;
    ctx.beginPath();
    for(let i = 0; i < 4; i++){
      const a = (i/4)*Math.PI*2-Math.PI/4;
      const r = i%2===0 ? c.size*0.8 : c.size*0.4;
      ctx[i===0?'moveTo':'lineTo'](Math.cos(a)*r, Math.sin(a)*r);
    }
    ctx.closePath(); ctx.fill();
  } else {
    ctx.fillStyle = '#ffd700'; ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(0,0,c.size*0.7,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.font = 'bold 8px Orbitron';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('¢', 0, 1);
  }
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawPowerup(p){
  const bob = Math.sin(p.bobPhase + Date.now()*0.004)*4;
  ctx.save();
  ctx.translate(p.x, p.y+bob);
  ctx.fillStyle   = 'rgba(0,255,200,0.2)';
  ctx.beginPath(); ctx.arc(0,0,p.size+4,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle = 'rgba(0,255,200,0.7)';
  ctx.lineWidth   = 2;
  ctx.stroke();
  ctx.font = `bold ${p.size*1.4}px serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.fillText(p.type.emoji, 0, 1);
  ctx.restore();
}

function drawParticle(p){
  const alpha = p.life / p.maxLife;
  ctx.globalAlpha = alpha;
  ctx.fillStyle   = p.color;
  ctx.beginPath(); ctx.arc(p.x, p.y, p.size*alpha, 0, Math.PI*2); ctx.fill();
  ctx.globalAlpha = 1;
}

function drawTrap(t){
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.strokeStyle = '#ff8800';
  ctx.lineWidth   = 2;
  ctx.globalAlpha = 0.6 + Math.sin(Date.now()*0.01)*0.2;
  ctx.beginPath(); ctx.arc(0,0,t.size,0,Math.PI*2); ctx.stroke();
  ctx.font = '16px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('⚠️', 0, 0);
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawMagnet(m){
  ctx.save();
  ctx.translate(m.x, m.y);
  const alpha = Math.min(1, m.life / 2) * 0.4;
  ctx.fillStyle = `rgba(255,136,0,${alpha})`;
  ctx.beginPath(); ctx.arc(0,0,m.radius,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle = `rgba(255,136,0,${alpha*2})`;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.font = '20px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.globalAlpha = Math.min(1, m.life);
  ctx.fillText('🧲', 0, 0);
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawBigBomb(b){
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.font = `${b.size*2}px serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('💣', 0, 0);
  ctx.restore();
}

// ============================================================
// ゲームループ
// ============================================================
function update(){
  if(!gameRunning) return;
  zOffset += dt * 3;

  // スキルクールダウン更新
  tickSkillCooldowns(dt);
  updateCharSkillUI();

  // 移動
  let dx = 0, dy = 0;
  if(keys['a']||keys['arrowleft'])  dx = -1;
  if(keys['d']||keys['arrowright']) dx =  1;
  if(keys['w']||keys['arrowup'])    dy = -1;
  if(keys['s']||keys['arrowdown'])  dy =  1;
  if(touchActive){
    const tdx = touchX-player.x, tdy = touchY-player.y, dist = Math.sqrt(tdx*tdx+tdy*tdy);
    if(dist > 10){ dx = tdx/dist; dy = tdy/dist; }
  }
  if(dx||dy){
    const len = Math.sqrt(dx*dx+dy*dy);
    const spd = player.speed * lvl.speed * (player.speedBoost || 1.0);
    player.x += (dx/len)*spd*dt;
    player.y += (dy/len)*spd*dt;
  }
  player.x = Math.max(25, Math.min(W-25, player.x));
  player.y = Math.max(25, Math.min(H-25, player.y));

  // 射撃
  let fireRate = player.fireRate / lvl.fire / diffMult.fireRate / fireRateMultiplier;
  if(player.rapidFire > 0) fireRate *= 0.4;
  player.fireTimer -= dt;
  const totalShots = lvl.shots + (player.extraShots || 0);
  if((keys[' '] || mouseDown) && player.fireTimer <= 0){
    player.fireTimer = fireRate;
    if(totalShots === 1){
      spawnBullet(player.x, player.y-24, -Math.PI/2, 650, false);
    } else if(totalShots === 2){
      spawnBullet(player.x-7,  player.y-24, -Math.PI/2,      650, false);
      spawnBullet(player.x+7,  player.y-24, -Math.PI/2,      650, false);
    } else if(totalShots >= 3){
      spawnBullet(player.x-12, player.y-24, -Math.PI/2-0.35, 630, false);
      spawnBullet(player.x,    player.y-24, -Math.PI/2,      650, false);
      spawnBullet(player.x+12, player.y-24, -Math.PI/2+0.35, 630, false);
      if(totalShots >= 4) spawnBullet(player.x-20, player.y-24, -Math.PI/2-0.6, 610, false);
      if(totalShots >= 5) spawnBullet(player.x+20, player.y-24, -Math.PI/2+0.6, 610, false);
    }
    if(player.spread > 0){
      spawnBullet(player.x, player.y-24, -Math.PI/2-0.25, 600, false);
      spawnBullet(player.x, player.y-24, -Math.PI/2+0.25, 600, false);
    }
  }

  if(player.invincible > 0) player.invincible -= dt;
  if(player.rapidFire  > 0) player.rapidFire  -= dt;
  if(player.spread     > 0) player.spread     -= dt;
  if(player.invincible <= 0) player.shield = false;
  if(comboTimer > 0){ comboTimer -= dt; if(comboTimer <= 0) resetCombo(); }
  if(dropUpActive > 0) dropUpActive -= dt;

  // ウェーブ管理
  waveTimer -= dt;
  const bossTrig = wave % 10 === 0;
  if(!bossActive && waveTimer <= 0 && enemies.length < (tutorialMode ? 3 : 12 + Math.floor(wave*0.5))){
    const cnt = tutorialMode ? 2 : 3 + Math.floor(wave*1.3);
    if(enemiesInWave < cnt){
      let types;
      if(tutorialMode)    types = ['basic'];
      else if(wave < 11)  types = ['basic','fast','tank','shooter'];
      else if(wave < 31)  types = ['purple','black'];
      else if(wave < 61)  types = ['gold','silver','bronze'];
      else                types = ['rainbow'];
      spawnEnemy(types[Math.floor(Math.random()*types.length)]);
      enemiesInWave++;
      waveTimer = tutorialMode ? 0.8 : 0.5-Math.min(0.3, wave*0.01);
    } else if(enemies.length === 0){
      if(bossTrig) spawnBoss(wave);
      else { wave++; enemiesInWave = 0; announceWave(tutorialMode ? `敵撃破: ${tutorialKills}/20` : `WAVE ${wave}`); waveTimer = 1; }
    }
  }

  // 自弾更新
  bullets = bullets.filter(b => {
    if(b.homing){
      if(!b.target || b.target.hp <= 0) b.target = enemies.find(e => !e.isBoss && e.hp > 0);
      if(b.target){
        const ddx = b.target.x-b.x, ddy = b.target.y-b.y, dist = Math.hypot(ddx, ddy);
        if(dist > 10){ b.vx = ddx/dist*550; b.vy = ddy/dist*550; }
      }
    }
    b.x += b.vx*dt; b.y += b.vy*dt; b.life -= dt;
    return b.life > 0 && b.y > -30 && b.y < H+30 && b.x > -30 && b.x < W+30;
  });

  // 敵弾更新
  ebullets = ebullets.filter(b => {
    b.x += b.vx*dt; b.y += b.vy*dt; b.life -= dt;
    const pdx = b.x-player.x, pdy = b.y-player.y;
    if(Math.sqrt(pdx*pdx+pdy*pdy) < 16){ damagePlayer(10); return false; }
    return b.life > 0 && b.y > -30 && b.y < H+50 && b.x > -30 && b.x < W+30;
  });

  // トラップ更新
  traps = traps.filter(t => {
    t.life -= dt;
    enemies.forEach(e => {
      const d = Math.hypot(e.x - t.x, e.y - t.y);
      if(d < t.size + e.size * 0.6){
        e.hp -= t.damage * dt;
        spawnExp(e.x, e.y, '#ff8800', 1);
      }
    });
    return t.life > 0;
  });

  // マグネ更新
  magnets = magnets.filter(m => {
    m.life -= dt;
    m.angle = (m.angle || 0) + dt * 3;
    enemies.forEach(e => {
      if(e.isBoss) return;
      const dx = m.x - e.x, dy = m.y - e.y;
      const dist = Math.hypot(dx, dy);
      if(dist < m.radius){
        e.x += (dx / dist) * 80 * dt;
        e.y += (dy / dist) * 80 * dt;
      }
    });
    return m.life > 0;
  });

  // ビッグボム更新
  bigBombs = bigBombs.filter(b => {
    const dx = b.tx - b.x, dy = b.ty - b.y;
    const dist = Math.hypot(dx, dy);
    if(dist < b.speed * dt){
      // 爆発
      spawnExp(b.x, b.y, '#ff6600', 20);
      enemies.forEach(e => {
        if(Math.hypot(e.x - b.x, e.y - b.y) < 80){
          e.hp -= b.damage;
          spawnExp(e.x, e.y, '#ff4400', 5);
        }
      });
      // 波状弾
      for(let i = 0; i < 12; i++){
        const a = (i / 12) * Math.PI * 2;
        bullets.push({ x:b.x, y:b.y, vx:Math.cos(a)*350, vy:Math.sin(a)*350, life:2, color:'#ff6600', size:5 });
      }
      b.life = 0;
    } else {
      b.x += (dx / dist) * b.speed * dt;
      b.y += (dy / dist) * b.speed * dt;
    }
    b.life -= dt;
    return b.life > 0;
  });

  // 敵更新
  enemies = enemies.filter(e => {
    // デバフ適用
    const debuff = enemyDebuffs.get(e.id);
    if(debuff){
      debuff.timer -= dt;
      if(debuff.timer <= 0) enemyDebuffs.delete(e.id);
    }
    const speedMult = debuff ? (debuff.speedMult || 1) : 1;

    if(e.isBoss){
      if(e.y < e.targetY) e.y += e.speed * speedMult * dt;
      else { e.x += Math.sin(Date.now()*0.001)*90*dt*e.moveDir; if(e.x < W*0.12) e.moveDir=1; if(e.x > W*0.88) e.moveDir=-1; }
      e.fireTimer  -= dt;
      e.phaseTimer  = (e.phaseTimer||0) + dt;
      if(e.fireTimer <= 0){
        const patt = Math.floor(e.phaseTimer/2.5) % 4;
        if(patt === 0){ for(let i=-4;i<=4;i++) spawnBullet(e.x,e.y+e.size,Math.PI/2+i*0.12,220,true,'#ff4400'); e.fireTimer=0.5; }
        else if(patt===1){ const a=Math.atan2(player.y-e.y,player.x-e.x); for(let i=-2;i<=2;i++) spawnBullet(e.x,e.y+e.size,a+i*0.15,300,true,'#ff00ff'); e.fireTimer=0.4; }
        else if(patt===2){ const a=e.phaseTimer*2.5; spawnBullet(e.x,e.y,a,200,true,'#ffff00'); spawnBullet(e.x,e.y,a+Math.PI,200,true,'#ffff00'); e.fireTimer=0.1; }
        else { for(let i=0;i<10;i++){ const a=(i/10)*Math.PI*2; spawnBullet(e.x,e.y+e.size/2,a,180,true,'#ff88ff'); } e.fireTimer=0.8; }
        if(e.isMegaBoss){ for(let i=0;i<20;i++){ const a=(i/20)*Math.PI*2; spawnBullet(e.x,e.y+e.size,a,300,true,'#ff00aa'); } }
      }
    } else {
      e.y += e.speed * speedMult * dt;
      e.fireTimer = (e.fireTimer||0) - dt;
      const fireChance = tutorialMode ? 0 : wave<11 ? 0.12 : wave<31 ? 0.22 : wave<61 ? 0.32 : 0.38;
      const attackMult = debuff ? (debuff.attackMult || 1) : 1;
      if(e.fireTimer <= 0 && Math.random() < fireChance){
        const patt = e.pattern || 0;
        if(patt === 0){ const a=Math.atan2(player.y-e.y,player.x-e.x); spawnBullet(e.x,e.y,a,190 * attackMult,true); }
        else if(patt===1){ for(let i=-1;i<=1;i++) spawnBullet(e.x,e.y,Math.PI/2+i*0.2,170 * attackMult,true,'#ffaa00'); }
        else { const a=Math.atan2(player.y-e.y,player.x-e.x); for(let i=0;i<3;i++) spawnBullet(e.x,e.y,a+(i-1)*0.15,210 * attackMult,true,'#ff00ff'); }
        e.fireTimer = 1.4 - Math.min(0.7, wave*0.04);
      }
    }

    // 弾ヒット判定
    for(let i = bullets.length-1; i >= 0; i--){
      const b = bullets[i];
      const ddx = b.x-e.x, ddy = b.y-e.y;
      const hitRadius = b.explosion ? (b.explosionRadius || 60) : e.size*0.6+b.size;
      if(Math.sqrt(ddx*ddx+ddy*ddy) < e.size*0.6+b.size){
        const baseDmg = lvl.dmg * diffMult.playerDmg * (b.damageMult || 1);
        e.hp -= baseDmg;
        bullets.splice(i, 1);
        spawnExp(b.x, b.y, '#0cf', 4);
        updateMissionProgress('damage', baseDmg);

        // ノックバック
        if(b.knockback){
          const angle = Math.atan2(e.y - b.y, e.x - b.x);
          e.x += Math.cos(angle) * 60;
          e.y += Math.sin(angle) * 60;
        }
        // 弱化
        if(b.weaken && !e.isBoss){
          enemyDebuffs.set(e.id, { attackMult: b.weakenMult || 0.5, speedMult:1, timer:5 });
        }
        // ソフト弾
        if(b.soft && !e.isBoss){
          const sm = b.statMult || 0.9;
          enemyDebuffs.set(e.id, { attackMult: sm, speedMult: sm, timer:5 });
        }
        // マグネ
        if(b.magnet){
          magnets.push({ x:e.x, y:e.y, radius: b.magnetRadius || 80, life: b.magnetDuration || 5, angle:0 });
        }
        // 爆発弾
        if(b.explosion){
          const exr = b.explosionRadius || 60;
          enemies.forEach(te => {
            if(te === e) return;
            if(Math.hypot(te.x - e.x, te.y - e.y) < exr){
              te.hp -= baseDmg * (b.explosionDamageMult || 2.0);
              spawnExp(te.x, te.y, '#ffdd00', 5);
            }
          });
          ebullets = ebullets.filter(eb => Math.hypot(eb.x - e.x, eb.y - e.y) >= exr);
          spawnExp(e.x, e.y, '#ffdd00', 10);
        }

        if(e.hp <= 0){
          spawnExp(e.x, e.y, e.isBoss ? '#ff6600' : '#ffaa00', e.isBoss ? 25 : 8);
          const cMult  = 1 + combo*0.15;
          score += Math.floor((e.score||100) * cMult);
          addCombo();
          const coinCnt  = e.isBoss ? 15 : (e.type==='tank' ? 4 : 2);
          const medalCnt = e.isBoss ? 5  : (e.type==='tank' ? 2 : 1);
          const pieceCnt = e.isBoss ? 20 : (e.type==='tank' ? 8 : 4);
          for(let c=0; c<coinCnt;  c++) spawnCoin(e.x+(Math.random()-0.5)*40, e.y, false);
          for(let c=0; c<medalCnt; c++) spawnCoin(e.x+(Math.random()-0.5)*40, e.y, true);
          for(let c=0; c<pieceCnt; c++) spawnPiece(e.x+(Math.random()-0.5)*40, e.y);
          if(!tutorialMode && (e.isBoss || Math.random() < 0.28*(1+dropUpActive*0.1))) spawnPowerup(e.x, e.y);
          if(e.isBoss){ bossActive=false; boss=null; document.getElementById('bossHpContainer').style.display='none'; wave++; enemiesInWave=0; announceWave(`WAVE ${wave}`); waveTimer=1.5; }
          enemyDebuffs.delete(e.id);
          addOrbs(e.isBoss ? 5 : 1);
          if(tutorialMode) tutorialKills++;
          enemiesKilled++;
          updateMissionProgress('enemy', 1);
          // キャラEXP付与（敵撃破で少し入る）
          addCharExp(charData.selectedCharId, 3);
          return false;
        }
        break;
      }
    }

    // プレイヤーとの当たり判定
    if(!e.isBoss || e.y >= e.targetY){
      const pdx = e.x-player.x, pdy = e.y-player.y;
      if(Math.sqrt(pdx*pdx+pdy*pdy) < e.size+12) damagePlayer(e.isBoss ? 28 : 18);
    }

    // 画面外逃走
    if(!e.isBoss && e.y > H+60){
      if(difficulty === 'nightmare'){ playerHP = 0; gameOver(); return false; }
      else if(difficulty === 'expert') livesCurrent = Math.max(0, livesCurrent-15);
      else if(difficulty === 'hard')   livesCurrent = Math.max(0, livesCurrent-12);
      else                             livesCurrent = Math.max(0, livesCurrent-10);
      if(livesCurrent <= 0) gameOver();
      return false;
    }
    return true;
  });

  // コイン・メダル・ピース収集
  coins_obj = coins_obj.filter(c => {
    c.x += c.vx*dt; c.y += c.vy*dt; c.vy += 120*dt; c.life -= dt;
    const dx = player.x-c.x, dy = player.y-c.y, dist = Math.sqrt(dx*dx+dy*dy);
    if(dist < 400){ c.x += (dx/dist)*700*dt; c.y += (dy/dist)*700*dt; }
    if(dist < 30){
      if(c.isMedal){
        const mVal = Math.floor((c.value||1) * bonusMedalMult);
        gameMedals += mVal;
        updateMissionProgress('medal', mVal);
      } else if(c.isPiece){
        pieces += c.value;
        score  += Math.floor(c.value*5*(1+combo*0.05));
        updateMissionProgress('piece', c.value);
      } else {
        const coinVal = Math.floor(c.value * bonusCoinMult);
        gameCoins += coinVal;
        score     += Math.floor(coinVal*12*(1+combo*0.1));
        updateMissionProgress('coin', coinVal);
      }
      return false;
    }
    return c.life > 0;
  });

  // パワーアップ収集
  powerups = powerups.filter(p => {
    p.y += p.vy*dt; p.life -= dt;
    const dx = p.x-player.x, dy = p.y-player.y;
    if(Math.sqrt(dx*dx+dy*dy) < 35){
      const es = items.indexOf(null);
      if(es >= 0){ items[es] = p.type; updateItemUI(); }
      return false;
    }
    return p.life > 0 && p.y < H+40;
  });

  // パーティクル更新
  particles = particles.filter(p => {
    p.x += p.vx*dt; p.y += p.vy*dt; p.life -= dt;
    return p.life > 0;
  });

  updateHUD();
  document.getElementById('skillIndicator').style.opacity = '0';

  // チュートリアル進行
  if(tutorialMode){
    document.getElementById('tutorialKillCount').textContent = tutorialKills;
    if(tutorialPhase === 0 && tutorialKills >= 2){
      tutorialPhase = 1;
      showTutorialTip('📖 移動成功!','ピースを集めると右下のスキルが使えます。コインとメダルはゲーム終了後に保存されます。');
    }
    if(tutorialPhase === 1 && tutorialKills >= 5){
      tutorialPhase = 2;
      showTutorialTip('💥 スキルを使ってみよう!','E・Rキーでキャラスキルが使えます。ピースを消費するので注意！');
    }
    if(tutorialKills >= 20) endTutorialSuccess();
  }
}

function render(){
  ctx.clearRect(0, 0, W, H);
  const bg = ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,'#000510');
  bg.addColorStop(0.5,'#000a18');
  bg.addColorStop(1,'#001030');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  drawStars(); drawTunnel();
  magnets.forEach(drawMagnet);
  traps.forEach(drawTrap);
  coins_obj.forEach(drawCoin);
  powerups.forEach(drawPowerup);
  bullets.forEach(drawBullet);
  ebullets.forEach(drawBullet);
  bigBombs.forEach(drawBigBomb);
  enemies.forEach(drawEnemy);
  particles.forEach(drawParticle);
  if(gameRunning) drawPlayer();
}

function gameLoop(time){
  dt = Math.min(0.033, (time - lastTime) / 1000);
  lastTime = time;
  update();
  render();
  requestAnimationFrame(gameLoop);
}

// ============================================================
// ゲーム開始
// ============================================================
function startGame(){
  score=0; gameCoins=0; gameMedals=0; pieces=0; combo=0; comboTimer=0; maxCombo=0;
  wave=1; waveTimer=1; enemiesInWave=0;
  playerMaxHP   = 100 * diffMult.playerMaxHP;
  playerHP      = playerMaxHP;
  livesMax      = 50 * diffMult.lives;
  livesCurrent  = livesMax;
  moveLevel=1; orbs=0; orbsTarget=30; dropUpActive=0;
  bossActive=false; boss=null;
  skillUses=0; itemUses=0; enemiesKilled=0;
  bullets=[]; enemies=[]; particles=[]; coins_obj=[]; powerups=[]; ebullets=[];
  traps=[]; bigBombs=[]; magnets=[];
  enemyDebuffs.clear();
  items = [
    ITEMS.find(i => i.id==='bomb'),
    ITEMS.find(i => i.id==='heal'),
    ITEMS.find(i => i.id==='heal'),
    null, null
  ];
  lvl = { speed:1, fire:1, size:1, shots:1, hp:0, comboT:3, dmg:1 };
  damageMultiplier  = 1;
  fireRateMultiplier = 1;
  finalExpMult=1; finalCoinMult=1; finalMedalMult=1;
  player = {
    x:cx, y:H*0.78, speed:280, fireRate:0.12, fireTimer:0,
    invincible:0, shield:false, rapidFire:0, spread:0,
    speedBoost:1.0, extraShots:0
  };
  // speedBoost用のタイマーが残っていても上書きされるよう念のためクリア
  if(window._speedBoostTimer)  { clearTimeout(window._speedBoostTimer);  window._speedBoostTimer  = null; }
  if(window._extraShotsTimer)  { clearTimeout(window._extraShotsTimer);  window._extraShotsTimer  = null; }

  resetSkillTimers();
  applyBonuses();
  initStars();
  updateItemUI();
  updateHUD();
  updateCharSkillUI();

  document.getElementById('homeScreen').style.display       = 'none';
  document.getElementById('shopScreen').style.display       = 'none';
  document.getElementById('difficultySelect').style.display = 'none';
  document.getElementById('gameOverScreen').style.display   = 'none';
  document.getElementById('inGameHUD').style.display        = 'flex';
  document.getElementById('inGameHUDRight').style.display   = 'flex';
  document.getElementById('itemSlots').style.display        = 'flex';
  document.getElementById('skillBar').style.display         = 'flex';
  document.getElementById('bossHpContainer').style.display  = 'none';
  document.getElementById('levelUpPopup').style.opacity     = '0';
  document.getElementById('activeEffects').innerHTML        = '';

  gameRunning = true;
  if(tutorialMode) showTutorialTip('【TUTORIAL】敵を倒す','敵を射撃して倒してみよう！スペースキーまたはマウスクリックで射撃できます。');
  announceWave(tutorialMode ? 'TUTORIAL START!' : 'WAVE 1 START!');
}

// ============================================================
// チュートリアル
// ============================================================
function startTutorial(){
  tutorialMode=true; tutorialKills=0; tutorialPhase=0;
  document.getElementById('tutorialOverlay').style.display = 'none';
  difficulty = 'normal';
  setDifficultyMultipliers();
  startGame();
}

function endTutorialSuccess(){
  if(tutorialMode){
    tutorialMode = false;
    gameRunning  = false;
    document.getElementById('gameOverScreen').style.display = 'flex';
    document.getElementById('gameOverTitle').textContent    = 'TUTORIAL SUCCESS!';
    document.getElementById('finalScore').textContent       = `敵撃破数: ${tutorialKills}`;
    document.getElementById('finalStats').textContent       = '基本操作をマスターしました！もう本ゲームをプレイできます。';
    setTimeout(() => {
      document.getElementById('gameOverTitle').style.opacity   = '1';
      document.getElementById('finalScore').style.opacity      = '1';
      document.getElementById('finalStats').style.opacity      = '1';
      document.getElementById('gameOverButtons').style.opacity = '1';
    }, 100);
  }
}

// ============================================================
// ゲームオーバー
// ============================================================
function gameOver(){
  gameRunning = false;

  if(!tutorialMode){
    const levelMult    = getScoreMultiplier();
    const charMult     = getCharScoreMult();
    const totalMult    = levelMult * charMult;
    const baseScore    = Math.floor(score);
    const bonusScore   = Math.floor(baseScore * totalMult) - baseScore;
    const finalScore   = Math.floor(baseScore * totalMult);

    if(finalScore > playerData.highScore) playerData.highScore = finalScore;
    playerData.coins  += gameCoins;
    playerData.medals += gameMedals;

    const baseExp  = calculateGameExp();
    const finalExp = Math.floor(baseExp * bonusExpMult);
    finalExpGained = finalExp;
    addPlayerExp(finalExp);
    // キャラEXPもゲーム終了時に付与（EXPの1/3）
    addCharExp(charData.selectedCharId, Math.floor(finalExp / 3));
    addToRankings(score);

    document.getElementById('totalScore').textContent    = `SCORE: ${finalScore.toLocaleString()}`;
    document.getElementById('baseScoreText').textContent = baseScore.toLocaleString();

    const char = getSelectedChar();
    const charState = getCharState(char.id);
    let multDetail = `×${levelMult.toFixed(2)}（LV補正）× ${charMult.toFixed(2)}（${char.name} LV${charState.level}補正）`;
    document.getElementById('bonusMultText').textContent  = multDetail;
    document.getElementById('bonusScoreText').textContent = `+${bonusScore.toLocaleString()}`;
    document.getElementById('baseScoreText').parentElement.style.display  = 'block';
    document.getElementById('bonusMultText').parentElement.style.display  = 'block';
    document.getElementById('bonusScoreText').parentElement.style.display = 'block';

    let expText = `獲得EXP: ${finalExp.toLocaleString()}`;
    document.getElementById('expDisplay').textContent = expText;

    let coinText  = `+${gameCoins.toLocaleString()}🪙`;
    let medalText = `+${gameMedals.toLocaleString()}🔘`;

    showGameOverRanking();
    document.getElementById('gameOverRanking').style.display = 'block';
    document.getElementById('finalStats').textContent =
      `${coinText} | ${medalText} | ムーブ${moveLevel} | WAVE${wave} | ${maxCombo}xCOMBO`;

    document.getElementById('goNickname').textContent   = playerData.nickname;
    document.getElementById('goLevelText').textContent  = `LV ${playerData.level}`;
    document.getElementById('goExpBar').style.width     = `${(playerData.exp % EXP_PER_LEVEL) / EXP_PER_LEVEL * 100}%`;
    document.getElementById('goHS').textContent         = playerData.highScore.toLocaleString();
    document.getElementById('goCoinCount').textContent  = playerData.coins.toLocaleString();
    document.getElementById('goMedalCount').textContent = playerData.medals.toLocaleString();
    const goVoidol = document.getElementById('goVoidolCount');
    if(goVoidol) goVoidol.textContent = playerData.voidols.toLocaleString();
  }

  savePlayerData();
  saveCharData();

  if(!tutorialMode && currentUser){
    const _finalScore = Math.floor(score * getScoreMultiplier() * getCharScoreMult());
    syncPlayerDataToCloud();
    saveOnlineRanking(_finalScore);
  }

  document.getElementById('gameOverScreen').style.display  = 'flex';
  document.getElementById('gameOverTitle').style.opacity   = '0';
  document.getElementById('finalScore').style.opacity      = '0';
  document.getElementById('gameOverRanking').style.opacity = '0';
  document.getElementById('finalStats').style.opacity      = '0';
  document.getElementById('gameOverButtons').style.opacity = '0';

  if(tutorialMode){
    document.getElementById('gameOverTitle').textContent   = 'GAME OVER';
    document.getElementById('totalScore').textContent      = `敵撃破数: ${tutorialKills} / 20`;
    document.getElementById('baseScoreText').parentElement.style.display  = 'none';
    document.getElementById('bonusMultText').parentElement.style.display  = 'none';
    document.getElementById('bonusScoreText').parentElement.style.display = 'none';
    document.getElementById('expDisplay').textContent = '';
    document.getElementById('finalStats').textContent = '基本操作をマスターしました！もう本ゲームをプレイできます。';
    document.getElementById('gameOverRanking').style.display = 'none';
  }

  setTimeout(() => document.getElementById('gameOverTitle').style.opacity   = '1', 100);
  setTimeout(() => document.getElementById('finalScore').style.opacity      = '1', 600);
  setTimeout(() => document.getElementById('gameOverRanking').style.opacity = '1', 1100);
  setTimeout(() => document.getElementById('finalStats').style.opacity      = '1', 1600);
  setTimeout(() => document.getElementById('gameOverButtons').style.opacity = '1', 2100);

  document.getElementById('inGameHUD').style.display      = 'none';
  document.getElementById('inGameHUDRight').style.display = 'none';
  document.getElementById('itemSlots').style.display      = 'none';
  document.getElementById('skillBar').style.display       = 'none';
}

// ============================================================
// 初期化
// ============================================================
document.getElementById('nicknameInput') && (document.getElementById('nicknameInput').value = playerData.nickname);
updateHomeDisplay();
initStars();
updateItemUI();
updateHUD();
initDailyMissions();
checkNewsStatus();
lastTime = performance.now();
requestAnimationFrame(gameLoop);