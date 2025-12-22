const BASE_STORAGE_KEY = 'monster-base-stats-presets';
const GROWTH_STORAGE_KEY = 'monster-growth-stats-presets';

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

const growthNumberKeys = [
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

const baseDefaults = [
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

const baseSelectA = document.getElementById('baseSelectA');
const baseSelectB = document.getElementById('baseSelectB');
const growthSelectA = document.getElementById('growthSelectA');
const growthSelectB = document.getElementById('growthSelectB');
const levelAInput = document.getElementById('levelA');
const levelBInput = document.getElementById('levelB');
const finalStatsA = document.getElementById('finalStatsA');
const finalStatsB = document.getElementById('finalStatsB');
const expectedHitEl = document.getElementById('expectedHit');
const mitigationEl = document.getElementById('mitigation');
const dpsEl = document.getElementById('dps');
const summaryA = document.getElementById('summaryA');
const summaryB = document.getElementById('summaryB');
const refreshButton = document.getElementById('refreshButton');

function safeNonNegative(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(num, 0);
}

function sanitizeBasePreset(preset) {
  const safe = { ...preset };
  safe.name = (preset.name || '').toString().trim() || '이름 없음';
  safe.element = (preset.element || '').toString().trim();
  baseNumberKeys.forEach((key) => {
    safe[key] = safeNonNegative(preset[key]);
  });
  return safe;
}

function sanitizeGrowthPreset(preset) {
  const safe = { ...preset };
  safe.name = (preset.name || '').toString().trim() || '이름 없음';
  growthNumberKeys.forEach((key) => {
    safe[key] = safeNonNegative(preset[key]);
  });
  return safe;
}

function loadPresets(key, defaults, sanitizer) {
  const stored = localStorage.getItem(key);
  if (!stored) return [...defaults].map(sanitizer);
  try {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed) && parsed.length) return parsed.map(sanitizer);
  } catch (error) {
    console.error(`${key} 로딩 실패`, error);
  }
  return [...defaults].map(sanitizer);
}

const basePresets = loadPresets(BASE_STORAGE_KEY, baseDefaults, sanitizeBasePreset);
const growthPresets = loadPresets(GROWTH_STORAGE_KEY, growthDefaults, sanitizeGrowthPreset);

function getFormulaConfig() {
  if (window.FormulaConfig && typeof FormulaConfig.load === 'function') {
    return FormulaConfig.load();
  }
  return {
    critChanceMin: 0,
    critChanceMax: 100,
    critDamageMin: 1,
    armorMitigationBase: 100,
    armorMitigationDivisor: 100,
    attackSpeedMin: 0
  };
}

let formulaConfig = getFormulaConfig();

function populateSelect(select, presets) {
  select.innerHTML = '';
  presets.forEach((preset, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = preset.name;
    select.appendChild(option);
  });
}

function clampNumber(value, min = 0) {
  const num = Number(value);
  if (Number.isNaN(num)) return min;
  return Math.max(num, min);
}

function clamp(value, min, max) {
  const num = Number(value);
  if (Number.isNaN(num)) return min;
  return Math.min(Math.max(num, min), max);
}

function combineStats(base, growth, level) {
  const lv = clampNumber(level, 0);
  const safeBase = sanitizeBasePreset(base);
  const safeGrowth = sanitizeGrowthPreset(growth);
  const sum = (baseKey, growthKey) => safeNonNegative(safeBase[baseKey]) + lv * safeNonNegative(safeGrowth[growthKey]);

  return {
    name: safeBase.name,
    hp: sum('hp', 'hpGrowth'),
    hpRegen: sum('hpRegen', 'hpRegenGrowth'),
    ad: sum('ad', 'adGrowth'),
    ap: sum('ap', 'apGrowth'),
    as: sum('as', 'asGrowth'),
    critChance: safeNonNegative(safeBase.critChance),
    critDamage: Math.max(safeNonNegative(safeBase.critDamage), 1),
    armor: sum('armor', 'armorGrowth'),
    mr: sum('mr', 'mrGrowth'),
    moveSpeed: sum('moveSpeed', 'moveSpeedGrowth'),
    range: sum('range', 'rangeGrowth'),
    abilityHaste: sum('abilityHaste', 'abilityHasteGrowth'),
    element: safeBase.element
  };
}

function renderFinalStats(container, stats) {
  const fields = [
    ['hp', 'HP'],
    ['hpRegen', 'HP 회복'],
    ['ad', 'AD'],
    ['ap', 'AP'],
    ['as', '공격속도'],
    ['critChance', '치명%'],
    ['critDamage', '치명배율'],
    ['armor', '방어력'],
    ['mr', '마법저항'],
    ['moveSpeed', '이동속도'],
    ['range', '사거리'],
    ['abilityHaste', '스킬 가속']
  ];

  container.innerHTML = '';
  fields.forEach(([key, label]) => {
    const row = document.createElement('div');
    row.className = 'stat-row';
    const name = document.createElement('span');
    name.textContent = label;
    const value = document.createElement('strong');
    const raw = Number(stats[key]);
    const isValid = Number.isFinite(raw);
    const safe = isValid ? raw : 0;
    const display = key === 'critChance' ? `${safe.toFixed(1)}%` : safe.toFixed(2);
    value.textContent = isValid ? display : '-';
    row.append(name, value);
    container.appendChild(row);
  });
}

function expectedHitDamage(attacker) {
  const config = formulaConfig || getFormulaConfig();
  const ad = Math.max(Number(attacker.ad) || 0, 0);
  const critChance = clamp(attacker.critChance, config.critChanceMin, config.critChanceMax);
  const critDamage = Math.max(Number(attacker.critDamage) || 0, config.critDamageMin);
  return ad * (1 + (critChance / 100) * (critDamage - 1));
}

function mitigationFromArmor(armor) {
  const config = formulaConfig || getFormulaConfig();
  const safeArmor = Math.max(Number(armor) || 0, 0);
  return config.armorMitigationBase / (config.armorMitigationDivisor + safeArmor);
}

function calculateDps(attacker, defender) {
  const config = formulaConfig || getFormulaConfig();
  const hit = expectedHitDamage(attacker);
  const mitigation = mitigationFromArmor(defender.armor);
  const attackSpeed = Math.max(Number(attacker.as) || 0, config.attackSpeedMin);
  const dps = hit * mitigation * attackSpeed;
  return { hit, mitigation, dps };
}

function update() {
  formulaConfig = getFormulaConfig();
  const baseA = basePresets[baseSelectA.value] || baseDefaults[0];
  const baseB = basePresets[baseSelectB.value] || baseDefaults[0];
  const growthA = growthPresets[growthSelectA.value] || growthDefaults[0];
  const growthB = growthPresets[growthSelectB.value] || growthDefaults[0];

  const finalA = combineStats(baseA, growthA, levelAInput.value);
  const finalB = combineStats(baseB, growthB, levelBInput.value);

  summaryA.textContent = `${finalA.name} @ Lv.${clampNumber(levelAInput.value)}`;
  summaryB.textContent = `${finalB.name} @ Lv.${clampNumber(levelBInput.value)}`;

  renderFinalStats(finalStatsA, finalA);
  renderFinalStats(finalStatsB, finalB);

  const { hit, mitigation, dps } = calculateDps(finalA, finalB);
  expectedHitEl.textContent = hit.toFixed(2);
  mitigationEl.textContent = mitigation.toFixed(3);
  dpsEl.textContent = dps.toFixed(2);
}

function attachListeners() {
  [baseSelectA, baseSelectB, growthSelectA, growthSelectB, levelAInput, levelBInput].forEach((el) => {
    el.addEventListener('change', update);
    el.addEventListener('input', update);
  });
  refreshButton.addEventListener('click', update);
}

function init() {
  populateSelect(baseSelectA, basePresets);
  populateSelect(baseSelectB, basePresets);
  populateSelect(growthSelectA, growthPresets);
  populateSelect(growthSelectB, growthPresets);
  attachListeners();
  update();
}

init();
