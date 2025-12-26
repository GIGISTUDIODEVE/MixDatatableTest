using System.Linq;
using UnityEngine;
using GIGISTUDIO.Abilities;
using GIGISTUDIO.Combat;
using GIGISTUDIO.Data;
using GIGISTUDIO.Runtime;
using GIGISTUDIO.Stats;

namespace GIGISTUDIO.Skills
{
    public sealed class SkillExecutor
    {
        private readonly IAbilityRepository _abilityRepo;
        private readonly IEffectRepository _effectRepo;

        public SkillExecutor(IAbilityRepository abilityRepo, IEffectRepository effectRepo)
        {
            _abilityRepo = abilityRepo;
            _effectRepo = effectRepo;
        }

        public async void ExecuteSkill(
            SkillSpec skill,
            int rank,
            StatComponent caster,
            StatComponent target,
            HealthComponent targetHealth,
            CombatConfig combatConfig)
        {
            if (skill == null || caster == null) return;

            var entry = skill.abilities.OrderByDescending(a => a.priority).FirstOrDefault();
            if (entry == null) return;

            var ability = await _abilityRepo.GetAbilityByIdAsync(entry.abilityId);
            if (ability == null) return;

            var executor = caster.GetComponent<AbilityExecutor>();
            if (executor == null)
            {
                Debug.LogError($"[{caster.name}] AbilityExecutor가 없습니다. 캐스터에 AbilityExecutor를 붙이세요.");
                return;
            }

            var casterPos = caster.transform.position;
            var targetPos = target != null ? target.transform.position : (casterPos + caster.transform.forward * ability.deliverySpec.range);

            var dir = (targetPos - casterPos);
            if (dir.sqrMagnitude < 0.0001f) dir = caster.transform.forward;

            var ctx = new AbilityContext
            {
                casterGO = caster.gameObject,
                casterStats = caster,

                targetGO = target != null ? target.gameObject : null,
                targetStats = target,
                targetHealth = targetHealth,

                castOrigin = casterPos + dir.normalized * 0.8f,
                aimDirection = dir.normalized,
                targetPoint = targetPos,

                combatConfig = combatConfig
            };

            executor.Execute(ability, ctx);
        }
    }
}
