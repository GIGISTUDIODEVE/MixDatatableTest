# Unified Skill–Ability–Effect Specification (Global, Slotless, LoL-capable)

본 문서는 **Skill > Ability > Effect** 구조를 기반으로  
챔피언, 아이템, 패시브 시스템, 오브젝트 등  
**스킬을 가질 수 있는 모든 주체가 공통으로 사용하는 단일 스펙**이다.

- Q/W/E/R 같은 **슬롯 개념은 제거**
- 일반공격 / 패시브 / 액티브 / 유틸리티 모두 동일 구조
- 리그 오브 레전드 수준의 스킬 + 아이템 구현을 목표로 함
- 구조 확장은 최소, 규칙은 명확하게 정의

---

## 1. Core Structure

```
Skill
 ├─ Ability (1..N)
 │   └─ Effect (1..N)
```

### 책임 분리

| 계층 | 책임 |
|---|---|
| Skill | 의미 단위, 랭크/쿨/코스트, 밸런스 수치, Ability 선택 |
| Ability | 실행 방식, 전달(Delivery), Effect 묶음 |
| Effect | 실제 게임 변화 (피해, 버프, 이동, 소환 등) |

---

## 2. Skill Category (의미 구분용)

```json
"skillCategory": "BasicAttack | Passive | Active | Utility"
```

> 구조적 차이는 없으며, **의미/정책 분리용 태그**이다.

### Category 의미
- **BasicAttack**: 자동 공격, OnAttack/OnHit 기반
- **Passive**: 직접 시전 불가, 이벤트 기반 발동
- **Active**: 명시적 입력으로 발동
- **Utility**: 이동/보호/시야/제어 중심 스킬

---

## 3. Skill Specification

### 3.1 Role
- 하나의 의미적 스킬 단위
- 쿨다운, 코스트, 랭크 규칙의 소유자
- 어떤 Ability를 실행할지 결정

### 3.2 Skill Schema

```json
{
  "skillId": "Skill_FireBolt",
  "skillCategory": "Active",

  "rankRules": {
    "maxRank": 5,
    "cooldownByRank": [8,7,6,5,4],
    "costByRank": [50,55,60,65,70]
  },

  "baseStats": {
    "damage": [80,120,160,200,240],
    "apRatio": 0.6
  },

  "abilities": [
    {
      "abilityId": "Skill_FireBolt_Default",
      "key": "Default",
      "priority": 0
    },
    {
      "abilityId": "Skill_FireBolt_Empowered",
      "key": "Empowered",
      "priority": 1,
      "selectConditions": ["HasEmpoweredState"]
    }
  ]
}
```

### 3.3 Rules
- Skill은 **슬롯을 모른다**
- Skill은 아이템/캐릭터/오브젝트 어디에도 부착 가능
- 쿨다운 공유는 Skill 단위

---

## 4. Ability Specification

### 4.1 Role
- Skill 내부의 **실행 버전**
- 재시전, 강화, 조건부 분기 표현

### 4.2 Ability Schema

```json
{
  "abilityId": "Skill_FireBolt_Default",
  "key": "Default",

  "castSpec": {
    "castTime": 0.25,
    "canMove": false,
    "isChanneling": false
  },

  "deliverySpec": {
    "type": "Projectile",
    "range": 650,
    "speed": 1200,
    "collision": "FirstHit"
  },

  "paramBindings": {
    "damage": { "ref": "damage" },
    "ratio": { "ref": "apRatio" }
  },

  "effects": [
    "Effect_FireBolt_Damage"
  ]
}
```

### 4.3 Rules
- Ability는 쿨다운/코스트를 갖지 않는다
- 입력/조작/전달 방식만 정의
- 상태에 따라 자유롭게 교체 가능

---

## 5. Effect Specification

### 5.1 Role
- 가장 작은 실행 단위
- “언제 → 누구에게 → 무엇을”

### 5.2 Effect Schema

```json
{
  "effectId": "Effect_FireBolt_Damage",
  "type": "Damage",

  "trigger": "OnHit",

  "selector": {
    "selectorType": "HitTarget",
    "team": "Enemy"
  },

  "calc": {
    "flat": { "ref": "damage", "byRank": true },
    "ratios": {
      "ap": { "ref": "ratio" }
    }
  },

  "apply": {
    "damageType": "Magic",
    "damageStage": "PostMitigation"
  }
}
```

---

## 6. Required Advanced Features (LoL-capable)

### 6.1 Proc / Internal Cooldown

```json
"procRules": {
  "cooldown": 10,
  "chance": 1.0,
  "maxPerTrigger": 1
}
```

- 패시브, 아이템 고유 효과 구현 필수

---

### 6.2 Stacking Rules

```json
"stacking": {
  "maxStacks": 5,
  "stackPolicy": "Add | Refresh",
  "expirePolicy": "RefreshDuration | Independent"
}
```

---

### 6.3 Unique Rules (아이템 고유 효과)

```json
"unique": {
  "groupId": "Spellblade",
  "policy": "HighestOnly | Replace | Block"
}
```

---

### 6.4 Damage / Modifier Pipeline

```json
"damageStage": "PreMitigation | PostMitigation | Final"
```

- 온힛, 증폭, 감소, 전환 처리 가능

---

### 6.5 CC / Dispel Rules

```json
"cc": {
  "ccType": "Stun | Root | Slow | Knockup",
  "isCleanseable": true
}
```

---

### 6.6 Aura / Area 지속 효과

- selectorType: Area
- trigger: OnEnter / OnExit / OnTick
- timing.tickInterval 사용

---

### 6.7 Source Attribution

```json
"source": {
  "sourceType": "Skill | Item | Summon | Environment",
  "sourceId": "Item_Sheen"
}
```

- 킬 크레딧, 로그, 상호작용에 필수

---

## 7. Value Reference Rules

모든 수치는 다음 형태 허용:

```json
100
{ "ref": "damage" }
{ "ref": "damage", "byRank": true }
```

### Resolution Order
1. Ability.paramBindings  
2. Skill.baseStats  
3. Runtime context (caster stats)

---

## 8. Design Guarantees

- 하나의 스펙으로 **챔피언 / 아이템 / 패시브 / 오브젝트** 모두 처리
- 데이터 중심 설계
- LoL 수준의 복잡도 대응 가능
- 구조 확장 없이 규칙 확장만으로 대응

---

## 9. Final Summary

이 문서는:
- 슬롯 없는 범용 스킬 시스템
- Skill–Ability–Effect의 명확한 책임 분리
- LoL 스킬/아이템 설계의 대부분을 커버

을 목표로 한다.
