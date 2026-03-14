// ============================================================
// ui.js
// HUD更新・ホーム画面・ショップ・ランキング・難易度選択・各種オーバーレイ
// キャラ選択画面・ガチャ画面
// ============================================================

// ============================================================
// ログイン成功 / ログアウト UI
// ============================================================
function onLoginSuccess(profile){
  playerData.nickname = profile.displayName;
  const ni = document.getElementById('nicknameInput');
  if(ni) ni.value = profile.displayName;
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
  const shopOpen  = document.getElementById('shopScreen') &&
                    document.getElementById('shopScreen').style.display === 'block';
  const diffOpen  = document.getElementById('difficultySelect') &&
                    document.getElementById('difficultySelect').style.display === 'flex';

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
  const mult = getScoreMultiplier() * getCharScoreMult();
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
  const expSubEl = document.querySelector('.exp-sub');
  if(expSubEl) expSubEl.textContent = `Orb ${orbsDisplay}/${orbsTarget}`;
  document.getElementById('livesDisplay').textContent  = `❤️ ${livesCurrent}/${livesMax}`;
  document.getElementById('livesBar').style.width      = `${(livesCurrent / livesMax) * 100}%`;

  const nickEl = document.getElementById('nicknameDisplay');
  if(nickEl){
    nickEl.textContent        = playerData.nickname;
    nickEl.style.minWidth     = '120px';
    nickEl.style.maxWidth     = '120px';
    nickEl.style.overflow     = 'hidden';
    nickEl.style.textOverflow = 'ellipsis';
    nickEl.style.whiteSpace   = 'nowrap';
    nickEl.style.display      = 'inline-block';
  }

  document.getElementById('playerLevelText').textContent    = `LV ${playerData.level}`;
  const expPercent = (playerData.exp % EXP_PER_LEVEL) / EXP_PER_LEVEL * 100;
  document.getElementById('playerExpBar').style.width       = `${expPercent}%`;
  document.getElementById('playerHSDisplay').textContent    = playerData.highScore.toLocaleString();
  document.getElementById('playerCoinDisplay').textContent  = playerData.coins.toLocaleString();
  document.getElementById('playerMedalDisplay').textContent = playerData.medals.toLocaleString();

  if(bossActive && boss) document.getElementById('bossHpBar').style.width = `${(boss.hp / boss.maxHp) * 100}%`;
  updateCharSkillUI();
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
    effects.push({ icon:'🛡️', label:'SHIELD',  time:player.invincible, color:'#0ff' });
  if(player.rapidFire > 0)
    effects.push({ icon:'⚡',  label:'RAPID',   time:player.rapidFire,  color:'#ff0' });
  if(player.spread > 0)
    effects.push({ icon:'🌊',  label:'SPREAD',  time:player.spread,     color:'#0f0' });
  if((player.speedBoost || 1) > 1)
    effects.push({ icon:'💨',  label:'SPEED',   time:1,                 color:'#8f8' });

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
  const s = (id, v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
  s('homeHighScore',  playerData.highScore.toLocaleString());
  s('homeCoinCount',  playerData.coins.toLocaleString());
  s('homeMedalCount', playerData.medals.toLocaleString());
  s('homeVoidolCount',playerData.voidols.toLocaleString());
  s('homeLevelText',  `LV ${playerData.level}`);
  const expPercent = (playerData.exp % EXP_PER_LEVEL) / EXP_PER_LEVEL * 100;
  const expBar = document.getElementById('homeExpBar');
  if(expBar) expBar.style.width = `${expPercent}%`;

  // ホーム中央のキャラ表示更新
  updateHomeCharDisplay();
}

function updateHomeCharDisplay(){
  const el = document.getElementById('homeCharDisplay');
  if(!el) return;
  const char  = getSelectedChar();
  const state = getCharState(char.id);
  el.innerHTML = `
    <div style="font-size:32px">${char.emoji}</div>
    <div style="text-align:left">
      <div style="color:#0ff;font-size:13px;font-weight:900">${char.name}</div>
      <div style="color:#aaa;font-size:10px">LV ${state.level} / CLASS ${state.classLv}</div>
    </div>
    <div style="color:#888;font-size:11px;margin-left:4px">▼ キャラ変更</div>
  `;
}

// ============================================================
// ショップ（Coming Soon に変更）
// ============================================================
function showShop(){
  document.getElementById('homeScreen').style.display = 'none';
  document.getElementById('shopScreen').style.display = 'block';
  renderShopContent();
  updateAuthUI();
}

function hideShop(){
  document.getElementById('shopScreen').style.display = 'none';
  document.getElementById('homeScreen').style.display = 'block';
  updateHomeDisplay();
  updateAuthUI();
}

function renderShopContent(){
  // 右上の通貨表示を更新
  const s = (id, v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
  s('shopCoinDisplay',   playerData.coins.toLocaleString());
  s('shopMedalDisplay',  playerData.medals.toLocaleString());
  s('shopVoidolDisplay', playerData.voidols.toLocaleString());

  const grid = document.getElementById('shopItemGrid');
  if(grid){
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:30px 20px;
                  border:2px dashed #333;border-radius:8px;color:#555">
        <div style="font-size:28px;margin-bottom:10px">🚧</div>
        <div style="font-size:14px;color:#666">Coming Soon</div>
        <div style="font-size:11px;margin-top:8px;color:#444">
          ショップアイテムは近日実装予定です
        </div>
      </div>
    `;
  }
}

function buyShopItem(){ /* Coming Soon */ }

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
  const content = document.getElementById('exchangeContent');
  if(!content) return;
  const tabs = [
    { id:'voidolToCoin',  label:'💵→🪙' },
    { id:'voidolToMedal', label:'💵→🔘' },
    { id:'coinToVoidol',  label:'🪙→💵' },
    { id:'medalToVoidol', label:'🔘→💵' },
  ];
  const tabHtml = tabs.map(t => `
    <button onclick="switchExchangeTab('${t.id}')"
            style="padding:8px 14px;border:none;border-radius:4px;cursor:pointer;
                   font-weight:900;font-size:13px;font-family:Orbitron,monospace;
                   background:${exchangeTab===t.id?'rgba(0,255,255,.25)':'rgba(255,255,255,.05)'};
                   color:${exchangeTab===t.id?'#0ff':'#888'};
                   border-bottom:${exchangeTab===t.id?'2px solid #0ff':'2px solid transparent'}">
      ${t.label}
    </button>`).join('');

  const items = VOIDOL_EXCHANGE[exchangeTab];
  const itemsHtml = items.map(item => {
    let fromLabel, toLabel, canAfford;
    if(exchangeTab==='voidolToCoin'){
      fromLabel=`💵 ${item.voidols}`; toLabel=`🪙 ${item.coins.toLocaleString()}`; canAfford=playerData.voidols>=item.voidols;
    } else if(exchangeTab==='voidolToMedal'){
      fromLabel=`💵 ${item.voidols}`; toLabel=`🔘 ${item.medals.toLocaleString()}`; canAfford=playerData.voidols>=item.voidols;
    } else if(exchangeTab==='coinToVoidol'){
      fromLabel=`🪙 ${item.coins.toLocaleString()}`; toLabel=`💵 ${item.voidols}`; canAfford=playerData.coins>=item.coins;
    } else {
      fromLabel=`🔘 ${item.medals.toLocaleString()}`; toLabel=`💵 ${item.voidols}`; canAfford=playerData.medals>=item.medals;
    }
    const ij = JSON.stringify(item).replace(/"/g,'&quot;');
    return `
      <div style="background:rgba(0,30,60,.7);border:1px solid ${canAfford?'#0ff':'#333'};
                  border-radius:8px;padding:14px;margin-bottom:10px;
                  display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="color:#aaa;font-size:12px;margin-bottom:4px">${fromLabel}</div>
          <div style="color:#0ff;font-size:16px;font-weight:900">→ ${toLabel}</div>
        </div>
        <button onclick="doExchange('${exchangeTab}',${ij})" ${canAfford?'':'disabled'}
                style="background:${canAfford?'linear-gradient(135deg,#0ff,#0af)':'#333'};
                       color:${canAfford?'#000':'#666'};border:none;padding:10px 18px;
                       border-radius:6px;cursor:${canAfford?'pointer':'not-allowed'};
                       font-weight:900;font-size:13px">両替する</button>
      </div>`;
  }).join('');

  content.innerHTML = `
    <div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap">${tabHtml}</div>
    <div style="color:#aaa;font-size:11px;margin-bottom:12px">
      💵 <span style="color:#ff0;font-weight:900">${playerData.voidols}</span> |
      🪙 ${playerData.coins.toLocaleString()} |
      🔘 ${playerData.medals.toLocaleString()}
    </div>
    ${itemsHtml}`;
}

function doExchange(tab, item){
  if(tab==='voidolToCoin'){
    if(playerData.voidols<item.voidols) return;
    playerData.voidols-=item.voidols; playerData.coins+=item.coins;
    showExchangeEffect(`🪙 +${item.coins.toLocaleString()}`);
  } else if(tab==='voidolToMedal'){
    if(playerData.voidols<item.voidols) return;
    playerData.voidols-=item.voidols; playerData.medals+=item.medals;
    showExchangeEffect(`🔘 +${item.medals.toLocaleString()}`);
  } else if(tab==='coinToVoidol'){
    if(playerData.coins<item.coins) return;
    playerData.coins-=item.coins; playerData.voidols+=item.voidols;
    showExchangeEffect(`💵 +${item.voidols}`);
  } else {
    if(playerData.medals<item.medals) return;
    playerData.medals-=item.medals; playerData.voidols+=item.voidols;
    showExchangeEffect(`💵 +${item.voidols}`);
  }
  savePlayerData();
  if(currentUser) syncPlayerDataToCloud();
  renderExchange();
}

function showExchangeEffect(text){
  const el = document.createElement('div');
  el.style.cssText = `position:fixed;top:45%;left:50%;transform:translate(-50%,-50%);
    color:#0ff;font-size:24px;font-weight:900;text-shadow:0 0 20px #0ff;
    z-index:99999;pointer-events:none;
    animation:fadeUpOut 1.5s ease-out forwards;font-family:Orbitron,monospace;`;
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
// ランキング（4タブ）
// ============================================================
let rankingTab  = 'all';
let dailySubTab = 'today';

async function showRanking(){
  document.getElementById('rankingOverlay').style.display = 'flex';
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
    </button>`).join('');
}

async function switchRankingTab(tab){
  rankingTab = tab;
  renderRankingTabs();
  await loadRankingTab();
}

async function loadRankingTab(){
  const list = document.getElementById('rankingList');
  list.innerHTML = '<div style="color:#aaa;text-align:center;padding:20px">読み込み中...</div>';

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
                       color:${dailySubTab==='yesterday'?'#0fc':'#666'}">昨日</button>`;
    } else {
      subTabBar.style.display = 'none';
    }
  }

  let entries = [], periodLabel = '';
  if(rankingTab==='all'){
    entries = await fetchOnlineRanking(); periodLabel = '通算ハイスコア';
  } else if(rankingTab==='monthly'){
    entries = await fetchMonthlyRanking(getMonthKey()); periodLabel = `${getMonthKey()} 月別`;
  } else if(rankingTab==='weekly'){
    entries = await fetchWeeklyRanking(getWeekKey()); periodLabel = '今週の週別';
  } else if(rankingTab==='daily'){
    const key = dailySubTab==='today' ? getDateKey() : getYesterdayKey();
    entries = await fetchDailyRanking(key);
    periodLabel = dailySubTab==='today' ? '今日' : '昨日';
  }

  const rewardRanks = (rankingTab==='weekly'||rankingTab==='monthly') ? [1,2,3,4,5] : [];
  const weeklyLabels  = ['5000🔘','2000🔘','1000🔘','2000🪙','1000🪙'];
  const monthlyLabels = ['10💵+10000🔘+30000🪙','5💵+5000🔘+10000🪙','3💵+3000🔘+5000🪙','1💵+1000🔘+2500🪙','1💵+500🔘+1000🪙'];

  list.innerHTML = '';
  const header = document.createElement('div');
  header.style.cssText = 'color:#aaa;font-size:11px;text-align:center;margin-bottom:12px';
  header.textContent = periodLabel;
  list.appendChild(header);

  if(entries.length === 0){
    list.innerHTML += '<div style="color:#aaa;text-align:center;padding:20px">まだデータがありません</div>';
    return;
  }

  entries.forEach((entry, i) => {
    const rank = i+1, isMe = currentUserProfile && entry.accountId===currentUserProfile.accountId;
    const hasReward = rewardRanks.includes(rank);
    const rewardLabel = rankingTab==='weekly' ? weeklyLabels[rank-1] : rankingTab==='monthly' ? monthlyLabels[rank-1] : '';
    const item = document.createElement('div');
    item.className = 'ranking-item';
    item.style.borderColor = isMe ? '#ff0' : (rank===1?'#ffd700':rank===2?'#c0c0c0':rank===3?'#cd7f32':'#0ff');
    item.innerHTML = `
      <div>
        <span class="ranking-rank" style="color:${rank===1?'#ffd700':rank===2?'#c0c0c0':rank===3?'#cd7f32':'#0ff'}">#${rank}</span>
        <span class="ranking-score">${entry.score.toLocaleString()}</span>
        ${isMe?'<span style="color:#ff0;font-size:9px"> ◀ YOU</span>':''}
        ${hasReward?`<span style="color:#f0f;font-size:9px;margin-left:4px">🎁 ${rewardLabel}</span>`:''}
        <div class="ranking-details">${entry.displayName} (${entry.accountId}) | WAVE ${entry.wave} | LV ${entry.level}</div>
      </div>`;
    list.appendChild(item);
  });
}

async function switchDailySubTab(sub){
  dailySubTab = sub;
  await loadRankingTab();
}
function getYesterdayKey(){
  const d = new Date(); d.setDate(d.getDate()-1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function showGameOverRanking(){
  const list = document.getElementById('gameOverRankingList');
  if(!list) return;
  list.innerHTML = '';
  if(!playerData.rankings || playerData.rankings.length===0){
    list.innerHTML = '<div style="text-align:center;color:#aaa;padding:10px;font-size:12px">まだランキングがありません</div>';
  } else {
    playerData.rankings.slice(0,5).forEach((entry,i) => {
      const item = document.createElement('div');
      item.style.cssText = 'background:rgba(0,40,80,.6);border:1px solid #0ff;border-radius:3px;padding:6px;margin-bottom:5px;display:flex;justify-content:space-between;font-size:11px';
      item.innerHTML = `
        <span style="color:#ffd700;font-weight:900">#${i+1}</span>
        <span style="color:#0ff">${entry.score.toLocaleString()}</span>
        <span style="color:#aaa;font-size:9px">W${entry.wave} LV${entry.level}</span>`;
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
  // キャラ選択ボタンを更新
  updateDifficultyCharBtn();
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
  if(!container) return;
  container.innerHTML = defs.map(d => `
    <button class="btn difficulty ${pendingDifficulty===d.id?'active':''}"
            onclick="chooseDifficulty('${d.id}')">${d.label}</button>`).join('');
}

function updateDifficultyCharBtn(){
  const btn = document.getElementById('diffCharSelectBtn');
  if(!btn) return;
  const char  = getSelectedChar();
  const state = getCharState(char.id);
  btn.innerHTML = `${char.emoji} ${char.name} LV${state.level} ▼ キャラ変更`;
}

function confirmDifficulty(){
  const nick = document.getElementById('nicknameInput');
  if(nick && nick.value.trim()) playerData.nickname = nick.value.trim();
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
// キャラ選択画面（ツムツム風）
// ============================================================
// callerが 'home' か 'diff'（難易度選択画面）かで戻り先を変える
let charSelectCaller = 'home';

function showCharSelect(caller = 'home'){
  charSelectCaller = caller;
  renderCharSelect();
  document.getElementById('charSelectOverlay').style.display = 'flex';
}

function closeCharSelect(){
  document.getElementById('charSelectOverlay').style.display = 'none';
}

let charDetailId = null;

function renderCharSelect(){
  const grid = document.getElementById('charSelectGrid');
  if(!grid) return;

  grid.innerHTML = CHARACTERS.map(c => {
    const state   = getCharState(c.id);
    const isOwned = state.owned;
    const isSel   = charData.selectedCharId === c.id;
    return `
      <div onclick="selectCharSlot('${c.id}')"
           style="position:relative;width:72px;height:72px;border-radius:50%;
                  background:${isOwned?'rgba(0,30,60,.9)':'rgba(20,20,20,.8)'};
                  border:3px solid ${isSel?'#ff0':isOwned?'#0ff':'#333'};
                  display:flex;flex-direction:column;align-items:center;justify-content:center;
                  cursor:${isOwned?'pointer':'default'};
                  box-shadow:${isSel?'0 0 16px #ff0':isOwned?'0 0 8px #0ff3':'none'};
                  transition:all .15s;flex-shrink:0">
        <span style="font-size:28px;filter:${isOwned?'none':'grayscale(100%) brightness(30%)'}">
          ${c.emoji}
        </span>
        ${isOwned ? `
          <span style="position:absolute;bottom:2px;left:50%;transform:translateX(-50%);
                       font-size:9px;color:${isSel?'#ff0':'#0ff'};font-weight:900;
                       white-space:nowrap">
            LV${state.level}
          </span>` : `
          <span style="position:absolute;inset:0;display:flex;align-items:center;
                       justify-content:center;color:#555;font-size:18px">🔒</span>`}
        ${isSel ? `
          <span style="position:absolute;top:-6px;right:-4px;
                       background:#ff0;color:#000;font-size:8px;font-weight:900;
                       border-radius:4px;padding:1px 4px">USE</span>` : ''}
      </div>`;
  }).join('');

  // 詳細パネル
  renderCharDetail(charDetailId || charData.selectedCharId);
}

function selectCharSlot(id){
  const state = getCharState(id);
  if(!state.owned){ renderCharDetail(id); charDetailId = id; return; }
  charDetailId = id;
  renderCharDetail(id);
}

function confirmCharSelect(){
  if(!charDetailId) return;
  const state = getCharState(charDetailId);
  if(!state.owned) return;
  selectCharacter(charDetailId);
  renderCharSelect();
  updateHomeCharDisplay();
  updateDifficultyCharBtn && updateDifficultyCharBtn();
}

function renderCharDetail(id){
  const panel = document.getElementById('charDetailPanel');
  if(!panel) return;
  const char  = getCharById(id);
  const state = getCharState(id);
  charDetailId = id;

  if(!state.owned){
    panel.innerHTML = `
      <div style="text-align:center;padding:20px">
        <div style="font-size:50px;filter:grayscale(100%);opacity:.4">${char.emoji}</div>
        <div style="color:#555;font-size:14px;margin-top:8px">${char.name}</div>
        <div style="color:#444;font-size:11px;margin-top:6px">ランク: ${char.rank}</div>
        <div style="color:#333;font-size:11px;margin-top:12px">🔒 ガチャで入手できます</div>
      </div>`;
    return;
  }

  const maxLv   = getCharMaxLevel(id);
  const expPct  = state.level >= maxLv ? 100 : (state.charExp / CHAR_EXP_PER_LEVEL * 100).toFixed(1);
  const clsPct  = state.classLv >= CHAR_CLASS_MAX ? 100 : (state.classExp / CHAR_CLASS_EXP_NEEDED * 100).toFixed(1);
  const isSel   = charData.selectedCharId === id;
  const skillE  = char.skills.e;
  const skillR  = char.skills.r;
  const costE   = getSkillCost(id, 'e');
  const costR   = getSkillCost(id, 'r');

  panel.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
      <div style="font-size:44px">${char.emoji}</div>
      <div>
        <div style="color:#0ff;font-size:16px;font-weight:900">${char.name}</div>
        <div style="color:#aaa;font-size:10px">${char.desc}</div>
        <div style="color:#ff0;font-size:10px;margin-top:2px">ランク: ${char.rank}</div>
      </div>
    </div>

    <!-- キャラLV -->
    <div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;font-size:11px;color:#0ff;margin-bottom:3px">
        <span>キャラLV ${state.level} / ${maxLv}</span>
        <span>EXP ${state.charExp.toLocaleString()} / ${CHAR_EXP_PER_LEVEL.toLocaleString()}</span>
      </div>
      <div style="height:6px;background:rgba(0,255,255,.1);border-radius:3px;overflow:hidden">
        <div style="width:${expPct}%;height:100%;background:linear-gradient(90deg,#0ff,#0af);border-radius:3px"></div>
      </div>
      <div style="color:#888;font-size:10px;margin-top:2px">
        スコア倍率: ×${(1 + state.level/100).toFixed(2)}
      </div>
    </div>

    <!-- クラス -->
    <div style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;font-size:11px;color:#f0f;margin-bottom:3px">
        <span>CLASS ${state.classLv} / ${CHAR_CLASS_MAX}</span>
        <span>${state.classExp} / ${CHAR_CLASS_EXP_NEEDED}</span>
      </div>
      <div style="height:6px;background:rgba(255,0,255,.1);border-radius:3px;overflow:hidden">
        <div style="width:${clsPct}%;height:100%;background:linear-gradient(90deg,#f0f,#a0f);border-radius:3px"></div>
      </div>
      <div style="display:flex;gap:4px;margin-top:5px">
        ${Array.from({length:CHAR_CLASS_MAX},(_,i)=>`
          <div style="flex:1;height:8px;border-radius:2px;
                      background:${i<state.classLv?'#f0f':'rgba(255,0,255,.15)'};
                      border:1px solid ${i<state.classLv?'#f0f':'#333'}"></div>`).join('')}
      </div>
    </div>

    <!-- スキル -->
    <div style="background:rgba(0,20,50,.7);border:1px solid #0ff3;border-radius:6px;padding:10px;margin-bottom:8px">
      <div style="color:#ff69b4;font-size:10px;font-weight:900;margin-bottom:4px">
        [E] ${skillE.name}
        <span style="color:#888;font-weight:400"> — ${costE}P
        ${skillE.cooldown > 0 ? ` / CD ${getSkillCooldown(id,'e').toFixed(1)}s` : ' / CD なし'}</span>
      </div>
      <div style="color:#ccc;font-size:10px">${skillE.desc}</div>
    </div>
    <div style="background:rgba(0,20,50,.7);border:1px solid #0ff3;border-radius:6px;padding:10px;margin-bottom:14px">
      <div style="color:#ff69b4;font-size:10px;font-weight:900;margin-bottom:4px">
        [R] ${skillR.name}
        <span style="color:#888;font-weight:400"> — ${costR}P
        ${skillR.cooldown > 0 ? ` / CD ${getSkillCooldown(id,'r').toFixed(1)}s` : ' / CD なし'}</span>
      </div>
      <div style="color:#ccc;font-size:10px">${skillR.desc}</div>
    </div>

    <!-- 選択ボタン -->
    <button onclick="confirmCharSelect()"
            style="width:100%;padding:12px;
                   background:${isSel?'rgba(255,255,0,.15)':'linear-gradient(135deg,#0ff,#0af)'};
                   color:${isSel?'#ff0':'#000'};border:${isSel?'2px solid #ff0':'none'};
                   border-radius:6px;cursor:pointer;font-weight:900;font-size:14px;
                   font-family:Orbitron,monospace">
      ${isSel ? '✅ 選択中' : '▶ このキャラで出撃'}
    </button>`;
}

// ============================================================
// ガチャ画面
// ============================================================
function showGacha(){
  renderGachaScreen();
  document.getElementById('gachaOverlay').style.display = 'flex';
}
function closeGacha(){
  document.getElementById('gachaOverlay').style.display = 'none';
}

function renderGachaScreen(){
  const content = document.getElementById('gachaContent');
  if(!content) return;

  const canAfford = playerData.coins >= GACHA_NORMAL_COST;

  content.innerHTML = `
    <!-- 所持通貨 -->
    <div style="display:flex;justify-content:center;gap:20px;margin-bottom:20px;
                background:rgba(0,20,50,.7);border-radius:8px;padding:12px">
      <span style="color:#ffd700;font-size:14px">🪙 ${playerData.coins.toLocaleString()}</span>
      <span style="color:#c0c0c0;font-size:14px">🔘 ${playerData.medals.toLocaleString()}</span>
      <span style="color:#ff0;font-size:14px">💵 ${playerData.voidols}</span>
    </div>

    <!-- ノーマルガチャ -->
    <div style="background:rgba(0,30,80,.8);border:2px solid #0ff;border-radius:12px;padding:20px;margin-bottom:16px">
      <div style="text-align:center;margin-bottom:14px">
        <div style="color:#0ff;font-size:20px;font-weight:900;text-shadow:0 0 10px #0ff">
          ⭐ ノーマルガチャ
        </div>
        <div style="color:#aaa;font-size:11px;margin-top:4px">全キャラ対象 / 分母60</div>
      </div>

      <!-- キャラ一覧プレビュー -->
      <div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-bottom:16px">
        ${CHARACTERS.map(c => {
          const state = getCharState(c.id);
          const owned = state.owned;
          return `<div style="text-align:center;opacity:${owned?'1':'0.4'}">
            <div style="font-size:22px">${c.emoji}</div>
            <div style="font-size:8px;color:${owned?'#0ff':'#555'}">${c.rank}</div>
          </div>`;
        }).join('')}
      </div>

      <button onclick="doNormalGacha()"
              ${canAfford?'':'disabled'}
              style="width:100%;padding:14px;
                     background:${canAfford?'linear-gradient(135deg,#0ff,#0af)':'#333'};
                     color:${canAfford?'#000':'#666'};border:none;border-radius:8px;
                     cursor:${canAfford?'pointer':'not-allowed'};font-weight:900;
                     font-size:16px;font-family:Orbitron,monospace">
        🎲 ガチャを引く — ${GACHA_NORMAL_COST.toLocaleString()} 🪙
      </button>
      ${!canAfford ? `<div style="color:#f44;font-size:11px;text-align:center;margin-top:8px">
        コインが足りません（あと ${(GACHA_NORMAL_COST - playerData.coins).toLocaleString()} 🪙 必要）
      </div>` : ''}
    </div>

    <!-- 他ガチャ Coming Soon -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      ${[
        { name:'プレミアムガチャ', cost:'300,000 🪙', color:'#ff0' },
        { name:'スペシャルガチャ', cost:'10,000 🔘',  color:'#f0f' },
        { name:'セレクトガチャ',   cost:'期間限定',    color:'#0f0' },
        { name:'ピックアップガチャ',cost:'期間限定',   color:'#f80' },
      ].map(g => `
        <div style="background:rgba(20,20,20,.7);border:1px dashed #333;
                    border-radius:8px;padding:12px;text-align:center">
          <div style="color:${g.color};font-size:12px;font-weight:900;margin-bottom:4px">${g.name}</div>
          <div style="color:#555;font-size:10px;margin-bottom:8px">${g.cost}</div>
          <div style="color:#444;font-size:11px">🚧 Coming Soon</div>
        </div>`).join('')}
    </div>`;
}

async function doNormalGacha(){
  const result = drawNormalGacha(false);
  if(!result.success){
    alert(result.error);
    return;
  }
  // charDataとplayerDataを両方保存・同期
  saveCharData();
  savePlayerData();
  if(currentUser) syncPlayerDataToCloud();
  showGachaResult(result);
}

function showGachaResult(result){
  const overlay = document.getElementById('gachaResultOverlay');
  const content = document.getElementById('gachaResultContent');
  if(!overlay || !content) return;

  const { char, isNew } = result;
  const state = getCharState(char.id);

  content.innerHTML = `
    <div style="text-align:center;padding:10px">
      <div style="font-size:80px;margin-bottom:10px;
                  animation:popIn .4s cubic-bezier(.17,.67,.83,.67)">${char.emoji}</div>
      <div style="color:#0ff;font-size:24px;font-weight:900;text-shadow:0 0 12px #0ff;
                  margin-bottom:6px">${char.name}</div>
      <div style="display:inline-block;background:rgba(255,255,0,.15);border:1px solid #ff0;
                  border-radius:4px;padding:3px 12px;color:#ff0;font-size:12px;margin-bottom:12px">
        RANK ${char.rank}
      </div>
      ${isNew ? `
        <div style="color:#0f0;font-size:18px;font-weight:900;margin-bottom:8px">
          🎉 NEW! 初入手！
        </div>
        <div style="color:#aaa;font-size:11px">キャラLV1からスタート！</div>
      ` : `
        <div style="color:#f0f;font-size:16px;font-weight:900;margin-bottom:8px">
          ✨ 重複！クラスEXP +1
        </div>
        <div style="color:#aaa;font-size:11px">CLASS ${state.classLv} / ${CHAR_CLASS_MAX}</div>
      `}
    </div>`;

  overlay.style.display = 'flex';
  renderGachaScreen();
  updateHomeDisplay();
}

function closeGachaResult(){
  document.getElementById('gachaResultOverlay').style.display = 'none';
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
const LATEST_NEWS_VERSION = "1.5.0";

function checkNewsStatus(){
  const lastRead = localStorage.getItem('lastReadNewsVersion');
  const badge = document.getElementById('newsNewBadge');
  if(badge) badge.style.display = (lastRead !== LATEST_NEWS_VERSION) ? 'block' : 'none';
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
  const ni = document.getElementById('nicknameInput');
  if(ni) ni.value = playerData.nickname;
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
const GAME_VERSION = "1.5.0";

function checkForUpdates(){
  if(typeof fbDb === 'undefined') return;
  fbDb.collection('config').doc('version').get()
    .then(doc => {
      if(!doc.exists) return;
      const data = doc.data();
      if(compareVersions(data.version, GAME_VERSION) > 0) displayUpdateNotification(data);
      else console.info("✅ 最新バージョン:", GAME_VERSION);
    })
    .catch(err => console.warn("⚠️ バージョンチェック失敗:", err.message));
}

function compareVersions(v1, v2){
  const p1=v1.split('.').map(Number), p2=v2.split('.').map(Number);
  for(let i=0;i<Math.max(p1.length,p2.length);i++){
    const a=p1[i]||0, b=p2[i]||0;
    if(a>b) return 1; if(a<b) return -1;
  }
  return 0;
}

function displayUpdateNotification(data){
  const box = document.createElement('div');
  box.style.cssText = `position:fixed;bottom:20px;right:20px;background:rgba(0,0,0,.95);
    color:#0ff;padding:18px 22px;border:2px solid #0ff;border-radius:8px;
    font-family:Orbitron,monospace;z-index:9999;max-width:340px;
    box-shadow:0 0 25px rgba(0,255,255,.6);animation:slideInRight .5s ease-out`;
  const cl = data.changes ? data.changes.map(c=>`<div style="font-size:9px;color:#aaa;margin-left:10px">• ${c}</div>`).join('') : '';
  box.innerHTML = `
    <div style="font-size:15px;font-weight:900;margin-bottom:10px;color:#ff0">
      🔔 新バージョン ${data.version} 公開！
    </div>
    <div style="font-size:11px;margin-bottom:8px;color:#fff;line-height:1.6">${data.message}</div>
    ${cl}
    <div style="font-size:9px;color:#666;margin:10px 0 12px">📅 ${data.release_date}</div>
    <a href="${data.download_url}" target="_blank"
       style="display:block;background:linear-gradient(135deg,#0ff,#0af);color:#000;padding:12px;
              text-align:center;text-decoration:none;border-radius:5px;font-weight:900;font-size:13px;
              margin-bottom:8px">📥 今すぐアップデート</a>
    <button onclick="this.parentElement.remove()"
            style="background:transparent;border:1px solid #555;color:#888;padding:8px;
                   width:100%;border-radius:4px;cursor:pointer;font-size:10px">後で確認する</button>`;
  document.body.appendChild(box);
}

// アニメーション CSS
const _uiStyle = document.createElement('style');
_uiStyle.textContent = `
  @keyframes slideInRight { from{transform:translateX(400px);opacity:0} to{transform:translateX(0);opacity:1} }
  @keyframes fadeUpOut    { 0%{opacity:1;transform:translate(-50%,-50%)} 100%{opacity:0;transform:translate(-50%,-120%)} }
  @keyframes popIn        { 0%{transform:scale(0)} 70%{transform:scale(1.2)} 100%{transform:scale(1)} }
`;
document.head.appendChild(_uiStyle);

window.addEventListener('load', () => { setTimeout(checkForUpdates, 1000); });
