// ============================================================
// player-data.js
// playerData定義・ローカル保存/読込・EXP・レベル・ランキング
// ※ firebase.js より前に読み込むこと
// ============================================================

let playerData = {
  nickname:  'PLAYER',
  highScore: 0,
  coins:     0,
  medals:    0,
  voidols:   0,
  level:     1,
  exp:       0,
  rankings:  []
};

const EXP_PER_LEVEL = 8000;

// ============================================================
// 保存 / 読込
// ============================================================
function savePlayerData(){
  const nick = document.getElementById('nicknameInput').value.trim();
  if(nick) playerData.nickname = nick;
  localStorage.setItem('voidRunnerData', JSON.stringify(playerData));
}

function loadPlayerData(){
  const d = localStorage.getItem('voidRunnerData');
  if(d){
    const loaded = JSON.parse(d);
    playerData = {
      nickname:       loaded.nickname       || 'PLAYER',
      highScore:      loaded.highScore      || 0,
      coins:          loaded.coins          || 0,
      medals:         loaded.medals         || 0,
      voidols:        loaded.voidols        || 0,
      level:          loaded.level          || 1,
      exp:            loaded.exp            || 0,
      rankings:       loaded.rankings       || [],
      lastDifficulty: loaded.lastDifficulty || 'normal'
    };
  }
}

loadPlayerData();

// ============================================================
// EXP付与・レベルアップ
// ============================================================
function addPlayerExp(amount){
  playerData.exp += amount;

  while(playerData.exp >= EXP_PER_LEVEL && playerData.level < 99){
    playerData.exp -= EXP_PER_LEVEL;
    playerData.level++;

    let coinReward = 100, medalReward = 50;
    if(playerData.level >= 90)     { coinReward = 1200; medalReward = 450; }
    else if(playerData.level >= 70){ coinReward = 1000; medalReward = 400; }
    else if(playerData.level >= 50){ coinReward =  900; medalReward = 300; }
    else if(playerData.level >= 30){ coinReward =  750; medalReward = 200; }
    else if(playerData.level >= 16){ coinReward =  500; medalReward = 150; }
    else if(playerData.level >= 6) { coinReward =  250; medalReward = 100; }
    if(playerData.level === 99){ coinReward = 1300; medalReward = 500; }

    playerData.coins   += coinReward;
    playerData.medals  += medalReward;
    playerData.voidols += 10;
  }

  if(playerData.level >= 99){
    playerData.level = 99;
    playerData.exp   = 0;
  }
}

// ============================================================
// スコア倍率
// ============================================================
function getScoreMultiplier(){
  const lv = playerData.level;
  let mult = 1.0;
  if(lv >= 90)      mult = 1.6;
  else if(lv >= 70) mult = 1.5;
  else if(lv >= 50) mult = 1.4;
  else if(lv >= 30) mult = 1.3;
  else if(lv >= 16) mult = 1.2;
  else if(lv >= 6)  mult = 1.1;
  if(selectedBonuses.score) mult += 0.5;
  return mult;
}

// ============================================================
// ゲーム内EXP計算
// ============================================================
function calculateGameExp(){
  const baseExp  = 100;
  const skillExp = skillUses     * 20;
  const itemExp  = itemUses      * 10;
  const enemyExp = enemiesKilled * 5;
  const waveExp  = wave          * 10;
  const moveExp  = moveLevel     * 10;
  return baseExp + skillExp + itemExp + enemyExp + waveExp + moveExp;
}

// ============================================================
// ローカルランキング追加
// ============================================================
function addToRankings(finalScore){
  const mult          = getScoreMultiplier();
  const adjustedScore = Math.floor(finalScore * mult);
  const entry = {
    score:     adjustedScore,
    wave:      wave,
    level:     playerData.level,
    moveLevel: moveLevel,
    date:      new Date().toISOString()
  };
  playerData.rankings.push(entry);
  playerData.rankings.sort((a, b) => b.score - a.score);
  playerData.rankings = playerData.rankings.slice(0, 5);
}
