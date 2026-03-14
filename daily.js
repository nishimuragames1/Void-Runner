// ============================================================
// daily.js
// デイリーミッション定義・生成・進捗管理・報酬クレーム
// ============================================================

const MISSION_TYPES = [
  { id:'skill_10',  type:'skill',  target:10,     label:'スキルを10回使おう',           icon:'⚡', sortKey:0  },
  { id:'skill_30',  type:'skill',  target:30,     label:'スキルを30回使おう',           icon:'⚡', sortKey:1  },
  { id:'skill_50',  type:'skill',  target:50,     label:'スキルを50回使おう',           icon:'⚡', sortKey:2  },
  { id:'coin_5k',   type:'coin',   target:5000,   label:'コインを5,000枚集めよう',      icon:'🪙', sortKey:3  },
  { id:'coin_10k',  type:'coin',   target:10000,  label:'コインを10,000枚集めよう',     icon:'🪙', sortKey:4  },
  { id:'coin_30k',  type:'coin',   target:30000,  label:'コインを30,000枚集めよう',     icon:'🪙', sortKey:5  },
  { id:'enemy_500', type:'enemy',  target:500,    label:'敵を合計500体倒そう',          icon:'💀', sortKey:6  },
  { id:'enemy_700', type:'enemy',  target:700,    label:'敵を合計700体倒そう',          icon:'💀', sortKey:7  },
  { id:'enemy_1k',  type:'enemy',  target:1000,   label:'敵を合計1,000体倒そう',        icon:'💀', sortKey:8  },
  { id:'piece_5k',  type:'piece',  target:5000,   label:'ピースを5,000個集めよう',       icon:'🧩', sortKey:9  },
  { id:'piece_10k', type:'piece',  target:10000,  label:'ピースを10,000個集めよう',      icon:'🧩', sortKey:10 },
  { id:'piece_30k', type:'piece',  target:30000,  label:'ピースを30,000個集めよう',      icon:'🧩', sortKey:11 },
  { id:'medal_1k',  type:'medal',  target:1000,   label:'メダルを1,000枚集めよう',      icon:'🔘', sortKey:12 },
  { id:'medal_3k',  type:'medal',  target:3000,   label:'メダルを3,000枚集めよう',      icon:'🔘', sortKey:13 },
  { id:'medal_5k',  type:'medal',  target:5000,   label:'メダルを5,000枚集めよう',      icon:'🔘', sortKey:14 },
  { id:'item_30',   type:'item',   target:30,     label:'アイテムを30回使おう',         icon:'🎒', sortKey:15 },
  { id:'item_50',   type:'item',   target:50,     label:'アイテムを50回使おう',         icon:'🎒', sortKey:16 },
  { id:'item_60',   type:'item',   target:60,     label:'アイテムを60回使おう',         icon:'🎒', sortKey:17 },
  { id:'dmg_10k',   type:'damage', target:10000,  label:'合計10,000ダメージ与えよう',   icon:'⚔️', sortKey:18 },
  { id:'dmg_50k',   type:'damage', target:50000,  label:'合計50,000ダメージ与えよう',   icon:'⚔️', sortKey:19 },
  { id:'dmg_100k',  type:'damage', target:100000, label:'合計100,000ダメージ与えよう',  icon:'⚔️', sortKey:20 },
];

let dailyData = null;

// ============================================================
// 日付・シード
// ============================================================
function getTodayString(){
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getDailySeed(dateStr){
  return parseInt(dateStr.replace(/-/g,''));
}

function seededRandom(seed, index){
  const x = Math.sin(seed * 9301 + index * 49297 + 233) * 10000;
  return x - Math.floor(x);
}

// ============================================================
// ミッション生成
// ============================================================
function generateDailyMissions(dateStr){
  const seed  = getDailySeed(dateStr);
  const types = ['skill','coin','enemy','piece','medal','item','damage'];
  const shuffledTypes = [...types].sort((a, b) =>
    seededRandom(seed, types.indexOf(a)) - seededRandom(seed, types.indexOf(b))
  );
  const selectedTypes = shuffledTypes.slice(0, 3);
  return selectedTypes.map((type, i) => {
    const candidates = MISSION_TYPES.filter(m => m.type === type);
    const idx = Math.floor(seededRandom(seed, i + 100) * candidates.length);
    return { ...candidates[idx], current: 0, claimed: false };
  });
}

// ============================================================
// 初期化
// ============================================================
function initDailyMissions(){
  const today = getTodayString();
  const saved = JSON.parse(localStorage.getItem('voidRunnerDaily') || 'null');
  if(saved && saved.date === today){
    dailyData = saved;
  } else {
    dailyData = {
      date:      today,
      missions:  generateDailyMissions(today),
      yesterday: saved ? saved.missions : []
    };
    saveDailyData();
  }
  updateDailyStars();
}

function saveDailyData(){
  localStorage.setItem('voidRunnerDaily', JSON.stringify(dailyData));
}

// ============================================================
// 進捗更新
// ============================================================
function updateMissionProgress(type, amount){
  if(!dailyData || !gameRunning) return;
  // orb→piece の後方互換
  const normalizedType = type === 'orb' ? 'piece' : type;
  dailyData.missions.forEach(m => {
    if(m.type === normalizedType && !m.claimed){
      m.current = Math.min(m.current + amount, m.target);
    }
  });
  saveDailyData();
  updateDailyStars();
}

// ============================================================
// 報酬クレーム
// ============================================================
function claimMissionReward(index){
  const mission = dailyData.missions[index];
  if(!mission || mission.claimed || mission.current < mission.target) return;
  mission.claimed = true;
  playerData.medals += 500;
  savePlayerData();
  saveDailyData();
  showMissionClaimEffect();
  updateDailyStars();
  renderDailyMissions();
  updateHomeDisplay();
}

function showMissionClaimEffect(){
  const effect = document.createElement('div');
  effect.style.cssText = `
    position:fixed;top:50%;left:50%;
    transform:translate(-50%,-50%);
    color:#ff0;font-size:28px;font-weight:900;
    text-shadow:0 0 20px #ff0;
    z-index:9999;pointer-events:none;
    animation:fadeUpOut 1.5s ease-out forwards;
    font-family:Orbitron,monospace;
  `;
  effect.textContent = '🔘 +500 MEDAL!';
  document.body.appendChild(effect);
  setTimeout(() => effect.remove(), 1500);
}

// ============================================================
// UI 更新
// ============================================================
function updateDailyStars(){
  if(!dailyData) return;
  const claimed   = dailyData.missions.filter(m => m.claimed).length;
  const completed = dailyData.missions.filter(m => m.current >= m.target).length;
  const stars = [0,1,2].map(i => {
    if(i < claimed)   return '<span style="color:#ff0;text-shadow:0 0 8px #ff0">★</span>';
    if(i < completed) return '<span style="color:#ff0;opacity:0.5">★</span>';
    return '<span style="color:#444">☆</span>';
  }).join('');
  const el = document.getElementById('dailyStars');
  if(el) el.innerHTML = stars;
}

function showDailyMission(){
  renderDailyMissions();
  document.getElementById('dailyOverlay').style.display = 'flex';
}

function closeDailyMission(){
  document.getElementById('dailyOverlay').style.display = 'none';
}

function renderDailyMissions(){
  const todayEl = document.getElementById('todayMissionList');
  todayEl.innerHTML = dailyData.missions.map((m, i) => {
    const pct      = Math.min(100, Math.floor((m.current / m.target) * 100));
    const done     = m.current >= m.target;
    const canClaim = done && !m.claimed;
    return `
      <div style="background:rgba(0,40,80,.6);border:1px solid ${m.claimed?'#666':done?'#ff0':'#0ff'};
                  border-radius:6px;padding:12px;margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span style="color:#fff;font-size:12px">${m.icon} ${m.label}</span>
          <span style="color:#ff0;font-size:11px;font-weight:900">500🔘</span>
        </div>
        <div style="background:rgba(0,0,0,.4);border-radius:3px;height:8px;overflow:hidden;margin-bottom:6px">
          <div style="width:${pct}%;height:100%;
                      background:${m.claimed?'#666':done?'#ff0':'linear-gradient(90deg,#0ff,#0af)'};
                      transition:width .3s;border-radius:3px"></div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="color:#aaa;font-size:10px">
            ${m.current.toLocaleString()} / ${m.target.toLocaleString()}
          </span>
          ${m.claimed
            ? '<span style="color:#666;font-size:10px">✅ 受取済み</span>'
            : canClaim
              ? `<button onclick="claimMissionReward(${i})"
                         style="background:linear-gradient(135deg,#ff0,#f80);color:#000;
                                border:none;padding:5px 12px;border-radius:3px;
                                cursor:pointer;font-weight:900;font-size:11px">
                   受け取る！
                 </button>`
              : `<span style="color:#0ff;font-size:10px">${pct}%</span>`
          }
        </div>
      </div>
    `;
  }).join('');

  const yestEl = document.getElementById('yesterdayMissionList');
  if(dailyData.yesterday && dailyData.yesterday.length > 0){
    yestEl.innerHTML = dailyData.yesterday.map(m => {
      const pct = Math.min(100, Math.floor((m.current / m.target) * 100));
      return `
        <div style="background:rgba(0,20,40,.4);border:1px solid #333;
                    border-radius:6px;padding:10px;margin-bottom:8px;opacity:0.6">
          <div style="color:#888;font-size:11px;margin-bottom:4px">
            ${m.icon} ${m.label}
          </div>
          <div style="background:rgba(0,0,0,.4);border-radius:3px;height:6px;overflow:hidden">
            <div style="width:${pct}%;height:100%;
                        background:${m.claimed?'#555':'#333'};border-radius:3px"></div>
          </div>
          <div style="color:#555;font-size:10px;margin-top:4px">
            ${m.current.toLocaleString()} / ${m.target.toLocaleString()}
            ${m.claimed ? '✅ 受取済み' : '⏰ 期限切れ'}
          </div>
        </div>
      `;
    }).join('');
  } else {
    yestEl.innerHTML = '<div style="color:#555;font-size:11px;text-align:center">データなし</div>';
  }
}
