// 리그 오브 레전드 프리셋 모음 (확장 가능)

function makeDamagePreset({
  key,
  label,
  aliases = [],
  skillCategory = "Active",
  damageType = "Magic",
  trigger = "OnHit",
  selectorType = "HitTarget",
  team = "Enemy",
  deliveryType = "Projectile",
  range = 800,
  speed = 1600,
  collision = "FirstHit",
  flat = [80, 120, 160, 200, 240],
  ratio = 0.7,
  cooldowns = [8, 7, 6, 5, 4],
  costs = [50, 55, 60, 65, 70],
}) {
  const effectId = `Effect_${key}`;
  const abilityId = `Ability_${key}`;
  const skillId = `Skill_${key}`;
  return {
    key,
    label,
    aliases: [key.toLowerCase(), label.toLowerCase(), ...aliases.map((a) => a.toLowerCase())],
    effect: {
      effectId,
      type: "Damage",
      trigger,
      selector: { selectorType, team },
      calc: { flat: { ref: "damage", byRank: true }, ratios: { ap: { ref: "ratio" } } },
      apply: { damageType, damageStage: "PostMitigation" },
      source: { sourceType: "Skill", sourceId: skillId },
    },
    ability: {
      abilityId,
      key: "Default",
      castSpec: { castTime: 0.25, canMove: deliveryType !== "Projectile", isChanneling: false },
      deliverySpec: { type: deliveryType, range, speed, collision },
      paramBindings: { damage: { ref: "damage" }, ratio: { ref: "ratio" } },
      effects: [effectId],
    },
    skill: {
      skillId,
      skillCategory,
      rankRules: { maxRank: 5, cooldownByRank: cooldowns, costByRank: costs },
      baseStats: { damage: flat, ratio },
      abilities: [{ abilityId, key: "Default", priority: 0 }],
    },
  };
}

function makeItemPreset({ key, label, aliases = [], type = "OnHit", flat = 80, ratio = 0.8, cooldown = 2 }) {
  const effectId = `Effect_${key}`;
  const abilityId = `Ability_${key}`;
  const skillId = `Skill_${key}`;
  const isAura = type === "Aura";
  return {
    key,
    label,
    aliases: [key.toLowerCase(), label.toLowerCase(), ...aliases.map((a) => a.toLowerCase())],
    effect: {
      effectId,
      type: "Damage",
      trigger: isAura ? "OnTick" : "OnHit",
      selector: { selectorType: isAura ? "Area" : "HitTarget", team: "Enemy" },
      calc: { flat: { ref: "bonusDamage" }, ratios: { ad: { ref: "bonusRatio" } } },
      apply: { damageType: "Physical", damageStage: "PostMitigation" },
      procRules: { cooldown, chance: 1, maxPerTrigger: 1 },
      source: { sourceType: "Item", sourceId: skillId },
    },
    ability: {
      abilityId,
      key: "Passive",
      castSpec: { castTime: 0, canMove: true, isChanneling: false },
      deliverySpec: { type, range: isAura ? 450 : 0, speed: 0, collision: "None" },
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

const championPresets = [
  makeDamagePreset({ key: "Ahri_Q", label: "아리 Q - 현혹의 구슬", deliveryType: "Projectile", range: 880, speed: 1700, ratio: 0.6 }),
  makeDamagePreset({ key: "Annie_R", label: "애니 R - 소환: 티버", deliveryType: "Area", range: 600, collision: "None", ratio: 0.75, cooldowns: [120, 100, 80], costs: [100, 100, 100] }),
  makeDamagePreset({ key: "Ashe_R", label: "애쉬 R - 마법의 수정화살", deliveryType: "Projectile", range: 25000, speed: 1600, collision: "FirstHit", ratio: 1.0, cooldowns: [100, 90, 80], costs: [100, 100, 100] }),
  makeDamagePreset({ key: "Garen_Q", label: "가렌 Q - 결정타", deliveryType: "OnHit", range: 0, speed: 0, collision: "None", damageType: "Physical", ratio: 1.4, cooldowns: [8, 7, 6, 5, 4], costs: [0, 0, 0, 0, 0] }),
  makeDamagePreset({ key: "Lux_E", label: "럭스 E - 광채", deliveryType: "Area", range: 1100, speed: 1400, collision: "None", ratio: 0.7 }),
  makeDamagePreset({ key: "Ezreal_Q", label: "이즈리얼 Q - 신비한 화살", deliveryType: "Projectile", range: 1150, speed: 2000, collision: "FirstHit", ratio: 1.3, damageType: "Physical", costs: [28, 31, 34, 37, 40] }),
  makeDamagePreset({ key: "Jinx_R", label: "징크스 R - 초강력 초토화 로켓!", deliveryType: "Projectile", range: 25000, speed: 1700, collision: "FirstHit", ratio: 1.5, flat: [200, 350, 500], cooldowns: [80, 75, 70] }),
  makeDamagePreset({ key: "Blitzcrank_Q", label: "블리츠크랭크 Q - 강철 주먹", deliveryType: "Projectile", range: 1150, speed: 1800, collision: "FirstHit", ratio: 1.0 }),
  makeDamagePreset({ key: "LeeSin_Q", label: "리 신 Q - 음파/공명의 일격", deliveryType: "Projectile", range: 1100, speed: 1800, collision: "FirstHit", ratio: 1.0, damageType: "Physical" }),
  makeDamagePreset({ key: "Katarina_R", label: "카타리나 R - 죽음의 연꽃", deliveryType: "Area", range: 550, speed: 0, collision: "None", trigger: "OnTick", flat: [250, 400, 550], ratio: 1.0, cooldowns: [90, 60, 45], costs: [0, 0, 0] }),
  makeDamagePreset({ key: "Malphite_R", label: "말파이트 R - 멈출 수 없는 힘", deliveryType: "Dash", range: 1000, speed: 2000, collision: "FirstHit", ratio: 1.0, damageType: "Magic", cooldowns: [130, 105, 80] }),
  makeDamagePreset({ key: "Morgana_Q", label: "모르가나 Q - 어둠의 속박", deliveryType: "Projectile", range: 1250, speed: 1200, collision: "FirstHit", ratio: 0.9 }),
  makeDamagePreset({ key: "Leona_Q", label: "레오나 Q - 일식", deliveryType: "OnHit", range: 0, speed: 0, collision: "None", damageType: "Magic", ratio: 0.3, costs: [45, 50, 55, 60, 65] }),
  makeDamagePreset({ key: "Nami_Q", label: "나미 Q - 물의 감옥", deliveryType: "Area", range: 875, speed: 0, collision: "None", ratio: 0.5 }),
  makeDamagePreset({ key: "Zed_R", label: "제드 R - 죽음의 표식", deliveryType: "Target", range: 625, speed: 0, collision: "None", damageType: "Physical", ratio: 1.0, cooldowns: [120, 90, 60], costs: [0, 0, 0] }),
];

const itemPresets = [
  makeItemPreset({ key: "Sheen", label: "주문검", aliases: ["spellblade", "sheen"], flat: 100, ratio: 1.0, cooldown: 1.5, type: "OnHit" }),
  makeItemPreset({ key: "Lifeline", label: "생명선", flat: 0, ratio: 0, cooldown: 90, type: "Passive" }),
  makeItemPreset({ key: "Sunfire", label: "불사르기(오라)", flat: 20, ratio: 0.02, cooldown: 1, type: "Aura" }),
  makeItemPreset({ key: "Kraken", label: "크라켄 학살자", flat: 80, ratio: 0.6, cooldown: 3, type: "OnHit" }),
  makeItemPreset({ key: "Bloodrazor", label: "블러드레이저", flat: 30, ratio: 0.025, cooldown: 1, type: "OnHit" }),
  makeItemPreset({ key: "Ludens", label: "루덴의 폭풍", aliases: ["luden"], flat: 100, ratio: 0.15, cooldown: 10, type: "OnHit" }),
  makeItemPreset({ key: "Statikk", label: "스태틱의 단검", aliases: ["statikk shiv"], flat: 80, ratio: 0.5, cooldown: 3, type: "OnHit" }),
];

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
  {
    key: "Smite",
    aliases: ["smite", "강타"],
    label: "강타 (Smite)",
    effect: {
      effectId: "Effect_Smite_TrueDamage",
      type: "Damage",
      trigger: "OnCast",
      selector: { selectorType: "Target", team: "Enemy" },
      calc: { flat: { ref: "trueDamage", byRank: true } },
      apply: { damageType: "True", damageStage: "Final" },
      source: { sourceType: "Summoner", sourceId: "Summoner_Smite" },
    },
    ability: {
      abilityId: "Summoner_Smite_Cast",
      key: "Default",
      castSpec: { castTime: 0, canMove: true, isChanneling: false },
      deliverySpec: { type: "Target", range: 500, speed: 0, collision: "None" },
      paramBindings: { trueDamage: { ref: "trueDamage" } },
      effects: ["Effect_Smite_TrueDamage"],
    },
    skill: {
      skillId: "Summoner_Smite",
      skillCategory: "Active",
      rankRules: { maxRank: 1, cooldownByRank: [15], costByRank: [0] },
      baseStats: { trueDamage: [600] },
      abilities: [{ abilityId: "Summoner_Smite_Cast", key: "Default", priority: 0 }],
    },
  },
];

export const PRESET_GROUPS = {
  champions: championPresets,
  items: itemPresets,
  utilities: utilityPresets,
};
