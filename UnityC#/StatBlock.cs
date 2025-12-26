using System;
using System.Collections.Generic;
using UnityEngine;

namespace GIGISTUDIO.Stats
{
    /// <summary>
    /// "최종 스탯" 컨테이너.
    /// - NaN/Infinity/음수 방지
    /// - 딕셔너리 기반이라 스탯 확장 쉬움
    /// </summary>
    [Serializable]
    public sealed class StatBlock
    {
        [SerializeField] private List<StatEntry> entries = new();

        private Dictionary<StatType, float> _map;

        [Serializable]
        private struct StatEntry
        {
            public StatType type;
            public float value;
        }

        private void EnsureMap()
        {
            if (_map != null) return;
            _map = new Dictionary<StatType, float>(entries.Count);
            for (int i = 0; i < entries.Count; i++)
                _map[entries[i].type] = entries[i].value;
        }

        public float Get(StatType type, float defaultValue = 0f)
        {
            EnsureMap();
            return _map.TryGetValue(type, out var v) ? v : defaultValue;
        }

        public void Set(StatType type, float value)
        {
            EnsureMap();
            value = StatMath.Sanitize(value, min: 0f); // 기본 정책: 음수 방지
            _map[type] = value;

            // Serialize-friendly 리스트에도 반영
            for (int i = 0; i < entries.Count; i++)
            {
                if (entries[i].type != type) continue;
                entries[i] = new StatEntry { type = type, value = value };
                return;
            }
            entries.Add(new StatEntry { type = type, value = value });
        }

        public void Clear()
        {
            entries.Clear();
            _map?.Clear();
        }

        public override string ToString()
        {
            EnsureMap();
            return $"StatBlock[{_map.Count}]";
        }
    }
}
