using System;
using UnityEngine;
using GIGISTUDIO.Combat;
using GIGISTUDIO.Data;
using GIGISTUDIO.Runtime;
using GIGISTUDIO.Stats;
using GIGISTUDIO.Effects;

namespace GIGISTUDIO.Abilities
{
    public sealed class ProjectileMover : MonoBehaviour
    {
        public struct ProjectileInit
        {
            public StatComponent casterStats;
            public CombatConfig combatConfig;

            public IEffectRepository effectRepo;
            public string[] effectIds;
            public EffectTickRunner tickRunner;

            public Vector3 direction;
            public float speed;
            public float radius;
            public float maxDistance;

            public LayerMask hitMask;
            public bool stopAtFirstHit;
            public bool includeTriggers;
        }

        private ProjectileInit _init;
        private Vector3 _start;
        private Vector3 _prev;

        public void Init(ProjectileInit init)
        {
            _init = init;
            _start = transform.position;
            _prev = _start;
        }

        private void Update()
        {
            float dt = Time.deltaTime;
            if (dt <= 0f) return;

            var step = _init.direction * (_init.speed * dt);
            var next = transform.position + step;

            var include = _init.includeTriggers ? QueryTriggerInteraction.Collide : QueryTriggerInteraction.Ignore;

            // SphereCast로 "터널링" 방지
            if (Physics.SphereCast(transform.position, _init.radius, _init.direction, out var hit, step.magnitude, _init.hitMask, include))
            {
                transform.position = hit.point;

                HandleHit(hit.collider);

                if (_init.stopAtFirstHit)
                {
                    Destroy(gameObject);
                    return;
                }
            }
            else
            {
                transform.position = next;
            }

            // 거리 제한
            float traveled = Vector3.Distance(_start, transform.position);
            if (traveled >= _init.maxDistance)
                Destroy(gameObject);
        }

        private async void HandleHit(Collider col)
        {
            if (col == null) return;

            var health = col.GetComponentInParent<HealthComponent>();
            if (health == null || health.IsDead) return;

            var targetStats = col.GetComponentInParent<StatComponent>();
            if (targetStats == null) return;

            await EffectApplyHelper.ApplyEffectsAsync(
                _init.effectRepo,
                _init.effectIds,
                _init.casterStats.Final,
                targetStats.Final,
                health,
                _init.combatConfig,
                _init.tickRunner
            );
        }
    }
}
