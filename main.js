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

function parseJsonField(raw, fieldName) {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error(`${fieldName}는 객체 형태의 JSON이어야 합니다.`);
    }

    const statKeys = Object.keys(parsed);
    if (statKeys.length === 0) {
      throw new Error(`${fieldName}에 한 개 이상의 스탯 키가 필요합니다.`);
    }

    for (const key of statKeys) {
      if (!STAT_KEYS.includes(key)) {
        throw new Error(
          `${fieldName}에 허용되지 않은 키(${key})가 있습니다. 허용 키: ${STAT_KEYS.join(", ")}`
        );
      }

      const value = parsed[key];
      if (!Number.isFinite(value)) {
        throw new Error(`${fieldName}.${key} 값은 숫자여야 합니다.`);
      }
    }

    return parsed;
  } catch (error) {
    throw new Error(`${fieldName} JSON 파싱 실패: ${error.message}`);
  }
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
  const baseStatsRaw = document.getElementById("baseStats").value.trim();
  const growthPerLevelRaw = document.getElementById("growthPerLevel").value.trim();
  const notes = document.getElementById("notes").value.trim();

  if (!monsterTypeId || !name || !tagsRaw) {
    renderStatus(createStatus, "필수 입력값을 모두 채워주세요.", true);
    return;
  }

  if (!Number.isFinite(rarityTier) || rarityTier < 1) {
    renderStatus(createStatus, "rarityTier는 1 이상 정수여야 합니다.", true);
    return;
  }

  if (!baseStatsRaw || !growthPerLevelRaw) {
    renderStatus(createStatus, "baseStats와 growthPerLevel을 입력하세요.", true);
    return;
  }

  let baseStats;
  let growthPerLevel;
  try {
    baseStats = parseJsonField(baseStatsRaw, "baseStats");
    growthPerLevel = parseJsonField(growthPerLevelRaw, "growthPerLevel");
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

  const baseStatsEl = document.getElementById("baseStats");
  const growthEl = document.getElementById("growthPerLevel");
  if (baseStatsEl) baseStatsEl.value = JSON.stringify(sampleBase, null, 2);
  if (growthEl) growthEl.value = JSON.stringify(sampleGrowth, null, 2);
}

loadButton?.addEventListener("click", fetchMonsterTypes);
createForm?.addEventListener("submit", handleCreate);
fillSampleButton?.addEventListener("click", fillSampleStats);
