using UnityEngine;
using GIGISTUDIO.Stats;

namespace GIGISTUDIO.Combat
{
    public static class CombatResolver
    {
        public static float ComputeExpectedHitDamage(StatBlock attacker, CombatConfig cfg)
        {
            float ad = attacker.Get(StatType.Ad);
            float critChance = Mathf.Clamp(attacker.Get(StatType.CritChance), cfg.critChanceMin, cfg.critChanceMax);
            float critDamage = Mathf.Max(attacker.Get(StatType.CritDamage), cfg.critDamageMin);

            // expectedHit = AD ¡¿ (1 + critChance/100 ¡¿ (critDamage - 1)) :contentReference[oaicite:3]{index=3}
            return ad * (1f + (critChance / 100f) * (critDamage - 1f));
        }

        public static float ComputeMitigation(StatBlock defender, CombatConfig cfg, DamageType damageType)
        {
            if (damageType == DamageType.True) return 1f;

            if (damageType == DamageType.Magic)
            {
                float mr = Mathf.Max(defender.Get(StatType.Mr), 0f);
                return cfg.armorMitigationBase / (cfg.armorMitigationDivisor + mr);
            }

            // Physical
            float armor = Mathf.Max(defender.Get(StatType.Armor), 0f);
            return cfg.armorMitigationBase / (cfg.armorMitigationDivisor + armor);
        }

        public static float ComputeDps(StatBlock attacker, StatBlock defender, CombatConfig cfg, DamageType damageType)
        {
            float expectedHit = ComputeExpectedHitDamage(attacker, cfg);
            float mitigation = ComputeMitigation(defender, cfg, damageType);
            float asValue = Mathf.Max(attacker.Get(StatType.AttackSpeed), cfg.attackSpeedMin);

            // dps = expectedHit ¡¿ mitigation ¡¿ max(AS, attackSpeedMin) :contentReference[oaicite:4]{index=4}
            return expectedHit * mitigation * asValue;
        }

        public static float ComputeHitOnce(StatBlock attacker, StatBlock defender, CombatConfig cfg, DamageType damageType)
        {
            float expectedHit = ComputeExpectedHitDamage(attacker, cfg);
            float mitigation = ComputeMitigation(defender, cfg, damageType);
            return expectedHit * mitigation;
        }
    }
}
