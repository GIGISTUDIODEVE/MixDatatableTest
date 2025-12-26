using System;
using System.Collections.Generic;

namespace GIGISTUDIO.Skills
{
    public enum SkillCategory
    {
        Active,
        Passive
    }

    [Serializable]
    public sealed class SkillSpec
    {
        public string skillId;
        public SkillCategory category = SkillCategory.Active;

        public int maxRank = 1;
        public List<float> cooldownByRank = new();
        public List<float> costByRank = new();

        // Ability º±≈√
        public List<SkillAbilityEntry> abilities = new();

        [Serializable]
        public sealed class SkillAbilityEntry
        {
            public string abilityId;
            public string key = "Default";
            public int priority = 0;
        }
    }
}
