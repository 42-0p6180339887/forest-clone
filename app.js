"use strict";
/* ============================================================
   专注森林 Forest Clone —— clean-room 复刻
   玩法规格见 SPEC.md（REA 式 Seen / Inferred / Unknown 证据记录）
   ============================================================ */

/* ---------------- 屏幕常亮（Wake Lock，原生 App 体验；不支持的环境自动跳过） ---------------- */
let wakeLock = null;
async function setWakeLock(on) {
  try {
    if (on && 'wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
    } else if (!on && wakeLock) {
      await wakeLock.release(); wakeLock = null;
    }
  } catch (_) { /* 忽略：无权限/不支持时不影响主功能 */ }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && typeof active !== 'undefined' && active) setWakeLock(true);
});

/* ---------------- 树木渲染：原创参数化 SVG ---------------- */
const SPECIES = {
  oak:    { name: "圆冠树", emoji: "🌳" },
  pine:   { name: "松树",   emoji: "🌲" },
  sakura: { name: "樱花树", emoji: "🌸" },
  cactus: { name: "仙人掌", emoji: "🌵" },
};

function treeSVG(species, p, dead = false) {
  p = Math.max(0, Math.min(1, p));
  const gy = 168;                       // 地面高度
  // 土壤（枯萎时发灰）
  const soilEl = `<ellipse cx="100" cy="${gy + 6}" rx="52" ry="10" fill="${dead ? "#b3a892" : "#caa472"}"/>
                  <ellipse cx="100" cy="${gy + 2}" rx="34" ry="7" fill="${dead ? "#a2987f" : "#b98d54"}"/>`;
  if (p < 0.08) {
    // 种子
    return `<svg viewBox="0 0 200 200">${soilEl}
      <ellipse cx="100" cy="${gy - 2}" rx="7" ry="5" fill="${dead ? "#8d8578" : "#8a6844"}"/>
      ${p > 0.03 ? `<path d="M100 ${gy - 4} q2 -8 8 -10" stroke="#7fae5c" stroke-width="2.5" fill="none" stroke-linecap="round"/>` : ""}
    </svg>`;
  }
  const trunkC = dead ? "#8d8578" : "#8a6844";
  const leafA  = dead ? "#a9a294" : (species === "sakura" ? "#f2a7c3" : species === "pine" ? "#2e6b46" : "#57a773");
  const leafB  = dead ? "#98917f" : (species === "sakura" ? "#e98bb1" : species === "pine" ? "#3c8560" : "#6fbf8a");
  const grow = 0.25 + 0.75 * p;         // 连续生长系数
  let body = "";

  if (species === "cactus") {
    const h = 26 + 74 * p;
    const w = 15 + 5 * p;
    const top = gy - h;
    body = `<rect x="${100 - w / 2}" y="${top}" width="${w}" height="${h}" rx="${w / 2}" fill="${dead ? "#a3a58f" : "#5da271"}"/>`;
    if (p > 0.5) body += `<path d="M${100 - w / 2} ${top + h * 0.42} q-16 0 -16 -14" stroke="${dead ? "#a3a58f" : "#5da271"}" stroke-width="9" fill="none" stroke-linecap="round"/>`;
    if (p > 0.78) body += `<path d="M${100 + w / 2} ${top + h * 0.3} q15 -2 14 -18" stroke="${dead ? "#a3a58f" : "#4c8f60"}" stroke-width="9" fill="none" stroke-linecap="round"/>`;
    if (p > 0.92 && !dead) body += `<circle cx="100" cy="${top - 4}" r="5" fill="#f28bb4"/><circle cx="100" cy="${top - 4}" r="2" fill="#ffd166"/>`;
  } else if (species === "pine") {
    const trunkH = 16 + 14 * p;
    body = `<rect x="96" y="${gy - trunkH}" width="8" height="${trunkH}" fill="${trunkC}"/>`;
    const tiers = 3;
    for (let i = 0; i < tiers; i++) {
      const tw = (30 + 34 * p) * (1 - i * 0.24);
      const ty = gy - trunkH - i * (16 + 15 * p) - 6;
      const th = 24 + 20 * p;
      body += `<path d="M${100 - tw} ${ty + th} L100 ${ty} L${100 + tw} ${ty + th} Z" fill="${i % 2 ? leafB : leafA}"/>`;
    }
  } else {
    // oak / sakura：圆冠
    const trunkH = 20 + 38 * p;
    const trunkW = 6 + 5 * p;
    const cx = 100, cy = gy - trunkH - (16 + 20 * p);
    const r = (13 + 27 * p);
    body = `<path d="M${100 - trunkW / 2} ${gy} L${100 - trunkW / 4} ${gy - trunkH} L${100 + trunkW / 4} ${gy - trunkH} L${100 + trunkW / 2} ${gy} Z" fill="${trunkC}"/>`;
    if (p > 0.3) body += `<path d="M100 ${gy - trunkH + 6} q-14 -8 -20 -18 M100 ${gy - trunkH + 6} q13 -9 17 -20" stroke="${trunkC}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
    const droop = dead ? 7 : 0;
    body += `<g transform="translate(0 ${droop})">
      <circle cx="${cx - r * 0.62}" cy="${cy + r * 0.28}" r="${r * 0.66}" fill="${leafB}"/>
      <circle cx="${cx + r * 0.62}" cy="${cy + r * 0.28}" r="${r * 0.66}" fill="${leafB}"/>
      <circle cx="${cx}" cy="${cy - r * 0.3}" r="${r * 0.82}" fill="${leafA}"/>
      <circle cx="${cx - r * 0.3}" cy="${cy + r * 0.34}" r="${r * 0.55}" fill="${leafA}"/>
      <circle cx="${cx + r * 0.34}" cy="${cy + r * 0.3}" r="${r * 0.5}" fill="${leafB}"/>
    </g>`;
    if (p > 0.9 && !dead && species === "oak")
      body += `<circle cx="${cx - 12}" cy="${cy + 6}" r="3.4" fill="#e4572e"/><circle cx="${cx + 14}" cy="${cy - 2}" r="3.4" fill="#e4572e"/><circle cx="${cx + 2}" cy="${cy + 14}" r="3.4" fill="#f08300"/>`;
    if (p > 0.9 && !dead && species === "sakura")
      body += `<circle cx="${cx - 34}" cy="${cy + 44}" r="3" fill="#f7c3d8"/><circle cx="${cx + 40}" cy="${cy + 58}" r="2.6" fill="#f7c3d8"/>`;
    if (p >= 0.12 && p <= 0.3) {
      // 新芽阶段：小茎 + 两片叶子
      body = `<path d="M100 ${gy} q1 -${18 * grow} -2 -${26 * grow}" stroke="#7fae5c" stroke-width="3.5" fill="none" stroke-linecap="round"/>
        <ellipse cx="${100 - 9}" cy="${gy - 26 * grow}" rx="8" ry="4.5" fill="${leafA}" transform="rotate(-28 ${100 - 9} ${gy - 26 * grow})"/>
        <ellipse cx="${100 + 7}" cy="${gy - 30 * grow}" rx="8" ry="4.5" fill="${leafB}" transform="rotate(24 ${100 + 7} ${gy - 30 * grow})"/>`;
    }
  }
  const tilt = dead ? `transform="rotate(-2.5 100 ${gy})"` : "";
  return `<svg viewBox="0 0 200 200">${soilEl}<g ${tilt}>${body}</g></svg>`;
}

/* ---------------- 存档 ---------------- */
const LS_KEY = "forestClone.v1";
let store = { coins: 0, sessions: [], clearedAt: null };
try {
  const raw = localStorage.getItem(LS_KEY);
  if (raw) store = Object.assign(store, JSON.parse(raw));
} catch (e) { /* 忽略损坏的存档 */ }
function save() { localStorage.setItem(LS_KEY, JSON.stringify(store)); notifySaveChanged(); }

/* ---------------- 存档导出 / 导入（跨设备迁移与合并） ---------------- */
const SAVE_FORMAT = "forest-clone-save";

function buildSaveData() {
  return {
    format: SAVE_FORMAT,
    version: 1,
    exportedAt: new Date().toISOString(),
    clearedAt: store.clearedAt || null,
    coins: store.coins,
    sessions: store.sessions,
  };
}

function validSession(s) {
  return !!s && typeof s === "object"
    && typeof s.id === "number"
    && typeof s.species === "string" && !!SPECIES[s.species]
    && typeof s.plannedMin === "number"
    && typeof s.focusedSec === "number"
    && (s.status === "grown" || s.status === "withered")
    && typeof s.endedAt === "string";
}

// 把一份外部存档合并进当前存档：按记录 id 去重（同一棵树在两台设备上不会重复计），
// 金币按合并后的全部记录重算（金币只来自长成的树：+计划分钟数，与发放规则一致）。
// 返回新增记录数。
function mergeSaveData(data) {
  if (!data || typeof data !== "object" || !Array.isArray(data.sessions)) {
    throw new Error("存档格式不对：缺少 sessions 列表");
  }
  if (data.format && data.format !== SAVE_FORMAT) {
    throw new Error("这不是「专注森林」的存档");
  }
  // 清空墓碑：任一端在 clearedAt 时刻执行过「清空全部记录」，则该时刻及之前的记录
  // 在合并时一律删除，避免旧设备把已清掉的树又同步回来；清空之后新种的树不受影响。
  const clearTs = Math.max(
    store.clearedAt ? Date.parse(store.clearedAt) || 0 : 0,
    data.clearedAt ? Date.parse(data.clearedAt) || 0 : 0);
  if (clearTs > 0) {
    store.clearedAt = new Date(clearTs).toISOString();
    store.sessions = store.sessions.filter((s) => Date.parse(s.endedAt) > clearTs);
  }
  const byId = new Map(store.sessions.map((s) => [s.id, s]));
  let added = 0;
  for (const s of data.sessions) {
    if (!validSession(s)) continue;
    if (clearTs > 0 && Date.parse(s.endedAt) <= clearTs) continue;
    if (!byId.has(s.id)) { byId.set(s.id, s); added += 1; }
  }
  store.sessions = [...byId.values()].sort((a, b) => a.id - b.id);
  store.coins = store.sessions.reduce(
    (sum, s) => sum + (s.status === "grown" ? s.plannedMin : 0), 0);
  save();
  return added;
}

function importSaveText(text) {
  let data;
  try { data = JSON.parse(text); } catch (_) { throw new Error("内容不是有效的存档（JSON 解析失败）"); }
  return mergeSaveData(data);
}

/* ---------------- 自动同步（GitHub Gist） ----------------
   存档同步到用户 GitHub 账号下的一个私密 Gist（文件 forest-save.json）。
   Token 只保存在本设备的 localStorage 里，只发往 api.github.com。
   策略：启动/手动同步时先拉取合并、再把并集推回；本地存档每次变化后防抖自动推送。 */
const SYNC_KEY = "forestClone.sync";
const GIST_FILE = "forest-save.json";
const GIST_DESC = "Forest Clone save (auto-sync)";
let syncCfg = null;
try { syncCfg = JSON.parse(localStorage.getItem(SYNC_KEY) || "null"); } catch (_) { syncCfg = null; }
let syncBusy = false;
let syncPending = false;
let syncTimer = null;
let syncSuppressHook = false; // 拉取合并期间置 true：合并里的 save() 不再触发新一轮推送，避免自激循环
let lastSyncAt = null;
let lastSyncError = "";

function persistSyncCfg() {
  if (syncCfg) localStorage.setItem(SYNC_KEY, JSON.stringify(syncCfg));
}
function notifySaveChanged() { if (!syncSuppressHook) scheduleSyncPush(); }
function scheduleSyncPush() {
  if (!syncCfg || !syncCfg.token) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => { syncNow("auto"); }, 1200);
}

async function ghApi(path, opts = {}) {
  const res = await fetch("https://api.github.com" + path, {
    ...opts,
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": "Bearer " + syncCfg.token,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  if (!res.ok) {
    let msg = "GitHub 接口返回 " + res.status;
    if (res.status === 401) msg = "Token 无效或已过期（401）";
    if (res.status === 403) msg = "权限不足（403）：Token 需要 gist 权限";
    if (res.status === 404) msg = "找不到同步 Gist（404），可能已被删除";
    throw new Error(msg);
  }
  return res.status === 204 ? null : res.json();
}

async function gistFindOrCreate() {
  if (syncCfg.gistId) {
    try { await ghApi("/gists/" + syncCfg.gistId); return syncCfg.gistId; }
    catch (e) { if (!/404/.test(e.message)) throw e; syncCfg.gistId = null; persistSyncCfg(); }
  }
  const list = await ghApi("/gists?per_page=100");
  const found = Array.isArray(list) && list.find((g) => g.files && g.files[GIST_FILE]);
  if (found) { syncCfg.gistId = found.id; persistSyncCfg(); return found.id; }
  const created = await ghApi("/gists", {
    method: "POST",
    body: JSON.stringify({
      description: GIST_DESC, public: false,
      files: { [GIST_FILE]: { content: JSON.stringify(buildSaveData(), null, 2) } },
    }),
  });
  syncCfg.gistId = created.id; persistSyncCfg();
  return created.id;
}

async function gistPullMerge() {
  const gist = await ghApi("/gists/" + syncCfg.gistId);
  const file = gist.files && gist.files[GIST_FILE];
  if (!file) return 0;
  let content = file.content;
  if (file.truncated && file.raw_url) content = await (await fetch(file.raw_url)).text();
  if (!content) return 0;
  syncSuppressHook = true;
  try { return mergeSaveData(JSON.parse(content)); }
  finally { syncSuppressHook = false; }
}

async function gistPush() {
  await ghApi("/gists/" + syncCfg.gistId, {
    method: "PATCH",
    body: JSON.stringify({
      files: { [GIST_FILE]: { content: JSON.stringify(buildSaveData(), null, 2) } },
    }),
  });
}

async function syncNow(reason) {
  if (!syncCfg || !syncCfg.token) return;
  if (syncBusy) { syncPending = true; return; }
  syncBusy = true; renderSyncUI();
  try {
    if (!syncCfg.gistId) await gistFindOrCreate();
    let added = 0;
    try { added = await gistPullMerge(); }
    catch (e) {
      if (/404/.test(e.message)) {
        syncCfg.gistId = null; persistSyncCfg();
        await gistFindOrCreate();
      } else throw e;
    }
    await gistPush();
    lastSyncAt = new Date(); lastSyncError = "";
    if (added > 0) { refreshTop(); renderForest(); renderStats(); }
  } catch (e) {
    lastSyncError = e.message || String(e);
  } finally {
    syncBusy = false; renderSyncUI();
    if (syncPending) { syncPending = false; scheduleSyncPush(); }
  }
}

function renderSyncUI() {
  const on = !!syncCfg;
  const offEl = $("syncOff"), onEl = $("syncOn");
  if (!offEl || !onEl) return;
  offEl.classList.toggle("hidden", on);
  onEl.classList.toggle("hidden", !on);
  if (on) {
    $("syncStatus").textContent = syncBusy ? "同步中…"
      : lastSyncError ? "同步失败：" + lastSyncError
      : lastSyncAt ? "已连接 · 上次同步 " + lastSyncAt.toLocaleTimeString()
      : "已连接 · 等待首次同步";
  }
}

function initSync() {
  renderSyncUI();
  if (syncCfg && syncCfg.token) syncNow("startup");
}

/* ---------------- 全局状态 ---------------- */
const $ = (id) => document.getElementById(id);
let selSpecies = "oak";
let selTag = "学习";
let selMinutes = 25;
let active = null;        // {species, tag, plannedMin, strict, startAt, endAt}
let tickTimer = null;
let awayTimer = null;
let awayDeadline = 0;

const DURATIONS = [10, 25, 35, 45, 60, 90, 120];
const TAGS = ["学习", "工作", "阅读", "写作", "运动", "休息"];
const HINTS = [
  [0.08, "种子正在积蓄力量……"],
  [0.30, "破土而出啦，稳住！"],
  [0.55, "小苗在认真长高……"],
  [0.85, "枝叶舒展开了，快长成大树了"],
  [1.01, "最后冲刺，大树即将长成！"],
];

/* ---------------- 顶部 & 导航 ---------------- */
function refreshTop() {
  $("coinCount").textContent = store.coins;
  $("streakCount").textContent = calcStreak();
}
function switchScreen(name) {
  document.querySelectorAll(".screen").forEach(s => s.classList.toggle("active", s.id === "screen-" + name));
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.screen === name));
  if (name === "forest") renderForest();
  if (name === "stats") renderStats();
  if (name === "focus") renderFocus();
}
document.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => switchScreen(t.dataset.screen)));

/* ---------------- 种植设置 ---------------- */
function renderSetup() {
  $("setupTree").innerHTML = treeSVG(selSpecies, 1);
  const row = $("speciesRow");
  row.innerHTML = "";
  Object.entries(SPECIES).forEach(([key, s]) => {
    const b = document.createElement("button");
    b.className = "species" + (key === selSpecies ? " selected" : "");
    b.innerHTML = treeSVG(key, 1) + s.name;
    b.addEventListener("click", () => { selSpecies = key; renderSetup(); });
    row.appendChild(b);
  });
  const dc = $("durationChips");
  dc.innerHTML = "";
  DURATIONS.forEach(m => {
    const c = document.createElement("button");
    c.className = "chip" + (m === selMinutes ? " selected" : "");
    c.textContent = m + " 分钟";
    c.addEventListener("click", () => setMinutes(m));
    dc.appendChild(c);
  });
  const tc = $("tagChips");
  tc.innerHTML = "";
  TAGS.forEach(t => {
    const c = document.createElement("button");
    c.className = "chip" + (t === selTag ? " selected" : "");
    c.textContent = t;
    c.addEventListener("click", () => { selTag = t; renderSetup(); });
    tc.appendChild(c);
  });
  $("durationLabel").textContent = selMinutes;
  $("durationRange").value = selMinutes;
}
function setMinutes(m) {
  selMinutes = Math.max(10, Math.min(180, Math.round(m / 5) * 5));
  renderSetup();
}
$("durationRange").addEventListener("input", (e) => {
  selMinutes = parseInt(e.target.value, 10);
  $("durationLabel").textContent = selMinutes;
  document.querySelectorAll("#durationChips .chip").forEach((c, i) =>
    c.classList.toggle("selected", DURATIONS[i] === selMinutes));
});

/* ---------------- 专注流程 ---------------- */
function renderFocus() {
  if (active) { showOnly("focusGrowing"); tick(); }
  else if (lastResult) { showOnly("focusResult"); }
  else { showOnly("focusSetup"); renderSetup(); }
}
function showOnly(id) {
  ["focusSetup", "focusGrowing", "focusResult"].forEach(x => $(x).classList.toggle("hidden", x !== id));
}

let lastResult = null;

$("plantBtn").addEventListener("click", () => {
  const now = Date.now();
  active = {
    species: selSpecies, tag: selTag, plannedMin: selMinutes,
    strict: $("strictToggle").checked,
    startAt: now, endAt: now + selMinutes * 60 * 1000,
  };
  lastResult = null;
  $("growingSpecies").textContent = SPECIES[selSpecies].emoji + " " + SPECIES[selSpecies].name;
  $("growingTag").textContent = "🏷️ " + selTag + " · " + selMinutes + " 分钟";
  showOnly("focusGrowing");
  clearInterval(tickTimer);
  tickTimer = setInterval(tick, 250);
  tick();
  setWakeLock(true);
});

function progress() {
  const total = active.endAt - active.startAt;
  return Math.max(0, Math.min(1, 1 - (active.endAt - Date.now()) / total));
}

function tick() {
  if (!active) return;
  const remainMs = active.endAt - Date.now();
  if (remainMs <= 0) { completeSession(); return; }
  const s = Math.ceil(remainMs / 1000);
  $("timeLeft").textContent = String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  const p = progress();
  $("ringFg").style.strokeDashoffset = String(578 * (1 - p));
  $("growingTree").innerHTML = treeSVG(active.species, Math.max(0.02, p));
  $("growingHint").textContent = HINTS.find(h => p < h[0])[1];
}

function endSession(status, reason) {
  const focusedSec = Math.round((Date.now() - active.startAt) / 1000);
  const sess = {
    id: Date.now(), species: active.species, tag: active.tag,
    plannedMin: active.plannedMin, focusedSec,
    status, progress: status === "grown" ? 1 : progress(),
    endedAt: new Date().toISOString(),
  };
  store.sessions.push(sess);
  let earned = 0;
  if (status === "grown") { earned = active.plannedMin; store.coins += earned; }
  save();
  clearInterval(tickTimer);
  setWakeLock(false);
  stopAwayWatch();
  stopSound();
  const dead = status !== "grown";
  lastResult = sess;
  active = null;
  $("resultTree").innerHTML = treeSVG(sess.species, sess.progress, dead);
  $("resultTitle").textContent = dead ? "这棵树枯萎了 🥀" : "专注完成！🎉";
  $("resultText").textContent = dead
    ? (reason === "away" ? "你离开了太久，它没能等到你回来。" : "没关系，下一次陪它长大。") +
      ` 本次坚持了 ${Math.max(1, Math.round(focusedSec / 60))} 分钟。`
    : `你专注了 ${sess.plannedMin} 分钟，收获一棵${SPECIES[sess.species].name}，金币 +${earned} 🪙`;
  showOnly("focusResult");
  refreshTop();
  if (!dead) chime();
}
function completeSession() { endSession("grown"); }
function wither(reason) { if (active) endSession("withered", reason); }

$("giveUpBtn").addEventListener("click", () => $("confirmOverlay").classList.remove("hidden"));
$("cancelGiveUp").addEventListener("click", () => $("confirmOverlay").classList.add("hidden"));
$("confirmGiveUp").addEventListener("click", () => { $("confirmOverlay").classList.add("hidden"); wither("giveup"); });
$("againBtn").addEventListener("click", () => { lastResult = null; renderFocus(); });
$("toForestBtn").addEventListener("click", () => switchScreen("forest"));

/* -------- 严格模式：切走页面 → 宽限倒计时 → 枯死 -------- */
document.addEventListener("visibilitychange", () => {
  if (!active || !active.strict) return;
  if (document.hidden) {
    awayDeadline = Date.now() + 5000;
    $("awayOverlay").classList.remove("hidden");
    clearInterval(awayTimer);
    awayTimer = setInterval(() => {
      const left = awayDeadline - Date.now();
      $("awayCount").textContent = Math.max(0, Math.ceil(left / 1000));
      if (left <= 0) { stopAwayWatch(); wither("away"); }
    }, 200);
    $("awayCount").textContent = 5;
  } else {
    stopAwayWatch();
  }
});
function stopAwayWatch() {
  clearInterval(awayTimer);
  $("awayOverlay").classList.add("hidden");
}

/* ---------------- 环境音（WebAudio 雨声） ---------------- */
let audioCtx = null, noiseNode = null, soundOn = false;
function toggleSound() {
  if (soundOn) { stopSound(); return; }
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const len = audioCtx.sampleRate * 2;
    const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {           // 粉红噪声近似雨声
      const white = Math.random() * 2 - 1;
      last = last * 0.94 + white * 0.06;
      d[i] = last * 3.2;
    }
    noiseNode = audioCtx.createBufferSource();
    noiseNode.buffer = buf; noiseNode.loop = true;
    const filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass"; filter.frequency.value = 900;
    const gain = audioCtx.createGain(); gain.gain.value = 0.16;
    noiseNode.connect(filter).connect(gain).connect(audioCtx.destination);
    noiseNode.start();
    soundOn = true;
    $("soundBtn").textContent = "🔊 环境音开";
  } catch (e) { /* 浏览器不支持则静默 */ }
}
function stopSound() {
  if (noiseNode) { try { noiseNode.stop(); } catch (e) {} noiseNode = null; }
  soundOn = false;
  const b = $("soundBtn"); if (b) b.textContent = "🔇 环境音";
}
$("soundBtn").addEventListener("click", toggleSound);

function chime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [659.25, 880].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = f; o.type = "sine";
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18);
      g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + i * 0.18 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.6);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.18); o.stop(ctx.currentTime + i * 0.18 + 0.7);
    });
  } catch (e) { /* 静默 */ }
}

/* ---------------- 森林 ---------------- */
function dayKey(iso) {
  const d = new Date(iso);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function dayLabel(key) {
  const today = dayKey(new Date().toISOString());
  const y = new Date(Date.now() - 86400000);
  if (key === today) return "今天";
  if (key === dayKey(y.toISOString())) return "昨天";
  return key;
}
function renderForest() {
  const list = $("forestList");
  const total = store.sessions.filter(s => s.status === "grown").length;
  $("forestSummary").textContent = store.sessions.length
    ? `共 ${store.sessions.length} 次专注记录 · ${total} 棵树长大 · 余额 ${store.coins} 金币`
    : "";
  if (!store.sessions.length) {
    list.innerHTML = `<div class="forest-empty">🌱<br>你的森林还是空的。<br>去种下第一棵树吧！</div>`;
    return;
  }
  const groups = {};
  [...store.sessions].reverse().forEach(s => {
    const k = dayKey(s.endedAt);
    (groups[k] = groups[k] || []).push(s);
  });
  list.innerHTML = "";
  Object.keys(groups).sort().reverse().forEach(k => {
    const wrap = document.createElement("div");
    wrap.className = "forest-day";
    wrap.innerHTML = `<div class="forest-day-title">${dayLabel(k)}</div>`;
    const grid = document.createElement("div");
    grid.className = "forest-grid";
    groups[k].forEach(s => {
      const cell = document.createElement("div");
      cell.className = "forest-cell";
      cell.innerHTML = treeSVG(s.species, s.progress, s.status === "withered") +
        `<div class="mins">${s.status === "withered" ? "枯萎" : s.plannedMin + " 分钟"}</div><div>${s.tag}</div>`;
      grid.appendChild(cell);
    });
    wrap.appendChild(grid);
    list.appendChild(wrap);
  });
}

/* ---------------- 统计 ---------------- */
function calcStreak() {
  const days = new Set(store.sessions.filter(s => s.status === "grown").map(s => dayKey(s.endedAt)));
  let streak = 0;
  let cursor = new Date();
  if (!days.has(dayKey(cursor.toISOString()))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dayKey(cursor.toISOString()))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
function renderStats() {
  const grown = store.sessions.filter(s => s.status === "grown");
  const withered = store.sessions.filter(s => s.status === "withered");
  const minutes = store.sessions.reduce((a, s) => a + Math.round(s.focusedSec / 60), 0);
  $("statMinutes").textContent = minutes;
  $("statGrown").textContent = grown.length;
  $("statWithered").textContent = withered.length;
  $("statStreak").textContent = calcStreak();
  const bars = $("weekBars");
  bars.innerHTML = "";
  const dayNames = ["日", "一", "二", "三", "四", "五", "六"];
  const sums = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const k = dayKey(d.toISOString());
    const sum = store.sessions.filter(s => dayKey(s.endedAt) === k)
      .reduce((a, s) => a + Math.round(s.focusedSec / 60), 0);
    sums.push({ sum, label: "周" + dayNames[d.getDay()] });
  }
  const max = Math.max(10, ...sums.map(x => x.sum));
  sums.forEach(({ sum, label }) => {
    const col = document.createElement("div");
    col.className = "bar-col";
    col.innerHTML = `<div class="bar-val">${sum || ""}</div><div class="bar" style="height:${Math.max(3, sum / max * 84)}px"></div><div class="bar-day">${label}</div>`;
    bars.appendChild(col);
  });
}
$("resetBtn").addEventListener("click", () => {
  if (confirm("确定要清空全部记录吗？森林、金币和统计都会归零。")) {
    store = { coins: 0, sessions: [], clearedAt: new Date().toISOString() };
    save(); refreshTop(); renderStats();
  }
});

/* ---------------- 存档备份 UI ---------------- */
function setSaveMsg(t) { $("saveMsg").textContent = t; }
function afterImport(added) {
  refreshTop(); renderForest(); renderStats();
  setSaveMsg(added > 0
    ? `导入完成：新增 ${added} 条记录（重复的已自动跳过），金币已按合并后的记录重算。`
    : "导入完成：没有新记录——这份存档里的树你都已经有了。");
}
$("exportFileBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(buildSaveData(), null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "forest-save-" + new Date().toISOString().slice(0, 10) + ".json";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  setSaveMsg("存档文件已导出。把它传到另一台设备，在那边的统计页点「导入存档文件」即可。");
});
$("exportCopyBtn").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(JSON.stringify(buildSaveData()));
    setSaveMsg("存档文本已复制。到另一台设备的统计页点「粘贴导入」，粘贴后确认即可。");
  } catch (_) {
    setSaveMsg("复制失败（浏览器没给剪贴板权限），请改用「导出存档文件」。");
  }
});
$("importFileBtn").addEventListener("click", () => $("importFileInput").click());
$("importFileInput").addEventListener("change", async (e) => {
  const f = e.target.files && e.target.files[0];
  e.target.value = "";
  if (!f) return;
  try { afterImport(importSaveText(await f.text())); }
  catch (err) { setSaveMsg("导入失败：" + err.message); }
});
$("importPasteBtn").addEventListener("click", () => {
  $("pasteBox").classList.remove("hidden");
  $("importText").focus();
});
$("importCancelBtn").addEventListener("click", () => {
  $("pasteBox").classList.add("hidden");
  $("importText").value = "";
});
$("importDoBtn").addEventListener("click", () => {
  try {
    afterImport(importSaveText($("importText").value.trim()));
    $("pasteBox").classList.add("hidden");
    $("importText").value = "";
  } catch (err) { setSaveMsg("导入失败：" + err.message); }
});

/* ---------------- 自动同步 UI 接线 ---------------- */
$("gistConnectBtn").addEventListener("click", async () => {
  const token = $("gistTokenInput").value.trim();
  if (!token) { $("syncMsg").textContent = "先粘贴 Token 再连接。"; return; }
  syncCfg = { token, gistId: null };
  $("syncMsg").textContent = "连接中…";
  renderSyncUI();
  try {
    await ghApi("/user");
    await gistFindOrCreate();
    persistSyncCfg();
    $("gistTokenInput").value = "";
    await syncNow("manual");
    $("syncMsg").textContent = lastSyncError
      ? "已连接，但首次同步失败：" + lastSyncError
      : "已连接，首次同步完成。这台设备的记录已与云端合并。";
  } catch (e) {
    syncCfg = null;
    localStorage.removeItem(SYNC_KEY);
    $("syncMsg").textContent = "连接失败：" + e.message;
    renderSyncUI();
  }
});
$("syncNowBtn").addEventListener("click", () => { syncNow("manual"); });
$("gistDisconnectBtn").addEventListener("click", () => {
  syncCfg = null;
  localStorage.removeItem(SYNC_KEY);
  lastSyncError = ""; lastSyncAt = null;
  $("syncMsg").textContent = "已断开。本机记录保留；云端 Gist 还在你的 GitHub 账号里，不想要可去 gist.github.com 手动删。";
  renderSyncUI();
});

/* ---------------- 启动 ---------------- */
renderSetup();
refreshTop();
initSync();
