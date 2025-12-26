using System;
using System.Collections.Generic;
using UnityEngine;
using GIGISTUDIO.Stats;

namespace GIGISTUDIO.Data
{
    [CreateAssetMenu(menuName = "QuestIsland/Stat Preset Repository")]
    public sealed class StatPresetRepository : ScriptableObject
    {
        [Serializable]
        public sealed class StatPresetEntry
        {
            public string presetId;
            public RawStats stats;
        }

        public List<StatPresetEntry> basePresets = new();
        public List<StatPresetEntry> growthPresets = new();

        private Dictionary<string, RawStats> _baseMap;
        private Dictionary<string, RawStats> _growthMap;

        private void OnEnable()
        {
            _baseMap = BuildMap(basePresets);
            _growthMap = BuildMap(growthPresets);
        }

        private static Dictionary<string, RawStats> BuildMap(List<StatPresetEntry> list)
        {
            var map = new Dictionary<string, RawStats>(StringComparer.Ordinal);
            foreach (var e in list)
            {
                if (string.IsNullOrWhiteSpace(e.presetId) || e.stats == null) continue;
                map[e.presetId.Trim()] = e.stats;
            }
            return map;
        }

        public RawStats GetBase(string presetId) =>
            (!string.IsNullOrWhiteSpace(presetId) && _baseMap.TryGetValue(presetId.Trim(), out var s)) ? s : null;

        public RawStats GetGrowth(string presetId) =>
            (!string.IsNullOrWhiteSpace(presetId) && _growthMap.TryGetValue(presetId.Trim(), out var s)) ? s : null;
    }
}
