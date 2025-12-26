using UnityEngine;
using GIGISTUDIO.Data;
using GIGISTUDIO.Stats;
using GIGISTUDIO.Monsters;

namespace GIGISTUDIO.Runtime
{
    public static class MonsterApplier
    {
        public static void ApplyMonster(StatComponent target, StatPresetRepository repo, MonsterDef monster)
        {
            if (target == null || repo == null || monster == null) return;

            var baseStats = repo.GetBase(monster.basePresetId);
            var growthStats = repo.GetGrowth(monster.growthPresetId);

            if (baseStats == null)
            {
                Debug.LogError($"[MonsterApplier] basePresetId not found: {monster.basePresetId}");
                return;
            }
            if (growthStats == null)
            {
                Debug.LogWarning($"[MonsterApplier] growthPresetId not found: {monster.growthPresetId} (0으로 처리 가능)");
                growthStats = new RawStats();
            }

            target.baseStats = baseStats;
            target.growthStats = growthStats;
            target.SetLevel(Mathf.Max(1, monster.defaultLevel));
        }

        public static void ApplyVariant(StatComponent target, StatPresetRepository repo, MonsterDef baseMonster, MonsterVariantDef variant)
        {
            if (target == null || repo == null || baseMonster == null || variant == null) return;

            // 우선 base monster 적용
            ApplyMonster(target, repo, baseMonster);

            // overrides 덮어쓰기
            var o = variant.overrides;
            if (!string.IsNullOrWhiteSpace(o.basePresetId))
            {
                var s = repo.GetBase(o.basePresetId);
                if (s != null) target.baseStats = s;
                else Debug.LogError($"[MonsterApplier] variant basePresetId not found: {o.basePresetId}");
            }

            if (!string.IsNullOrWhiteSpace(o.growthPresetId))
            {
                var s = repo.GetGrowth(o.growthPresetId);
                target.growthStats = s ?? new RawStats();
                if (s == null) Debug.LogWarning($"[MonsterApplier] variant growthPresetId not found: {o.growthPresetId}");
            }

            if (o.defaultLevel.HasValue)
                target.SetLevel(Mathf.Max(1, o.defaultLevel.Value));

            // 마지막으로 최종 재계산
            target.Rebuild();
        }
    }
}
