const FORMULA_CONFIG_KEY = 'combat-formula-config';

const defaultFormulaConfig = {
  critChanceMin: 0,
  critChanceMax: 100,
  critDamageMin: 1,
  armorMitigationBase: 100,
  armorMitigationDivisor: 100,
  attackSpeedMin: 0
};

function sanitizeConfig(rawConfig = {}) {
  const cfg = typeof rawConfig === 'object' && rawConfig !== null ? rawConfig : {};
  const safeNumber = (value, fallback, min = -Infinity) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    return Math.max(num, min);
  };

  const critChanceMin = safeNumber(cfg.critChanceMin, defaultFormulaConfig.critChanceMin, 0);
  const critChanceMaxBase = safeNumber(cfg.critChanceMax, defaultFormulaConfig.critChanceMax, critChanceMin);
  const critChanceMax = Math.max(critChanceMaxBase, critChanceMin);

  const critDamageMin = safeNumber(cfg.critDamageMin, defaultFormulaConfig.critDamageMin, 1);
  const armorMitigationBase = safeNumber(cfg.armorMitigationBase, defaultFormulaConfig.armorMitigationBase, 0.0001);
  const armorMitigationDivisor = safeNumber(cfg.armorMitigationDivisor, defaultFormulaConfig.armorMitigationDivisor, 0.0001);
  const attackSpeedMin = safeNumber(cfg.attackSpeedMin, defaultFormulaConfig.attackSpeedMin, 0);

  return {
    critChanceMin,
    critChanceMax,
    critDamageMin,
    armorMitigationBase,
    armorMitigationDivisor,
    attackSpeedMin
  };
}

function loadFormulaConfig() {
  const stored = localStorage.getItem(FORMULA_CONFIG_KEY);
  if (!stored) return { ...defaultFormulaConfig };
  try {
    const parsed = JSON.parse(stored);
    return sanitizeConfig(parsed);
  } catch (error) {
    console.error('계산식 설정을 읽을 수 없습니다.', error);
    return { ...defaultFormulaConfig };
  }
}

function saveFormulaConfig(config) {
  const sanitized = sanitizeConfig(config);
  localStorage.setItem(FORMULA_CONFIG_KEY, JSON.stringify(sanitized));
  return sanitized;
}

window.FormulaConfig = {
  STORAGE_KEY: FORMULA_CONFIG_KEY,
  defaults: defaultFormulaConfig,
  sanitize: sanitizeConfig,
  load: loadFormulaConfig,
  save: saveFormulaConfig
};
