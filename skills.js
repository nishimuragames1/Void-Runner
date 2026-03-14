// ============================================================
// skills.js
// アイテム定義・使用、スキル定義・使用、ボーナス定義・切替・適用
// ============================================================

// ============================================================
// アイテム定義
// ============================================================
const ITEMS = [
  { id:'shield', emoji:'🛡️', d:5, name:'Shield' },
  { id:'rapid',  emoji:'⚡',  d:5, name:'Rapid'  },
  { id:'bomb',   emoji:'💥',  d:0, name:'Bomb'   },
  { id:'heal',   emoji:'💚',  d:0, name:'Heal'   },
  { id:'spread', emoji:'🌊',  d:5, name:'Spread' },
  { id:'lives',  emoji:'❤️',  d:0, name:'Lives'  }
];

// ============================================================
// アイテム使用
// ============================================================
function useItem(i){
  if(!items[i]) return;
  const it = items[i];
  itemUses++;
  if(it.id === 'shield'){ player.shield = true; player.invincible = it.d; }
  else if(it.id === 'rapid'){ player.rapidFire = it.d; }
  else if(it.id === 'bomb')  useBomb();
  else if(it.id === 'heal')  playerHP = Math.min(playerMaxHP, playerHP + 30);
  else if(it.id === 'spread'){ player.spread = it.d; }
  else if(it.id === 'lives') livesCurrent = Math.min(livesMax, livesCurrent + 20);
  items[i] = null;
  updateItemUI();
  updateMissionProgress('item', 1);
}

function useBomb(){
  enemies.forEach(e => {
    if(!e.isBoss){ spawnExp(e.x, e.y, '#ff4400', 8); score += e.score || 100; addCombo(); enemiesKilled++; }
    else { e.hp -= 50; spawnExp(e.x, e.y, '#ff0', 16); }
  });
  enemies  = enemies.filter(e => e.isBoss && e.hp > 0);
  ebullets = [];
}

// ============================================================
// アイテムUI更新
// ============================================================
function updateItemUI(){
  const c = document.getElementById('itemSlots');
  c.innerHTML = '';
  for(let i = 0; i < 5; i++){
    const slot = document.createElement('div');
    slot.className = 'item-slot' + (items[i] ? '' : ' empty');
    slot.innerHTML = items[i] ? items[i].emoji : '−';

    const h = document.createElement('span');
    h.className   = 'key-hint';
    h.textContent = i + 1;
    slot.appendChild(h);

    const gauge         = document.createElement('div');
    gauge.className     = 'item-gauge';
    const gaugeFill     = document.createElement('div');
    gaugeFill.className = 'item-gauge-fill';
    gaugeFill.style.width = items[i] ? '100%' : '0%';
    gauge.appendChild(gaugeFill);
    slot.appendChild(gauge);

    if(items[i]) slot.addEventListener('click', () => useItem(i));
    c.appendChild(slot);
  }
}

// ============================================================
// スキル使用
// ============================================================
function useSkill(s){
  const costMult = difficulty === 'nightmare' ? 2 : 1;

  if(s === 'homing'   && pieces >= 100  * costMult){ pieces -= 100  * costMult; spawnHomingBullets(); skillUses++; updateMissionProgress('skill', 1); }
  else if(s === 'wave'    && pieces >= 500  * costMult){ pieces -= 500  * costMult; spawnWaveBullets();   skillUses++; updateMissionProgress('skill', 1); }
  else if(s === 'dropup'  && pieces >= 1000 * costMult){ pieces -= 1000 * costMult; dropUpActive = 15;    skillUses++; updateMissionProgress('skill', 1); }
  else if(s === 'megabomb'&& pieces >= 5000 * costMult){ pieces -= 5000 * costMult; spawnMegabomb();      skillUses++; updateMissionProgress('skill', 1); }

  updateSkillButtons();
}

function updateSkillButtons(){
  const costMult = difficulty === 'nightmare' ? 2 : 1;
  const btns = [
    { el: document.getElementById('skillHomingBtn'), cost: 100  * costMult },
    { el: document.getElementById('skillWaveBtn'),   cost: 500  * costMult },
    { el: document.getElementById('skillDropBtn'),   cost: 1000 * costMult },
    { el: document.getElementById('skillBombBtn'),   cost: 5000 * costMult }
  ];
  btns.forEach(btn => {
    btn.el.classList.remove('disabled','ready','used');
    if(pieces >= btn.cost && pieces < btn.cost * 2) btn.el.classList.add('used');
    else if(pieces >= btn.cost)                      btn.el.classList.add('ready');
    else                                             btn.el.classList.add('disabled');
  });
}

// ============================================================
// スキル弾生成
// ============================================================
function spawnHomingBullets(){
  for(let i = 0; i < 3; i++){
    bullets.push({ x:player.x+(i-1)*8, y:player.y-20, vx:0, vy:-600, life:5, color:'#00ff00', size:5, homing:true, target:null });
  }
}

function spawnWaveBullets(){
  for(let i = 0; i < 8; i++){
    const a = (i / 8) * Math.PI * 2;
    bullets.push({ x:player.x, y:player.y, vx:Math.cos(a)*400, vy:Math.sin(a)*400, life:3, color:'#ffff00', size:6, homing:false });
  }
}

function spawnMegabomb(){
  if(particles.length < MAX_P)
    particles.push({ x:player.x, y:player.y, vx:0, vy:0, life:0.2, maxLife:0.2, color:'#ffff00', size:70 });
  const closest = enemies.reduce((a, b) =>
    a && Math.hypot(a.x-player.x, a.y-player.y) < Math.hypot(b.x-player.x, b.y-player.y) ? a : b, null);
  if(closest){
    closest.hp -= 200;
    for(let i = 0; i < 16; i++){
      const a = (i / 16) * Math.PI * 2;
      if(bullets.length < 200)
        bullets.push({ x:closest.x, y:closest.y, vx:Math.cos(a)*550, vy:Math.sin(a)*550, life:2.5, color:'#ff6600', size:5 });
    }
  }
}

// ============================================================
// ボーナス定義
// ============================================================
const BONUS_DEFS = [
  { id:'score', label:'スコアボーナス',   cost:1900, desc:'スコア倍率+0.5'   },
  { id:'hp',    label:'HPボーナス',       cost:800,  desc:'HP×1.25スタート' },
  { id:'lives', label:'ライフボーナス',   cost:900,  desc:'ライフ×1.25スタート' },
  { id:'rapid', label:'ラピッドボーナス', cost:1800, desc:'発射速度×1.25'   },
  { id:'item',  label:'アイテムボーナス', cost:1200, desc:'ドロップ率+0.25' },
  { id:'exp',   label:'EXPボーナス',      cost:1500, desc:'EXP倍率（ガチャ）' },
  { id:'combo', label:'コンボボーナス',   cost:1000, desc:'コンボが切れない' },
  { id:'coin',  label:'コインボーナス',   cost:500,  desc:'コイン倍率（ガチャ）' },
  { id:'medal', label:'メダルボーナス',   cost:700,  desc:'メダル倍率（ガチャ）' },
  { id:'orb',   label:'オーブボーナス',   cost:400,  desc:'オーブ×1.25'    },
];

let selectedBonuses = {
  score:false, hp:false, lives:false, rapid:false,
  item:false,  exp:false, combo:false, coin:false,
  medal:false, orb:false
};

// ガチャ倍率テーブル
const MULT_TABLE = [
  {v:1.1,w:100},{v:1.2,w:95},{v:1.3,w:90},{v:1.4,w:85},
  {v:1.5,w:80},{v:1.6,w:75},{v:1.7,w:70},{v:1.8,w:65},
  {v:1.9,w:60},{v:2.0,w:55},{v:3.0,w:30},{v:4.0,w:20},
  {v:5.0,w:15},{v:6.0,w:12},{v:7.0,w:10},{v:8.0,w:8},
  {v:9.0,w:6},{v:10.0,w:5},{v:15.0,w:3},{v:20.0,w:2},
  {v:30.0,w:1.5},{v:40.0,w:1},{v:50.0,w:0.5}
];

function rollMult(){
  const total = MULT_TABLE.reduce((s, e) => s + e.w, 0);
  let r = Math.random() * total;
  for(const e of MULT_TABLE){ r -= e.w; if(r <= 0) return e.v; }
  return 1.1;
}

// ============================================================
// ボーナス切替 UI
// ============================================================
function toggleBonus(id, cost){
  if(selectedBonuses[id]){
    selectedBonuses[id] = false;
    playerData.coins   += cost;
  } else {
    if(playerData.coins < cost) return;
    selectedBonuses[id] = true;
    playerData.coins   -= cost;
  }
  savePlayerData();
  renderBonusArea();
}

function renderBonusArea(){
  const area = document.getElementById('bonusArea');
  area.innerHTML = BONUS_DEFS.map(b => {
    const on        = selectedBonuses[b.id];
    const canAfford = playerData.coins >= b.cost;
    return `
      <div class="bonus-card ${on?'bonus-on':''} ${!canAfford&&!on?'bonus-cant':''}"
           onclick="toggleBonus('${b.id}', ${b.cost})">
        <div class="bonus-card-left">
          <div class="bonus-label">${b.label}</div>
          <div class="bonus-desc">${b.desc}</div>
        </div>
        <div class="bonus-card-right">
          <div class="bonus-cost">${b.cost}🪙</div>
          <div class="bonus-toggle">${on ? '✅ ON' : '⬜ OFF'}</div>
        </div>
      </div>`;
  }).join('');
  document.getElementById('bonusCoinDisplay').textContent = `🪙 ${playerData.coins.toLocaleString()}`;
}

// ============================================================
// ボーナス適用（ゲーム開始時）
// ============================================================
function applyBonuses(){
  bonusExpMult         = 1;
  bonusCoinMult        = 1;
  bonusMedalMult       = 1;
  bonusComboNeverReset = false;
  bonusItemDropRate    = 0;

  if(selectedBonuses.hp)    playerMaxHP = Math.floor(playerMaxHP * 1.25);
  if(selectedBonuses.lives){ livesMax = Math.floor(livesMax * 1.25); livesCurrent = livesMax; }
  if(selectedBonuses.rapid) fireRateMultiplier *= 1.25;
  if(selectedBonuses.item)  bonusItemDropRate   = 0.25;
  if(selectedBonuses.exp)  { bonusExpMult  = rollMult(); finalExpMult   = bonusExpMult;  }
  if(selectedBonuses.combo) bonusComboNeverReset = true;
  if(selectedBonuses.coin) { bonusCoinMult  = rollMult(); finalCoinMult  = bonusCoinMult;  }
  if(selectedBonuses.medal){ bonusMedalMult = rollMult(); finalMedalMult = bonusMedalMult; }
}