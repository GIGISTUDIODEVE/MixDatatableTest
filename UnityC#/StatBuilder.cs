using System;
using UnityEngine;

namespace GIGISTUDIO.Stats
{
    public static class StatBuilder
    {
        private static readonly StatType[] All = (StatType[])Enum.GetValues(typeof(StatType));

        public static StatBlock BuildFinal(RawStats baseStats, RawStats growthStats, int level)
        {
            if (baseStats == null) throw new ArgumentNullException(nameof(baseStats));
            if (growthStats == null) growthStats = new RawStats(); // 없으면 0으로 간주

            var block = new StatBlock();

            for (int i = 0; i < All.Length; i++)
            {
                var type = All[i];
                float b = baseStats.Get(type);
                float g = growthStats.Get(type);
                float final = StatMath.ApplyGrowth(b, g, level);

                // 일부 스탯은 최소값 정책을 다르게 줄 수도 있음 (예: critDamage 최소 1)
                if (type == StatType.CritDamage)
                    final = Mathf.Max(final, 1f);

                block.Set(type, final);
            }

            return block;
        }
    }
}
