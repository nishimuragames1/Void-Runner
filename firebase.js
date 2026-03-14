// ============================================================
// firebase.js
// Firebase設定・認証・クラウド同期・各種ランキング・報酬・特別コード
// キャラデータ同期追加 (v1.5.0)
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyCGZCJ20iIifEGuLOMe4_Vc9M1p3c59zeo",
  authDomain: "nishimura-games.firebaseapp.com",
  projectId: "nishimura-games",
  storageBucket: "nishimura-games.appspot.com",
  messagingSenderId: "394110539730",
  appId: "1:394110539730:web:f78e331859b2f7c5c05a0b",
  measurementId: "G-TVLRN3LZKN"
};

firebase.initializeApp(firebaseConfig);
const fbAuth = firebase.auth();
const fbDb   = firebase.firestore();
console.log("✅ Firebase初期化完了");

firebase.firestore().settings({
  experimentalForceLongPolling: true,
  useFetchStreams: false
});

// ============================================================
// 認証変数
// ============================================================
let currentUser        = null;
let currentUserProfile = null;

// ============================================================
// データスキーマバージョン
// v1.5.0 でキャラ追加のためバージョン管理
// ============================================================
const DATA_VERSION = 2; // v1.4.0以前 = 1, v1.5.0以降 = 2

// ============================================================
// バリデーション
// ============================================================
function validateAccountId(id){
  if(id.length < 4) return 'アカウントIDは4文字以上で入力してください';
  if(!/^[a-zA-Z0-9!@#$%^&*_\-]+$/.test(id)) return 'アカウントIDは英数字・記号のみ使用可能です';
  return null;
}
function validatePassword(pw){
  if(pw.length < 8) return 'パスワードは8文字以上で入力してください';
  if(!/[a-zA-Z]/.test(pw)) return 'パスワードに英字を含めてください';
  if(!/[0-9]/.test(pw)) return 'パスワードに数字を含めてください';
  return null;
}
function validateDisplayName(name){
  if(!name||name.trim().length===0) return 'アカウント名を入力してください';
  if(name.length > 20) return 'アカウント名は20文字以内にしてください';
  return null;
}

// ============================================================
// アカウントID重複チェック
// ============================================================
async function isAccountIdTaken(accountId){
  const doc = await fbDb.collection('accountIds').doc(accountId.toLowerCase()).get();
  return doc.exists;
}

// ============================================================
// 初期プロフィール生成（共通）
// ============================================================
function buildInitialProfile(uid, accountId, displayName, email, googleLinked){
  return {
    uid,
    accountId: accountId.toLowerCase(),
    displayName,
    email: email || null,
    googleLinked,
    dataVersion: DATA_VERSION,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    // プレイヤーデータ（リセット済み）
    highScore: 0,
    coins:     0,
    medals:    0,
    voidols:   0,
    level:     1,
    exp:       0,
    rankings:  [],
    // キャラデータ（初期状態）
    charData: {
      selectedCharId: 'void',
      chars: {}
    }
  };
}

// ============================================================
// 新規登録
// ============================================================
async function registerWithEmail(accountId, displayName, password, email=null){
  const idErr   = validateAccountId(accountId);
  const nameErr = validateDisplayName(displayName);
  const pwErr   = validatePassword(password);
  if(idErr)   return {success:false, error:idErr};
  if(nameErr) return {success:false, error:nameErr};
  if(pwErr)   return {success:false, error:pwErr};

  const taken = await isAccountIdTaken(accountId);
  if(taken) return {success:false, error:'このアカウントIDはすでに使用されています'};

  const authEmail = email || `${accountId.toLowerCase()}@voidrunner.internal`;
  try {
    const cred    = await fbAuth.createUserWithEmailAndPassword(authEmail, password);
    const uid     = cred.user.uid;
    const profile = buildInitialProfile(uid, accountId, displayName, email, false);

    const batch = fbDb.batch();
    batch.set(fbDb.collection('users').doc(uid), profile);
    batch.set(fbDb.collection('accountIds').doc(accountId.toLowerCase()),
      {uid, createdAt: firebase.firestore.FieldValue.serverTimestamp()});
    await batch.commit();

    currentUser        = cred.user;
    currentUserProfile = profile;

    // ローカルデータをリセットして初期状態にする
    resetLocalDataToInitial(displayName);
    onLoginSuccess(profile);
    return {success:true};
  } catch(e){
    return {success:false, error:firebaseErrorToJapanese(e.code)};
  }
}

// ============================================================
// ログイン
// ============================================================
async function loginWithAccountId(accountId, password){
  try {
    const idDoc = await fbDb.collection('accountIds').doc(accountId.toLowerCase()).get();
    if(!idDoc.exists) return {success:false, error:'アカウントIDが見つかりません'};
    const uid     = idDoc.data().uid;
    const userDoc = await fbDb.collection('users').doc(uid).get();
    const profile = userDoc.data();
    const authEmail = (profile.email && profile.email.trim() !== '')
      ? profile.email
      : `${accountId.toLowerCase()}@voidrunner.internal`;
    const cred = await fbAuth.signInWithEmailAndPassword(authEmail, password);
    currentUser        = cred.user;
    currentUserProfile = profile;

    // クラウドからデータをロード
    loadCloudDataToLocal(profile);
    onLoginSuccess(profile);
    return {success:true};
  } catch(e){
    return {success:false, error:firebaseErrorToJapanese(e.code)};
  }
}

// ============================================================
// Googleログイン
// ============================================================
async function loginWithGoogle(){
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    const result  = await fbAuth.signInWithPopup(provider);
    const user    = result.user;
    const userDoc = await fbDb.collection('users').doc(user.uid).get();
    if(userDoc.exists){
      currentUser        = user;
      currentUserProfile = userDoc.data();
      loadCloudDataToLocal(currentUserProfile);
      onLoginSuccess(currentUserProfile);
      return {success:true, isNew:false};
    } else {
      currentUser = user;
      return {success:true, isNew:true, googleUser:user};
    }
  } catch(e){
    return {success:false, error:firebaseErrorToJapanese(e.code)};
  }
}

async function completeGoogleRegistration(accountId, displayName){
  const idErr   = validateAccountId(accountId);
  const nameErr = validateDisplayName(displayName);
  if(idErr)   return {success:false, error:idErr};
  if(nameErr) return {success:false, error:nameErr};
  const taken = await isAccountIdTaken(accountId);
  if(taken) return {success:false, error:'このアカウントIDはすでに使用されています'};

  const uid     = currentUser.uid;
  const profile = buildInitialProfile(uid, accountId, displayName, currentUser.email, true);

  const batch = fbDb.batch();
  batch.set(fbDb.collection('users').doc(uid), profile);
  batch.set(fbDb.collection('accountIds').doc(accountId.toLowerCase()),
    {uid, createdAt: firebase.firestore.FieldValue.serverTimestamp()});
  await batch.commit();

  currentUserProfile = profile;
  resetLocalDataToInitial(displayName);
  onLoginSuccess(profile);
  return {success:true};
}

// ============================================================
// ログアウト
// ============================================================
async function logout(){
  await fbAuth.signOut();
  currentUser        = null;
  currentUserProfile = null;
  onLogout();
}

// ============================================================
// ローカルデータのリセット（v1.5.0 初回登録時）
// ============================================================
function resetLocalDataToInitial(displayName){
  // playerData リセット
  playerData.highScore      = 0;
  playerData.coins          = 0;
  playerData.medals         = 0;
  playerData.voidols        = 0;
  playerData.level          = 1;
  playerData.exp            = 0;
  playerData.rankings       = [];
  playerData.nickname       = displayName;
  playerData.lastDifficulty = 'normal';
  savePlayerData();

  // charData リセット（ボイド所持済みにして初期化）
  charData.selectedCharId = 'void';
  charData.chars = {};
  initCharData(); // 全キャラ未所持状態を作る
  // ボイドを所持済みにする
  charData.chars['void'] = {
    owned:          true,
    level:          1,
    charExp:        0,
    classLv:        0,
    classExp:       0,
    levelUnlocked:  0
  };
  saveCharData();
}

// ============================================================
// クラウドデータをローカルに反映
// ============================================================
function loadCloudDataToLocal(profile){
  if(!profile) return;

  // プレイヤーデータ
  playerData.highScore = profile.highScore || 0;
  playerData.coins     = profile.coins     || 0;
  playerData.medals    = profile.medals    || 0;
  playerData.voidols   = profile.voidols   || 0;
  playerData.level     = profile.level     || 1;
  playerData.exp       = profile.exp       || 0;
  playerData.rankings  = profile.rankings  || [];
  playerData.nickname  = profile.displayName;
  savePlayerData();

  // キャラデータ（クラウド優先）
  if(profile.charData){
    applyCharDataFromCloud(profile.charData);
  } else {
    // charDataがない古いアカウント → ボイドのみ所持状態で初期化
    charData.selectedCharId = 'void';
    initCharData();
    charData.chars['void'] = {
      owned:true, level:1, charExp:0, classLv:0, classExp:0, levelUnlocked:0
    };
    saveCharData();
  }
}

// ============================================================
// クラウド同期（プレイヤーデータ＋キャラデータ）
// ============================================================
async function syncPlayerDataToCloud(){
  if(!currentUser) return;
  try {
    await fbDb.collection('users').doc(currentUser.uid).update({
      highScore:  playerData.highScore,
      coins:      playerData.coins,
      medals:     playerData.medals,
      voidols:    playerData.voidols,
      level:      playerData.level,
      exp:        playerData.exp,
      rankings:   playerData.rankings,
      charData:   getCharDataForCloud(),
      dataVersion: DATA_VERSION,
      updatedAt:  firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch(e){ console.warn('クラウド同期失敗:', e); }
}

// ============================================================
// 日付ユーティリティ
// ============================================================
function getDateKey(){
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function getWeekKey(){
  const d   = new Date();
  const day = d.getDay()===0 ? 6 : d.getDay()-1;
  const mon = new Date(d);
  mon.setDate(d.getDate()-day);
  return `${mon.getFullYear()}-W${String(mon.getMonth()+1).padStart(2,'0')}${String(mon.getDate()).padStart(2,'0')}`;
}
function getMonthKey(){
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
function getPrevWeekKey(){
  const d   = new Date();
  const day = d.getDay()===0 ? 6 : d.getDay()-1;
  const mon = new Date(d);
  mon.setDate(d.getDate()-day-7);
  return `${mon.getFullYear()}-W${String(mon.getMonth()+1).padStart(2,'0')}${String(mon.getDate()).padStart(2,'0')}`;
}
function getPrevMonthKey(){
  const d    = new Date();
  const prev = new Date(d.getFullYear(), d.getMonth()-1, 1);
  return `${prev.getFullYear()}-${String(prev.getMonth()+1).padStart(2,'0')}`;
}

// ============================================================
// ランキング保存（4種類）
// ============================================================
async function saveOnlineRanking(score){
  if(!currentUser || !currentUserProfile) return;

  // charData が未定義でもクラッシュしないよう安全に取得
  const selectedCharId = (typeof charData !== 'undefined' && charData.selectedCharId)
    ? charData.selectedCharId : 'void';

  const base = {
    uid:         currentUser.uid,
    accountId:   currentUserProfile.accountId,
    displayName: currentUserProfile.displayName,
    score, wave, level: playerData.level, moveLevel,
    charId:      selectedCharId,
    updatedAt:   firebase.firestore.FieldValue.serverTimestamp()
  };
  try {
    const batch = fbDb.batch();
    // 通算
    const allRef = fbDb.collection('rankings').doc(currentUser.uid);
    const allDoc = await allRef.get();
    if(!allDoc.exists || score > (allDoc.data().score||0)) batch.set(allRef, base);
    // 日別
    const dayKey = getDateKey();
    const dayRef = fbDb.collection('rankingsDaily').doc(`${dayKey}_${currentUser.uid}`);
    const dayDoc = await dayRef.get();
    if(!dayDoc.exists || score > (dayDoc.data().score||0)) batch.set(dayRef, {...base, dateKey:dayKey});
    // 週別
    const weekKey = getWeekKey();
    const weekRef = fbDb.collection('rankingsWeekly').doc(`${weekKey}_${currentUser.uid}`);
    const weekDoc = await weekRef.get();
    if(!weekDoc.exists || score > (weekDoc.data().score||0)) batch.set(weekRef, {...base, weekKey});
    // 月別
    const monthKey = getMonthKey();
    const monthRef = fbDb.collection('rankingsMonthly').doc(`${monthKey}_${currentUser.uid}`);
    const monthDoc = await monthRef.get();
    if(!monthDoc.exists || score > (monthDoc.data().score||0)) batch.set(monthRef, {...base, monthKey});
    await batch.commit();
    console.log('✅ ランキング保存完了');
  } catch(e){ console.warn('ランキング保存失敗:', e); }
}

// ============================================================
// ランキング取得
// ============================================================
async function fetchOnlineRanking(){
  try {
    const snap = await fbDb.collection('rankings').orderBy('score','desc').limit(20).get();
    return snap.docs.map(d => d.data());
  } catch(e){ console.warn('通算ランキング取得失敗:', e); return []; }
}
async function fetchDailyRanking(dateKey){
  try {
    const snap = await fbDb.collection('rankingsDaily')
      .where('dateKey','==',dateKey).orderBy('score','desc').limit(20).get();
    return snap.docs.map(d => d.data());
  } catch(e){ console.warn('日別ランキング取得失敗:', e); return []; }
}
async function fetchWeeklyRanking(weekKey){
  try {
    const snap = await fbDb.collection('rankingsWeekly')
      .where('weekKey','==',weekKey).orderBy('score','desc').limit(20).get();
    return snap.docs.map(d => d.data());
  } catch(e){ console.warn('週別ランキング取得失敗:', e); return []; }
}
async function fetchMonthlyRanking(monthKey){
  try {
    const snap = await fbDb.collection('rankingsMonthly')
      .where('monthKey','==',monthKey).orderBy('score','desc').limit(20).get();
    return snap.docs.map(d => d.data());
  } catch(e){ console.warn('月別ランキング取得失敗:', e); return []; }
}

// ============================================================
// 週別・月別報酬チェック（ログイン時に呼ぶ）
// ============================================================
const WEEKLY_REWARDS = [
  { medals:5000 }, { medals:2000 }, { medals:1000 },
  { coins:2000 },  { coins:1000 },
];
const MONTHLY_REWARDS = [
  { voidols:10, medals:10000, coins:30000 },
  { voidols:5,  medals:5000,  coins:10000 },
  { voidols:3,  medals:3000,  coins:5000  },
  { voidols:1,  medals:1000,  coins:2500  },
  { voidols:1,  medals:500,   coins:1000  },
];

async function checkAndGrantRankingRewards(){
  if(!currentUser) return;
  try {
    const claimedDoc = await fbDb.collection('rewardsClaimed').doc(currentUser.uid).get();
    const claimed    = claimedDoc.exists ? claimedDoc.data() : {};
    const prevWeek   = getPrevWeekKey();
    const prevMonth  = getPrevMonthKey();
    const rewards    = [];

    // 週別
    if(!claimed[`week_${prevWeek}`]){
      const snap = await fbDb.collection('rankingsWeekly')
        .where('weekKey','==',prevWeek).orderBy('score','desc').limit(5).get();
      const list = snap.docs.map(d => d.data());
      const rank = list.findIndex(e => e.uid===currentUser.uid);
      if(rank>=0 && rank<WEEKLY_REWARDS.length){
        const r = WEEKLY_REWARDS[rank];
        rewards.push({type:'weekly', rank:rank+1, period:prevWeek, reward:r});
        if(r.medals) playerData.medals += r.medals;
        if(r.coins)  playerData.coins  += r.coins;
      }
      await fbDb.collection('rewardsClaimed').doc(currentUser.uid)
        .set({[`week_${prevWeek}`]:true},{merge:true});
    }

    // 月別
    if(!claimed[`month_${prevMonth}`]){
      const snap = await fbDb.collection('rankingsMonthly')
        .where('monthKey','==',prevMonth).orderBy('score','desc').limit(5).get();
      const list = snap.docs.map(d => d.data());
      const rank = list.findIndex(e => e.uid===currentUser.uid);
      if(rank>=0 && rank<MONTHLY_REWARDS.length){
        const r = MONTHLY_REWARDS[rank];
        rewards.push({type:'monthly', rank:rank+1, period:prevMonth, reward:r});
        if(r.voidols) playerData.voidols += r.voidols;
        if(r.medals)  playerData.medals  += r.medals;
        if(r.coins)   playerData.coins   += r.coins;
      }
      await fbDb.collection('rewardsClaimed').doc(currentUser.uid)
        .set({[`month_${prevMonth}`]:true},{merge:true});
    }

    if(rewards.length>0){
      savePlayerData();
      await syncPlayerDataToCloud();
      showRankingRewardPopup(rewards);
    }
  } catch(e){ console.warn('報酬チェック失敗:', e); }
}

// 報酬ポップアップ
function showRankingRewardPopup(rewards){
  const overlay = document.getElementById('rankingRewardOverlay');
  const content = document.getElementById('rankingRewardContent');
  if(!overlay||!content) return;
  content.innerHTML = rewards.map(r => {
    const typeLabel   = r.type==='weekly' ? '週別' : '月別';
    const periodLabel = r.type==='weekly' ? `${r.period}の週` : r.period;
    let rt = '';
    if(r.reward.voidols) rt += `💵 ${r.reward.voidols} ボイドル `;
    if(r.reward.medals)  rt += `🔘 ${r.reward.medals.toLocaleString()} メダル `;
    if(r.reward.coins)   rt += `🪙 ${r.reward.coins.toLocaleString()} コイン`;
    return `
      <div style="background:rgba(0,40,80,.7);border:2px solid #ffd700;
                  border-radius:8px;padding:20px;margin-bottom:15px;text-align:center">
        <div style="color:#ffd700;font-size:14px;margin-bottom:8px">${periodLabel} ${typeLabel}ランキング</div>
        <div style="color:#fff;font-size:28px;font-weight:900;margin-bottom:10px">🏆 ${r.rank}位</div>
        <div style="color:#0ff;font-size:16px;font-weight:900">${rt}</div>
        <div style="color:#0f0;font-size:18px;margin-top:10px">GET!</div>
      </div>`;
  }).join('');
  overlay.style.display = 'flex';
}

function closeRankingRewardOverlay(){
  document.getElementById('rankingRewardOverlay').style.display = 'none';
}

// ============================================================
// 特別コード
// ============================================================
async function redeemSpecialCode(code){
  if(!currentUser) return {success:false, error:'ログインが必要です'};
  if(!code||code.trim()==='') return {success:false, error:'コードを入力してください'};
  try {
    const codeRef = fbDb.collection('specialCodes').doc(code.trim().toUpperCase());
    const codeDoc = await codeRef.get();
    if(!codeDoc.exists) return {success:false, error:'無効なコードです'};
    const data = codeDoc.data();
    if(data.expiresAt && data.expiresAt.toDate() < new Date())
      return {success:false, error:'このコードは期限切れです'};
    const usedRef = fbDb.collection('specialCodeUsed')
      .doc(`${currentUser.uid}_${code.trim().toUpperCase()}`);
    const usedDoc = await usedRef.get();
    if(usedDoc.exists) return {success:false, error:'このコードはすでに使用済みです'};
    if(data.voidols) playerData.voidols += data.voidols;
    if(data.coins)   playerData.coins   += data.coins;
    if(data.medals)  playerData.medals  += data.medals;
    await usedRef.set({
      uid: currentUser.uid,
      code: code.trim().toUpperCase(),
      usedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    savePlayerData();
    await syncPlayerDataToCloud();
    let rt = '';
    if(data.voidols) rt += `💵 ${data.voidols} ボイドル `;
    if(data.coins)   rt += `🪙 ${data.coins.toLocaleString()} コイン `;
    if(data.medals)  rt += `🔘 ${data.medals.toLocaleString()} メダル`;
    return {success:true, reward:rt.trim()};
  } catch(e){ return {success:false, error:'エラーが発生しました'}; }
}

// ============================================================
// ログイン状態の自動監視
// ============================================================
fbAuth.onAuthStateChanged(async (user) => {
  if(user){
    const doc = await fbDb.collection('users').doc(user.uid).get();
    if(doc.exists){
      currentUser        = user;
      currentUserProfile = doc.data();

      // クラウドデータをローカルに反映
      loadCloudDataToLocal(currentUserProfile);

      onLoginSuccess(currentUserProfile);
      // ランキング報酬チェック
      checkAndGrantRankingRewards();
    }
  }
});

// ============================================================
// エラーコード日本語変換
// ============================================================
function firebaseErrorToJapanese(code){
  const map = {
    'auth/email-already-in-use':   'このアカウントIDはすでに使用されています',
    'auth/invalid-email':          'メールアドレスの形式が正しくありません',
    'auth/wrong-password':         'パスワードが正しくありません',
    'auth/user-not-found':         'アカウントが見つかりません',
    'auth/invalid-credential':     'IDまたはパスワードが正しくありません',
    'auth/weak-password':          'パスワードが短すぎます（8文字以上）',
    'auth/too-many-requests':      'しばらく時間をおいてから再試行してください',
    'auth/popup-closed-by-user':   'ログインがキャンセルされました',
    'auth/network-request-failed': 'ネットワークエラーが発生しました',
    'permission-denied':           'アクセスが拒否されました（サーバーエラー）',
  };
  return map[code] || `エラーが発生しました（${code}）`;
}

// ============================================================
// 認証UI操作
// ============================================================
let accountIdCheckTimer = null;

function openAuthOverlay(tab='login'){
  document.getElementById('authOverlay').style.display='flex';
  switchAuthTab(tab);
  clearAuthMessage();
}
function closeAuthOverlay(){
  document.getElementById('authOverlay').style.display='none';
  clearAuthMessage();
}
function switchAuthTab(tab){
  const isLogin = tab==='login';
  document.getElementById('loginForm').style.display        = isLogin?'block':'none';
  document.getElementById('registerForm').style.display     = isLogin?'none':'block';
  document.getElementById('googleSetupForm').style.display  = 'none';
  document.getElementById('tabLogin').style.background      = isLogin?'rgba(0,255,255,.2)':'transparent';
  document.getElementById('tabLogin').style.color           = isLogin?'#0ff':'#666';
  document.getElementById('tabRegister').style.background   = isLogin?'transparent':'rgba(0,255,255,.2)';
  document.getElementById('tabRegister').style.color        = isLogin?'#666':'#0ff';
  clearAuthMessage();
}
function clearAuthMessage(){
  const el = document.getElementById('authMessage');
  if(el) el.style.display='none';
}
function checkAccountIdAvailability(value, statusId='accountIdStatus'){
  const el = document.getElementById(statusId);
  if(!el) return;
  clearTimeout(accountIdCheckTimer);
  const err = validateAccountId(value);
  if(err){ el.textContent=err; el.style.color='#f88'; return; }
  el.textContent='確認中...'; el.style.color='#aaa';
  accountIdCheckTimer = setTimeout(async()=>{
    const taken = await isAccountIdTaken(value);
    if(taken){ el.textContent='❌ このIDはすでに使用されています'; el.style.color='#f44'; }
    else     { el.textContent='✅ 使用可能です';                   el.style.color='#0f0'; }
  }, 600);
}
async function handleLogin(){
  const id = document.getElementById('loginAccountId').value.trim();
  const pw = document.getElementById('loginPassword').value;
  showAuthMessage('ログイン中...','success');
  const result = await loginWithAccountId(id,pw);
  if(!result.success) showAuthMessage(result.error);
}
async function handleRegister(){
  const id    = document.getElementById('regAccountId').value.trim();
  const name  = document.getElementById('regDisplayName').value.trim();
  const pw    = document.getElementById('regPassword').value;
  const email = document.getElementById('regEmail').value.trim()||null;
  showAuthMessage('登録中...','success');
  const result = await registerWithEmail(id,name,pw,email);
  if(!result.success) showAuthMessage(result.error);
}
async function handleGoogleLogin(){
  const result = await loginWithGoogle();
  if(!result.success){ showAuthMessage(result.error); return; }
  if(result.isNew){
    document.getElementById('loginForm').style.display       = 'none';
    document.getElementById('registerForm').style.display    = 'none';
    document.getElementById('googleSetupForm').style.display = 'block';
    document.getElementById('googleSetupName').value = result.googleUser.displayName||'';
  }
}
async function handleGoogleSetup(){
  const id   = document.getElementById('googleSetupId').value.trim();
  const name = document.getElementById('googleSetupName').value.trim();
  showAuthMessage('登録中...','success');
  const result = await completeGoogleRegistration(id,name);
  if(!result.success) showAuthMessage(result.error);
}
function showAuthMessage(msg, type='error'){
  const el = document.getElementById('authMessage');
  if(!el) return;
  el.textContent   = msg;
  el.style.color   = type==='success' ? '#0f0' : '#f44';
  el.style.display = 'block';
}