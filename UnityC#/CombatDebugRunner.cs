using UnityEngine;
using GIGISTUDIO.Stats;

namespace GIGISTUDIO.Combat
{
    public sealed class CombatDebugRunner : MonoBehaviour
    {
        public StatComponent attacker;
        public StatComponent defender;

        public CombatConfig config = new CombatConfig();
        public DamageType damageType = DamageType.Physical;

        [ContextMenu("Compute DPS")]
        public void Compute()
        {
            if (attacker == null || defender == null)
            {
                Debug.LogWarning("attacker/defender가 비었습니다.");
                return;
            }

            float hit = CombatResolver.ComputeHitOnce(attacker.Final, defender.Final, config, damageType);
            float dps = CombatResolver.ComputeDps(attacker.Final, defender.Final, config, damageType);

            Debug.Log($"[Combat] hitOnce={hit:F2}, dps={dps:F2} | type={damageType}");
        }
    }
}
