using UnityEngine;

namespace GIGISTUDIO.Stats
{
    public sealed class StatDebugRunner : MonoBehaviour
    {
        public StatComponent target;

        [ContextMenu("Print Final Stats")]
        public void PrintFinal()
        {
            if (target == null || target.Final == null)
            {
                Debug.LogWarning("Target/Final이 없습니다.");
                return;
            }

            Debug.Log(
                $"HP={target.Final.Get(StatType.Hp)}, " +
                $"AD={target.Final.Get(StatType.Ad)}, " +
                $"AS={target.Final.Get(StatType.AttackSpeed)}, " +
                $"Armor={target.Final.Get(StatType.Armor)}"
            );
        }
    }
}
