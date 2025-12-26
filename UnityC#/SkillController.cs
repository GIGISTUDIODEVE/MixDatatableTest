using System.Collections.Generic;
using UnityEngine;
using GIGISTUDIO.Combat;
using GIGISTUDIO.Data;
using GIGISTUDIO.Runtime;
using GIGISTUDIO.Stats;
namespace GIGISTUDIO.Skills
{
    /// <summary>
    /// 플레이어/몬스터 공용 스킬 컨트롤러
    /// </summary>
    public sealed class SkillController : MonoBehaviour
    {
        [Header("Dependencies")]
        public StatComponent stats;
        public HealthComponent targetHealth;
        public CombatConfig combatConfig;

        public ResourceComponent resource; // 마나/에너지

        [Header("Runtime")]
        public List<SkillRuntimeSlot> skills = new();

        private SkillExecutor _executor;

        public void Initialize(
            IAbilityRepository abilityRepo,
            IEffectRepository effectRepo)
        {
            _executor = new SkillExecutor(abilityRepo, effectRepo);
        }

        private void Update()
        {
            TickCooldowns(Time.deltaTime);
        }

        private void TickCooldowns(float dt)
        {
            foreach (var slot in skills)
            {
                if (slot.state != SkillState.Cooldown) continue;

                slot.cooldownRemaining -= dt;
                if (slot.cooldownRemaining <= 0f)
                {
                    slot.cooldownRemaining = 0f;
                    slot.state = SkillState.Ready;
                }
            }
        }

        public bool CanUse(int index)
        {
            if (index < 0 || index >= skills.Count) return false;

            var slot = skills[index];
            if (slot.state != SkillState.Ready) return false;

            float cost = GetCost(slot);
            if (resource != null && !resource.Has(cost)) return false;

            return true;
        }

        public void Use(int index, StatComponent target)
        {
            if (!CanUse(index)) return;

            var slot = skills[index];
            float cost = GetCost(slot);
            float cooldown = GetCooldown(slot);

            // 자원 소모
            resource?.Consume(cost);

            // 시전 → 즉시 실행(MVP)
            slot.state = SkillState.Casting;

            _executor.ExecuteSkill(
                slot.spec,
                slot.rank,
                stats,
                target,
                targetHealth,
                combatConfig
            );

            // 쿨타임 진입
            slot.cooldownRemaining = cooldown;
            slot.state = SkillState.Cooldown;
        }

        private float GetCooldown(SkillRuntimeSlot slot)
        {
            var list = slot.spec.cooldownByRank;
            int idx = Mathf.Clamp(slot.rank - 1, 0, list.Count - 1);
            return list.Count > 0 ? list[idx] : 0f;
        }

        private float GetCost(SkillRuntimeSlot slot)
        {
            var list = slot.spec.costByRank;
            int idx = Mathf.Clamp(slot.rank - 1, 0, list.Count - 1);
            return list.Count > 0 ? list[idx] : 0f;
        }
    }
}
