// ============================================================
// skills.js
// アイテム定義・使用、キャラスキル定義・発動、ボーナス（Coming Soon）
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
  if(!c) return;
  c.innerHTML = '';
  for(let i = 0; i < 5; i++){
    const slot = document.createElement('div');
    slot.className = 'item-slot' + (items[i] ? '' : ' empty');
    slot.innerHTML = items[i] ? items[i].emoji : '−';
    const h = document.createElement('span');
    h.className   = 'key-hint';
    h.textContent = i + 1;
    slot.appendChild(h);
    const gauge     = document.createElement('div');
    gauge.className = 'item-gauge';
    const gaugeFill = document.createElement('div');
    gaugeFill.className   = 'item-gauge-fill';
    gaugeFill.style.width = items[i] ? '100%' : '0%';
    gauge.appendChild(gaugeFill);
    slot.appendChild(gauge);
    if(items[i]) slot.addEventListener('click', () => useItem(i));
    c.appendChild(slot);
  }
}

// ============================================================
// キャラスキル状態変数
// ============================================================
let skillECooldownTimer = 0; // E スキルの残クールダウン
let skillRCooldownTimer = 0; // R スキルの残クールダウン

// ゲーム開始時にリセット
function resetSkillTimers(){
  skillECooldownTimer = 0;
  skillRCooldownTimer = 0;
}

// dt ぶん減らす（game.js の update() 内で毎フレーム呼ぶ）
function tickSkillCooldowns(dt){
  if(skillECooldownTimer > 0) skillECooldownTimer = Math.max(0, skillECooldownTimer - dt);
  if(skillRCooldownTimer > 0) skillRCooldownTimer = Math.max(0, skillRCooldownTimer - dt);
}

// ============================================================
// キャラスキル使用
// ============================================================
function useCharSkill(key){ // key: 'e' | 'r'
  const charId = charData.selectedCharId;
  const char   = getCharById(charId);
  const state  = getCharState(charId);
  if(!char || !state.owned) return;

  const skill    = char.skills[key];
  if(!skill) return;

  const cost     = getSkillCost(charId, key);
  const cooldown = getSkillCooldown(charId, key);
  const timer    = key === 'e' ? skillECooldownTimer : skillRCooldownTimer;

  // コスト・クールダウンチェック
  if(pieces < cost){ showSkillMessage(`ピースが足りない！(必要: ${cost})`); return; }
  if(timer > 0){ showSkillMessage(`クールダウン中… (${timer.toFixed(1)}s)`); return; }

  pieces -= cost;
  skillUses++;
  updateMissionProgress('skill', 1);

  // クールダウンセット
  if(key === 'e') skillECooldownTimer = cooldown;
  else            skillRCooldownTimer = cooldown;

  // スキル発動
  activateCharSkill(char, skill, state);
  updateCharSkillUI();
  updateHUD();
}

// ============================================================
// スキル発動ロジック
// ============================================================
function activateCharSkill(char, skill, state){
  const classLv = state.classLv || 0;

  switch(skill.type){

    // ── ボイド ──────────────────────────────────────
    case 'homing_shot':
      // 追尾弾3発
      for(let i = 0; i < 3; i++){
        bullets.push({
          x: player.x + (i-1)*8, y: player.y - 20,
          vx: 0, vy: -600, life: 5,
          color: '#00ffcc', size: 5 + lvl.size * 2,
          homing: true, target: null
        });
      }
      break;

    case 'bullet_count_up':
      // 既存タイマーをクリアしてから再セット
      if(window._extraShotsTimer) clearTimeout(window._extraShotsTimer);
      player.extraShots = (player.extraShots || 0) + 1;
      window._extraShotsTimer = setTimeout(() => {
        player.extraShots = Math.max(0, (player.extraShots||0) - 1);
        window._extraShotsTimer = null;
      }, skill.duration * 1000);
      break;

    // ── ベース ──────────────────────────────────────
    case 'knockback_shot': {
      const speedBonus = 1 + classLv * (skill.classBonus?.speedPerClass || 0);
      const a = -Math.PI / 2;
      bullets.push({
        x: player.x, y: player.y - 24,
        vx: Math.cos(a) * 700 * speedBonus,
        vy: Math.sin(a) * 700 * speedBonus,
        life: 3, color: '#ff8800', size: 8 + lvl.size * 2,
        knockback: true
      });
      break;
    }

    case 'damage_trap': {
      const dmg = (skill.baseDamage || 10) + classLv * (skill.classBonus?.damagePerClass || 0);
      traps.push({
        x: player.x, y: player.y,
        damage: dmg, life: 8,
        size: 30, color: '#ff8800'
      });
      break;
    }

    // ── レッド ──────────────────────────────────────
    case 'high_power_shot': {
      const dmult = skill.damageMult || 1.5;
      for(let i = 0; i < lvl.shots; i++){
        const offsets = [-12, 0, 12];
        const angles  = [-Math.PI/2 - 0.35, -Math.PI/2, -Math.PI/2 + 0.35];
        const idx = lvl.shots === 1 ? 1 : i;
        bullets.push({
          x: player.x + (lvl.shots > 1 ? offsets[idx] : 0),
          y: player.y - 24,
          vx: Math.cos(angles[idx]) * 650 * diffMult.bulletSpeed,
          vy: Math.sin(angles[idx]) * 650 * diffMult.bulletSpeed,
          life: 3, color: '#ff2200',
          size: 3 + lvl.size * 2,
          damageMult: dmult
        });
      }
      break;
    }

    case 'spread_high_power': {
      const speedBonus = 1 + classLv * (skill.classBonus?.speedPerClass || 0);
      const dmult = skill.damageMult || 1.5;
      for(let i = 0; i < 8; i++){
        const a = (i / 8) * Math.PI * 2;
        bullets.push({
          x: player.x, y: player.y,
          vx: Math.cos(a) * 450 * speedBonus,
          vy: Math.sin(a) * 450 * speedBonus,
          life: 3, color: '#ff4400',
          size: 5 + lvl.size * 2,
          damageMult: dmult
        });
      }
      break;
    }

    // ── サッド ──────────────────────────────────────
    case 'weaken_shot': {
      const speedBonus = 1 + classLv * (skill.classBonus?.speedPerClass || 0);
      bullets.push({
        x: player.x, y: player.y - 24,
        vx: 0, vy: -650 * speedBonus * diffMult.bulletSpeed,
        life: 3, color: '#4488ff',
        size: 6 + lvl.size * 2,
        weaken: true, weakenMult: skill.weakenMult || 0.5
      });
      break;
    }

    case 'heal':
      playerHP = Math.min(playerMaxHP, playerHP + (skill.healAmount || 60));
      showSkillEffect('💙 +' + (skill.healAmount || 60) + ' HP');
      break;

    // ── ソフト ──────────────────────────────────────
    case 'soft_shot':
      bullets.push({
        x: player.x, y: player.y - 24,
        vx: 0, vy: -650 * diffMult.bulletSpeed,
        life: 3, color: '#cccccc',
        size: 6 + lvl.size * 2,
        soft: true, statMult: skill.statMult || 0.9
      });
      break;

    case 'invincible': {
      const dur = (skill.duration || 5) + classLv * 0;
      player.invincible = dur;
      player.shield     = true;
      // invincibleは毎フレーム減算されるのでshieldも自動で切れる
      showSkillEffect('🛡️ ソフトガード');
      break;
    }

    // ── アウル ──────────────────────────────────────
    case 'explosion_shot':
      bullets.push({
        x: player.x, y: player.y - 24,
        vx: 0, vy: -650 * diffMult.bulletSpeed,
        life: 3, color: '#ffdd00',
        size: 5 + lvl.size * 2,
        explosion: true,
        explosionRadius: skill.explosionRadius || 60,
        explosionDamageMult: skill.explosionDamageMult || 2.0
      });
      break;

    case 'big_bomb': {
      const target = enemies.reduce((a, b) =>
        a && Math.hypot(a.x-player.x, a.y-player.y) < Math.hypot(b.x-player.x, b.y-player.y) ? a : b, null);
      if(target){
        const baseDmg = 150 + classLv * (skill.classBonus?.damagePerClass || 20);
        bigBombs.push({
          x: player.x, y: player.y,
          tx: target.x, ty: target.y,
          speed: 400, damage: baseDmg,
          life: 5, size: 18, color: '#ff6600'
        });
      }
      break;
    }

    // ── ヤミー ──────────────────────────────────────
    case 'magnet_shot': {
      const radius = (skill.baseRadius || 80) + classLv * (skill.classBonus?.radiusPerClass || 10);
      bullets.push({
        x: player.x, y: player.y - 24,
        vx: 0, vy: -650 * diffMult.bulletSpeed,
        life: 3, color: '#ff8800',
        size: 6 + lvl.size * 2,
        magnet: true,
        magnetRadius: radius,
        magnetDuration: skill.magnetDuration || 5
      });
      break;
    }

    case 'heal_lives':
      playerHP     = Math.min(playerMaxHP, playerHP + (skill.healHP || 50));
      livesCurrent = Math.min(livesMax, livesCurrent + (skill.healLives || 30));
      showSkillEffect('🟠 ライス！');
      break;

    // ── グラス ──────────────────────────────────────
    case 'speed_shot': {
      const speedMult = (skill.speedMult || 2.0) + classLv * (skill.classBonus?.speedPerClass || 0.25);
      bullets.push({
        x: player.x, y: player.y - 24,
        vx: 0, vy: -650 * speedMult * diffMult.bulletSpeed,
        life: 3, color: '#88ff44',
        size: 4 + lvl.size * 2
      });
      break;
    }

    case 'speed_up': {
      const dur = (skill.duration || 10) + classLv * (skill.classBonus?.durationPerClass || 0.5);
      // 既存タイマーをクリアしてから再セット
      if(window._speedBoostTimer) clearTimeout(window._speedBoostTimer);
      player.speedBoost = skill.speedMult || 2.0;
      window._speedBoostTimer = setTimeout(() => {
        player.speedBoost = 1.0;
        window._speedBoostTimer = null;
      }, dur * 1000);
      showSkillEffect('🟢 スピードアップ！');
      break;
    }

    // ── パープル ──────────────────────────────────────
    case 'magic_shot':
      bullets.push({
        x: player.x, y: player.y - 24,
        vx: 0, vy: -300 * diffMult.bulletSpeed,
        life: 5, color: '#cc44ff',
        size: 4 + lvl.size * 2,
        magic: true,
        growthPerSecond: skill.growthPerSecond || 0.1,
        spawnTime: performance.now()
      });
      break;

    case 'big_magic': {
      const dmult = skill.damageMult || 1.25;
      // 全方向に波状弾
      for(let i = 0; i < 12; i++){
        const a = (i / 12) * Math.PI * 2;
        bullets.push({
          x: player.x, y: player.y,
          vx: Math.cos(a) * 400,
          vy: Math.sin(a) * 400,
          life: 2.5, color: '#cc44ff',
          size: 5 + lvl.size * 2,
          damageMult: dmult
        });
      }
      playerHP     = Math.min(playerMaxHP, playerHP + (skill.healHP || 50));
      livesCurrent = Math.min(livesMax, livesCurrent + (skill.healLives || 20));
      showSkillEffect('🟣 ビッグマジック！');
      break;
    }
  }
}

// ============================================================
// スキルエフェクト表示
// ============================================================
function showSkillEffect(text){
  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed;top:40%;left:50%;transform:translate(-50%,-50%);
    color:#fff;font-size:22px;font-weight:900;
    text-shadow:0 0 16px #fff;z-index:99999;pointer-events:none;
    animation:fadeUpOut 1.2s ease-out forwards;font-family:Orbitron,monospace;
  `;
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

function showSkillMessage(text){
  const el = document.getElementById('skillIndicator');
  if(!el) return;
  el.textContent = text;
  el.style.opacity = '1';
  setTimeout(() => { el.style.opacity = '0'; }, 1200);
}

// ============================================================
// キャラスキルUI更新（HUD右下のEボタン・Rボタン）
// ============================================================
function updateCharSkillUI(){
  const charId = charData.selectedCharId;
  const char   = getCharById(charId);
  const state  = getCharState(charId);
  if(!char || !state.owned) return;

  // スキルバーの上にキャラ表示
  const charInfoEl = document.getElementById('skillCharInfo');
  if(charInfoEl){
    charInfoEl.innerHTML = `
      <div style="color:#aaa;font-size:9px;letter-spacing:1px">キャラクター：${char.name}</div>
      <div style="font-size:20px;line-height:1.2">${char.emoji}</div>
    `;
  }

  ['e','r'].forEach(key => {
    const btn   = document.getElementById(`skill${key.toUpperCase()}Btn`);
    if(!btn) return;
    const skill = char.skills[key];
    const cost  = getSkillCost(charId, key);
    const cd    = key === 'e' ? skillECooldownTimer : skillRCooldownTimer;
    const canUse = pieces >= cost && cd <= 0;

    btn.innerHTML = `
      <span style="font-size:10px;font-weight:900">${key.toUpperCase()}</span><br>
      <span style="font-size:9px">${skill.name}</span><br>
      <span style="font-size:9px;color:${canUse?'#ff69b4':'#888'}">${cost}P</span>
      ${cd > 0 ? `<br><span style="font-size:9px;color:#ff0">${cd.toFixed(1)}s</span>` : ''}
    `;
    btn.classList.remove('disabled','ready','used');
    if(cd > 0)      btn.classList.add('disabled');
    else if(canUse) btn.classList.add('ready');
    else            btn.classList.add('disabled');
  });
}

// ============================================================
// ボーナス定義（復活）
// ============================================================
const BONUS_DEFS = [
  { id:'score', label:'スコアボーナス',   cost:1900, desc:'スコア倍率+0.5'      },
  { id:'hp',    label:'HPボーナス',       cost:800,  desc:'HP×1.25スタート'    },
  { id:'lives', label:'ライフボーナス',   cost:900,  desc:'ライフ×1.25スタート' },
  { id:'rapid', label:'ラピッドボーナス', cost:1800, desc:'発射速度×1.25'       },
  { id:'item',  label:'アイテムボーナス', cost:1200, desc:'ドロップ率+0.25'     },
  { id:'exp',   label:'EXPボーナス',      cost:1500, desc:'EXP倍率（ガチャ）'  },
  { id:'combo', label:'コンボボーナス',   cost:1000, desc:'コンボが切れない'    },
  { id:'coin',  label:'コインボーナス',   cost:500,  desc:'コイン倍率（ガチャ）'},
  { id:'medal', label:'メダルボーナス',   cost:700,  desc:'メダル倍率（ガチャ）'},
  { id:'orb',   label:'オーブボーナス',   cost:400,  desc:'オーブ×1.25'        },
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
  const total = MULT_TABLE.reduce((s,e) => s+e.w, 0);
  let r = Math.random()*total;
  for(const e of MULT_TABLE){ r-=e.w; if(r<=0) return e.v; }
  return 1.1;
}

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
  if(!area) return;
  area.innerHTML = BONUS_DEFS.map(b => {
    const on        = selectedBonuses[b.id];
    const canAfford = playerData.coins >= b.cost;
    return `
      <div class="bonus-card ${on?'bonus-on':''} ${!canAfford&&!on?'bonus-cant':''}"
           onclick="toggleBonus('${b.id}',${b.cost})">
        <div class="bonus-card-left">
          <div class="bonus-label">${b.label}</div>
          <div class="bonus-desc">${b.desc}</div>
        </div>
        <div class="bonus-card-right">
          <div class="bonus-cost">${b.cost}🪙</div>
          <div class="bonus-toggle">${on?'✅ ON':'⬜ OFF'}</div>
        </div>
      </div>`;
  }).join('');
  const coinEl = document.getElementById('bonusCoinDisplay');
  if(coinEl) coinEl.textContent = `🪙 ${playerData.coins.toLocaleString()}`;
}

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

// ============================================================
// オブジェクトプール追加（トラップ・ビッグボム）
// ============================================================
// ※ これらは game.js 側で let traps=[], bigBombs=[] として宣言する
