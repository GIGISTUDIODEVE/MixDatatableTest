// 리그 오브 레전드 프리셋 모음
// 데이터는 간략화된 샘플 스펙이며, 지속적으로 확장 가능하도록 그룹/배열 구조로 분리했습니다.

function buildChampionPreset({ key, label, damage = 80, ratio = 0.8, range = 600 }) {
  const effectId = `Effect_${key}_Burst`;
  const abilityId = `Ability_${key}_Strike`;
  const skillId = `Skill_${key}_Signature`;
  return {
    key,
    label,
    aliases: [key.toLowerCase(), label.toLowerCase()],
    effect: {
      effectId,
      type: "Damage",
      trigger: "OnHit",
      selector: { selectorType: "HitTarget", team: "Enemy" },
      calc: { flat: { ref: "damage", byRank: true }, ratios: { ap: { ref: "ratio" } } },
      apply: { damageType: "Magic", damageStage: "PostMitigation" },
      source: { sourceType: "Skill", sourceId: skillId },
    },
    ability: {
      abilityId,
      key: "Default",
      castSpec: { castTime: 0.25, canMove: false, isChanneling: false },
      deliverySpec: { type: "Projectile", range, speed: 1200, collision: "FirstHit" },
      paramBindings: { damage: { ref: "damage" }, ratio: { ref: "ratio" } },
      effects: [effectId],
    },
    skill: {
      skillId,
      skillCategory: "Active",
      rankRules: { maxRank: 5, cooldownByRank: [8, 7, 6, 5, 4], costByRank: [50, 55, 60, 65, 70] },
      baseStats: { damage: [damage, damage + 20, damage + 40, damage + 60, damage + 80], ratio },
      abilities: [{ abilityId, key: "Default", priority: 0 }],
    },
  };
}

function buildItemPreset({ key, label, type = "OnHit", flat = 100, ratio = 1.0, cooldown = 2 }) {
  const effectId = `Effect_${key}_Passive`;
  const abilityId = `Ability_${key}_Passive`;
  const skillId = `Skill_${key}_Passive`;
  return {
    key,
    label,
    aliases: [key.toLowerCase(), label.toLowerCase()],
    effect: {
      effectId,
      type: "Damage",
      trigger: type === "Aura" ? "OnTick" : "OnHit",
      selector: { selectorType: type === "Aura" ? "Area" : "HitTarget", team: "Enemy" },
      calc: { flat: { ref: "bonusDamage" }, ratios: { ad: { ref: "bonusRatio" } } },
      apply: { damageType: "Physical", damageStage: "PostMitigation" },
      procRules: { cooldown, chance: 1, maxPerTrigger: 1 },
      source: { sourceType: "Item", sourceId: skillId },
    },
    ability: {
      abilityId,
      key: "Passive",
      castSpec: { castTime: 0, canMove: true, isChanneling: false },
      deliverySpec: { type, range: type === "Aura" ? 450 : 0, speed: 0, collision: "None" },
      paramBindings: { bonusDamage: { ref: "bonusDamage" }, bonusRatio: { ref: "bonusRatio" } },
      effects: [effectId],
    },
    skill: {
      skillId,
      skillCategory: "Passive",
      rankRules: { maxRank: 1, cooldownByRank: [cooldown], costByRank: [0] },
      baseStats: { bonusDamage: flat, bonusRatio: ratio },
      abilities: [{ abilityId, key: "Passive", priority: 0 }],
    },
  };
}

const CHAMPION_KEYS = [
  "Alistar",
  "Annie",
  "Ashe",
  "Fiddlesticks",
  "Jax",
  "Kayle",
  "MasterYi",
  "Morgana",
  "Nunu",
  "Ryze",
  "Sion",
  "Sivir",
  "Soraka",
  "Teemo",
  "Tristana",
  "TwistedFate",
  "Warwick",
];

const championPresets = CHAMPION_KEYS.map((key) =>
  buildChampionPreset({
    key,
    label: `${key} 시그니처`,
    damage: 70 + Math.floor(Math.random() * 30),
    ratio: 0.6 + Math.random() * 0.4,
    range: 550 + Math.floor(Math.random() * 150),
  })
);

const itemPresetConfigs = [
  { key: "Sheen", label: "주문검", flat: 100, ratio: 1.0, cooldown: 1.5, type: "OnHit" },
  { key: "Lifeline", label: "생명선", flat: 0, ratio: 0, cooldown: 90, type: "Passive" },
  { key: "Sunfire", label: "불사르기(오라)", flat: 20, ratio: 0.02, cooldown: 1, type: "Aura" },
  { key: "Kraken", label: "크라켄 학살자", flat: 80, ratio: 0.6, cooldown: 3, type: "OnHit" },
  { key: "Bloodrazor", label: "블러드레이저", flat: 30, ratio: 0.025, cooldown: 1, type: "OnHit" },
];

const itemPresets = itemPresetConfigs.map(buildItemPreset);

const utilityPresets = [
  {
    key: "Ignite",
    aliases: ["ignite", "점화"],
    label: "점화 (Ignite)",
    effect: {
      effectId: "Effect_Ignite_DoT",
      type: "Damage",
      trigger: "OnTick",
      selector: { selectorType: "Target", team: "Enemy" },
      calc: { flat: { ref: "dot", byRank: true } },
      timing: { tickInterval: 1, duration: 5 },
      apply: { damageType: "True", damageStage: "Final" },
      source: { sourceType: "Summoner", sourceId: "Summoner_Ignite" },
    },
    ability: {
      abilityId: "Summoner_Ignite_Cast",
      key: "Default",
      castSpec: { castTime: 0, canMove: false, isChanneling: false },
      deliverySpec: { type: "Target", range: 600, speed: 0, collision: "None" },
      paramBindings: { dot: { ref: "dot" } },
      effects: ["Effect_Ignite_DoT"],
    },
    skill: {
      skillId: "Summoner_Ignite",
      skillCategory: "Active",
      rankRules: { maxRank: 1, cooldownByRank: [180], costByRank: [0] },
      baseStats: { dot: [50] },
      abilities: [{ abilityId: "Summoner_Ignite_Cast", key: "Default", priority: 0 }],
    },
  },
];

export const PRESET_GROUPS = {
  champions: championPresets,
  items: itemPresets,
  utilities: utilityPresets,
};
