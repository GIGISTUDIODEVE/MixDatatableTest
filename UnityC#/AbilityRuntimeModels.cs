using System;
using System.Collections.Generic;
using UnityEngine;

namespace GIGISTUDIO.Abilities
{
    public enum AbilityDeliveryType
    {
        Instant,
        Target,
        Projectile,
        Area,
        OnHit
    }

    [Serializable]
    public sealed class AbilitySpec
    {
        public string abilityId;
        public string key = "Default";
        public AbilityDeliveryType deliveryType = AbilityDeliveryType.Instant;

        // 전달 스펙(MVP)
        public DeliverySpec deliverySpec = new DeliverySpec();

        // 실행할 effect들
        public List<string> effectIds = new List<string>();
    }

    [Serializable]
    public sealed class DeliverySpec
    {
        // 공용
        public float range = 8f;

        // Projectile
        public float projectileSpeed = 18f;
        public float projectileRadius = 0.15f;

        // Area
        public float areaRadius = 3f;

        // 타겟 필터
        public LayerMask hitMask = ~0;          // 기본: 전부
        public bool stopAtFirstHit = true;      // Projectile 충돌 1회만
        public bool includeTriggers = false;    // 트리거 포함 여부

        // 팀/진영 같은 건 나중에 추가 가능 (지금은 레이어로 MVP)
    }
}
