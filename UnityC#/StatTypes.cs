using System;

namespace GIGISTUDIO.Stats
{
    // 프로젝트에서 실제로 쓰는 키들을 열거형으로 고정 (확장 가능)
    public enum StatType
    {
        Hp,
        HpRegen,
        Ad,
        Ap,
        AttackSpeed,   // as
        CritChance,    // %
        CritDamage,    // x배
        Armor,
        Mr,
        MoveSpeed,
        Range,
        AbilityHaste,
    }
}
