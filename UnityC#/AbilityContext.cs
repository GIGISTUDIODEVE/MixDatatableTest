using UnityEngine;
using GIGISTUDIO.Combat;
using GIGISTUDIO.Runtime;
using GIGISTUDIO.Stats;

namespace GIGISTUDIO.Abilities
{
    public sealed class AbilityContext
    {
        // 실행 주체/대상
        public GameObject casterGO;
        public StatComponent casterStats;

        public GameObject targetGO;                 // 단일 타겟 (없을 수 있음)
        public StatComponent targetStats;
        public HealthComponent targetHealth;

        // 월드 정보
        public Vector3 castOrigin;
        public Vector3 aimDirection;                // 정규화 권장
        public Vector3 targetPoint;                 // Area에서 사용

        public CombatConfig combatConfig;
    }
}
