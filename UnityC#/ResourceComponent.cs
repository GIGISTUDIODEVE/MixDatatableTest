using UnityEngine;

namespace GIGISTUDIO.Runtime
{
    /// <summary>
    /// 마나/에너지/기력 등 공용 자원 컴포넌트
    /// </summary>
    public sealed class ResourceComponent : MonoBehaviour
    {
        public float max = 100f;
        public float current = 100f;

        public bool Has(float cost) => current >= cost;

        public void Consume(float cost)
        {
            current = Mathf.Max(0f, current - Mathf.Max(0f, cost));
        }

        public void Refill(float amount)
        {
            current = Mathf.Min(max, current + Mathf.Max(0f, amount));
        }
    }
}
