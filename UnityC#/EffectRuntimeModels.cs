using System;
using UnityEngine;
using GIGISTUDIO.Combat;
using GIGISTUDIO.Stats;

namespace GIGISTUDIO.Effects
{
    public enum EffectType { Damage, Heal }
    public enum TriggerType { OnHit, OnTick }
    public enum SelectorType { Self, Target } // MVP

    [Serializable]
    public sealed class EffectSpec
    {
        public string effectId;
        public EffectType type = EffectType.Damage;
        public TriggerType trigger = TriggerType.OnHit;
        public SelectorType selector = SelectorType.Target;

        public DamageType damageType = DamageType.Physical;

        [Header("Calc")]
        public float flat = 0f;
        public float ratio = 0f;
        public StatType ratioStat = StatType.Ap;

        [Header("Tick (OnTick only)")]
        public float tickInterval = 1f;
        public float duration = 0f;
    }
}
