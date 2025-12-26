using UnityEngine;

namespace GIGISTUDIO.Stats
{
    /// <summary>
    /// 어떤 유닛(플레이어/몬스터/소환물)이든 붙일 수 있는 스탯 컴포넌트.
    /// base/growth/level이 바뀌면 Final을 재생성.
    /// </summary>
    public sealed class StatComponent : MonoBehaviour
    {
        [Header("Inputs")]
        public RawStats baseStats;
        public RawStats growthStats;

        [Min(1)]
        public int level = 1;

        [Header("Output (read-only)")]
        [SerializeField] private StatBlock finalStats;

        public StatBlock Final => finalStats;

        private int _cachedLevel;

        private void Awake()
        {
            Rebuild();
        }

        private void Update()
        {
            // 아주 단순한 MVP: 레벨만 감시
            if (level != _cachedLevel)
                Rebuild();
        }

        public void SetLevel(int newLevel)
        {
            level = Mathf.Max(1, newLevel);
            Rebuild();
        }

        public void Rebuild()
        {
            if (baseStats == null)
            {
                Debug.LogError($"[{name}] baseStats가 비어있습니다. (레벨 1의 기준값이 필요)");
                return;
            }

            finalStats = StatBuilder.BuildFinal(baseStats, growthStats, level);
            _cachedLevel = level;

            // 디버그 확인(원하면 제거)
            Debug.Log($"[{name}] Final rebuilt @Lv{level} | HP={finalStats.Get(StatType.Hp)} AD={finalStats.Get(StatType.Ad)}");
        }
    }
}
