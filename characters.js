// ============================================================
// characters.js
// キャラクター定義・レベル・クラス・ガチャロジック
// player-data.js の次に読み込むこと
// ============================================================

// ============================================================
// キャラクター定義
// ============================================================
const CHARACTERS = [
  {
    id: 'void',
    name: 'ボイド',
    emoji: '⚫',
    rank: 'D',
    rankWeight: 150,
    desc: '追尾する弾を撃つ基本キャラ',
    skills: {
      e: {
        name: '追尾弾',
        desc: '近くの敵を追尾する弾を撃つ',
        baseCost: 500,
        cooldown: 0,
        type: 'homing_shot'
      },
      r: {
        name: '弾数アップ',
        desc: '少しの間弾の数を増やす',
        baseCost: 4000,
        cooldown: 10,
        type: 'bullet_count_up',
        duration: 5
      }
    }
  },
  {
    id: 'base',
    name: 'ベース',
    emoji: '🟤',
    rank: 'D',
    rankWeight: 150,
    desc: 'ノックバックとトラップを使いこなす',
    skills: {
      e: {
        name: 'ノックバック弾',
        desc: '当たった敵をノックバックする弾を撃つ',
        baseCost: 500,
        cooldown: 0,
        type: 'knockback_shot',
        classBonus: { speedPerClass: 0.1 }
      },
      r: {
        name: 'ダメージトラップ',
        desc: 'プレイヤーの位置にトラップを配置する',
        baseCost: 1000,
        cooldown: 3,
        type: 'damage_trap',
        baseDamage: 10,
        classBonus: { damagePerClass: 5, cooldownPerClass: -0.25 }
      }
    }
  },
  {
    id: 'red',
    name: 'レッド',
    emoji: '🔴',
    rank: 'D',
    rankWeight: 150,
    desc: '高火力弾で敵を撃破する攻撃型',
    skills: {
      e: {
        name: '高火力弾',
        desc: '攻撃力が高い弾を撃つ',
        baseCost: 500,
        cooldown: 0,
        type: 'high_power_shot',
        damageMult: 1.5
      },
      r: {
        name: '拡散高火力弾',
        desc: '複数の方向に攻撃力が高い弾を撃つ',
        baseCost: 2000,
        cooldown: 6,
        type: 'spread_high_power',
        damageMult: 1.5,
        classBonus: { speedPerClass: 0.1, cooldownPerClass: -0.25 }
      }
    }
  },
  {
    id: 'sad',
    name: 'サッド',
    emoji: '🔵',
    rank: 'D',
    rankWeight: 150,
    desc: '敵を弱体化させる支援型',
    skills: {
      e: {
        name: '弱化弾',
        desc: '当たった敵の攻撃力を下げる弾を撃つ',
        baseCost: 400,
        cooldown: 0,
        type: 'weaken_shot',
        weakenMult: 0.5,
        classBonus: { speedPerClass: 0.1 }
      },
      r: {
        name: 'リーフケアル',
        desc: '体力を少し回復する',
        baseCost: 2000,
        cooldown: 5,
        type: 'heal',
        healAmount: 60
      }
    }
  },
  {
    id: 'soft',
    name: 'ソフト',
    emoji: '⚪',
    rank: 'D',
    rankWeight: 150,
    desc: '全ステータスを下げる万能弱体化キャラ',
    skills: {
      e: {
        name: 'ソフト弾',
        desc: '当たった敵のステータスを下げる弾を撃つ',
        baseCost: 300,
        cooldown: 0,
        type: 'soft_shot',
        statMult: 0.9
      },
      r: {
        name: 'ソフトガード',
        desc: '少しの間敵の攻撃を喰らわない',
        baseCost: 1500,
        cooldown: 12,
        type: 'invincible',
        duration: 5,
        classBonus: { cooldownPerClass: -0.25 }
      }
    }
  },
  {
    id: 'owl',
    name: 'アウル',
    emoji: '🟡',
    rank: 'D',
    rankWeight: 150,
    desc: '爆発弾で範囲攻撃を得意とする',
    skills: {
      e: {
        name: '小爆発弾',
        desc: '敵に当たったら小さな爆発を起こす弾を撃つ',
        baseCost: 500,
        cooldown: 0,
        type: 'explosion_shot',
        explosionDamageMult: 2.0,
        explosionRadius: 60
      },
      r: {
        name: 'ビッグボム',
        desc: '近くの敵に当たると爆発する大きなボムを投げつける',
        baseCost: 5000,
        cooldown: 5,
        type: 'big_bomb',
        classBonus: { damagePerClass: 20 }
      }
    }
  },
  {
    id: 'yummy',
    name: 'ヤミー',
    emoji: '🟠',
    rank: 'D',
    rankWeight: 150,
    desc: 'マグネで敵を引き寄せる戦略型',
    skills: {
      e: {
        name: 'マグネ弾',
        desc: '敵に当たったらマグネを発生させる弾を撃つ',
        baseCost: 500,
        cooldown: 0.5,
        type: 'magnet_shot',
        magnetDuration: 5,
        baseRadius: 80,
        classBonus: { radiusPerClass: 10 }
      },
      r: {
        name: 'ライス',
        desc: '体力とライフが少し回復する',
        baseCost: 1000,
        cooldown: 10,
        type: 'heal_lives',
        healHP: 50,
        healLives: 30
      }
    }
  },
  {
    id: 'grass',
    name: 'グラス',
    emoji: '🟢',
    rank: 'D',
    rankWeight: 150,
    desc: 'スピードに特化した機動型',
    skills: {
      e: {
        name: 'スピード弾',
        desc: 'スピードが速い弾を撃つ',
        baseCost: 300,
        cooldown: 0,
        type: 'speed_shot',
        speedMult: 2.0,
        classBonus: { speedPerClass: 0.25 }
      },
      r: {
        name: 'スピードアップ',
        desc: '少しの間移動スピードが上がる',
        baseCost: 700,
        cooldown: 20,
        type: 'speed_up',
        speedMult: 2.0,
        duration: 10,
        classBonus: { durationPerClass: 0.5 }
      }
    }
  },
  {
    id: 'purple',
    name: 'パープル',
    emoji: '🟣',
    rank: 'C',
    rankWeight: 120,
    desc: '時間で強化されるマジック弾を操る',
    skills: {
      e: {
        name: 'マジック弾',
        desc: '不思議な弾を撃つ',
        baseCost: 500,
        cooldown: 0,
        type: 'magic_shot',
        growthPerSecond: 0.1
      },
      r: {
        name: 'ビッグマジック',
        desc: '不思議な効果がある',
        baseCost: 2000,
        cooldown: 5,
        type: 'big_magic',
        damageMult: 1.25,
        healHP: 50,
        healLives: 20
      }
    }
  }
];

// ============================================================
// キャラクター定数
// ============================================================
const CHAR_EXP_PER_LEVEL  = 10000;
const CHAR_EXP_MAX_LEVEL  = 50;
const CHAR_CLASS_EXP_NEEDED = 10;
const CHAR_CLASS_MAX      = 6;

// レベル上限解放に必要なコイン
const CHAR_LEVEL_UNLOCK = {
  5:  1000,
  10: 2000,
  20: 4000,
  30: 5000,
  35: 10000,
  40: 15000,
  45: 20000
};

// ============================================================
// プレイヤーのキャラクターデータ管理
// ============================================================
// charData 構造:
// {
//   selectedCharId: 'void',
//   chars: {
//     void: { owned: true, level: 1, charExp: 0, classLv: 0, classExp: 0, levelUnlocked: 0 },
//     ...
//   }
// }

let charData = {
  selectedCharId: 'void',
  chars: {}
};

// 初期化（全キャラ未所持で埋める）
function initCharData(){
  CHARACTERS.forEach(c => {
    if(!charData.chars[c.id]){
      charData.chars[c.id] = {
        owned: false,
        level: 0,
        charExp: 0,
        classLv: 0,
        classExp: 0,
        levelUnlocked: 0
      };
    }
  });
}

function saveCharData(){
  localStorage.setItem('voidRunnerCharData', JSON.stringify(charData));
}

function loadCharData(){
  const d = localStorage.getItem('voidRunnerCharData');
  if(d){
    charData = JSON.parse(d);
  }
  initCharData();
}

loadCharData();

// ============================================================
// キャラクター取得ヘルパー
// ============================================================
function getCharById(id){
  return CHARACTERS.find(c => c.id === id) || CHARACTERS[0];
}

function getSelectedChar(){
  return getCharById(charData.selectedCharId);
}

function getCharState(id){
  return charData.chars[id] || { owned:false, level:0, charExp:0, classLv:0, classExp:0, levelUnlocked:0 };
}

// ============================================================
// キャラクターEXP・レベル
// ============================================================
function addCharExp(charId, amount){
  const state = charData.chars[charId];
  if(!state || !state.owned) return;

  const maxLv = getCharMaxLevel(charId);
  if(state.level >= maxLv) return;

  state.charExp += amount;
  while(state.charExp >= CHAR_EXP_PER_LEVEL && state.level < maxLv){
    state.charExp -= CHAR_EXP_PER_LEVEL;
    state.level++;
    if(state.level >= maxLv) state.charExp = 0;
  }
  saveCharData();
}

function getCharMaxLevel(charId){
  const state = charData.chars[charId];
  if(!state) return 4;
  const unlocked = state.levelUnlocked || 0;
  const caps = [4, 5, 10, 20, 30, 35, 40, 45, 50];
  return caps[Math.min(unlocked, caps.length - 1)];
}

function unlockCharLevel(charId, targetCap){
  const state = charData.chars[charId];
  if(!state || !state.owned) return { success:false, error:'未所持のキャラです' };
  const cost = CHAR_LEVEL_UNLOCK[targetCap];
  if(!cost) return { success:false, error:'無効な上限解放レベルです' };
  if(playerData.coins < cost) return { success:false, error:'コインが足りません' };
  playerData.coins -= cost;
  state.levelUnlocked = (state.levelUnlocked || 0) + 1;
  saveCharData();
  savePlayerData();
  return { success:true };
}

// ============================================================
// キャラクタークラス
// ============================================================
function addCharClassExp(charId, amount){
  const state = charData.chars[charId];
  if(!state || !state.owned) return;
  if(state.classLv >= CHAR_CLASS_MAX) return;

  state.classExp += amount;
  while(state.classExp >= CHAR_CLASS_EXP_NEEDED && state.classLv < CHAR_CLASS_MAX){
    state.classExp -= CHAR_CLASS_EXP_NEEDED;
    state.classLv++;
    if(state.classLv >= CHAR_CLASS_MAX) state.classExp = 0;
  }
  saveCharData();
}

// ============================================================
// スキルコスト計算（クラスによる減少）
// ============================================================
function getSkillCost(charId, skillKey){
  const char  = getCharById(charId);
  const state = getCharState(charId);
  const skill = char.skills[skillKey];
  if(!skill) return 999999;
  const classLv = state.classLv || 0;
  // クラス1上がるごとに baseCost × 0.1 ずつ減少
  const reduction = skill.baseCost * 0.1 * classLv;
  return Math.max(0, Math.floor(skill.baseCost - reduction));
}

// スキルクールダウン計算
function getSkillCooldown(charId, skillKey){
  const char  = getCharById(charId);
  const state = getCharState(charId);
  const skill = char.skills[skillKey];
  if(!skill) return 0;
  const classLv = state.classLv || 0;
  let cd = skill.cooldown;
  if(skill.classBonus && skill.classBonus.cooldownPerClass){
    cd += skill.classBonus.cooldownPerClass * classLv;
  }
  return Math.max(0, cd);
}

// キャラレベルによるスコア倍率
function getCharScoreMult(){
  const charId = charData.selectedCharId;
  const state  = getCharState(charId);
  const lv     = state.owned ? (state.level || 0) : 0;
  return 1 + lv / 100;
}

// ============================================================
// ガチャシステム
// ============================================================

// ノーマルガチャコスト
const GACHA_NORMAL_COST = 50000;

// 排出プール（ノーマルガチャ用・全キャラ）
function getNormalGachaPool(){
  // スキルMAX（classLv >= 6）のキャラは排出停止
  return CHARACTERS.filter(c => {
    const state = getCharState(c.id);
    // classLvがCHAR_CLASS_MAX未満なら排出対象
    return state.classLv < CHAR_CLASS_MAX;
  });
}

function rollNormalGacha(forceVoid = false){
  if(forceVoid){
    return CHARACTERS.find(c => c.id === 'void');
  }

  const pool = getNormalGachaPool();
  if(pool.length === 0) return null;

  const totalWeight = pool.reduce((sum, c) => sum + c.rankWeight, 0);
  let r = Math.random() * totalWeight;
  for(const c of pool){
    r -= c.rankWeight;
    if(r <= 0) return c;
  }
  return pool[pool.length - 1];
}

function applyGachaResult(char){
  if(!char) return null;
  const state = charData.chars[char.id];

  if(!state.owned){
    // 新規取得
    state.owned   = true;
    state.level   = 1;
    state.charExp = 0;
    state.classLv = 0;
    state.classExp = 0;
    state.levelUnlocked = 0;
  } else {
    // 既所持→クラス経験値+1
    addCharClassExp(char.id, 1);
  }

  saveCharData();
  return { char, isNew: !state.owned };
}

// ノーマルガチャを引く
function drawNormalGacha(forceVoid = false){
  if(!forceVoid){
    if(playerData.coins < GACHA_NORMAL_COST){
      return { success:false, error:'コインが足りません' };
    }
    playerData.coins -= GACHA_NORMAL_COST;
    savePlayerData();
  }

  const char   = rollNormalGacha(forceVoid);
  const state  = charData.chars[char.id];
  const wasNew = !state.owned;

  if(!state.owned){
    state.owned    = true;
    state.level    = 1;
    state.charExp  = 0;
    state.classLv  = 0;
    state.classExp = 0;
    state.levelUnlocked = 0;
  } else {
    addCharClassExp(char.id, 1);
  }

  saveCharData();
  return { success:true, char, isNew: wasNew };
}

// ============================================================
// ガチャ月間累計ゲージ（将来拡張用）
// ============================================================
let gachaGauge = 0;
function incrementGachaGauge(){
  gachaGauge++;
  // 将来：一定数で報酬付与
}

// ============================================================
// キャラ選択
// ============================================================
function selectCharacter(charId){
  const state = charData.chars[charId];
  if(!state || !state.owned) return false;
  charData.selectedCharId = charId;
  saveCharData();
  return true;
}

// ============================================================
// Firestore同期用データ取得
// ============================================================
function getCharDataForCloud(){
  return {
    selectedCharId: charData.selectedCharId,
    chars: charData.chars
  };
}

function applyCharDataFromCloud(cloudChars){
  if(!cloudChars) return;
  charData.selectedCharId = cloudChars.selectedCharId || 'void';
  charData.chars = cloudChars.chars || {};
  initCharData();
  saveCharData();
}