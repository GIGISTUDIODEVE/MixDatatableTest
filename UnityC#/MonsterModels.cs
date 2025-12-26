using System;
using System.Collections.Generic;

namespace GIGISTUDIO.Monsters
{

    [Serializable]
    public sealed class MonsterDef
    {
        public string monsterId;
        public string displayName;

        public string basePresetId;
        public string growthPresetId;
        public int defaultLevel = 1;

        public List<string> tags = new List<string>();

        // 확장 필드(loot, ai 등)는 나중에 추가 가능
    }

    [Serializable]
    public sealed class MonsterVariantDef
    {
        public string variantId;
        public string monsterId;
        public string displayName;

        public VariantOverrides overrides = new VariantOverrides();
        public List<string> tags = new List<string>();

        [Serializable]
        public sealed class VariantOverrides
        {
            public string basePresetId;
            public string growthPresetId;
            public int? defaultLevel;
        }
    }
}
