### 0.1 AbilitySpec (스킬 정의)
AbilitySpec은 **“하나의 스킬(패시브/액티브/유틸)”을 데이터로 정의**하는 최상위 단위다.  
LoL 방식(기본공격 + Passive | A | U)을 전제로, 실제 동작은 `effects: EffectSpec[]` 조합으로 표현한다.

---

#### 0.1.1 필드 목록
- `abilityId: string`
  - 스킬의 **전역 유니크 ID**
  - 권장 네이밍: `{ChampionId}_{Slot}` 또는 `{ChampionId}_{Slot}{Index}`
    - 예) `Hero01_Passive`, `Hero01_A1`, `Hero01_U`
  - 런타임/로그/리플레이/밸런스툴의 키로 쓰이므로 **변경 비용이 큰 필드**다(초기에 규칙 고정 권장)

- `slot: enum` = Passive | A | U
  - `Passive`: 자동/상시/조건부 발동(버튼 시전 개념이 없거나 약함)
  - `A`: 전투 핵심 액티브(딜/CC/이동 등)
  - `U`: 유틸(방어/보조/시야/세이브/팀플 보조 등)
  - (권장) 기본공격(AA)은 AbilitySpec으로 넣지 않고 별도 `BasicAttackSpec`으로 두는 편이 관리가 쉽다  
    *(원하면 AA도 Ability처럼 다루도록 확장 가능)*

- `rankRules`
  - `maxRank: int`
    - 스킬 랭크(레벨) 최대치
    - 권장:
      - Passive: `1`
      - A/U: `3~5` (프로젝트 룰에 맞게 고정)
  - `cooldownByRank: number[]`
    - **길이 = maxRank** 강제
    - 단위: 초(s)
    - Passive는 보통 `[0]` 권장  
      - “내부 쿨(ICD)”이 필요한 경우 `cooldownByRank`가 아니라 Effect의 `procRules.internalCooldown`로 표현하는 것을 권장
  - `costByRank: number[]`
    - **길이 = maxRank** 강제
    - 단위: 자원 단위(마나/에너지/스태미나 등, 게임 공통 룰로 해석)
    - Passive는 `[0]` 권장
    - “스택 소모/탄약 소모/체력 소모” 같은 특수 비용은
      - (권장) `effects`에 `SpendResource / ConsumeStack` 류 Effect로 모델링하거나,
      - 또는 `costByRank` 해석을 확장(하지만 UI/툴팁/밸런스 툴에서 혼란이 커질 수 있음)

- `effects: EffectSpec[]`
  - 이 Ability를 구성하는 Effect들의 목록
  - 하나의 버튼 스킬이라도 여러 Effect로 쪼갠다(권장)
    - 예) “피해 + 둔화”, “보호막 + 이속”, “투사체 발사 + 명중 시 폭발 + 장판 생성”
  - Effect의 발동/대상/계산/적용은 각각 `trigger/targeting/calc/apply`로 분리되어 있으므로,
    AbilitySpec은 **Effect를 조립/순서화**하는 역할이다.

- (선택) `deliverySpec`
  - Projectile/Zone/Beam/Instant 등 “전달 방식”을 Ability 레벨에서 선언
  - **별도 문서로 분리 가능** (추천)
  - 설계 원칙:
    - Ability가 “무엇을 쏘고/깔고/즉발하느냐”는 상위 개념은 `deliverySpec`
    - “맞았을 때 무엇이 일어나느냐”는 `effects`로 구성

---

#### 0.1.2 작성 규칙(Validation / Lint)
AbilitySpec 작성 시 아래 규칙을 **툴/빌드 단계에서 검증**하는 것을 권장한다.

- `abilityId`
  - 빈 문자열 금지
  - 프로젝트 전체에서 유일해야 함
- `slot`
  - `Passive | A | U` 외 값 금지
- `rankRules.maxRank`
  - 1 이상
- `cooldownByRank`, `costByRank`
  - 배열 길이 = `maxRank`
  - 음수 금지
- `effects`
  - 비어있을 수 있음(예: “전달 스펙만 정의하고 실제 효과는 다른 시스템에서 주입” 같은 특수 케이스)  
    하지만 기본 정책은 **최소 1개 이상**을 권장
  - `effectId` 중복 금지(Ability 내부에서)
- (선택) `deliverySpec`
  - `deliverySpec.type`에 따라 필요한 필드(예: projectileSpeed, radius 등) 누락 금지

---

#### 0.1.3 운영 규칙(LoL 방식 권장 정책)
- Passive
  - “항상 켜짐”이면 `triggerType=OnTick` 또는 상태 부여형(ApplyStatus) 조합으로 표현
  - “기본공격 적중 시 발동”이면 `triggerType=OnHit` 기반 Effect로 표현
  - 내부 쿨/발동 제한은 `procRules` 또는 `conditions`로 관리(쿨다운 배열로 억지로 표현하지 않기)
- A / U
  - 쿨다운/코스트는 `rankRules`로 통일(툴팁/밸런스/플레이어 가시성)
  - 사거리/범위/투사체 등 “사용감” 파라미터는 `deliverySpec`로 통일(가능하면)

---

#### 0.1.4 예시: Passive | A | U (스켈레톤)
아래 예시는 “EffectSpec 상세는 뒤 섹션(0.2~)을 따른다”는 전제에서 **Ability 레벨 구조**만 보여준다.

```json
{
  "abilityId": "Hero01_Passive",
  "slot": "Passive",
  "rankRules": {
    "maxRank": 1,
    "cooldownByRank": [0],
    "costByRank": [0]
  },
  "effects": [
    { "effectId": "P_OnHitBonus", "type": "Damage", "trigger": { "triggerType": "OnHit" } }
  ]
}
```

```json
{
  "abilityId": "Hero01_A1",
  "slot": "A",
  "rankRules": {
    "maxRank": 5,
    "cooldownByRank": [8, 7.5, 7, 6.5, 6],
    "costByRank": [60, 65, 70, 75, 80]
  },
  "effects": [
    { "effectId": "A1_Damage", "type": "Damage", "trigger": { "triggerType": "OnCastCommit" } },
    { "effectId": "A1_Slow", "type": "ApplyStatus", "trigger": { "triggerType": "OnCastCommit" } }
  ],
  "deliverySpec": {
    "type": "InstantSingleTarget",
    "range": 650
  }
}
```

```json
{
  "abilityId": "Hero01_U",
  "slot": "U",
  "rankRules": {
    "maxRank": 3,
    "cooldownByRank": [18, 16, 14],
    "costByRank": [80, 90, 100]
  },
  "effects": [
    { "effectId": "U_Shield", "type": "Shield", "trigger": { "triggerType": "OnCastCommit" } },
    { "effectId": "U_MoveSpeed", "type": "ApplyStatus", "trigger": { "triggerType": "OnCastCommit" } }
  ],
  "deliverySpec": {
    "type": "InstantAoE",
    "radius": 450,
    "centerRef": "CasterPos"
  }
}
```

---

#### 0.1.5 (선택) DeliverySpec 최소 인터페이스(요약)
DeliverySpec을 이 문서에서 최소 형태로만 요약하면 아래처럼 둘 수 있다.  
*(정식 정의는 별도 문서로 확장 권장)*

- `deliverySpec.type: enum`
  - `InstantSingleTarget`
  - `InstantAoE`
  - `Projectile`
  - `Zone`
  - `Beam` (선택)
- 공통(권장)
  - `range?: number`
  - `radius?: number`
  - `centerRef?: enum` = CasterPos | TargetPos | CursorPos | ProjectilePos
- Projectile 전용(권장)
  - `projectileSpeed?: number`
  - `maxDistance?: number`
  - `collisionRule?: enum` = FirstHit | Pierce | StopOnWall
- Zone 전용(권장)
  - `duration?: number`
  - `tickInterval?: number`
