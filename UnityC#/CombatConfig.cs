using System;
using UnityEngine;

namespace GIGISTUDIO.Combat
{
    [Serializable]
    public sealed class CombatConfig
    {
        public float critChanceMin = 0;
        public float critChanceMax = 100;
        public float critDamageMin = 1;

        public float armorMitigationBase = 100;
        public float armorMitigationDivisor = 100;

        public float attackSpeedMin = 0;

        // 확장: MR도 같은 방식으로 처리 (문서 권장 확장) :contentReference[oaicite:2]{index=2}
    }
}
