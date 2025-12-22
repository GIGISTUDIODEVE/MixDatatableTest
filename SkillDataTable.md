# SkillDataTable (LoL-Style) — README

이 문서는 **스탯 기반 스킬 데이터 테이블(SkillDataTable)** 을 **리그 오브 레전드(LoL)** 스타일로 설계한 구조를 정리한 README입니다.  
핵심 목표는 **정적(밸런스/툴팁) 데이터**와 **동적(유저/개체 상태) 데이터**를 분리하고, 스탯(AD/AP/Armor/MR/Ability Haste 등)에 의해
피해/회복/쿨다운이 일관되게 계산되도록 하는 것입니다.

---

## 1. 데이터 컬렉션 구조 (정적/동적 분리)

### 1.1 `skillTypes` (정적 스킬 정의)
- 경로: `skillTypes/{skillId}`
- 용도:
  - 스킬의 “툴팁/밸런스” 정의
  - 랭크별 수치(기본 피해, 실드량, 회복량 등)
  - 대상지정 방식, 사거리, 캐스팅, 미사일 등
  - 계수(AP/AD 등)와 효과 리스트

### 1.2 `skillStates` (동적 상태: 랭크/해금 등)
- 경로 옵션 A (계정 공용 강화): `users/{uid}/skillStates/{skillId}`
- 경로 옵션 B (몬스터/개체 종속): `users/{uid}/monsters/{monsterUid}/skillStates/{skillId}`
- 용도:
  - 스킬 랭크(rank), 해금 여부(unlocked) 등 “개체별 변화”

> 원칙: **정적 = types**, **동적 = user 인스턴스**.

---

## 2. `skillTypes/{skillId}` 스키마 (LoL 스타일)

```json
{
  "skillId": "skill_fireball",
  "nameKey": "SKILL_FIREBALL_NAME",
  "descKey": "SKILL_FIREBALL_DESC",
  "iconKey": "skill_fireball",

  "slotHint": "BASIC|Q|W|E|R",
  "category": "BASIC|SPECIAL",
  "maxRank": 5,

  "targeting": "SELF|ENEMY_SINGLE|ENEMY_AOE|ALLY_SINGLE|ALLY_AOE|GROUND",
  "range": 600,
  "castTime": 0.25,
  "missileSpeed": 1200,
  "canCrit": false,

  "cooldown": { "byRank": [8,7.5,7,6.5,6] },
  "cost": { "type": "mana|energy|hp|none", "byRank": [50,55,60,65,70] },

  "scalings": [
    { "id": "baseDamage", "kind": "LEVEL_TABLE", "byRank": [70,110,150,190,230] },
    { "id": "apRatio", "kind": "AP_RATIO", "value": 0.7 }
  ],

  "effects": [
    {
      "type": "DAMAGE",
      "element": "magic",
      "amount": {
        "op": "ADD",
        "terms": [
          { "ref": "baseDamage" },
          { "op": "MUL", "a": { "ref": "apRatio" }, "b": { "stat": "ap" } }
        ]
      }
    }
  ],

  "rules": {
    "cooldownUsesAbilityHaste": true,
    "damageReductionStyle": "LOL_ARMOR_MR",
    "notes": "밸런스 메모"
  },

  "dataVersion": 1
}
```

### 2.1 필드 설명 (요약)
- `maxRank`: LoL처럼 Q/W/E=5, R=3 등으로 운영 가능
- `cooldown.byRank`: 랭크별 기본 쿨다운
- `cost`: 자원 타입 및 랭크별 소모량(선택)
- `scalings`: 랭크 테이블/계수 정의(툴팁·밸런스 분리)
- `effects`: 실제 효과들(피해/회복/실드/버프/디버프 등)
- `rules`: 계산 규칙 스위치(Ability Haste 적용, 피해감소 방식 등)

---

## 3. 스탯 기반 계산 규칙 (서버/클라 공통)

### 3.1 Ability Haste 기반 쿨다운
- `cdr = abilityHaste / (100 + abilityHaste)`
- `cooldownFinal = cooldownBase * (1 - cdr)`

> LoL 스타일: Ability Haste는 **감소율이 선형이 아니라 분모에 누적**되는 형태로 운용합니다.

### 3.2 방어력/마저 피해 감소 (LoL 스타일)
- 물리: `mult = 100 / (100 + armor')`
- 마법: `mult = 100 / (100 + mr')`
- 적용 순서(권장):
  1) 퍼센트 감소/관통  
  2) 고정 감소/관통  
  3) 0 이하 클램프  

---

## 4. `skillStates` (유저/개체별 스킬 랭크)

### 4-A) 계정 공용 강화형
경로: `users/{uid}/skillStates/{skillId}`

```json
{
  "skillId": "skill_fireball",
  "rank": 3,
  "unlocked": true,
  "lastUpgradedAt": 1730000000
}
```

### 4-B) 몬스터/개체 종속형 (LoL처럼 “챔피언별 스킬 레벨”)
경로: `users/{uid}/monsters/{monsterUid}/skillStates/{skillId}`

```json
{
  "skillId": "skill_fireball",
  "rank": 2,
  "unlocked": true
}
```

> 권장: **skillTypes에는 정의만**, **skillStates에는 레벨만** 저장.

---

## 5. 몬스터 스킬 슬롯(4개) 연결 규칙 (권장)

- 슬롯 규칙: `0 = 기본 공격`, `1~3 = 특수 스킬`
- 연결은 몬스터 타입(정적)에 “스킬 ID 참조”만 둡니다.

예시: `monsterTypes/{monsterTypeId}`

```json
{
  "kit": {
    "skills": [
      { "slot": 0, "skillId": "basic_claw" },
      { "slot": 1, "skillId": "skill_fireball" },
      { "slot": 2, "skillId": "skill_shield" },
      { "slot": 3, "skillId": "skill_ult_meteor" }
    ]
  }
}
```

---

## 6. 데이터 검증 규칙 (필수)

아래 검증은 운영 중 데이터 사고를 크게 줄여줍니다.

- `maxRank >= 1`
- `cooldown.byRank.length == maxRank`
- `cost.byRank.length == maxRank` (cost가 있을 때)
- `effects` 배열 길이 `>= 1`
- 확률(치명타 확률 등)은 `0~1`로 클램프
- `rank`는 `1..maxRank` 범위 (unlocked=false면 0 허용 등 정책화)

---

## 7. 빠른 시작 체크리스트

1) `skillTypes`에 스킬 정의 추가  
2) 몬스터 타입의 `kit.skills`에 skillId 연결  
3) 유저/몬스터 인스턴스에 `skillStates` 생성 (rank/unlocked)  
4) 스탯 계산(Ability Haste, Armor/MR)을 공통 유틸로 구현  
5) 서버 authoritative + 클라 예측(가능하면 같은 수식/테이블 사용)

---

## 8. 다음 확장 (선택)

- **효과 DSL 고도화**: 조건부/타깃 필터/중첩 룰/스택
- **툴팁 자동 생성**: `(+0.7 AP)` 같은 표기를 `scalings` 기반으로 자동 렌더링
- **밸런스 버전 관리**: `dataVersion` + 마이그레이션 스크립트
