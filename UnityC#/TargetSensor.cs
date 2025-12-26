using UnityEngine;

namespace GIGISTUDIO.AI
{
    public sealed class TargetSensor : MonoBehaviour
    {
        public float searchRadius = 12f;
        public LayerMask targetMask = ~0;
        public bool includeTriggers = false;

        public Transform CurrentTarget { get; private set; }

        public void Scan()
        {
            var include = includeTriggers ? QueryTriggerInteraction.Collide : QueryTriggerInteraction.Ignore;
            var hits = Physics.OverlapSphere(transform.position, searchRadius, targetMask, include);

            Transform best = null;
            float bestDistSqr = float.PositiveInfinity;

            for (int i = 0; i < hits.Length; i++)
            {
                var col = hits[i];
                if (col == null) continue;

                var t = col.transform;
                float d = (t.position - transform.position).sqrMagnitude;
                if (d < bestDistSqr)
                {
                    bestDistSqr = d;
                    best = t;
                }
            }

            CurrentTarget = best;
        }
    }
}
