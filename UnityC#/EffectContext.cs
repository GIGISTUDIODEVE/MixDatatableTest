using GIGISTUDIO.Combat;
using GIGISTUDIO.Stats;
using GIGISTUDIO.Runtime;

namespace GIGISTUDIO.Effects
{
    public sealed class EffectContext
    {
        public StatBlock sourceStats;
        public StatBlock targetStats;

        public HealthComponent targetHealth; // 실제 적용 대상
        public CombatConfig combatConfig;
    }
}
