import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBq6NYET2gBapgOi5Yh2aSePctsMA8Dr7U",
  authDomain: "studydase.firebaseapp.com",
  databaseURL: "https://studydase-default-rtdb.firebaseio.com",
  projectId: "studydase",
  storageBucket: "studydase.firebasestorage.app",
  messagingSenderId: "889952871801",
  appId: "1:889952871801:web:2739d10dd5b3291b563ba8",
  measurementId: "G-JH3EBS40YM",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const listStatus = document.getElementById("listStatus");
const tableBody = document.getElementById("monsterTableBody");
const loadButton = document.getElementById("loadMonsters");
const jsonPreview = document.getElementById("jsonPreview");

const createForm = document.getElementById("createForm");
const createStatus = document.getElementById("createStatus");
const createButton = document.getElementById("createButton");
const fillSampleButton = document.getElementById("fillSample");
const baseStatsFields = document.getElementById("baseStatsFields");
const growthFields = document.getElementById("growthFields");
const presetSelect = document.getElementById("presetSelect");
const loadPresetsButton = document.getElementById("loadPresets");
const applyPresetButton = document.getElementById("applyPreset");
const presetStatus = document.getElementById("presetStatus");
const presetForm = document.getElementById("presetForm");
const presetSaveStatus = document.getElementById("presetSaveStatus");
const savePresetButton = document.getElementById("savePreset");
const presetBaseStatsFields = document.getElementById("presetBaseStatsFields");
const presetGrowthFields = document.getElementById("presetGrowthFields");
const presetFillSampleButton = document.getElementById("presetFillSample");
const presetListStatus = document.getElementById("presetListStatus");
const presetTableBody = document.getElementById("presetTableBody");
const presetJsonPreview = document.getElementById("presetJsonPreview");
const refreshPresetListButton = document.getElementById("refreshPresetList");

const STAT_CATEGORIES = [
  { label: "생존", keys: ["hp", "hpRegen"] },
  { label: "공격", keys: ["ad", "ap", "as", "critChance", "critDamage"] },
  { label: "방어·유틸", keys: ["armor", "mr", "tenacity", "moveSpeed", "range"] },
  { label: "쿨·자원", keys: ["abilityHaste"] },
];

const STAT_KEYS = STAT_CATEGORIES.flatMap((cat) => cat.keys);
let presetCache = new Map();

function renderStatus(el, message, isError = false) {
  if (!el) return;
  el.textContent = message || "";
  el.classList.toggle("error", Boolean(isError));
}

function toDisplayDate(timestamp) {
  if (!timestamp) return "-";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString();
}

function renderStatInputs() {
  const renderTo = (container, prefix) => {
    if (!container) return;
    container.innerHTML = STAT_CATEGORIES.map(
      (cat) => `
        <div class="stat-section" aria-label="${cat.label} 카테고리">
          <h4>${cat.label}</h4>
          <div class="stat-grid">
            ${cat.keys
              .map(
                (key) => `
                  <label class="stat-field" for="${prefix}-${key}">
                    <span>${key}</span>
                    <input id="${prefix}-${key}" type="number" step="any" placeholder="0" required />
                  </label>
                `
              )
              .join("")}
          </div>
        </div>
      `
    ).join("");
  };

  const targets = [
    { container: baseStatsFields, prefix: "base" },
    { container: growthFields, prefix: "growth" },
    { container: presetBaseStatsFields, prefix: "preset-base" },
    { container: presetGrowthFields, prefix: "preset-growth" },
  ];

  targets.forEach(({ container, prefix }) => renderTo(container, prefix));
}

function collectStats(prefix, label) {
  const stats = {};
  for (const key of STAT_KEYS) {
    const el = document.getElementById(`${prefix}-${key}`);
    if (!el) {
      throw new Error(`${label} 입력 필드(${key})를 찾을 수 없습니다.`);
    }
    const raw = el.value.trim();
    if (raw === "") {
      throw new Error(`${label}.${key} 값을 입력하세요.`);
    }
    const value = Number(raw);
    if (!Number.isFinite(value)) {
      throw new Error(`${label}.${key} 값은 숫자여야 합니다.`);
    }
    stats[key] = value;
  }
  return stats;
}

async function fetchMonsterTypes() {
  renderStatus(listStatus, "불러오는 중...");
  loadButton.disabled = true;
  tableBody.innerHTML = "";

  try {
    const monsterTypesRef = collection(db, "monsterTypes");
    const q = query(monsterTypesRef, orderBy("name", "asc"));
    const snap = await getDocs(q);

    if (snap.empty) {
      renderStatus(listStatus, "등록된 몬스터 타입이 없습니다.");
      if (jsonPreview) jsonPreview.value = "";
      return;
    }

    const rows = [];
    const rawDocs = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const docData = { id: docSnap.id, ...data };
      rows.push(docData);
      rawDocs.push(docData);
    });

    tableBody.innerHTML = rows
      .map(
        (row) => `
        <tr>
          <td>${row.id}</td>
          <td>${row.name || "-"}</td>
          <td>${row.rarityTier ?? "-"}</td>
          <td>${Array.isArray(row.tags) ? row.tags.join(", ") : "-"}</td>
          <td>${row.dataVersion ?? "-"}</td>
          <td>${toDisplayDate(row.createdAt)}</td>
        </tr>
      `
      )
      .join("");

    renderStatus(listStatus, `총 ${rows.length}개 몬스터 타입`);

    if (jsonPreview) {
      jsonPreview.value = JSON.stringify(rawDocs, null, 2);
    }
  } catch (error) {
    console.error(error);
    renderStatus(listStatus, `불러오기 실패: ${error.message}`, true);
    if (jsonPreview) jsonPreview.value = "";
  } finally {
    loadButton.disabled = false;
  }
}

async function handleCreate(event) {
  event.preventDefault();

  const monsterTypeId = document.getElementById("monsterTypeId").value.trim();
  const name = document.getElementById("name").value.trim();
  const rarityTier = Number(document.getElementById("rarityTier").value);
  const tagsRaw = document.getElementById("tags").value.trim();
  const dataVersionRaw = document.getElementById("dataVersion").value;
  const notes = document.getElementById("notes").value.trim();

  if (!monsterTypeId || !name || !tagsRaw) {
    renderStatus(createStatus, "필수 입력값을 모두 채워주세요.", true);
    return;
  }

  if (!Number.isFinite(rarityTier) || rarityTier < 1) {
    renderStatus(createStatus, "rarityTier는 1 이상 정수여야 합니다.", true);
    return;
  }

  let baseStats;
  let growthPerLevel;
  try {
    baseStats = collectStats("base", "baseStats");
    growthPerLevel = collectStats("growth", "growthPerLevel");
  } catch (error) {
    renderStatus(createStatus, error.message, true);
    return;
  }

  const tags = tagsRaw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  if (!tags.length) {
    renderStatus(createStatus, "tags는 하나 이상 필요합니다.", true);
    return;
  }

  const payload = {
    name,
    rarityTier,
    tags,
    baseStats,
    growthPerLevel,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (notes) {
    payload.notes = notes;
  }

  const dataVersion = Number(dataVersionRaw);
  if (dataVersionRaw && Number.isFinite(dataVersion) && dataVersion > 0) {
    payload.dataVersion = dataVersion;
  }

  createButton.disabled = true;
  renderStatus(createStatus, "생성 중...");

  try {
    const monsterDoc = doc(db, `monsterTypes/${monsterTypeId}`);
    await setDoc(monsterDoc, payload, { merge: true });
    renderStatus(createStatus, "서버 몬스터 타입 생성 완료!");
    createForm.reset();
    document.getElementById("rarityTier").value = "1";
    fetchMonsterTypes();
  } catch (error) {
    console.error(error);
    renderStatus(createStatus, `생성 실패: ${error.message}`, true);
  } finally {
    createButton.disabled = false;
  }
}

function setStatValues(prefix, values) {
  for (const key of STAT_KEYS) {
    const el = document.getElementById(`${prefix}-${key}`);
    if (el) {
      el.value = values[key] ?? "";
    }
  }
}

function fillSampleStats() {
  const sampleBase = {
    hp: 120,
    hpRegen: 2.5,
    ad: 14,
    ap: 0,
    as: 1.05,
    critChance: 0.1,
    critDamage: 2,
    armor: 8,
    mr: 6,
    tenacity: 0,
    moveSpeed: 330,
    range: 1,
    abilityHaste: 0,
  };

  const sampleGrowth = {
    hp: 12,
    hpRegen: 0.1,
    ad: 1.4,
    ap: 0,
    as: 0.025,
    critChance: 0,
    critDamage: 0,
    armor: 0.9,
    mr: 0.7,
    tenacity: 0,
    moveSpeed: 0,
    range: 0,
    abilityHaste: 0.5,
  };

  setStatValues("base", sampleBase);
  setStatValues("growth", sampleGrowth);
}

function fillSamplePresetStats() {
  const sampleBase = {
    hp: 200,
    hpRegen: 3,
    ad: 18,
    ap: 0,
    as: 0.9,
    critChance: 0.05,
    critDamage: 2,
    armor: 12,
    mr: 10,
    tenacity: 0,
    moveSpeed: 320,
    range: 1,
    abilityHaste: 5,
  };

  const sampleGrowth = {
    hp: 20,
    hpRegen: 0.2,
    ad: 1.6,
    ap: 0,
    as: 0.02,
    critChance: 0,
    critDamage: 0,
    armor: 1.1,
    mr: 0.9,
    tenacity: 0,
    moveSpeed: 0,
    range: 0,
    abilityHaste: 0.6,
  };

  setStatValues("preset-base", sampleBase);
  setStatValues("preset-growth", sampleGrowth);
}

function updatePresetSelectOptions(rows) {
  if (!presetSelect) return;
  if (!rows.length) {
    presetSelect.innerHTML = `<option value="">등록된 프리셋이 없습니다</option>`;
    return;
  }

  const options = [
    `<option value="">프리셋을 선택하세요</option>`,
    ...rows.map((row) => `<option value="${row.id}">${row.name || row.id}</option>`),
  ];
  presetSelect.innerHTML = options.join("");
}

function renderPresetTable(rows) {
  if (!presetTableBody) return;
  presetTableBody.innerHTML = rows
    .map(
      (row) => `
        <tr>
          <td>${row.id}</td>
          <td>${row.name || "-"}</td>
          <td>${toDisplayDate(row.createdAt)}</td>
          <td>${toDisplayDate(row.updatedAt)}</td>
        </tr>
      `
    )
    .join("");
}

function cachePresets(rows) {
  presetCache = new Map();
  rows.forEach((row) => {
    presetCache.set(row.id, row);
  });
}

async function fetchStatPresets() {
  renderStatus(presetStatus, "프리셋 불러오는 중...");
  renderStatus(presetListStatus, "프리셋 불러오는 중...");
  loadPresetsButton && (loadPresetsButton.disabled = true);
  refreshPresetListButton && (refreshPresetListButton.disabled = true);

  try {
    const presetRef = collection(db, "monsterStatPresets");
    const q = query(presetRef, orderBy("name", "asc"));
    const snap = await getDocs(q);

    if (snap.empty) {
      updatePresetSelectOptions([]);
      renderPresetTable([]);
      if (presetJsonPreview) presetJsonPreview.value = "";
      cachePresets([]);
      renderStatus(presetStatus, "등록된 프리셋이 없습니다.");
      renderStatus(presetListStatus, "등록된 프리셋이 없습니다.");
      return;
    }

    const rows = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      rows.push({ id: docSnap.id, ...data });
    });

    cachePresets(rows);
    updatePresetSelectOptions(rows);
    renderPresetTable(rows);
    if (presetJsonPreview) {
      presetJsonPreview.value = JSON.stringify(rows, null, 2);
    }

    renderStatus(presetStatus, `프리셋 ${rows.length}개 불러옴`);
    renderStatus(presetListStatus, `프리셋 ${rows.length}개 불러옴`);
  } catch (error) {
    console.error(error);
    renderStatus(presetStatus, `프리셋 불러오기 실패: ${error.message}`, true);
    renderStatus(presetListStatus, `프리셋 불러오기 실패: ${error.message}`, true);
    if (presetJsonPreview) presetJsonPreview.value = "";
  } finally {
    loadPresetsButton && (loadPresetsButton.disabled = false);
    refreshPresetListButton && (refreshPresetListButton.disabled = false);
  }
}

async function handlePresetSave(event) {
  event.preventDefault();

  const presetId = document.getElementById("presetId")?.value.trim();
  const presetName = document.getElementById("presetName")?.value.trim();

  if (!presetId || !presetName) {
    renderStatus(presetSaveStatus, "프리셋 ID와 이름을 모두 입력하세요.", true);
    return;
  }

  let baseStats;
  let growthPerLevel;
  try {
    baseStats = collectStats("preset-base", "baseStats");
    growthPerLevel = collectStats("preset-growth", "growthPerLevel");
  } catch (error) {
    renderStatus(presetSaveStatus, error.message, true);
    return;
  }

  renderStatus(presetSaveStatus, "프리셋 저장 중...");
  if (savePresetButton) savePresetButton.disabled = true;

  try {
    const presetDoc = doc(db, `monsterStatPresets/${presetId}`);
    const existing = await getDoc(presetDoc);
    const payload = {
      name: presetName,
      baseStats,
      growthPerLevel,
      updatedAt: serverTimestamp(),
    };

    if (!existing.exists()) {
      payload.createdAt = serverTimestamp();
    }

    await setDoc(presetDoc, payload, { merge: true });
    renderStatus(presetSaveStatus, "프리셋 저장 완료");
    await fetchStatPresets();
  } catch (error) {
    console.error(error);
    renderStatus(presetSaveStatus, `프리셋 저장 실패: ${error.message}`, true);
  } finally {
    if (savePresetButton) savePresetButton.disabled = false;
  }
}

function applySelectedPreset() {
  const presetId = presetSelect?.value;
  if (!presetId) {
    renderStatus(presetStatus, "적용할 프리셋을 선택하세요.", true);
    return;
  }

  const preset = presetCache.get(presetId);
  if (!preset) {
    renderStatus(presetStatus, "프리셋을 먼저 불러오세요.", true);
    return;
  }

  setStatValues("base", preset.baseStats || {});
  setStatValues("growth", preset.growthPerLevel || {});
  renderStatus(presetStatus, `${preset.name || presetId} 프리셋을 적용했습니다.`);
}

renderStatInputs();

loadButton?.addEventListener("click", fetchMonsterTypes);
createForm?.addEventListener("submit", handleCreate);
fillSampleButton?.addEventListener("click", fillSampleStats);
loadPresetsButton?.addEventListener("click", fetchStatPresets);
refreshPresetListButton?.addEventListener("click", fetchStatPresets);
applyPresetButton?.addEventListener("click", applySelectedPreset);
presetForm?.addEventListener("submit", handlePresetSave);
presetFillSampleButton?.addEventListener("click", fillSamplePresetStats);
