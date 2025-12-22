# CombatStats 계산 가이드

이 문서는 테스트 페이지에서 사용하는 전투 관련 수식을 정의합니다. 모든 값은 0 이하가 되지 않도록 클램프하여 계산 안전성을 확보합니다.

## 최종 스텟 산출
- 입력: 베이스 스텟(`base`)과 성장 스텟(`growth`), 그리고 `level`.
- 계산: `final = base + (level × growth)`
  - 성장 스텟이 존재하지 않는 경우에는 0으로 간주합니다.
  - `level`은 0 미만으로 내려가지 않도록 0 이상으로 제한합니다.

## 피해 계산
- 기대 타격 피해(치명 기대값 포함):
  - `critChanceClamped = clamp(critChance, 0, 100)`
  - `critDamageClamped = max(critDamage, 1)`
  - `expectedHit = AD × (1 + critChanceClamped / 100 × (critDamageClamped - 1))`
- 방어력 감쇠 계수(물리 피해):
  - `mitigation = 100 / (100 + max(armor, 0))`
- 초당 입히는 피해(DPS):
  - `dps = expectedHit × mitigation × AS`

## 주의 사항
- 모든 필드가 숫자가 아닐 경우 0으로 변환합니다.
- 계산은 물리 피해 기준이며, MR/AP에 따른 별도 보정은 포함하지 않았습니다.
- 공격속도(`AS`)가 0이거나 그 이하이면 DPS는 0이 됩니다.
