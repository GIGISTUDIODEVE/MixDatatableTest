using UnityEngine;
using GIGISTUDIO.Combat;

namespace GIGISTUDIO.Effects
{
    public static class EffectExecutor
    {
        /// <summary>
        /// 1회 적용. 결과를 HealthComponent에 반영까지 수행.
        /// 반환값: 적용된 순수량(데미지면 피해량, 힐이면 회복량)
        /// </summary>
        public static float ExecuteOnceAndApply(EffectSpec spec, EffectContext ctx)
        {
            if (spec == null || ctx == null) return 0f;
            if (ctx.sourceStats == null) return 0f;

            var targetStats = (spec.selector == SelectorType.Self) ? ctx.sourceStats : ctx.targetStats;
            if (targetStats == null) return 0f;

            float amount = spec.flat + spec.ratio * ctx.sourceStats.Get(spec.ratioStat);
            amount = Mathf.Max(0f, amount);
            if (amount <= 0f) return 0f;

            if (spec.type == EffectType.Heal)
            {
                ctx.targetHealth?.ApplyHeal(amount);
                return amount;
            }

            // Damage: mitigation 적용
            var cfg = ctx.combatConfig ?? new CombatConfig();
            float mitigation = CombatResolver.ComputeMitigation(targetStats, cfg, spec.damageType);
            float finalDamage = amount * mitigation;

            ctx.targetHealth?.ApplyDamage(finalDamage);
            return finalDamage;
        }
    }
}
