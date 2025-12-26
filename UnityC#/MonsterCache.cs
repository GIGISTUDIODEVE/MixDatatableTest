using System;
using System.Collections.Generic;
using GIGISTUDIO.Monsters;

namespace GIGISTUDIO.Data
{
    public sealed class MonsterCache
    {
        public DateTime lastMonstersFetchUtc { get; private set; } = DateTime.MinValue;
        public DateTime lastVariantsFetchUtc { get; private set; } = DateTime.MinValue;

        public readonly Dictionary<string, MonsterDef> monstersById = new(StringComparer.Ordinal);
        public readonly Dictionary<string, MonsterVariantDef> variantsById = new(StringComparer.Ordinal);

        public bool HasFreshMonsters(TimeSpan ttl) => (DateTime.UtcNow - lastMonstersFetchUtc) <= ttl && monstersById.Count > 0;
        public bool HasFreshVariants(TimeSpan ttl) => (DateTime.UtcNow - lastVariantsFetchUtc) <= ttl && variantsById.Count > 0;

        public void SetMonsters(IEnumerable<MonsterDef> list)
        {
            monstersById.Clear();
            foreach (var m in list)
            {
                if (m == null || string.IsNullOrWhiteSpace(m.monsterId)) continue;
                monstersById[m.monsterId.Trim()] = m;
            }
            lastMonstersFetchUtc = DateTime.UtcNow;
        }

        public void SetVariants(IEnumerable<MonsterVariantDef> list)
        {
            variantsById.Clear();
            foreach (var v in list)
            {
                if (v == null || string.IsNullOrWhiteSpace(v.variantId)) continue;
                variantsById[v.variantId.Trim()] = v;
            }
            lastVariantsFetchUtc = DateTime.UtcNow;
        }
    }
}
