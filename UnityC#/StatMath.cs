using System;
using UnityEngine;

namespace GIGISTUDIO.Stats
{
    public static class StatMath
    {
        /// <summary>
        /// 값 안전화: NaN/Inf 제거 + 최소값 클램프
        /// </summary>
        public static float Sanitize(float v, float min = 0f, float max = float.PositiveInfinity)
        {
            if (float.IsNaN(v) || float.IsInfinity(v)) v = 0f;
            if (v < min) v = min;
            if (v > max) v = max;
            return v;
        }

        /// <summary>
        /// 프로젝트 정책:
        /// final = base + (level - 1) * growth
        /// 레벨 1 = base
        /// </summary>
        public static float ApplyGrowth(float baseValue, float growthPerLevel, int level)
        {
            if (level < 1) level = 1;
            int growthLevel = Math.Max(0, level - 1);

            float result = baseValue + growthLevel * growthPerLevel;
            return Sanitize(result, min: 0f);
        }
    }
}
