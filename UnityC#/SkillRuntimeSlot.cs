using GIGISTUDIO.Skills;

namespace GIGISTUDIO.Skills
{
    /// <summary>
    /// 스킬 1칸의 런타임 상태
    /// </summary>
    public sealed class SkillRuntimeSlot
    {
        public SkillSpec spec;
        public int rank = 1;

        public SkillState state = SkillState.Ready;

        public float cooldownRemaining = 0f;

        public bool IsReady => state == SkillState.Ready;
    }
}
