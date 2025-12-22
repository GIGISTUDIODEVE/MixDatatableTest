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

const listUserIdInput = document.getElementById("listUserId");
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

async function fetchMonsters() {
  const uid = listUserIdInput.value.trim();
  if (!uid) {
    renderStatus(listStatus, "유저 UID를 입력하세요.", true);
    return;
  }

  renderStatus(listStatus, "불러오는 중...");
  loadButton.disabled = true;
  tableBody.innerHTML = "";

  try {
    const monsterRef = collection(db, `users/${uid}/monsters`);
    const q = query(monsterRef, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);

    if (snap.empty) {
      renderStatus(listStatus, "몬스터가 없습니다.");
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
          <td>${row.monsterUid || row.id}</td>
          <td>${row.monsterTypeId || "-"}</td>
          <td>${row.level ?? "-"}</td>
          <td>${row.exp ?? "-"}</td>
          <td>${row.ascension ?? "-"}</td>
          <td>${row.locked ?? false}</td>
          <td>${toDisplayDate(row.createdAt)}</td>
        </tr>
      `
      )
      .join("");

    renderStatus(listStatus, `총 ${rows.length}개 문서`);
  } catch (error) {
    console.error(error);
    renderStatus(listStatus, `불러오기 실패: ${error.message}`, true);
  } finally {
    loadButton.disabled = false;
  }
}

async function handleCreate(event) {
  event.preventDefault();

  const uid = document.getElementById("createUserId").value.trim();
  const monsterUid = document.getElementById("monsterUid").value.trim();
  const monsterTypeId = document.getElementById("monsterTypeId").value.trim();
  const level = Number(document.getElementById("level").value);
  const exp = Number(document.getElementById("exp").value);
  const ascension = Number(document.getElementById("ascension").value);
  const locked = document.getElementById("locked").value === "true";
  const rarity = document.getElementById("rarity").value.trim();

  if (!uid || !monsterUid || !monsterTypeId) {
    renderStatus(createStatus, "필수 입력값을 모두 채워주세요.", true);
    return;
  }

  if (!Number.isFinite(level) || level < 1) {
    renderStatus(createStatus, "level은 1 이상 정수여야 합니다.", true);
    return;
  }

  if (!Number.isFinite(exp) || exp < 0) {
    renderStatus(createStatus, "exp는 0 이상 정수여야 합니다.", true);
    return;
  }

  if (!Number.isFinite(ascension) || ascension < 0) {
    renderStatus(createStatus, "ascension은 0 이상 정수여야 합니다.", true);
    return;
  }

  const payload = {
    monsterUid,
    monsterTypeId,
    level,
    exp,
    ascension,
    locked,
    createdAt: serverTimestamp(),
  };

  if (rarity) {
    payload.rarity = rarity;
  }

  createButton.disabled = true;
  renderStatus(createStatus, "생성 중...");

  try {
    const monsterDoc = doc(db, `users/${uid}/monsters/${monsterUid}`);
    await setDoc(monsterDoc, payload, { merge: true });
    renderStatus(createStatus, "생성 완료!");
    createForm.reset();
    document.getElementById("level").value = "1";
    document.getElementById("exp").value = "0";
    document.getElementById("ascension").value = "0";
    document.getElementById("locked").value = "false";

    listUserIdInput.value = uid;
    fetchMonsters();
  } catch (error) {
    console.error(error);
    renderStatus(createStatus, `생성 실패: ${error.message}`, true);
  } finally {
    createButton.disabled = false;
  }
}

loadButton?.addEventListener("click", fetchMonsters);
createForm?.addEventListener("submit", handleCreate);
