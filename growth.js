const GROWTH_STORAGE_KEY = 'monster-growth-stats-presets';
const growthDefaults = [
  {
    name: '탱커 성장',
    hpGrowth: 110,
    hpRegenGrowth: 0.15,
    adGrowth: 3.2,
    apGrowth: 0,
    asGrowth: 0.018,
    armorGrowth: 3.6,
    mrGrowth: 2.1,
    moveSpeedGrowth: 0.15,
    rangeGrowth: 0,
    abilityHasteGrowth: 0.5
  },
  {
    name: '마법사 성장',
    hpGrowth: 95,
    hpRegenGrowth: 0.12,
    adGrowth: 2.1,
    apGrowth: 4.5,
    asGrowth: 0.021,
    armorGrowth: 3,
    mrGrowth: 1.8,
    moveSpeedGrowth: 0.12,
    rangeGrowth: 0.05,
    abilityHasteGrowth: 1.2
  },
  {
    name: '원거리 딜러 성장',
    hpGrowth: 100,
    hpRegenGrowth: 0.14,
    adGrowth: 3.6,
    apGrowth: 0,
    asGrowth: 0.024,
    armorGrowth: 3.1,
    mrGrowth: 1.3,
    moveSpeedGrowth: 0.18,
    rangeGrowth: 0.12,
    abilityHasteGrowth: 0.4
  }
];

const growthForm = document.getElementById('growthForm');
const growthFormTitle = document.getElementById('growthFormTitle');
const growthTableBody = document.querySelector('#growthTable tbody');
const growthRowTemplate = document.getElementById('growthRowTemplate');
const growthExportArea = document.getElementById('growthExportArea');
const growthSearch = document.getElementById('growthSearch');
const growthToast = document.getElementById('growthToast');
const growthConfirmDialog = document.getElementById('growthConfirmDialog');
const addGrowthButton = document.getElementById('addGrowthButton');
const resetGrowthFormButton = document.getElementById('resetGrowthForm');
const cancelGrowthEditButton = document.getElementById('cancelGrowthEdit');
const copyGrowthExportButton = document.getElementById('copyGrowthExport');
const resetGrowthStorageButton = document.getElementById('resetGrowthStorage');
const confirmGrowthReset = document.getElementById('confirmGrowthReset');
const cancelGrowthDialog = document.getElementById('cancelGrowthDialog');

let growthPresets = loadGrowthPresets();
let editingGrowthIndex = null;

function loadGrowthPresets() {
  const stored = localStorage.getItem(GROWTH_STORAGE_KEY);
  if (!stored) {
    return [...growthDefaults];
  }
  try {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (error) {
    console.error('성장 프리셋을 읽을 수 없습니다.', error);
  }
  return [...growthDefaults];
}

function saveGrowthPresets() {
  localStorage.setItem(GROWTH_STORAGE_KEY, JSON.stringify(growthPresets));
}

function showGrowthToast(message) {
  growthToast.textContent = message;
  growthToast.classList.add('show');
  setTimeout(() => growthToast.classList.remove('show'), 2200);
}

function validateGrowthPayload(payload) {
  const numberKeys = [
    'hpGrowth',
    'hpRegenGrowth',
    'adGrowth',
    'apGrowth',
    'asGrowth',
    'armorGrowth',
    'mrGrowth',
    'moveSpeedGrowth',
    'rangeGrowth',
    'abilityHasteGrowth'
  ];

  for (const key of numberKeys) {
    const value = Number(payload[key]);
    if (Number.isNaN(value) || value < 0) {
      throw new Error(`${key} 값은 0 이상의 숫자여야 합니다.`);
    }
  }
}

function applyGrowthFilter(data, keyword) {
  if (!keyword) return data;
  const lower = keyword.toLowerCase();
  return data.filter((item) =>
    Object.values(item).some((value) => String(value).toLowerCase().includes(lower))
  );
}

function renderGrowthTable() {
  growthTableBody.innerHTML = '';
  const filtered = applyGrowthFilter(growthPresets, growthSearch.value);

  filtered.forEach((preset) => {
    const row = growthRowTemplate.content.firstElementChild.cloneNode(true);
    Object.entries(preset).forEach(([key, value]) => {
      const cell = row.querySelector(`.${key}`);
      if (cell) {
        cell.textContent = value;
      }
    });

    row.querySelector('.edit').addEventListener('click', () => startGrowthEdit(preset));
    row.querySelector('.delete').addEventListener('click', () => deleteGrowthPreset(preset));
    growthTableBody.appendChild(row);
  });

  growthExportArea.value = JSON.stringify(growthPresets, null, 2);
}

function startGrowthEdit(preset) {
  editingGrowthIndex = growthPresets.indexOf(preset);
  growthFormTitle.textContent = '프리셋 편집';
  Object.keys(preset).forEach((key) => {
    const field = growthForm.elements.namedItem(key);
    if (field) {
      field.value = preset[key];
    }
  });
  growthForm.elements.name.focus();
}

function resetGrowthFormState() {
  growthForm.reset();
  editingGrowthIndex = null;
  growthFormTitle.textContent = '프리셋 생성';
}

function deleteGrowthPreset(target) {
  growthPresets = growthPresets.filter((preset) => preset !== target);
  saveGrowthPresets();
  renderGrowthTable();
  showGrowthToast('프리셋을 삭제했습니다.');
  resetGrowthFormState();
}

function handleGrowthSubmit(event) {
  event.preventDefault();
  const formData = new FormData(growthForm);
  const payload = Object.fromEntries(formData.entries());
  const normalized = { ...payload };
  Object.keys(payload).forEach((key) => {
    if (key !== 'name') {
      normalized[key] = Number(payload[key]);
    } else {
      normalized[key] = payload[key].trim();
    }
  });

  try {
    if (!normalized.name) {
      throw new Error('프리셋 이름을 입력하세요.');
    }
    validateGrowthPayload(normalized);
  } catch (error) {
    showGrowthToast(error.message);
    return;
  }

  if (editingGrowthIndex != null) {
    growthPresets[editingGrowthIndex] = normalized;
    showGrowthToast('프리셋을 업데이트했습니다.');
  } else {
    growthPresets.unshift(normalized);
    showGrowthToast('새 프리셋을 추가했습니다.');
  }

  saveGrowthPresets();
  renderGrowthTable();
  resetGrowthFormState();
}

function copyGrowthExport() {
  growthExportArea.select();
  document.execCommand('copy');
  showGrowthToast('JSON을 복사했습니다.');
}

function resetGrowthToDefault() {
  growthPresets = [...growthDefaults];
  saveGrowthPresets();
  renderGrowthTable();
  resetGrowthFormState();
  growthConfirmDialog.close();
  showGrowthToast('기본 성장 프리셋으로 초기화했습니다.');
}

function attachGrowthListeners() {
  growthForm.addEventListener('submit', handleGrowthSubmit);
  growthSearch.addEventListener('input', renderGrowthTable);
  addGrowthButton.addEventListener('click', resetGrowthFormState);
  resetGrowthFormButton.addEventListener('click', resetGrowthFormState);
  cancelGrowthEditButton.addEventListener('click', resetGrowthFormState);
  copyGrowthExportButton.addEventListener('click', copyGrowthExport);
  resetGrowthStorageButton.addEventListener('click', () => growthConfirmDialog.showModal());
  confirmGrowthReset.addEventListener('click', resetGrowthToDefault);
  cancelGrowthDialog.addEventListener('click', () => growthConfirmDialog.close());
}

attachGrowthListeners();
renderGrowthTable();
