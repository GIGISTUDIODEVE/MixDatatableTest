using System.Collections;
using UnityEngine;

namespace GIGISTUDIO.Effects
{
    public sealed class EffectTickRunner : MonoBehaviour
    {
        public Coroutine Run(EffectSpec spec, EffectContext ctx, System.Action<float> onApplied = null)
        {
            return StartCoroutine(CoRun(spec, ctx, onApplied));
        }

        private IEnumerator CoRun(EffectSpec spec, EffectContext ctx, System.Action<float> onApplied)
        {
            if (spec == null || ctx == null) yield break;

            float interval = Mathf.Max(0.05f, spec.tickInterval);
            float duration = Mathf.Max(0f, spec.duration);

            if (duration <= 0f)
            {
                float amt = EffectExecutor.ExecuteOnceAndApply(spec, ctx);
                onApplied?.Invoke(amt);
                yield break;
            }

            float t = 0f;
            while (t <= duration + 0.0001f)
            {
                float amt = EffectExecutor.ExecuteOnceAndApply(spec, ctx);
                onApplied?.Invoke(amt);

                yield return new WaitForSeconds(interval);
                t += interval;
            }
        }
    }
}
