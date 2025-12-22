import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
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

const STAT_KEYS = [
  "hp",
  "hpRegen",
  "ad",
  "ap",
  "as",
  "critChance",
  "critDamage",
  "armor",
  "mr",
  "tenacity",
  "moveSpeed",
  "range",
  "abilityHaste",
];

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
    container.innerHTML = STAT_KEYS.map(
      (key) => `
        <label class="stat-field" for="${prefix}-${key}">
          <span>${key}</span>
          <input id="${prefix}-${key}" type="number" step="any" placeholder="0" required />
        </label>
      `
    ).join("");
  };

  renderTo(baseStatsFields, "base");
  renderTo(growthFields, "growth");
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

renderStatInputs();

loadButton?.addEventListener("click", fetchMonsterTypes);
createForm?.addEventListener("submit", handleCreate);
fillSampleButton?.addEventListener("click", fillSampleStats);
