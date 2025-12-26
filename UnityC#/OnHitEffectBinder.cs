using System.Collections.Generic;
using UnityEngine;
using GIGISTUDIO.Effects;

namespace GIGISTUDIO.Combat
{
    /// <summary>
    /// BasicAttackEmitter의 OnHit에 EffectSpec들을 연결해서 실행.
    /// (OnHit 트리거만 처리하는 MVP 바인더)
    /// </summary>
    public sealed class OnHitEffectBinder : MonoBehaviour
    {
        public BasicAttackEmitter emitter;
        public List<EffectSpec> onHitEffects = new();

        private void OnEnable()
        {
            if (emitter != null) emitter.OnHit += HandleHit;
        }

        private void OnDisable()
        {
            if (emitter != null) emitter.OnHit -= HandleHit;
        }

        private void HandleHit(BasicAttackEmitter.OnHitPayload payload)
        {
            if (onHitEffects == null || onHitEffects.Count == 0) return;

            foreach (var spec in onHitEffects)
            {
                if (spec == null) continue;
                if (spec.trigger != TriggerType.OnHit) continue;

                var ctx = new EffectContext
                {
                    sourceStats = payload.attacker,
                    targetStats = payload.defender,
                    targetHealth = payload.defenderHealth,
                    combatConfig = payload.config
                };

                float applied = EffectExecutor.ExecuteOnceAndApply(spec, ctx);
                Debug.Log($"[OnHitEffect] {spec.effectId} applied={applied:F2}");
            }
        }
    }
}
