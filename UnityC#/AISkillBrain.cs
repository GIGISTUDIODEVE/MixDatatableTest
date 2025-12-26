using UnityEngine;
using GIGISTUDIO.Skills;
using GIGISTUDIO.Stats;
using GIGISTUDIO.Runtime;

namespace GIGISTUDIO.AI
{
    public sealed class AISkillBrain : MonoBehaviour
    {
        [Header("Deps")]
        public SkillController controller;
        public TargetSensor sensor;

        [Header("Think")]
        public float thinkInterval = 0.25f;
        public float minUseInterval = 0.15f; // 연속 사용 방지(프레임/틱 중복)

        [Header("Range Rules (index -> max range)")]
        public float skill0Range = 2.5f;
        public float skill1Range = 7f;
        public float skill2Range = 12f;

        private float _thinkTimer;
        private float _useCooldown;

        private void Reset()
        {
            controller = GetComponent<SkillController>();
            sensor = GetComponent<TargetSensor>();
        }

        private void Update()
        {
            if (controller == null || sensor == null) return;

            _thinkTimer -= Time.deltaTime;
            _useCooldown -= Time.deltaTime;

            if (_thinkTimer > 0f) return;
            _thinkTimer = Mathf.Max(0.05f, thinkInterval);

            sensor.Scan();

            var targetTr = sensor.CurrentTarget;
            if (targetTr == null) return;

            // 타겟 Stat/Health 찾기
            var targetStats = targetTr.GetComponentInParent<StatComponent>();
            var targetHealth = targetTr.GetComponentInParent<HealthComponent>();
            if (targetStats == null || targetHealth == null || targetHealth.IsDead) return;

            if (_useCooldown > 0f) return;

            float dist = Vector3.Distance(transform.position, targetTr.position);

            // 1) 거리 기반 우선 시도
            if (TryUseByDistance(dist, targetStats, targetHealth)) return;

            // 2) fallback: 가능한 스킬 중 첫번째 사용
            for (int i = 0; i < controller.skills.Count; i++)
            {
                if (controller.CanUse(i))
                {
                    controller.targetHealth = targetHealth; // SkillController가 targetHealth에 적용하도록(현재 구조 유지)
                    controller.Use(i, targetStats);
                    _useCooldown = minUseInterval;
                    return;
                }
            }
        }

        private bool TryUseByDistance(float dist, StatComponent targetStats, HealthComponent targetHealth)
        {
            // 스킬 슬롯이 부족하면 자동 스킵
            // 가까울수록 낮은 인덱스(근접기) 우선
            if (dist <= skill0Range && controller.skills.Count > 0 && controller.CanUse(0))
            {
                controller.targetHealth = targetHealth;
                controller.Use(0, targetStats);
                _useCooldown = minUseInterval;
                return true;
            }

            if (dist <= skill1Range && controller.skills.Count > 1 && controller.CanUse(1))
            {
                controller.targetHealth = targetHealth;
                controller.Use(1, targetStats);
                _useCooldown = minUseInterval;
                return true;
            }

            if (dist <= skill2Range && controller.skills.Count > 2 && controller.CanUse(2))
            {
                controller.targetHealth = targetHealth;
                controller.Use(2, targetStats);
                _useCooldown = minUseInterval;
                return true;
            }

            return false;
        }
    }
}
