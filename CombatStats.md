# CombatStats.md

# Combat Stats & Damage Formula Reference

이 문서는 다음을 목표로 한다.

- 전투 수치의 의미를 명확히 정의
- 데미지 계산의 수학적 일관성 보장
- 클라이언트 / 서버 / 기획 공통 기준 제공
- 공식과 계산 순서를 명시적으로 문서화

---

## 1. 스탯 정의 (Stat Definitions)

### 1.1 공격 스탯 (Offensive Stats)

| 스탯 | 설명 |
|---|---|
| Physical Attack | 물리 피해를 발생시키는 공격 스탯 |
| Magic Attack | 마법 피해를 발생시키는 공격 스탯 |
| True Damage | 방어 및 데미지 감소를 무시하는 고정 피해 |

---

### 1.2 방어 스탯 (Defensive Stats)

| 스탯 | 설명 |
|---|---|
| Physical Defense (Armor) | 물리 피해에 대한 방어 수치 |
| Magic Defense (Magic Resistance) | 마법 피해에 대한 방어 수치 |

- 방어 수치는 **0 이상일 수도, 음수일 수도 있음**
- 방어 수치가 음수일 경우 피해량은 증가함

---

### 1.3 데미지 감소 스탯 (Damage Reduction)

| 스탯 | 설명 |
|---|---|
| Physical Damage Reduction | 최종 물리 피해를 비율로 감소 |
| Magic Damage Reduction | 최종 마법 피해를 비율로 감소 |

- 값 범위: `0.0 ~ 1.0`
- 예시: `0.3 = 30% 피해 감소`
- 일반적으로 상한선(Cap) 설정 권장 (예: 80%)

---

## 2. 데미지 계산 철학 (League of Legends 방식)

### 핵심 개념

1. 방어는 피해를 “고정 수치로 차감”하지 않는다
2. 방어는 피해에 곱해지는 “배율”을 만든다
3. 방어 수치가 증가할수록 피해 감소 효율은 점점 완만해진다
4. 방어 수치가 음수일 경우 피해는 증가한다
5. 데미지 감소(Damage Reduction)는 방어 계산 이후 적용된다
6. True Damage는 모든 계산을 무시하고 그대로 적용된다

---

## 3. 방어 수치 → 데미지 배율 공식 (핵심 공식)

### 3.1 방어 수치가 0 이상일 경우
Damage Multiplier = 100 / (100 + Defense)
- Defense가 증가할수록 배율은 0에 가까워짐
- 피해 감소는 곡선 형태로 완만해짐

예시:
- Defense = 50  → 100 / 150 ≈ 0.6667
- Defense = 100 → 100 / 200 = 0.5

---

### 3.2 방어 수치가 음수일 경우
Damage Multiplier = 2 - (100 / (100 - Defense))
- Defense가 음수일수록 피해량 증가
- 단순 선형 증가가 아닌 LoL 고유의 곡선 유지

예시:
- Defense = -20 → 약 1.17배 피해
- Defense = -50 → 약 1.33배 피해

---

## 4. 물리 데미지 계산 공식 (Physical Damage Formula)

### 계산 절차

1. 기본 물리 피해량 계산 (공격력, 스킬 계수 반영)
2. Armor로 데미지 배율 계산
3. Armor 배율 적용
4. Physical Damage Reduction 적용
5. 최종 피해량 확정

### 최종 공식
Final Physical Damage = Physical Damage × Armor Multiplier × (1 - Physical Damage Reduction)
---

## 5. 마법 데미지 계산 공식 (Magic Damage Formula)

마법 데미지는 물리 데미지와 동일한 구조를 가지며  
Armor 대신 Magic Resistance를 사용한다.
Final Magic Damage = Magic Damage × Magic Resistance Multiplier × (1 - Magic Damage Reduction)
---

## 6. True Damage 계산 공식
Final True Damage = True Damage
### True Damage 특성

- Armor 무시
- Magic Resistance 무시
- Damage Reduction 무시
- 별도의 배율 계산 없이 그대로 적용

---

## 7. 전체 데미지 계산 순서 (공식 순서)

1. 피해 타입 결정 (Physical / Magic / True)
2. 기본 피해량 계산
3. 공격 스탯 반영
4. 방어 수치 → 데미지 배율 계산
5. 데미지 감소(Damage Reduction) 적용
6. True Damage 별도 적용
7. 최종 피해량 확정 (최소값 0)

---

## 8. 계산 예시 (Worked Examples)

### 8.1 물리 피해 예시

- Physical Damage: 200  
- Armor: 50  
- Physical Damage Reduction: 20%
Armor Multiplier = 100 / (100 + 50) = 0.6667 After Defense = 200 × 0.6667 ≈ 133.34 Final Damage = 133.34 × (1 - 0.2) ≈ 106.67
---

### 8.2 마법 피해 예시 (음수 저항)

- Magic Damage: 150  
- Magic Resistance: -30  
- Magic Damage Reduction: 0%
Multiplier = 2 - (100 / (100 - (-30))) ≈ 1.23 Final Damage ≈ 184.6
---

## 9. 설계 권장 사항

- Damage Reduction에는 반드시 상한선(Cap)을 둘 것
- 방어 음수 허용 여부는 밸런스 정책에 따라 결정
- PvP 환경에서는 True Damage 사용을 신중히 제한
- 방어 계산과 데미지 감소는 반드시 서로 다른 레이어로 처리
