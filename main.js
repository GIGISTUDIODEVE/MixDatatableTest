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

const createForm = document.getElementById("createForm");
const createStatus = document.getElementById("createStatus");
const createButton = document.getElementById("createButton");

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
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
    throw new Error(`${fieldName}는 객체 형태의 JSON이어야 합니다.`);
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
      return;
    }

    const rows = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      rows.push({ id: docSnap.id, ...data });
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
  } catch (error) {
    console.error(error);
    renderStatus(listStatus, `불러오기 실패: ${error.message}`, true);
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

loadButton?.addEventListener("click", fetchMonsterTypes);
createForm?.addEventListener("submit", handleCreate);
