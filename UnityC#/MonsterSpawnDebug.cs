using UnityEngine;
using GIGISTUDIO.Data;
using GIGISTUDIO.Monsters;
using GIGISTUDIO.Runtime;
using GIGISTUDIO.Stats;

namespace QuestIsland.Monster
{
    public sealed class MonsterSpawnDebug : MonoBehaviour
    {
        public StatPresetRepository presetRepo;

        public StatComponent spawned; // 몬스터 프리팹에 StatComponent 붙여두고 연결

        [Header("Test Data (임시)")]
        public MonsterDef monster;
        public MonsterVariantDef variant;

        [ContextMenu("Spawn Base Monster")]
        public void SpawnBase()
        {
            if (spawned == null || presetRepo == null || monster == null) return;
            MonsterApplier.ApplyMonster(spawned, presetRepo, monster);
            Debug.Log($"[MonsterSpawnDebug] Spawned Monster: {monster.monsterId} Lv{spawned.level}");
        }

        [ContextMenu("Spawn Variant")]
        public void SpawnVariant()
        {
            if (spawned == null || presetRepo == null || monster == null || variant == null) return;
            MonsterApplier.ApplyVariant(spawned, presetRepo, monster, variant);
            Debug.Log($"[MonsterSpawnDebug] Spawned Variant: {variant.variantId} Lv{spawned.level}");
        }
    }
}