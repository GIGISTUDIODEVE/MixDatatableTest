// 리그 오브 레전드 프리셋 모음
// 데이터는 간략화된 샘플 스펙이며, 지속적으로 확장 가능하도록 그룹/배열 구조로 분리했습니다.

// 챔피언은 "17종 챔피언 × 4스킬(Q/W/E/R)" 프리셋이 목적.
// 이 프리셋은 Firestore 툴이 한 번에 Effect/Ability/Skill 1세트를 채우는 구조이므로
// "챔피언 1명 = 프리셋 4개"(Q/W/E/R)로 만든다.
function buildChampionSkillPreset({
  championKey,
  slot,
  label,
  damage = 80,
  apRatio = 0.8,
  range = 600,
  deliveryType = "Projectile",
  cooldownByRank,
  costByRank,
  maxRank,
}) {
  const key = `${championKey}_${slot}`;
  const effectId = `Effect_${championKey}_${slot}_Damage`;
  const abilityId = `Ability_${championKey}_${slot}`;
  const skillId = `Skill_${championKey}_${slot}`;

  return {
    key,
    label,
    aliases: [
      championKey.toLowerCase(),
      key.toLowerCase(),
      `${championKey.toLowerCase()}_${slot.toLowerCase()}`,
      label.toLowerCase(),
      slot.toLowerCase(),
    ],
    effect: {
      effectId,
      type: "Damage",
      trigger: "OnHit",
      selector: { selectorType: "HitTarget", team: "Enemy" },
      calc: {
        flat: { ref: "damage", byRank: true },
        ratios: { ap: { ref: "ratio" } },
      },
      apply: { damageType: "Magic", damageStage: "PostMitigation" },
      source: { sourceType: "Skill", sourceId: skillId },
    },
    ability: {
      abilityId,
      key: "Default",
      castSpec: { castTime: 0.25, canMove: false, isChanneling: false },
      deliverySpec: {
        type: deliveryType,
        range,
        speed: deliveryType === "Projectile" ? 1200 : 0,
        collision: deliveryType === "Projectile" ? "FirstHit" : "None",
      },
      // 문서의 값 참조 규칙(Ability.paramBindings -> Skill.baseStats)을 그대로 사용한다.
      paramBindings: { damage: { ref: "damage" }, ratio: { ref: "apRatio" } },
      effects: [effectId],
    },
    skill: {
      skillId,
      skillCategory: "Active",
      rankRules: {
        maxRank,
        cooldownByRank,
        costByRank,
      },
      baseStats: {
        damage: Array.from({ length: maxRank }, (_, i) => damage + i * 20),
        apRatio,
      },
      abilities: [{ abilityId, key: "Default", priority: 0 }],
    },
  };
}

function buildItemPreset({
  key,
  label,

  // delivery: OnHit / Aura / Passive
  delivery = "OnHit",

  // effect
  effectType = "Damage",
  trigger = "OnHit",
  selectorType = "HitTarget",
  team = "Enemy",
  damageType = "Physical",
  damageStage = "PostMitigation",
  auraRange = 450,

  // values
  flat = 100,
  ratio = 1.0,
  cooldown = 2,
  unique,
}) {
  const effectId = `Effect_${key}_Passive`;
  const abilityId = `Ability_${key}_Passive`;
  const skillId = `Skill_${key}_Passive`;

  const deliverySpec =
    delivery === "Aura"
      ? { type: "Area", range: auraRange, speed: 0, collision: "None" }
      : delivery === "OnHit"
        ? { type: "OnHit", range: 0, speed: 0, collision: "None" }
        : { type: "Instant", range: 0, speed: 0, collision: "None" };

  const effectCalc =
    effectType === "Shield"
      ? { flat: { ref: "shield" }, ratios: {} }
      : { flat: { ref: "bonusDamage" }, ratios: { ad: { ref: "bonusRatio" } } };

  const baseStats =
    effectType === "Shield"
      ? { shield: flat }
      : { bonusDamage: flat, bonusRatio: ratio };

  const paramBindings =
    effectType === "Shield"
      ? { shield: { ref: "shield" } }
      : { bonusDamage: { ref: "bonusDamage" }, bonusRatio: { ref: "bonusRatio" } };

  return {
    key,
    label,
    aliases: [key.toLowerCase(), label.toLowerCase()],
    effect: {
      effectId,
      type: effectType,
      trigger,
      selector: { selectorType, team },
      calc: effectCalc,
      apply: effectType === "Damage" ? { damageType, damageStage } : undefined,
      procRules: { cooldown, chance: 1, maxPerTrigger: 1 },
      unique,
      source: { sourceType: "Item", sourceId: skillId },
    },
    ability: {
      abilityId,
      key: "Passive",
      castSpec: { castTime: 0, canMove: true, isChanneling: false },
      deliverySpec,
      paramBindings,
      effects: [effectId],
    },
    skill: {
      skillId,
      skillCategory: "Passive",
      rankRules: { maxRank: 1, cooldownByRank: [cooldown], costByRank: [0] },
      baseStats,
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

// "챔피언 17종 × 4스킬" (Q/W/E/R)
const CHAMPION_SLOTS = [
  {
    slot: "Q",
    slotLabel: "Q",
    maxRank: 5,
    cooldownByRank: [8, 7, 6, 5, 4],
    costByRank: [50, 55, 60, 65, 70],
    damage: 80,
    apRatio: 0.6,
    range: 625,
  },
  {
    slot: "W",
    slotLabel: "W",
    maxRank: 5,
    cooldownByRank: [14, 13, 12, 11, 10],
    costByRank: [60, 65, 70, 75, 80],
    damage: 70,
    apRatio: 0.5,
    range: 700,
  },
  {
    slot: "E",
    slotLabel: "E",
    maxRank: 5,
    cooldownByRank: [12, 11, 10, 9, 8],
    costByRank: [40, 45, 50, 55, 60],
    damage: 60,
    apRatio: 0.45,
    range: 550,
  },
  {
    slot: "R",
    slotLabel: "R",
    maxRank: 3,
    cooldownByRank: [120, 100, 80],
    costByRank: [100, 100, 100],
    damage: 150,
    apRatio: 0.7,
    range: 900,
  },
];

const championPresets = CHAMPION_KEYS.flatMap((championKey) =>
  CHAMPION_SLOTS.map((slotCfg) =>
    buildChampionSkillPreset({
      championKey,
      slot: slotCfg.slot,
      label: `${championKey} ${slotCfg.slotLabel}`,
      damage: slotCfg.damage,
      apRatio: slotCfg.apRatio,
      range: slotCfg.range,
      cooldownByRank: slotCfg.cooldownByRank,
      costByRank: slotCfg.costByRank,
      maxRank: slotCfg.maxRank,
    })
  )
);

const itemPresetConfigs = [
  // 주문검(Spellblade) - 온힛 피해 + 고유 효과 그룹(중복 방지)
  {
    key: "Sheen",
    label: "주문검",
    delivery: "OnHit",
    effectType: "Damage",
    trigger: "OnHit",
    selectorType: "HitTarget",
    team: "Enemy",
    damageType: "Physical",
    damageStage: "PostMitigation",
    flat: 100,
    ratio: 1.0,
    cooldown: 1.5,
    unique: { groupId: "Spellblade", policy: "HighestOnly" },
  },

  // 생명선(Lifeline) - 패시브 발동(피해를 받을 때) / 셀프 실드(샘플)
  {
    key: "Lifeline",
    label: "생명선",
    delivery: "Passive",
    effectType: "Shield",
    trigger: "OnDamageTaken",
    selectorType: "Self",
    team: "Self",
    flat: 250,
    cooldown: 90,
  },

  // 불사르기(오라) - 주변 적에게 주기적 피해
  {
    key: "Sunfire",
    label: "불사르기(오라)",
    delivery: "Aura",
    effectType: "Damage",
    trigger: "OnTick",
    selectorType: "Area",
    team: "Enemy",
    damageType: "Magic",
    damageStage: "PostMitigation",
    auraRange: 450,
    flat: 20,
    ratio: 0.02,
    cooldown: 1,
  },

  // 크라켄 - 온힛 피해
  {
    key: "Kraken",
    label: "크라켄 학살자",
    delivery: "OnHit",
    effectType: "Damage",
    trigger: "OnHit",
    selectorType: "HitTarget",
    team: "Enemy",
    damageType: "Physical",
    damageStage: "PostMitigation",
    flat: 80,
    ratio: 0.6,
    cooldown: 3,
  },

  // 블러드레이저 - 온힛 피해 (비율 피해 샘플)
  {
    key: "Bloodrazor",
    label: "블러드레이저",
    delivery: "OnHit",
    effectType: "Damage",
    trigger: "OnHit",
    selectorType: "HitTarget",
    team: "Enemy",
    damageType: "Physical",
    damageStage: "PostMitigation",
    flat: 30,
    ratio: 0.025,
    cooldown: 1,
  },
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
