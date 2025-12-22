const STORAGE_KEY = 'monster-base-stats-presets';
const defaultPresets = [
  {
    name: '탱커 기본',
    hp: 820,
    hpRegen: 7.5,
    ad: 62,
    ap: 0,
    as: 0.65,
    critChance: 5,
    critDamage: 1.5,
    armor: 36,
    mr: 32,
    moveSpeed: 330,
    range: 1.2,
    abilityHaste: 0,
    element: 'Earth'
  },
  {
    name: '마법사 기본',
    hp: 560,
    hpRegen: 5.1,
    ad: 50,
    ap: 70,
    as: 0.68,
    critChance: 0,
    critDamage: 1.5,
    armor: 24,
    mr: 32,
    moveSpeed: 340,
    range: 5.5,
    abilityHaste: 20,
    element: 'Arcane'
  },
  {
    name: '원거리 딜러',
    hp: 600,
    hpRegen: 5.5,
    ad: 72,
    ap: 0,
    as: 0.78,
    critChance: 10,
    critDamage: 1.75,
    armor: 26,
    mr: 30,
    moveSpeed: 345,
    range: 5.8,
    abilityHaste: 0,
    element: 'Wind'
  }
];

function sanitizePreset(preset) {
  const safe = { ...preset };
  safe.name = (preset.name || '').toString().trim() || '이름 없음';
  safe.element = (preset.element || '').toString().trim();
  baseNumberKeys.forEach((key) => {
    const num = Number(preset[key]);
    safe[key] = Number.isFinite(num) ? Math.max(num, 0) : 0;
  });
  return safe;
}

const baseNumberKeys = [
  'hp',
  'hpRegen',
  'ad',
  'ap',
  'as',
  'critChance',
  'critDamage',
  'armor',
  'mr',
  'moveSpeed',
  'range',
  'abilityHaste'
];

const form = document.getElementById('presetForm');
const formTitle = document.getElementById('formTitle');
const presetTableBody = document.querySelector('#presetTable tbody');
const rowTemplate = document.getElementById('rowTemplate');
const exportArea = document.getElementById('exportArea');
const searchInput = document.getElementById('searchInput');
const toast = document.getElementById('toast');
const confirmDialog = document.getElementById('confirmDialog');
const addPresetButton = document.getElementById('addPresetButton');
const resetFormButton = document.getElementById('resetFormButton');
const cancelEditButton = document.getElementById('cancelEditButton');
const copyExportButton = document.getElementById('copyExportButton');
const clearAllButton = document.getElementById('clearAllButton');
const confirmResetButton = document.getElementById('confirmResetButton');
const cancelDialogButton = document.getElementById('cancelDialogButton');

let presets = loadPresets();
let editingIndex = null;

function loadPresets() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return [...defaultPresets].map(sanitizePreset);
  }
  try {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      return parsed.map(sanitizePreset);
    }
  } catch (error) {
    console.error('로컬 저장소를 읽을 수 없습니다.', error);
  }
  return [...defaultPresets].map(sanitizePreset);
}

function savePresets() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}

function validatePayload(payload) {
  for (const key of baseNumberKeys) {
    const value = Number(payload[key]);
    if (Number.isNaN(value) || value < 0) {
      throw new Error(`${key} 값은 0 이상의 숫자여야 합니다.`);
    }
  }

  if (payload.critChance > 100) {
    throw new Error('치명확률은 0~100 사이값이어야 합니다.');
  }
}

function renderTable() {
  presetTableBody.innerHTML = '';
  const filtered = applyFilter(presets, searchInput.value);
  filtered.forEach((preset, index) => {
    const row = rowTemplate.content.firstElementChild.cloneNode(true);
    Object.entries(preset).forEach(([key, value]) => {
      const cell = row.querySelector(`.${key}`);
      if (cell) {
        cell.textContent = key === 'critChance' ? `${value}%` : value;
      }
    });

    row.querySelector('.edit').addEventListener('click', () => startEdit(preset));
    row.querySelector('.delete').addEventListener('click', () => deletePreset(preset));
    presetTableBody.appendChild(row);
  });

  exportArea.value = JSON.stringify(presets, null, 2);
}

function applyFilter(data, keyword) {
  if (!keyword) return data;
  const lower = keyword.toLowerCase();
  return data.filter((item) =>
    Object.values(item).some((value) => String(value).toLowerCase().includes(lower))
  );
}

function startEdit(preset) {
  editingIndex = presets.indexOf(preset);
  formTitle.textContent = '프리셋 편집';
  Object.keys(preset).forEach((key) => {
    const field = form.elements.namedItem(key);
    if (field) {
      field.value = preset[key];
    }
  });
  form.elements.name.focus();
}

function resetForm() {
  form.reset();
  editingIndex = null;
  formTitle.textContent = '프리셋 생성';
}

function deletePreset(target) {
  presets = presets.filter((preset) => preset !== target);
  savePresets();
  renderTable();
  showToast('프리셋을 삭제했습니다.');
  resetForm();
}

function handleSubmit(event) {
  event.preventDefault();
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());
  const normalized = { ...payload };
  Object.keys(payload).forEach((key) => {
    if (key !== 'name' && key !== 'element') {
      normalized[key] = Number(payload[key]);
    } else {
      normalized[key] = payload[key].trim();
    }
  });

  try {
    if (!normalized.name) {
      throw new Error('프리셋 이름을 입력하세요.');
    }
    validatePayload(normalized);
  } catch (error) {
    showToast(error.message);
    return;
  }

  if (editingIndex != null) {
    presets[editingIndex] = sanitizePreset(normalized);
    showToast('프리셋을 업데이트했습니다.');
  } else {
    presets.unshift(sanitizePreset(normalized));
    showToast('새 프리셋을 추가했습니다.');
  }

  savePresets();
  renderTable();
  resetForm();
}

function copyExport() {
  exportArea.select();
  document.execCommand('copy');
  showToast('JSON을 복사했습니다.');
}

function resetToDefault() {
  presets = [...defaultPresets].map(sanitizePreset);
  savePresets();
  renderTable();
  resetForm();
  confirmDialog.close();
  showToast('기본 프리셋으로 초기화했습니다.');
}

function attachEventListeners() {
  form.addEventListener('submit', handleSubmit);
  searchInput.addEventListener('input', renderTable);
  addPresetButton.addEventListener('click', resetForm);
  resetFormButton.addEventListener('click', resetForm);
  cancelEditButton.addEventListener('click', resetForm);
  copyExportButton.addEventListener('click', copyExport);
  clearAllButton.addEventListener('click', () => confirmDialog.showModal());
  confirmResetButton.addEventListener('click', resetToDefault);
  cancelDialogButton.addEventListener('click', () => confirmDialog.close());
}

attachEventListeners();
renderTable();
