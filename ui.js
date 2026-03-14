// ============================================================
// ui.js
// HUD更新・ホーム画面・ショップ・ランキング・難易度選択・各種オーバーレイ
// ============================================================

// ============================================================
// ログイン成功 / ログアウト UI
// ============================================================
function onLoginSuccess(profile){
  playerData.nickname = profile.displayName;
  document.getElementById('nicknameInput').value = profile.displayName;
  closeAuthOverlay();
  updateHomeDisplay();
  updateAuthUI();
}

function onLogout(){
  updateAuthUI();
  updateHomeDisplay();
}

function updateAuthUI(){
  const loggedIn = !!currentUserProfile;
  const loginBtn  = document.getElementById('authLoginBtn');
  const logoutBtn = document.getElementById('authLogoutBtn');
  const userInfo  = document.getElementById('authUserInfo');
  const shopOpen  = document.getElementById('shopScreen').style.display === 'block';
  const diffOpen  = document.getElementById('difficultySelect').style.display === 'flex';

  // ショップ中は認証ボタン類を非表示
  if(shopOpen){
    if(loginBtn)  loginBtn.style.display  = 'none';
    if(logoutBtn) logoutBtn.style.display = 'none';
    if(userInfo)  userInfo.style.display  = 'none';
    return;
  }

  if(loginBtn)  loginBtn.style.display  = (loggedIn || diffOpen) ? 'none'  : 'block';
  if(logoutBtn) logoutBtn.style.display = (loggedIn && !diffOpen) ? 'block' : 'none';
  if(userInfo){
    userInfo.style.display = (loggedIn && !diffOpen) ? 'block' : 'none';
    if(loggedIn && !diffOpen) userInfo.innerHTML =
      `<span style="color:#0ff;font-size:11px">ID: ${currentUserProfile.accountId}</span><br>` +
      `<span style="color:#fff;font-size:12px;font-weight:900">${currentUserProfile.displayName}</span>`;
  }
}

function showAuthMessage(msg, type='error'){
  const el = document.getElementById('authMessage');
  if(!el) return;
  el.textContent   = msg;
  el.style.color   = type === 'success' ? '#0f0' : '#f44';
  el.style.display = 'block';
}

// ============================================================
// HUD 更新
// ============================================================
function updateHUD(){
  const mult = getScoreMultiplier();
  document.getElementById('scoreDisplay').textContent  = Math.floor(score * mult).toLocaleString();
  document.getElementById('coinDisplay').textContent   = `🪙 ${gameCoins}`;
  document.getElementById('medalDisplay').textContent  = `🔘 ${gameMedals}`;
  document.getElementById('piecesDisplay').textContent = `🧩 ${pieces}`;
  document.getElementById('waveDisplay').textContent   = wave;
  document.getElementById('hpBar').style.width         = `${(playerHP / playerMaxHP) * 100}%`;
  document.getElementById('hpText').textContent        = `HP ${Math.ceil(playerHP)}/${playerMaxHP}`;

  const orbsPercent = (orbs / orbsTarget) * 100;
  document.getElementById('expBar').style.width        = `${orbsPercent}%`;
  document.getElementById('levelDisplay').textContent  = `Move ${moveLevel}`;
  const orbsDisplay = Math.round(orbs * 100) / 100;
  document.querySelector('.exp-sub').textContent       = `Orb ${orbsDisplay}/${orbsTarget}`;
  document.getElementById('livesDisplay').textContent  = `❤️ ${livesCurrent}/${livesMax}`;
  document.getElementById('livesBar').style.width      = `${(livesCurrent / livesMax) * 100}%`;

  // ニックネーム表示（固定幅）
  const nickEl = document.getElementById('nicknameDisplay');
  if(nickEl){
    nickEl.textContent = playerData.nickname;
    nickEl.style.minWidth  = '120px';
    nickEl.style.maxWidth  = '120px';
    nickEl.style.overflow  = 'hidden';
    nickEl.style.textOverflow = 'ellipsis';
    nickEl.style.whiteSpace = 'nowrap';
    nickEl.style.display   = 'inline-block';
  }

  document.getElementById('playerLevelText').textContent    = `LV ${playerData.level}`;
  const expPercent = (playerData.exp % EXP_PER_LEVEL) / EXP_PER_LEVEL * 100;
  document.getElementById('playerExpBar').style.width       = `${expPercent}%`;
  document.getElementById('playerHSDisplay').textContent    = playerData.highScore.toLocaleString();
  document.getElementById('playerCoinDisplay').textContent  = playerData.coins;
  document.getElementById('playerMedalDisplay').textContent = playerData.medals;

  if(bossActive && boss) document.getElementById('bossHpBar').style.width = `${(boss.hp / boss.maxHp) * 100}%`;
  updateSkillButtons();
  updateActiveEffects();
}

// ============================================================
// アクティブエフェクト表示
// ============================================================
function updateActiveEffects(){
  const el = document.getElementById('activeEffects');
  if(!el) return;
  const effects = [];
  if(player.shield && player.invincible > 0)
    effects.push({ icon:'🛡️', label:'SHIELD',   time:player.invincible, color:'#0ff' });
  if(player.rapidFire > 0)
    effects.push({ icon:'⚡',  label:'RAPID',    time:player.rapidFire,  color:'#ff0' });
  if(player.spread > 0)
    effects.push({ icon:'🌊',  label:'SPREAD',   time:player.spread,     color:'#0f0' });
  if(dropUpActive > 0)
    effects.push({ icon:'🌟',  label:'DROP UP',  time:dropUpActive,      color:'#f0f' });

  el.innerHTML = effects.map(e => {
    const pct = Math.min(100, (e.time / 5) * 100);
    return `
      <div style="background:rgba(0,10,30,.85);border:2px solid ${e.color};
                  border-radius:5px;padding:5px 10px;min-width:110px;
                  box-shadow:0 0 8px ${e.color}44">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
          <span style="font-size:14px">${e.icon}</span>
          <span style="color:${e.color};font-size:10px;font-weight:900;
                       text-shadow:0 0 6px ${e.color};letter-spacing:1px">${e.label}</span>
          <span style="color:#aaa;font-size:9px;margin-left:auto">${e.time.toFixed(1)}s</span>
        </div>
        <div style="height:3px;background:rgba(255,255,255,.1);border-radius:2px;overflow:hidden">
          <div style="width:${pct}%;height:100%;background:${e.color};border-radius:2px;
                      transition:width .1s;box-shadow:0 0 4px ${e.color}"></div>
        </div>
      </div>`;
  }).join('');
}

// ============================================================
// ホーム画面
// ============================================================
function updateHomeDisplay(){
  document.getElementById('homeHighScore').textContent  = playerData.highScore.toLocaleString();
  document.getElementById('homeCoinCount').textContent  = playerData.coins.toLocaleString();
  document.getElementById('homeMedalCount').textContent = playerData.medals.toLocaleString();
  document.getElementById('homeVoidolCount') && (document.getElementById('homeVoidolCount').textContent = playerData.voidols.toLocaleString());
  document.getElementById('homeLevelText').textContent  = `LV ${playerData.level}`;
  const expPercent = (playerData.exp % EXP_PER_LEVEL) / EXP_PER_LEVEL * 100;
  document.getElementById('homeExpBar').style.width     = `${expPercent}%`;
}

// ============================================================
// ショップ
// ============================================================
function showShop(){
  document.getElementById('homeScreen').style.display = 'none';
  document.getElementById('shopScreen').style.display = 'block';
  document.getElementById('shopCoinDisplay').textContent  = `🪙 ${playerData.coins.toLocaleString()}`;
  document.getElementById('shopMedalDisplay') && (document.getElementById('shopMedalDisplay').textContent = `🔘 ${playerData.medals.toLocaleString()}`);
  document.getElementById('shopVoidolDisplay') && (document.getElementById('shopVoidolDisplay').textContent = `💵 ${playerData.voidols.toLocaleString()}`);
  updateAuthUI(); // ショップ中は認証ボタン非表示
}

function hideShop(){
  document.getElementById('shopScreen').style.display = 'none';
  document.getElementById('homeScreen').style.display = 'block';
  updateHomeDisplay();
  updateAuthUI(); // ホーム戻ったら認証ボタン再表示
}

function buyShopItem(item){
  if(item === 'heal_up'      && playerData.coins >= 50) { playerData.coins -= 50;  playerHP = Math.min(playerMaxHP, playerHP + 50); }
  else if(item === 'max_lives'    && playerData.coins >= 100){ playerData.coins -= 100; livesMax += 20; livesCurrent += 20; }
  else if(item === 'damage_up'    && playerData.coins >= 150){ playerData.coins -= 150; damageMultiplier += 1; lvl.shots = Math.min(5, lvl.shots + 1); }
  else if(item === 'fire_rate_up' && playerData.coins >= 150){ playerData.coins -= 150; fireRateMultiplier += 0.5; }
  savePlayerData();
  document.getElementById('shopCoinDisplay').textContent = `🪙 ${playerData.coins.toLocaleString()}`;
}

// ============================================================
// ボイドル両替所
// ============================================================
const VOIDOL_EXCHANGE = {
  voidolToCoin: [
    { voidols:50,   coins:50000   },
    { voidols:75,   coins:80000   },
    { voidols:100,  coins:120000  },
    { voidols:250,  coins:320000  },
    { voidols:300,  coins:480000  },
    { voidols:500,  coins:850000  },
    { voidols:1000, coins:1800000 },
  ],
  voidolToMedal: [
    { voidols:50,   medals:2000   },
    { voidols:75,   medals:3500   },
    { voidols:100,  medals:7000   },
    { voidols:250,  medals:21000  },
    { voidols:300,  medals:28000  },
    { voidols:500,  medals:50000  },
    { voidols:1000, medals:130000 },
  ],
  coinToVoidol: [
    { coins:1000000,  voidols:50   },
    { coins:5000000,  voidols:350  },
    { coins:10000000, voidols:1000 },
  ],
  medalToVoidol: [
    { medals:500000,  voidols:100  },
    { medals:1000000, voidols:700  },
    { medals:5000000, voidols:2000 },
  ],
};

let exchangeTab = 'voidolToCoin';

function showExchange(){
  renderExchange();
  document.getElementById('exchangeOverlay').style.display = 'flex';
}

function closeExchange(){
  document.getElementById('exchangeOverlay').style.display = 'none';
}

function switchExchangeTab(tab){
  exchangeTab = tab;
  renderExchange();
}

function renderExchange(){
  const overlay = document.getElementById('exchangeOverlay');
  if(!overlay) return;

  const tabs = [
    { id:'voidolToCoin',  label:'💵→🪙' },
    { id:'voidolToMedal', label:'💵→🔘' },
    { id:'coinToVoidol',  label:'🪙→💵' },
    { id:'medalToVoidol', label:'🔘→💵' },
  ];

  const tabHtml = tabs.map(t => `
    <button onclick="switchExchangeTab('${t.id}')"
            style="padding:8px 14px;border:none;border-radius:4px;cursor:pointer;font-weight:900;font-size:13px;
                   background:${exchangeTab===t.id?'rgba(0,255,255,.25)':'rgba(255,255,255,.05)'};
                   color:${exchangeTab===t.id?'#0ff':'#888'};
                   border-bottom:${exchangeTab===t.id?'2px solid #0ff':'2px solid transparent'}">
      ${t.label}
    </button>
  `).join('');

  const items = VOIDOL_EXCHANGE[exchangeTab];
  const itemsHtml = items.map(item => {
    let fromLabel, toLabel, canAfford;
    if(exchangeTab === 'voidolToCoin'){
      fromLabel = `💵 ${item.voidols} ボイドル`;
      toLabel   = `🪙 ${item.coins.toLocaleString()} コイン`;
      canAfford = playerData.voidols >= item.voidols;
    } else if(exchangeTab === 'voidolToMedal'){
      fromLabel = `💵 ${item.voidols} ボイドル`;
      toLabel   = `🔘 ${item.medals.toLocaleString()} メダル`;
      canAfford = playerData.voidols >= item.voidols;
    } else if(exchangeTab === 'coinToVoidol'){
      fromLabel = `🪙 ${item.coins.toLocaleString()} コイン`;
      toLabel   = `💵 ${item.voidols} ボイドル`;
      canAfford = playerData.coins >= item.coins;
    } else {
      fromLabel = `🔘 ${item.medals.toLocaleString()} メダル`;
      toLabel   = `💵 ${item.voidols} ボイドル`;
      canAfford = playerData.medals >= item.medals;
    }
    const itemJson = JSON.stringify(item).replace(/"/g, '&quot;');
    return `
      <div style="background:rgba(0,30,60,.7);border:1px solid ${canAfford?'#0ff':'#333'};
                  border-radius:8px;padding:14px;margin-bottom:10px;
                  display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="color:#aaa;font-size:12px;margin-bottom:4px">${fromLabel}</div>
          <div style="color:#0ff;font-size:16px;font-weight:900">→ ${toLabel}</div>
        </div>
        <button onclick="doExchange('${exchangeTab}', ${itemJson})"
                ${canAfford?'':'disabled'}
                style="background:${canAfford?'linear-gradient(135deg,#0ff,#0af)':'#333'};
                       color:${canAfford?'#000':'#666'};border:none;padding:10px 18px;
                       border-radius:6px;cursor:${canAfford?'pointer':'not-allowed'};
                       font-weight:900;font-size:13px;white-space:nowrap">
          両替する
        </button>
      </div>
    `;
  }).join('');

  const content = document.getElementById('exchangeContent');
  if(content) content.innerHTML = `
    <div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap">${tabHtml}</div>
    <div style="color:#aaa;font-size:11px;margin-bottom:12px">
      💵 所持ボイドル: <span style="color:#ff0;font-weight:900">${playerData.voidols}</span> |
      🪙 ${playerData.coins.toLocaleString()} |
      🔘 ${playerData.medals.toLocaleString()}
    </div>
    ${itemsHtml}
  `;
}

function doExchange(tab, item){
  if(tab === 'voidolToCoin'){
    if(playerData.voidols < item.voidols) return;
    playerData.voidols -= item.voidols;
    playerData.coins   += item.coins;
    showExchangeEffect(`🪙 +${item.coins.toLocaleString()} コイン`);
  } else if(tab === 'voidolToMedal'){
    if(playerData.voidols < item.voidols) return;
    playerData.voidols -= item.voidols;
    playerData.medals  += item.medals;
    showExchangeEffect(`🔘 +${item.medals.toLocaleString()} メダル`);
  } else if(tab === 'coinToVoidol'){
    if(playerData.coins < item.coins) return;
    playerData.coins   -= item.coins;
    playerData.voidols += item.voidols;
    showExchangeEffect(`💵 +${item.voidols} ボイドル`);
  } else if(tab === 'medalToVoidol'){
    if(playerData.medals < item.medals) return;
    playerData.medals  -= item.medals;
    playerData.voidols += item.voidols;
    showExchangeEffect(`💵 +${item.voidols} ボイドル`);
  }
  savePlayerData();
  if(currentUser) syncPlayerDataToCloud();
  renderExchange();
}

function showExchangeEffect(text){
  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed;top:45%;left:50%;transform:translate(-50%,-50%);
    color:#0ff;font-size:24px;font-weight:900;
    text-shadow:0 0 20px #0ff;z-index:99999;pointer-events:none;
    animation:fadeUpOut 1.5s ease-out forwards;font-family:Orbitron,monospace;
  `;
  el.textContent = text + ' GET!';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1500);
}

// ============================================================
// 特別コード入力
// ============================================================
function showCodeInput(){
  document.getElementById('codeInputOverlay').style.display = 'flex';
  document.getElementById('codeInputField').value = '';
  document.getElementById('codeInputResult').textContent = '';
}

function closeCodeInput(){
  document.getElementById('codeInputOverlay').style.display = 'none';
}

async function submitCode(){
  const code = document.getElementById('codeInputField').value.trim();
  const resultEl = document.getElementById('codeInputResult');
  if(!code){ resultEl.style.color='#f44'; resultEl.textContent='コードを入力してください'; return; }
  if(!currentUser){ resultEl.style.color='#f44'; resultEl.textContent='ログインが必要です'; return; }
  resultEl.style.color='#aaa'; resultEl.textContent='確認中...';
  const result = await redeemSpecialCode(code);
  if(result.success){
    resultEl.style.color='#0f0';
    resultEl.textContent = `✅ ${result.reward} GET!`;
    updateHomeDisplay();
  } else {
    resultEl.style.color='#f44';
    resultEl.textContent = `❌ ${result.error}`;
  }
}

// ============================================================
// ランキング（4種類）
// ============================================================
let rankingTab     = 'all';
let dailySubTab    = 'today'; // 'today' | 'yesterday'

async function showRanking(){
  const overlay = document.getElementById('rankingOverlay');
  overlay.style.display = 'flex';
  renderRankingTabs();
  await loadRankingTab();
}

function closeRanking(){
  document.getElementById('rankingOverlay').style.display = 'none';
}

function renderRankingTabs(){
  const tabs = [
    { id:'all',     label:'通算' },
    { id:'monthly', label:'月別' },
    { id:'weekly',  label:'週別' },
    { id:'daily',   label:'日別' },
  ];
  const container = document.getElementById('rankingTabBar');
  if(!container) return;
  container.innerHTML = tabs.map(t => `
    <button onclick="switchRankingTab('${t.id}')"
            style="padding:8px 16px;border:none;border-radius:4px 4px 0 0;cursor:pointer;
                   font-weight:900;font-size:12px;font-family:Orbitron,monospace;
                   background:${rankingTab===t.id?'rgba(0,255,255,.2)':'rgba(255,255,255,.05)'};
                   color:${rankingTab===t.id?'#0ff':'#666'};
                   border-bottom:${rankingTab===t.id?'2px solid #0ff':'2px solid transparent'}">
      ${t.label}
    </button>
  `).join('');
}

async function switchRankingTab(tab){
  rankingTab = tab;
  renderRankingTabs();
  await loadRankingTab();
}

async function loadRankingTab(){
  const list = document.getElementById('rankingList');
  list.innerHTML = '<div style="color:#aaa;text-align:center;padding:20px">読み込み中...</div>';

  // 日別サブタブ
  const subTabBar = document.getElementById('rankingSubTabBar');
  if(subTabBar){
    if(rankingTab === 'daily'){
      subTabBar.style.display = 'flex';
      subTabBar.innerHTML = `
        <button onclick="switchDailySubTab('today')"
                style="padding:6px 14px;border:none;border-radius:3px;cursor:pointer;font-size:11px;
                       background:${dailySubTab==='today'?'rgba(0,255,200,.2)':'transparent'};
                       color:${dailySubTab==='today'?'#0fc':'#666'}">今日</button>
        <button onclick="switchDailySubTab('yesterday')"
                style="padding:6px 14px;border:none;border-radius:3px;cursor:pointer;font-size:11px;
                       background:${dailySubTab==='yesterday'?'rgba(0,255,200,.2)':'transparent'};
                       color:${dailySubTab==='yesterday'?'#0fc':'#666'}">昨日</button>
      `;
    } else {
      subTabBar.style.display = 'none';
    }
  }

  let entries = [];
  let periodLabel = '';

  if(rankingTab === 'all'){
    entries = await fetchOnlineRanking();
    periodLabel = '通算ハイスコア';
  } else if(rankingTab === 'monthly'){
    entries = await fetchMonthlyRanking(getMonthKey());
    periodLabel = `${getMonthKey()} 月別ハイスコア`;
  } else if(rankingTab === 'weekly'){
    entries = await fetchWeeklyRanking(getWeekKey());
    periodLabel = `今週の週別ハイスコア`;
  } else if(rankingTab === 'daily'){
    const key = dailySubTab === 'today' ? getDateKey() : getYesterdayKey();
    entries = await fetchDailyRanking(key);
    periodLabel = dailySubTab === 'today' ? '今日のハイスコア' : '昨日のハイスコア';
  }

  // 週別・月別は報酬対象順位を表示
  const rewardRanks = (rankingTab === 'weekly') ? [1,2,3,4,5] : (rankingTab === 'monthly') ? [1,2,3,4,5] : [];
  const weeklyRewardLabels  = ['5000🔘','2000🔘','1000🔘','2000🪙','1000🪙'];
  const monthlyRewardLabels = ['10💵+10000🔘+30000🪙','5💵+5000🔘+10000🪙','3💵+3000🔘+5000🪙','1💵+1000🔘+2500🪙','1💵+500🔘+1000🪙'];

  list.innerHTML = '';
  const header = document.createElement('div');
  header.style.cssText = 'color:#aaa;font-size:11px;text-align:center;margin-bottom:12px;letter-spacing:1px';
  header.textContent = periodLabel;
  list.appendChild(header);

  if(entries.length === 0){
    list.innerHTML += '<div style="color:#aaa;text-align:center;padding:20px">まだデータがありません</div>';
    return;
  }

  entries.forEach((entry, i) => {
    const rank   = i + 1;
    const isMe   = currentUserProfile && entry.accountId === currentUserProfile.accountId;
    const hasReward = rewardRanks.includes(rank);
    const rewardLabel = rankingTab === 'weekly' ? weeklyRewardLabels[rank-1]
                      : rankingTab === 'monthly' ? monthlyRewardLabels[rank-1] : '';

    const item = document.createElement('div');
    item.className = 'ranking-item';
    item.style.borderColor = isMe ? '#ff0' : (rank===1?'#ffd700':rank===2?'#c0c0c0':rank===3?'#cd7f32':'#0ff');
    item.innerHTML = `
      <div>
        <span class="ranking-rank" style="color:${rank===1?'#ffd700':rank===2?'#c0c0c0':rank===3?'#cd7f32':'#0ff'}">#${rank}</span>
        <span class="ranking-score">${entry.score.toLocaleString()}</span>
        ${isMe ? '<span style="color:#ff0;font-size:9px"> ◀ YOU</span>' : ''}
        ${hasReward ? `<span style="color:#f0f;font-size:9px;margin-left:4px">🎁 ${rewardLabel}</span>` : ''}
        <div class="ranking-details">
          ${entry.displayName} (${entry.accountId}) |
          WAVE ${entry.wave} | LV ${entry.level}
        </div>
      </div>`;
    list.appendChild(item);
  });
}

async function switchDailySubTab(sub){
  dailySubTab = sub;
  await loadRankingTab();
}

function getYesterdayKey(){
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function showGameOverRanking(){
  const list = document.getElementById('gameOverRankingList');
  list.innerHTML = '';
  if(playerData.rankings.length === 0){
    list.innerHTML = '<div style="text-align:center;color:#aaa;padding:10px;font-size:12px">まだランキングがありません</div>';
  } else {
    playerData.rankings.slice(0, 5).forEach((entry, i) => {
      const item = document.createElement('div');
      item.style.cssText = 'background:rgba(0,40,80,.6);border:1px solid #0ff;border-radius:3px;padding:6px;margin-bottom:5px;display:flex;justify-content:space-between;font-size:11px';
      item.innerHTML = `
        <span style="color:#ffd700;font-weight:900">#${i+1}</span>
        <span style="color:#0ff">${entry.score.toLocaleString()}</span>
        <span style="color:#aaa;font-size:9px">W${entry.wave} LV${entry.level}</span>
      `;
      list.appendChild(item);
    });
  }
}

// ============================================================
// 難易度選択
// ============================================================
let pendingDifficulty = 'normal';

function selectDifficulty(){
  pendingDifficulty = playerData.lastDifficulty || 'normal';
  document.getElementById('homeScreen').style.display       = 'none';
  document.getElementById('difficultySelect').style.display = 'flex';
  renderDifficultyButtons();
  renderBonusArea();
  updateAuthUI();
}

function chooseDifficulty(d){
  pendingDifficulty = d;
  renderDifficultyButtons();
}

function renderDifficultyButtons(){
  const defs = [
    { id:'easy',      label:'🔰 EASY'      },
    { id:'normal',    label:'🎮 NORMAL'    },
    { id:'hard',      label:'💀 HARD'      },
    { id:'expert',    label:'🔥 EXPERT'    },
    { id:'nightmare', label:'👿 NIGHTMARE' },
  ];
  const container = document.getElementById('difficultyBtns');
  container.innerHTML = defs.map(d => `
    <button class="btn difficulty ${pendingDifficulty === d.id ? 'active' : ''}"
            onclick="chooseDifficulty('${d.id}')">${d.label}</button>
  `).join('');
}

function confirmDifficulty(){
  const nick = document.getElementById('nicknameInput').value.trim();
  if(nick) playerData.nickname = nick;
  playerData.lastDifficulty = pendingDifficulty;
  savePlayerData();
  difficulty = pendingDifficulty;
  setDifficultyMultipliers();
  document.getElementById('homeDiffLabel').textContent = difficulty.toUpperCase();
  startGame();
}

function cancelDifficulty(){
  BONUS_DEFS.forEach(b => {
    if(selectedBonuses[b.id]){
      selectedBonuses[b.id] = false;
      playerData.coins += b.cost;
    }
  });
  savePlayerData();
  document.getElementById('difficultySelect').style.display = 'none';
  document.getElementById('homeScreen').style.display       = 'block';
  updateHomeDisplay();
  updateAuthUI();
}

// ============================================================
// 操作説明・チュートリアル
// ============================================================
function showControls(){
  document.getElementById('controlsOverlay').style.display = 'flex';
}
function closeControls(){
  document.getElementById('controlsOverlay').style.display = 'none';
}
function showTutorialStart(){
  document.getElementById('tutorialPhaseDesc').textContent =
    '敵を 20 体倒すとクリア！操作しながら敵を倒して習得しよう。';
  document.getElementById('tutorialOverlay').style.display = 'flex';
}
function skipTutorial(){
  document.getElementById('tutorialOverlay').style.display = 'none';
}

// ============================================================
// お知らせ
// ============================================================
const LATEST_NEWS_VERSION = "1.4.0";

function checkNewsStatus(){
  const lastReadVersion = localStorage.getItem('lastReadNewsVersion');
  const badge = document.getElementById('newsNewBadge');
  if(badge) badge.style.display = (lastReadVersion !== LATEST_NEWS_VERSION) ? 'block' : 'none';
}

function showNewsOverlay(){
  document.getElementById('newsOverlay').style.display = 'flex';
  localStorage.setItem('lastReadNewsVersion', LATEST_NEWS_VERSION);
  const badge = document.getElementById('newsNewBadge');
  if(badge) badge.style.display = 'none';
}

function closeNewsOverlay(){
  document.getElementById('newsOverlay').style.display = 'none';
}

// ============================================================
// ゲームオーバー後の画面遷移
// ============================================================
function goHome(){
  document.getElementById('gameOverScreen').style.display = 'none';
  document.getElementById('homeScreen').style.display     = 'block';
  document.getElementById('nicknameInput').value = playerData.nickname;
  updateHomeDisplay();
  updateHUD();
  updateAuthUI();
}

function retryGame(){
  document.getElementById('gameOverScreen').style.display = 'none';
  selectDifficulty();
}

// ============================================================
// アップデート確認（Firestore版）
// ============================================================
const GAME_VERSION = "1.4.0";

function checkForUpdates(){
  fbDb.collection('config').doc('version').get()
    .then(doc => {
      if(!doc.exists) return;
      const data = doc.data();
      console.log("📦 バージョン情報を取得:", data);
      if(compareVersions(data.version, GAME_VERSION) > 0){
        displayUpdateNotification(data);
      } else {
        console.info("✅ 最新バージョンを使用中:", GAME_VERSION);
      }
    })
    .catch(err => {
      console.warn("⚠️ バージョンチェック失敗:", err.message);
    });
}

function compareVersions(v1, v2){
  const p1 = v1.split('.').map(Number);
  const p2 = v2.split('.').map(Number);
  for(let i = 0; i < Math.max(p1.length, p2.length); i++){
    const a = p1[i]||0, b = p2[i]||0;
    if(a > b) return 1;
    if(a < b) return -1;
  }
  return 0;
}

function displayUpdateNotification(data){
  const updateBox = document.createElement('div');
  updateBox.id = 'updateNotification';
  updateBox.style.cssText = `
    position:fixed;bottom:20px;right:20px;
    background:rgba(0,0,0,0.95);color:#0ff;
    padding:18px 22px;border:2px solid #0ff;border-radius:8px;
    font-family:Orbitron,monospace;z-index:9999;max-width:340px;
    box-shadow:0 0 25px rgba(0,255,255,0.6);animation:slideInRight 0.5s ease-out;
  `;
  const changesList = data.changes
    ? data.changes.map(c => `<div style="font-size:9px;color:#aaa;margin-left:10px">• ${c}</div>`).join('')
    : '';
  updateBox.innerHTML = `
    <div style="font-size:15px;font-weight:900;margin-bottom:10px;color:#ff0;text-shadow:0 0 10px #ff0">
      🔔 新バージョン ${data.version} 公開！
    </div>
    <div style="font-size:11px;margin-bottom:8px;color:#fff;line-height:1.6">${data.message}</div>
    ${changesList}
    <div style="font-size:9px;color:#666;margin:10px 0 12px 0">📅 ${data.release_date}</div>
    <a href="${data.download_url}" target="_blank"
       style="display:block;background:linear-gradient(135deg,#0ff,#0af);color:#000;padding:12px;
              text-align:center;text-decoration:none;border-radius:5px;font-weight:900;font-size:13px;
              margin-bottom:8px;letter-spacing:1px">📥 今すぐアップデート</a>
    <button onclick="this.parentElement.remove()"
            style="background:transparent;border:1px solid #555;color:#888;padding:8px;width:100%;
                   border-radius:4px;cursor:pointer;font-size:10px">後で確認する</button>
  `;
  document.body.appendChild(updateBox);
}

// アニメーション用CSS
const _style = document.createElement('style');
_style.textContent = `
  @keyframes slideInRight {
    from { transform:translateX(400px); opacity:0; }
    to   { transform:translateX(0);     opacity:1; }
  }
  @keyframes fadeUpOut {
    0%   { opacity:1; transform:translate(-50%,-50%); }
    100% { opacity:0; transform:translate(-50%,-120%); }
  }
`;
document.head.appendChild(_style);

window.addEventListener('load', () => {
  setTimeout(checkForUpdates, 1000);
});