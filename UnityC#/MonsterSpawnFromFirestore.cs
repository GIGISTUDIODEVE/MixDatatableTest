using System;
using System.Linq;
using System.Threading.Tasks;
using UnityEngine;
using GIGISTUDIO.Monsters;
using GIGISTUDIO.Runtime;
using GIGISTUDIO.Stats;

namespace GIGISTUDIO.Data
{
    public sealed class MonsterSpawnFromFirestore : MonoBehaviour
    {
        [Header("Deps")]
        public GIGISTUDIO.Data.StatPresetRepository presetRepo;
        public StatComponent spawned; // 몬스터 프리팹에 붙은 StatComponent

        [Header("Firestore")]
        public float cacheTtlSeconds = 30f;

        [Header("Selection")]
        public string monsterId;
        public string variantId; // 비면 base monster로 스폰

        private IMonsterRepository _repo;

        private void Awake()
        {
            _repo = new FirestoreMonsterRepository(TimeSpan.FromSeconds(Mathf.Max(1f, cacheTtlSeconds)));
        }

        [ContextMenu("Spawn Selected (Async)")]
        public async void SpawnSelected()
        {
            if (spawned == null || presetRepo == null)
            {
                Debug.LogWarning("spawned/presetRepo가 비었습니다.");
                return;
            }

            try
            {
                // 1) monster 로드
                var m = await _repo.GetMonsterByIdAsync(monsterId);
                if (m == null)
                {
                    Debug.LogError($"Monster not found: {monsterId}");
                    return;
                }

                // 2) variant가 있으면 overrides 적용
                if (!string.IsNullOrWhiteSpace(variantId))
                {
                    var v = await _repo.GetVariantByIdAsync(variantId);
                    if (v == null)
                    {
                        Debug.LogError($"Variant not found: {variantId}");
                        return;
                    }

                    MonsterApplier.ApplyVariant(spawned, presetRepo, m, v);
                    Debug.Log($"Spawned Variant: {v.variantId} (base={m.monsterId}) Lv{spawned.level}");
                }
                else
                {
                    MonsterApplier.ApplyMonster(spawned, presetRepo, m);
                    Debug.Log($"Spawned Monster: {m.monsterId} Lv{spawned.level}");
                }
            }
            catch (Exception e)
            {
                Debug.LogError(e);
            }
        }
    }
}