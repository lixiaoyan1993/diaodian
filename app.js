/**
 * 叼点 —— 以「标点档案」为中心的数据模型演示。
 *
 * 核心思想：抖音视频和钓友反馈都只是"喂给标点档案的证据"。
 *   - 提炼页：从视频生成/填充档案的证据层
 *   - 地图/候选页：读档案渲染
 *   - 验点页：把反馈写回档案的验证层，重算真实性
 *   - 真实性分 = 线上证据(baseScore) + 线下验证(verifications)加权
 * 所有页面读写的是同一份 SPOTS 数据，改一处，处处联动。
 */

// 反馈对真实性分的影响权重（线下证据，权重高于线上）
const FEEDBACK_WEIGHT = {
  中鱼: 6,
  空军: -4,
  位置不准: -8,
  有人管: -10,
  禁钓: -30,
  挂底: -2,
};

// ---- 中心数据源：标点档案 ----
const SPOTS = [
  {
    id: "north-bridge",
    name: "北岸老桥桥洞",
    owner: "阿杭",
    public: true,
    style: "路亚",
    pos: { x: 31, y: 38, water: "运河", accuracy: "300-800米", tone: "green" },
    fish: { species: "翘嘴", window: "晚口", lure: "VIB", weight: "7g", action: "慢收", distanceKm: 4.2 },
    // 证据层：每条视频是一条线上证据
    evidence: [
      { type: "map-pin", title: "地名：北岸老桥 / 运河绿道", desc: "标题和评论均出现“老桥”“运河边”", level: "高" },
      { type: "scan-text", title: "画面：红色护栏 + 桥洞", desc: "截图 OCR 和地貌特征可匹配", level: "中" },
      { type: "fish", title: "鱼情：翘嘴 / 晚口 / VIB", desc: "提取鱼种、窗口期和饵型", level: "高" },
      { type: "messages-square", title: "评论：有人问“是不是北岸”", desc: "评论区弱线索，作为辅助证据", level: "中" },
    ],
    baseScore: 78, // 仅凭线上证据的基础分
    verifications: ["中鱼", "中鱼", "空军"], // 线下验证记录
    note: "晚口桥墩阴影有追饵，7g VIB 慢收更稳。",
  },
  {
    id: "greenway-bend",
    name: "运河绿道回湾",
    owner: "城西阿伟",
    public: true,
    style: "路亚",
    pos: { x: 64, y: 28, water: "运河", accuracy: "500-1000米", tone: "blue" },
    fish: { species: "翘嘴", window: "晨口", lure: "米诺", weight: "5g", action: "抽停", distanceKm: 5.6 },
    evidence: [
      { type: "map-pin", title: "地名：运河绿道", desc: "标题水域特征匹配", level: "中" },
      { type: "scan-text", title: "画面：缓流回湾", desc: "地貌疑似，缺地标牌", level: "低" },
    ],
    baseScore: 72,
    verifications: [],
    note: "",
  },
  {
    id: "wetland-gate",
    name: "湿地南门闸口",
    owner: "夜钓老王",
    public: true,
    style: "路亚",
    pos: { x: 72, y: 66, water: "湿地", accuracy: "800-1500米", tone: "gold" },
    fish: { species: "鳜鱼", window: "夜口", lure: "亮片", weight: "10g", action: "跳底", distanceKm: 9.1 },
    evidence: [
      { type: "scan-text", title: "画面：闸口结构疑似匹配", desc: "需要钓友现场验证", level: "中" },
    ],
    baseScore: 64,
    verifications: [],
    note: "",
  },
  {
    id: "stone-edge",
    name: "石坎深浅交界",
    owner: "老李",
    public: true,
    style: "路亚",
    pos: { x: 43, y: 74, water: "野河", accuracy: "300-600米", tone: "blue" },
    fish: { species: "鲈鱼", window: "晨口", lure: "米诺", weight: "6g", action: "匀收", distanceKm: 6.8 },
    evidence: [
      { type: "map-pin", title: "地名：石坎", desc: "同城钓友交叉确认", level: "高" },
      { type: "fish", title: "鱼情：晨口 / 夜口均有记录", desc: "深浅交界结构稳定", level: "高" },
    ],
    baseScore: 76,
    verifications: ["中鱼", "中鱼"],
    note: "深浅交界处停顿，米诺匀收带轻抽。",
  },
  {
    id: "dock-corner",
    name: "老码头桦尖草洞",
    owner: "钓鲫老张",
    public: true,
    style: "台钓",
    pos: { x: 24, y: 56, water: "野河", accuracy: "200-400米", tone: "green" },
    fish: { species: "鲫鱼", window: "晨口", lure: "蚯蚓/红虫", weight: "1.5米水深", action: "底钓", distanceKm: 3.5 },
    evidence: [
      { type: "map-pin", title: "地名：老码头桦尖", desc: "钓友常驻钓位", level: "高" },
      { type: "fish", title: "鱼情：鲫鱼 / 晨口好口", desc: "草洞挡风，发窝快", level: "高" },
    ],
    baseScore: 80,
    verifications: ["中鱼", "中鱼", "中鱼"],
    note: "打隔夜窝，1.5米水深，钓钝守大鲫。",
  },
  {
    id: "reservoir-inlet",
    name: "水库进水口铧尖",
    owner: "老李",
    public: true,
    style: "台钓",
    pos: { x: 58, y: 80, water: "水库", accuracy: "300-600米", tone: "blue" },
    fish: { species: "鲤鱼", window: "全天", lure: "玉米/颗粒", weight: "2.5米水深", action: "底钓", distanceKm: 12.4 },
    evidence: [
      { type: "map-pin", title: "地名：进水口铧尖", desc: "进水带食，大鱼洄游", level: "高" },
      { type: "fish", title: "鱼情：鲤草为主", desc: "雨后进水口最佳", level: "中" },
    ],
    baseScore: 74,
    verifications: ["中鱼"],
    note: "玉米打重窝，钓离底守鲤草。",
  },
];

let activeSpotId = SPOTS[0].id;

// ---- 本地持久化：我手动记录的点存在 localStorage ----
const STORE_KEY = "diaodian.spots";

function loadMySpots() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
    // 把我记录的点放到最前面，和内置 demo 点合并到同一数据源
    SPOTS.unshift(...saved);
  } catch (e) {
    /* 忽略损坏的本地数据 */
  }
}

function saveMySpots() {
  const mine = SPOTS.filter((s) => s.source === "manual");
  localStorage.setItem(STORE_KEY, JSON.stringify(mine));
}

// ---- 账号（前端模拟，仅原型用，密码明文存本地）----
const USERS_KEY = "diaodian.users";
const SESSION_KEY = "diaodian.user";
let currentUser = localStorage.getItem(SESSION_KEY) || null;

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "{}");
  } catch (e) {
    return {};
  }
}

// "我的"标点：登录后只看自己的点；游客看公开点作为预览
function visibleSpots() {
  if (currentUser) return SPOTS.filter((s) => s.owner === currentUser);
  return SPOTS.filter((s) => s.public);
}

// 标点大厅：所有标记人选择公开的点
function hallSpots() {
  return SPOTS.filter((s) => s.public);
}

// 钓法筛选：全部 / 路亚 / 台钓
let styleFilter = "全部";
function applyStyleFilter(list) {
  if (styleFilter === "全部") return list;
  return list.filter((s) => (s.style || "路亚") === styleFilter);
}

// ---- 真实性计算：线上证据基础分 + 线下反馈加权 ----
function computeConfidence(spot) {
  let score = spot.baseScore;
  for (const v of spot.verifications) {
    score += FEEDBACK_WEIGHT[v] || 0;
  }
  return Math.max(10, Math.min(99, Math.round(score)));
}

function toneClass(score) {
  if (score >= 80) return "hot";
  if (score >= 65) return "warm";
  return "cool";
}

function styleTag(spot) {
  const st = spot.style || "路亚";
  return `<span class="style-tag ${st === "台钓" ? "bait" : "lure"}">${st}</span>`;
}

function getSpot(id) {
  return SPOTS.find((s) => s.id === id);
}

// ---- DOM 引用 ----
const screens = document.querySelectorAll(".screen");
const navButtons = document.querySelectorAll(".bottom-nav button");
const analyzeButton = document.querySelector("#analyzeButton");
const pipelineSteps = document.querySelectorAll(".pipeline-step");
const signalList = document.querySelector("#signalList");
const candidateList = document.querySelector("#candidateList");
const extractScore = document.querySelector("#extractScore");
const mapCanvas = document.querySelector("#mapCanvas");
const savedList = document.querySelector("#savedList");
const spotTitle = document.querySelector("#spotTitle");
const spotText = document.querySelector("#spotText");
const spotMeta = document.querySelector("#spotMeta");
const spotScore = document.querySelector("#spotScore");
const feedbackButtons = document.querySelectorAll("[data-feedback]");
const feedbackTitle = document.querySelector("#feedbackTitle");
const feedbackText = document.querySelector("#feedbackText");
const feedbackCount = document.querySelector("#feedbackCount");

function showScreen(name) {
  screens.forEach((screen) => {
    screen.classList.toggle("active", screen.dataset.screen === name);
  });
  navButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.target === name);
  });
  // 进入记点页自动定位
  if (name === "record") autoLocate();
}

// ---- 渲染：提炼页（读当前档案的证据层）----
function renderSignals(spot) {
  signalList.innerHTML = "";
  spot.evidence.forEach((ev) => {
    const article = document.createElement("article");
    article.innerHTML = `
      <i data-lucide="${ev.type}"></i>
      <div>
        <strong>${ev.title}</strong>
        <p>${ev.desc}</p>
      </div>
      <b>${ev.level}</b>`;
    signalList.appendChild(article);
  });
  extractScore.textContent = computeConfidence(spot);
}

// ---- 渲染：候选列表（读所有档案，按真实性排序）----
function renderCandidates() {
  candidateList.innerHTML = "";
  [...visibleSpots()]
    .sort((a, b) => computeConfidence(b) - computeConfidence(a))
    .forEach((spot) => {
      const score = computeConfidence(spot);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "candidate" + (spot.id === activeSpotId ? " active" : "");
      btn.innerHTML = `<span>${spot.name}</span><b>${score}%</b>`;
      btn.addEventListener("click", () => {
        activeSpotId = spot.id;
        renderAll();
        showScreen("map");
      });
      candidateList.appendChild(btn);
    });
}

// ---- 渲染：地图 pin（读所有档案）----
function renderPins() {
  mapCanvas.querySelectorAll(".pin").forEach((p) => p.remove());
  visibleSpots().forEach((spot) => {
    const score = computeConfidence(spot);
    const pin = document.createElement("button");
    pin.type = "button";
    pin.className = `pin ${toneClass(score)}` + (spot.id === activeSpotId ? " active" : "");
    pin.style.setProperty("--x", `${spot.pos.x}%`);
    pin.style.setProperty("--y", `${spot.pos.y}%`);
    pin.textContent = score;
    pin.addEventListener("click", () => {
      activeSpotId = spot.id;
      renderAll();
    });
    mapCanvas.appendChild(pin);
  });
}

// ---- 渲染：标点详情（读位置层 + 战术层 + 真实性）----
function renderDetail(spot) {
  const score = computeConfidence(spot);
  spotTitle.textContent = spot.name;

  let metaText;
  if (!spot.fish.window && !spot.fish.bait) {
    // 手动记录的点
    spotText.textContent = spot.geo
      ? `GPS ${spot.geo.lat.toFixed(5)}, ${spot.geo.lng.toFixed(5)}`
      : "手动标记，未定位";
    metaText = `鱼种：${spot.fish.species}`;
  } else if (spot.fish.bait) {
    // 台钓
    spotText.textContent = `${spot.evidence.length}条线上证据，${spot.verifications.length}次现场验证，精度约${spot.pos.accuracy}。`;
    metaText = `${spot.fish.species} · ${spot.fish.bait} · ${spot.fish.depth} · 底钓`;
  } else {
    spotText.textContent = `${spot.evidence.length}条线上证据，${spot.verifications.length}次现场验证，精度约${spot.pos.accuracy}。`;
    metaText = `${spot.fish.species} · ${spot.fish.window || ""} · ${spot.fish.weight || spot.fish.lure || ""} ${spot.fish.lure ? `（${spot.fish.action}）` : ""}`;
  }
  if (spot.fromOwner) metaText += `　收藏自 @${spot.fromOwner}`;
  spotMeta.innerHTML = styleTag(spot) + metaText;
  // 备注行
  const noteEl = document.querySelector("#spotNote");
  if (noteEl) {
    noteEl.hidden = !spot.note;
    if (spot.note) noteEl.textContent = spot.note;
  }
  spotScore.textContent = score;
}

// ---- 渲染：点库（读所有档案）----
function renderLibrary() {
  savedList.innerHTML = "";
  [...applyStyleFilter(visibleSpots())]
    .sort((a, b) => computeConfidence(b) - computeConfidence(a))
    .forEach((spot) => {
      const score = computeConfidence(spot);
      const status =
        spot.source === "manual"
          ? "我的点"
          : spot.source === "saved"
            ? "已收藏"
            : spot.verifications.length === 0
              ? "待验证"
              : score >= 80
                ? "高可信"
                : "已收藏";
      const thumb = spot.photo
        ? `<span class="mini-map" style="background-image:url(${spot.photo});background-size:cover"></span>`
        : `<span class="mini-map ${spot.pos.tone}"></span>`;
      const line = !spot.fish.window && !spot.fish.bait
        ? `${status} · ${spot.fish.species}`
        : spot.fish.bait
          ? `${status} · ${spot.fish.bait} · ${spot.fish.depth}`
          : `${status} · ${spot.fish.window} · ${spot.fish.lure} · ${spot.fish.distanceKm}km`;
      const article = document.createElement("article");
      article.innerHTML = `
        ${thumb}
        <div>
          <strong>${spot.name}</strong>
          <p>${styleTag(spot)}${line}</p>
        </div>
        <b>${score}</b>`;
      article.addEventListener("click", () => {
        activeSpotId = spot.id;
        renderAll();
        showScreen("map");
      });
      savedList.appendChild(article);
    });
}

// 把大厅里别人的点复制一份到我的点库（默认私密）
function addToMyLibrary(spot) {
  if (!currentUser) {
    openAuth("login", "登录后才能把大厅的点加到自己的点库。");
    return;
  }
  if (SPOTS.some((s) => s.owner === currentUser && s.fromId === spot.id)) {
    return; // 已收藏过
  }
  const copy = JSON.parse(JSON.stringify(spot));
  copy.id = `s-${Date.now()}`;
  copy.owner = currentUser;
  copy.public = false; // 收藏的副本默认私密，要再公开由自己决定
  copy.source = "saved";
  copy.fromId = spot.id;
  copy.fromOwner = spot.owner;
  SPOTS.unshift(copy);
  saveMySpots();
  renderAll();
}

let hallActiveId = null;

// ---- 渲染：大厅地图视图（所有公开点的 pin）----
function renderHallMap() {
  const hallMap = document.querySelector("#hallMap");
  const spots = applyStyleFilter(hallSpots());
  if (!spots.some((s) => s.id === hallActiveId)) {
    hallActiveId = spots[0]?.id || null;
  }
  hallMap.querySelectorAll(".pin").forEach((p) => p.remove());
  spots.forEach((spot) => {
    const score = computeConfidence(spot);
    const pin = document.createElement("button");
    pin.type = "button";
    pin.className = `pin ${toneClass(score)}` + (spot.id === hallActiveId ? " active" : "");
    pin.style.setProperty("--x", `${spot.pos.x}%`);
    pin.style.setProperty("--y", `${spot.pos.y}%`);
    pin.textContent = score;
    pin.addEventListener("click", () => {
      hallActiveId = spot.id;
      renderHallMap();
      renderHallDetail();
    });
    hallMap.appendChild(pin);
  });
}

// ---- 渲染：大厅地图下方的选中详情 + 收藏按钮 ----
function renderHallDetail() {
  const spot = SPOTS.find((s) => s.id === hallActiveId);
  const title = document.querySelector("#hallSpotTitle");
  const meta = document.querySelector("#hallSpotMeta");
  const addBtn = document.querySelector("#hallAddBtn");
  if (!spot) {
    title.textContent = "点开地图上的标点";
    meta.textContent = "选一个看看，可以收藏到自己的点库";
    addBtn.disabled = true;
    addBtn.className = "hall-add";
    addBtn.textContent = "收藏";
    return;
  }
  const score = computeConfidence(spot);
  title.textContent = spot.name;
  const detail = spot.fish.bait
    ? `${spot.fish.species} · ${spot.fish.bait} · ${spot.fish.depth}`
    : `${spot.fish.species} · ${spot.fish.lure || spot.fish.weight || ""} · ${spot.fish.action || ""}`;
  meta.innerHTML = `${styleTag(spot)}@${spot.owner || "钓友"} · ${detail} · ${score}分`;

  const mine = spot.owner === currentUser;
  const saved = SPOTS.some((s) => s.owner === currentUser && s.fromId === spot.id);
  addBtn.textContent = mine ? "我的点" : saved ? "已收藏" : "加到我的点库";
  addBtn.disabled = mine || saved;
  addBtn.className = "hall-add" + (mine || saved ? " done" : "");
  addBtn.onclick = mine || saved ? null : () => addToMyLibrary(spot);
}

// ---- 渲染：大厅列表视图（所有公开点，含别人的）----
function renderHall() {
  const hallList = document.querySelector("#hallList");
  hallList.innerHTML = "";
  [...applyStyleFilter(hallSpots())]
    .sort((a, b) => computeConfidence(b) - computeConfidence(a))
    .forEach((spot) => {
      const score = computeConfidence(spot);
      const mine = spot.owner === currentUser;
      const saved = SPOTS.some((s) => s.owner === currentUser && s.fromId === spot.id);
      const thumb = spot.photo
        ? `<span class="mini-map" style="background-image:url(${spot.photo});background-size:cover"></span>`
        : `<span class="mini-map ${spot.pos.tone}"></span>`;
      const btnLabel = mine ? "我的点" : saved ? "已收藏" : "加到我的点库";
      const btnDone = mine || saved ? " done" : "";
      const line = spot.fish.bait
        ? `${spot.fish.species} · ${spot.fish.bait} · ${spot.fish.depth}`
        : `${spot.fish.species} · ${spot.fish.lure || spot.fish.weight || ""} · ${spot.fish.action || ""}`;

      const article = document.createElement("article");
      article.innerHTML = `
        ${thumb}
        <div>
          <strong>${spot.name}</strong>
          <p>${styleTag(spot)}<span class="hall-owner">@${spot.owner || "钓友"}</span> · ${line} · ${score}分</p>
        </div>
        <button class="hall-add${btnDone}" type="button"${mine || saved ? " disabled" : ""}>${btnLabel}</button>`;

      if (!mine && !saved) {
        article.querySelector(".hall-add").addEventListener("click", () => addToMyLibrary(spot));
      }
      hallList.appendChild(article);
    });
}

// ---- 渲染：验点页（读当前档案的验证层）----
function renderVerify(spot) {
  const counts = {};
  spot.verifications.forEach((v) => (counts[v] = (counts[v] || 0) + 1));
  const parts = Object.entries(counts).map(([k, n]) => `${n}次${k}`);
  feedbackTitle.textContent = `${spot.name} · 最近验点`;
  feedbackText.textContent = parts.length
    ? `${parts.join("，")}。当前真实性 ${computeConfidence(spot)} 分。`
    : "暂无现场验点，真实性仅来自线上证据。";
  feedbackCount.textContent = spot.verifications.length;
}

// 一次性刷新所有视图 —— 这就是"同一份数据，处处联动"
function renderAll() {
  const vis = visibleSpots();
  if (!vis.some((s) => s.id === activeSpotId)) {
    activeSpotId = vis[0]?.id;
  }
  const spot = getSpot(activeSpotId);
  if (!spot) return;
  renderSignals(spot);
  renderCandidates();
  renderPins();
  renderDetail(spot);
  renderLibrary();
  renderHall();
  renderHallMap();
  renderHallDetail();
  renderVerify(spot);
  if (window.lucide) window.lucide.createIcons();
}

// 平台配置：抖音 / 小红书 复用同一套提炼流程
const PLATFORM = {
  douyin: {
    name: "抖音",
    label: "抖音链接",
    link: "https://v.douyin.com/luya-spot-demo/",
    scene: "杭州运河边晚口，桥洞下第一杆就追",
    badgeClass: "",
    pictureSignal: { type: "scan-text", title: "封面：抽帧 OCR 待匹配", desc: "视频地标特征置信度偏低", level: "低" },
  },
  xiaohongshu: {
    name: "小红书",
    label: "小红书笔记链接",
    link: "https://xhslink.com/luya-note-demo",
    scene: "探店笔记｜城西野河翘嘴爆护点位分享",
    badgeClass: "xhs",
    pictureSignal: { type: "scan-text", title: "笔记图片：多图 OCR 待匹配", desc: "图文笔记地标线索偏弱", level: "低" },
  },
};
let platform = "douyin";

// ---- 提炼动画：从视频/笔记生成一个低分线上候选档案并插入数据源 ----
function animateExtraction() {
  pipelineSteps.forEach((step, index) => {
    window.setTimeout(() => step.classList.add("active"), index * 180);
  });

  const city = document.querySelector("#citySelect")?.value || "杭州";
  const water = document.querySelector("#waterSelect")?.value || "运河";
  const plat = PLATFORM[platform];

  // 新点：纯线上证据，无验证 → 真实性低，需要钓友去验
  const newSpot = {
    id: `extracted-${Date.now()}`,
    name: `${city}${water}·${plat.name}提炼点`,
    source: platform,
    owner: currentUser || null, // 登录则归属本人，未登录作公开示例
    pos: { x: 20 + Math.random() * 60, y: 20 + Math.random() * 55, water, accuracy: "1-2公里", tone: "gold" },
    fish: { species: "翘嘴", window: "晚口", lure: "VIB", weight: "7g", action: "慢收", distanceKm: +(2 + Math.random() * 8).toFixed(1) },
    evidence: [
      { type: "map-pin", title: `地名：${city}${water}`, desc: `${plat.name}标题/话题标签提取`, level: "中" },
      plat.pictureSignal,
      { type: "fish", title: "鱼情：翘嘴 / 晚口 / VIB", desc: "文案提取饵型与窗口", level: "中" },
    ],
    baseScore: 48,
    verifications: [],
    note: "",
  };
  SPOTS.unshift(newSpot);
  activeSpotId = newSpot.id;

  window.setTimeout(() => {
    renderAll();
    showScreen("extract");
    document.querySelectorAll("#signalList article").forEach((card, index) => {
      window.setTimeout(() => {
        card.animate(
          [
            { transform: "translateY(8px)", opacity: 0.2 },
            { transform: "translateY(0)", opacity: 1 },
          ],
          { duration: 260, easing: "ease-out" },
        );
      }, index * 110);
    });
  }, 720);
}

// ---- 事件绑定 ----
navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    renderAll();
    showScreen(button.dataset.target);
  });
});

// 大厅地图 / 列表视图切换
const hallViewTabs = document.querySelectorAll(".view-tabs button");
const hallViews = document.querySelectorAll(".hall-view");
hallViewTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const view = tab.dataset.hallview;
    hallViewTabs.forEach((t) => t.classList.toggle("active", t === tab));
    hallViews.forEach((v) => (v.hidden = v.dataset.hallview !== view));
  });
});

// 钓法筛选（点库 + 大厅共用，按 data-filter 同步高亮）
const styleFilterChips = document.querySelectorAll(".style-filter button");
styleFilterChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    styleFilter = chip.dataset.filter;
    styleFilterChips.forEach((c) => c.classList.toggle("active", c.dataset.filter === styleFilter));
    renderAll();
  });
});

document.querySelectorAll("[data-go]").forEach((button) => {
  button.addEventListener("click", () => {
    renderAll();
    showScreen(button.dataset.go);
  });
});

analyzeButton.addEventListener("click", animateExtraction);

// 平台切换：抖音 / 小红书
const platformChips = document.querySelectorAll(".platform-chips button");
const platformBadge = document.querySelector("#platformBadge");
const sceneText = document.querySelector("#sceneText");
const linkLabel = document.querySelector("#linkLabel");
const videoLink = document.querySelector("#videoLink");

platformChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    platform = chip.dataset.platform;
    const plat = PLATFORM[platform];
    platformChips.forEach((c) => c.classList.toggle("active", c === chip));
    platformBadge.textContent = plat.name;
    platformBadge.className = `video-badge ${plat.badgeClass}`.trim();
    sceneText.textContent = plat.scene;
    linkLabel.textContent = plat.label;
    videoLink.value = plat.link;
  });
});

// 验点：把反馈写回当前档案的验证层 → 重算真实性 → 全局联动刷新
feedbackButtons.forEach((button) => {
  button.addEventListener("click", () => {
    feedbackButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");

    const spot = getSpot(activeSpotId);
    const feedback = button.dataset.feedback;
    if (!spot) return;
    const before = computeConfidence(spot);
    spot.verifications.push(feedback);
    const after = computeConfidence(spot);

    renderAll();
    // Re-activate the clicked button after re-render
    document.querySelectorAll(".verify-grid button").forEach((b) => {
      if (b.dataset.feedback === feedback) b.classList.add("active");
    });

    const delta = after - before;
    const sign = delta > 0 ? `+${delta}` : `${delta}`;
    feedbackText.textContent = `已记录「${feedback}」：真实性 ${before} → ${after}（${sign}）。地图、候选、点库已同步更新。`;
  });
});

// ---- 记点页：一键定位 ----
const locateBtn = document.querySelector("#locateBtn");
const geoReadout = document.querySelector("#geoReadout");
let lastGeo = null;
let locating = false;

function autoLocate() {
  if (lastGeo || locating || !navigator.geolocation) return;
  locating = true;
  geoReadout.textContent = "定位中…";
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      locating = false;
      lastGeo = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      geoReadout.textContent = `已定位：${lastGeo.lat.toFixed(5)}, ${lastGeo.lng.toFixed(5)}（精度约${Math.round(pos.coords.accuracy)}米）`;
      geoReadout.classList.add("located");
    },
    () => { locating = false; },
    { enableHighAccuracy: true, timeout: 6000 },
  );
}

locateBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    geoReadout.textContent = "当前环境不支持定位，可手动填写标点名称后保存。";
    return;
  }
  geoReadout.textContent = "定位中…";
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      lastGeo = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      geoReadout.textContent = `已定位：${lastGeo.lat.toFixed(5)}, ${lastGeo.lng.toFixed(5)}（精度约${Math.round(pos.coords.accuracy)}米）`;
      geoReadout.classList.add("located");
    },
    (err) => {
      geoReadout.classList.remove("located");
      geoReadout.textContent =
        err.code === err.PERMISSION_DENIED
          ? "定位被拒绝。请在浏览器允许定位，或直接手动保存。"
          : "定位失败，可手动填写后保存。";
    },
    { enableHighAccuracy: true, timeout: 8000 },
  );
});

// ---- 记点页：拍照 / 选图，转成 dataURL 预览 ----
const photoInput = document.querySelector("#recPhoto");
const photoPreview = document.querySelector("#photoPreview");
let lastPhoto = null;

photoInput.addEventListener("change", () => {
  const file = photoInput.files && photoInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    lastPhoto = reader.result;
    photoPreview.src = lastPhoto;
    photoPreview.hidden = false;
  };
  reader.readAsDataURL(file);
});

// ---- 记点页：钓法切换（路亚 / 台钓）----
let recStyle = "路亚";
const styleChips = document.querySelectorAll("#styleChips button");
const recSpecies = document.querySelector("#recSpecies");
const styleFields = document.querySelectorAll(".style-fields");

function updateStyleFields(style) {
  recSpecies.placeholder = style === "台钓" ? "鲫鱼 / 鲤鱼" : "翘嘴";
  styleFields.forEach((el) => {
    el.hidden = el.dataset.style !== style;
  });
}

styleChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    recStyle = chip.dataset.style;
    styleChips.forEach((c) => c.classList.toggle("active", c === chip));
    updateStyleFields(recStyle);
  });
});

// ---- 记点页：保存为一个标点档案 ----
const saveSpotBtn = document.querySelector("#saveSpotBtn");
const val = (id) => document.querySelector(id)?.value.trim() || "";

function autoSpotName(style, species, geo) {
  const parts = [];
  if (species && species !== "未填") parts.push(species);
  if (geo) {
    parts.push(geo.lat.toFixed(4).slice(-2) + "°" + geo.lng.toFixed(4).slice(-2));
  }
  return parts.length ? parts.join("·") + style + "点" : style + "新点";
}

saveSpotBtn.addEventListener("click", () => {
  if (!currentUser) {
    openAuth("login", "记点前请先登录，标点会绑定到你的账号。");
    return;
  }
  const species = val("#recSpecies");
  const name = val("#recName") || autoSpotName(recStyle, species || "未填", lastGeo);
  const spot = {
    id: `u-${Date.now()}`,
    name,
    source: "manual",
    owner: currentUser,
    public: document.querySelector("#recPublic").checked,
    style: recStyle,
    geo: lastGeo,
    photo: lastPhoto,
    pos: {
      x: lastGeo ? 10 + ((Math.abs(lastGeo.lng * 1000) % 80) | 0) : 15 + Math.random() * 70,
      y: lastGeo ? 10 + ((Math.abs(lastGeo.lat * 1000) % 75) | 0) : 15 + Math.random() * 65,
      accuracy: lastGeo ? "GPS精确" : "手动标记",
      tone: recStyle === "台钓" ? "blue" : "hot",
    },
    fish: recStyle === "台钓"
      ? { species: species || "未填", bait: val("#recBait") || "未填", depth: val("#recDepth") || "未填", distanceKm: 0 }
      : { species: species || "未填", lure: val("#recLure") || "未填", action: val("#recAction") || "未填", distanceKm: 0 },
    evidence: [{ type: "map-pin", title: "我亲自标记", desc: "现场记录，第一手证据", level: "高" }],
    baseScore: 82,
    verifications: [],
    note: val("#recNote"),
  };

  SPOTS.unshift(spot);
  activeSpotId = spot.id;
  saveMySpots();

  // 清空表单
  document.querySelector("#recName").value = "";
  document.querySelector("#recSpecies").value = "";
  document.querySelector("#recLure").value = "";
  document.querySelector("#recAction").value = "";
  document.querySelector("#recBait").value = "";
  document.querySelector("#recDepth").value = "";
  document.querySelector("#recNote").value = "";
  document.querySelector("#recPublic").checked = false;
  recStyle = "路亚";
  styleChips.forEach((c) => c.classList.toggle("active", c.dataset.style === "路亚"));
  updateStyleFields("路亚");
  photoInput.value = "";
  lastPhoto = null;
  photoPreview.hidden = true;
  lastGeo = null;
  geoReadout.textContent = "尚未定位";
  geoReadout.classList.remove("located");

  renderAll();
  showScreen("map");
});

// ---- 账号 UI ----
const authBtn = document.querySelector("#authBtn");
const authOverlay = document.querySelector("#authOverlay");
const authClose = document.querySelector("#authClose");
const authTitle = document.querySelector("#authTitle");
const authUser = document.querySelector("#authUser");
const authPass = document.querySelector("#authPass");
const authMsg = document.querySelector("#authMsg");
const authSubmit = document.querySelector("#authSubmit");
const authToggle = document.querySelector("#authToggle");
let authMode = "login"; // login | register

function updateAuthBtn() {
  authBtn.textContent = currentUser ? currentUser : "登录";
}

function openAuth(mode, msg) {
  authMode = mode;
  authTitle.textContent = mode === "login" ? "登录" : "注册";
  authSubmit.textContent = mode === "login" ? "登录" : "注册";
  authToggle.textContent = mode === "login" ? "去注册" : "去登录";
  authMsg.textContent = msg || "";
  authUser.value = "";
  authPass.value = "";
  authOverlay.hidden = false;
}

function closeAuth() {
  authOverlay.hidden = true;
}

authBtn.addEventListener("click", () => {
  if (currentUser) {
    // 已登录 → 询问登出
    if (confirm(`当前账号：${currentUser}\n要退出登录吗？`)) {
      currentUser = null;
      localStorage.removeItem(SESSION_KEY);
      updateAuthBtn();
      renderAll();
    }
  } else {
    openAuth("login");
  }
});

authClose.addEventListener("click", closeAuth);
authToggle.addEventListener("click", () => openAuth(authMode === "login" ? "register" : "login"));

authSubmit.addEventListener("click", () => {
  const name = authUser.value.trim();
  const pass = authPass.value;
  if (!name || !pass) {
    authMsg.textContent = "用户名和密码不能为空。";
    authMsg.className = "auth-msg error";
    return;
  }
  const users = getUsers();
  if (authMode === "register") {
    if (users[name]) {
      authMsg.textContent = "该用户名已存在，换一个或去登录。";
      authMsg.className = "auth-msg error";
      return;
    }
    users[name] = pass;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } else {
    if (!users[name]) {
      authMsg.textContent = "账号不存在，请先注册。";
      authMsg.className = "auth-msg error";
      return;
    }
    if (users[name] !== pass) {
      authMsg.textContent = "密码不对。";
      authMsg.className = "auth-msg error";
      return;
    }
  }
  currentUser = name;
  localStorage.setItem(SESSION_KEY, name);
  authMsg.textContent = "登录成功！";
  authMsg.className = "auth-msg success";
  updateAuthBtn();
  window.setTimeout(closeAuth, 400);
  renderAll();
});

window.addEventListener("DOMContentLoaded", () => {
  loadMySpots();
  updateAuthBtn();
  renderAll();
});
