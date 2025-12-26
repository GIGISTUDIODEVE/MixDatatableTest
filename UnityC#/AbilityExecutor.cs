using System;
using System.Linq;
using UnityEngine;
using GIGISTUDIO.Data;
using GIGISTUDIO.Effects;
using GIGISTUDIO.Runtime;

namespace GIGISTUDIO.Abilities
{
    public sealed class AbilityExecutor : MonoBehaviour
    {
        [Header("Deps")]
        public MonoBehaviour effectRepositoryProvider; // IEffectRepository를 들고있는 컴포넌트(예: GameServices)
        public EffectTickRunner tickRunner;            // 캐스터에 붙어있으면 그걸 써도 됨

        private IEffectRepository _effectRepo;

        private void Awake()
        {
            _effectRepo = effectRepositoryProvider as IEffectRepository;
            if (tickRunner == null) tickRunner = GetComponent<EffectTickRunner>();
        }

        public async void Execute(AbilitySpec ability, AbilityContext ctx)
        {
            if (ability == null || ctx == null || _effectRepo == null) return;

            var effects = ability.effectIds?.Where(x => !string.IsNullOrWhiteSpace(x)).ToArray() ?? Array.Empty<string>();
            if (effects.Length == 0) return;

            // Instant/Target: 바로 적용
            if (ability.deliveryType == AbilityDeliveryType.Instant || ability.deliveryType == AbilityDeliveryType.Target)
            {
                await EffectApplyHelper.ApplyEffectsAsync(
                    _effectRepo,
                    effects,
                    ctx.casterStats.Final,
                    ctx.targetStats?.Final,
                    ctx.targetHealth,
                    ctx.combatConfig,
                    ResolveTickRunner(ctx)
                );
                return;
            }

            // Area: 위치 기반 오버랩 후 일괄 적용
            if (ability.deliveryType == AbilityDeliveryType.Area)
            {
                ExecuteArea(ability, ctx, effects);
                return;
            }

            // Projectile: 투사체 발사
            if (ability.deliveryType == AbilityDeliveryType.Projectile)
            {
                ExecuteProjectile(ability, ctx, effects);
                return;
            }

            // OnHit은 BasicAttackEmitter 쪽 바인딩으로 처리하는 게 정석(MVP 유지)
        }

        private EffectTickRunner ResolveTickRunner(AbilityContext ctx)
        {
            // 캐스터에 붙은 TickRunner 우선
            var casterRunner = ctx.casterGO != null ? ctx.casterGO.GetComponent<EffectTickRunner>() : null;
            return casterRunner != null ? casterRunner : tickRunner;
        }

        private async void ExecuteArea(AbilitySpec ability, AbilityContext ctx, string[] effectIds)
        {
            var spec = ability.deliverySpec;
            float radius = Mathf.Max(0.01f, spec.areaRadius);

            var origin = ctx.targetPoint;
            var include = spec.includeTriggers ? QueryTriggerInteraction.Collide : QueryTriggerInteraction.Ignore;

            var hits = Physics.OverlapSphere(origin, radius, spec.hitMask, include);
            if (hits == null || hits.Length == 0) return;

            // 각 콜라이더에서 HealthComponent 찾고 적용
            foreach (var col in hits)
            {
                if (col == null) continue;

                var health = col.GetComponentInParent<HealthComponent>();
                if (health == null || health.IsDead) continue;

                var stat = col.GetComponentInParent<Stats.StatComponent>();
                if (stat == null) continue;

                await EffectApplyHelper.ApplyEffectsAsync(
                    _effectRepo,
                    effectIds,
                    ctx.casterStats.Final,
                    stat.Final,
                    health,
                    ctx.combatConfig,
                    ResolveTickRunner(ctx)
                );
            }
        }

        private void ExecuteProjectile(AbilitySpec ability, AbilityContext ctx, string[] effectIds)
        {
            var spec = ability.deliverySpec;

            // 런타임 투사체 생성 (프리팹 쓰고 싶으면 여기만 교체하면 됨)
            var go = new GameObject($"Projectile_{ability.abilityId}");
            go.transform.position = ctx.castOrigin;

            var proj = go.AddComponent<ProjectileMover>();
            proj.Init(new ProjectileMover.ProjectileInit
            {
                casterStats = ctx.casterStats,
                combatConfig = ctx.combatConfig,
                effectRepo = _effectRepo,
                effectIds = effectIds,
                direction = (ctx.aimDirection.sqrMagnitude > 0.0001f ? ctx.aimDirection.normalized : ctx.casterGO.transform.forward),
                speed = Mathf.Max(0.01f, spec.projectileSpeed),
                radius = Mathf.Max(0.01f, spec.projectileRadius),
                maxDistance = Mathf.Max(0.1f, spec.range),
                hitMask = spec.hitMask,
                stopAtFirstHit = spec.stopAtFirstHit,
                includeTriggers = spec.includeTriggers,
                tickRunner = ResolveTickRunner(ctx),
            });
        }
    }
}
