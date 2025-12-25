# CombatStats 계산 가이드
## Level 정책 (중요)
- **레벨은 1부터 시작**한다고 가정합니다.
- 성장치 적용은 **(level - 1)** 을 기준으로 합니다.
  - 예: `final = base + (level - 1) × growth`
  - 따라서 **레벨 1 = base** 입니다.


이 문서는 테스트 페이지에서 사용하는 전투 관련 수식을 정의합니다. 모든 값은 0 이하가 되지 않도록 클램프하여 계산 안전성을 확보합니다.

## 최종 스텟 산출
- 입력: 베이스 스텟(`base`)과 성장 스텟(`growth`), 그리고 `level`.
- 계산: `final = base + ((level - 1) × growth)`
  - 성장 스텟이 존재하지 않는 경우에는 0으로 간주합니다.
  - `level`은 0 미만으로 내려가지 않도록 0 이상으로 제한합니다.

## 피해 계산
- 기대 타격 피해(치명 기대값 포함):
  - `critChanceClamped = clamp(critChance, critChanceMin, critChanceMax)`
  - `critDamageClamped = max(critDamage, critDamageMin)`
  - `expectedHit = AD × (1 + critChanceClamped / 100 × (critDamageClamped - 1))`
- 방어력 감쇠 계수(물리 피해):
  - `mitigation = armorMitigationBase / (armorMitigationDivisor + max(armor, 0))`
- 초당 입히는 피해(DPS):
  - `dps = expectedHit × mitigation × max(AS, attackSpeedMin)`

### 기본 상수(페이지에서 수정 가능)
- `critChanceMin = 0`
- `critChanceMax = 100`
- `critDamageMin = 1`
- `armorMitigationBase = 100`
- `armorMitigationDivisor = 100`
- `attackSpeedMin = 0`

## 주의 사항
- 모든 필드가 숫자가 아닐 경우 0으로 변환합니다.
- 로컬스토리지나 입력값에 음수 혹은 숫자가 아닌 값이 들어와도 0 이상으로 보정해 계산합니다.
- 계산은 물리 피해 기준이며, MR/AP에 따른 별도 보정은 포함하지 않았습니다.
- 공격속도(`AS`)가 0이거나 그 이하이면 DPS는 0이 됩니다.

## DamageType별 Mitigation (권장 확장)
- Physical: `armorMitigation = base / (divisor + armor)`
- Magic: `mrMitigation = base / (divisor + mr)`
- True: `mitigation = 1`

> 스킬/이펙트의 `damageType`이 Magic/True일 경우 위 규칙을 적용하도록 전투 파이프라인을 확장하는 것을 권장합니다.
