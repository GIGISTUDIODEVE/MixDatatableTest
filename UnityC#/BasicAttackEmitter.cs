using UnityEngine;
using GIGISTUDIO.Combat;
using GIGISTUDIO.Stats;
using GIGISTUDIO.Runtime;

namespace GIGISTUDIO.Combat
{
    /// <summary>
    /// MVP 기본공격 이벤트 발생기:
    /// - 공격자/피격자 스탯 + Health를 입력으로 받고
    /// - "한 번 때렸다" 이벤트를 발생시킴 (OnHit)
    /// </summary>
    public sealed class BasicAttackEmitter : MonoBehaviour
    {
        public StatComponent attackerStats;
        public StatComponent defenderStats;
        public HealthComponent defenderHealth;

        public CombatConfig combatConfig = new CombatConfig();
        public DamageType damageType = DamageType.Physical;

        public System.Action<OnHitPayload> OnHit;

        public struct OnHitPayload
        {
            public StatBlock attacker;
            public StatBlock defender;
            public HealthComponent defenderHealth;
            public CombatConfig config;
            public DamageType damageType;

            public float baseHitDamage; // 기본공격(기대값) 피해(1회)
        }

        [ContextMenu("Attack Once")]
        public void AttackOnce()
        {
            if (attackerStats == null || defenderStats == null)
            {
                Debug.LogWarning("attackerStats/defenderStats가 비었습니다.");
                return;
            }

            float hit = CombatResolver.ComputeHitOnce(attackerStats.Final, defenderStats.Final, combatConfig, damageType);

            // 기본공격 피해를 실제로 먼저 적용(원하면 여기서 빼도 됨)
            defenderHealth?.ApplyDamage(hit);

            OnHit?.Invoke(new OnHitPayload
            {
                attacker = attackerStats.Final,
                defender = defenderStats.Final,
                defenderHealth = defenderHealth,
                config = combatConfig,
                damageType = damageType,
                baseHitDamage = hit
            });

            Debug.Log($"[BasicAttack] hit={hit:F2}");
        }
    }
}
