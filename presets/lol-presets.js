// 리그 오브 레전드 프리셋 모음 (아이템 전용)
// - 챔피언/유틸리티 프리셋은 제거했습니다.
// - deliverySpec.type 은 Firestore UI 드롭다운(Projectile/Instant/Area/OnHit/Dash) 기준으로 맞췄습니다.

function buildItemPreset({
  key,
  label,
  mode = "OnHit",          // "OnHit" | "Aura" | "Lifeline"
  flat = 100,
  ratio = 1.0,
  cooldown = 2,
  tickInterval = 1,
  auraRadius = 450,
}) {
  const effectId = `Effect_${key}_Passive`;
  const abilityId = `Ability_${key}_Passive`;
  const skillId = `Skill_${key}_Passive`;
  const itemId = `Item_${key}`;

  // mode -> runtime spec
  const isAura = mode === "Aura";
  const isLifeline = mode === "Lifeline";

  const effectType = isLifeline ? "Shield" : "Damage";
  const trigger = isAura ? "OnTick" : (isLifeline ? "OnDamageTaken" : "OnHit");
  const selector =
    isAura ? { selectorType: "Area", team: "Enemy" } :
    isLifeline ? { selectorType: "Self", team: "Ally" } :
    { selectorType: "HitTarget", team: "Enemy" };

  const deliveryType = isAura ? "Area" : (isLifeline ? "Instant" : "OnHit");

  const calc =
    isLifeline
      ? { flat: { ref: "shieldAmount" } }
      : { flat: { ref: "bonusDamage" }, ratios: { ad: { ref: "bonusRatio" } } };

  const apply =
    isLifeline
      ? { shieldType: "Normal" }
      : { damageType: "Physical", damageStage: "PostMitigation" };

  const timing = isAura ? { tickInterval } : undefined;

  return {
    key,
    label,
    aliases: [key.toLowerCase(), label.toLowerCase()],

    effect: {
      effectId,
      type: effectType,
      source: { sourceType: "Item", sourceId: itemId },

      trigger,
      selector,
      calc,
      apply,
      ...(timing ? { timing } : {}),

      procRules: { cooldown, chance: 1, maxPerTrigger: 1 },
    },

    ability: {
      abilityId,
      key: "Passive",
      castSpec: { castTime: 0, canMove: true, isChanneling: false },

      // UI 드롭다운 기준의 deliveryType 사용
      deliverySpec: {
        type: deliveryType,
        range: isAura ? auraRadius : 0,
        speed: 0,
        collision: "None",
      },

      paramBindings: isLifeline
        ? { shieldAmount: { ref: "shieldAmount" } }
        : { bonusDamage: { ref: "bonusDamage" }, bonusRatio: { ref: "bonusRatio" } },

      effects: [effectId],
    },

    skill: {
      skillId,
      skillCategory: "Passive",
      rankRules: { maxRank: 1, cooldownByRank: [cooldown], costByRank: [0] },

      baseStats: isLifeline
        ? { shieldAmount: flat }
        : { bonusDamage: flat, bonusRatio: ratio },

      abilities: [{ abilityId, key: "Passive", priority: 0 }],
    },
  };
}

const itemPresetConfigs = [
  // 주문검(예: Sheen) 류: OnHit 추가 피해
  { key: "Sheen", label: "주문검", mode: "OnHit", flat: 100, ratio: 1.0, cooldown: 1.5 },

  // 생명선(예: Lifeline) 류: 피해를 받을 때 보호막 (샘플)
  { key: "Lifeline", label: "생명선", mode: "Lifeline", flat: 250, ratio: 0, cooldown: 90 },

  // 오라(예: Sunfire) 류: 주기적으로 주변 적에게 피해
  { key: "Sunfire", label: "불사르기(오라)", mode: "Aura", flat: 20, ratio: 0.02, cooldown: 1, tickInterval: 1, auraRadius: 450 },

  { key: "Kraken", label: "크라켄 학살자", mode: "OnHit", flat: 80, ratio: 0.6, cooldown: 3 },
  { key: "Bloodrazor", label: "블러드레이저", mode: "OnHit", flat: 30, ratio: 0.025, cooldown: 1 },
];

export const itemPresets = itemPresetConfigs.map(buildItemPreset);

// 그룹도 아이템만 노출
export const PRESET_GROUPS = {
  items: itemPresets,
};
