using System.Threading.Tasks;
using GIGISTUDIO.Combat;
using GIGISTUDIO.Data;
using GIGISTUDIO.Effects;
using GIGISTUDIO.Runtime;
using GIGISTUDIO.Stats;

namespace GIGISTUDIO.Abilities
{
    public static class EffectApplyHelper
    {
        public static async Task ApplyEffectsAsync(
            IEffectRepository effectRepo,
            string[] effectIds,
            StatBlock sourceStats,
            StatBlock targetStats,
            HealthComponent targetHealth,
            CombatConfig combatConfig,
            EffectTickRunner tickRunner // OnTick용 (nullable)
        )
        {
            if (effectRepo == null || effectIds == null) return;

            for (int i = 0; i < effectIds.Length; i++)
            {
                var id = effectIds[i];
                if (string.IsNullOrWhiteSpace(id)) continue;

                var effect = await effectRepo.GetEffectByIdAsync(id);
                if (effect == null) continue;

                var ctx = new EffectContext
                {
                    sourceStats = sourceStats,
                    targetStats = targetStats,
                    targetHealth = targetHealth,
                    combatConfig = combatConfig
                };

                if (effect.trigger == TriggerType.OnTick)
                {
                    // OnTick은 TickRunner가 있어야 함
                    if (tickRunner != null)
                        tickRunner.Run(effect, ctx);
                }
                else
                {
                    EffectExecutor.ExecuteOnceAndApply(effect, ctx);
                }
            }
        }
    }
}
