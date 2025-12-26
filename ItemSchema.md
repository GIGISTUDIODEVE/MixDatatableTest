# Item Schema Specification (LoL-style + itemType 분기 + 강화)

이 문서는 **LoL 아이템 구조(조합 트리 + 스탯/효과)** 를 기본으로 하되, 일반적인 게임 아이템(소모/퀘스트/재료 등)까지 **단일 items 컬렉션**에서 운영할 수 있도록
`itemType`으로 분기하는 **타입 기반 스키마**를 정의합니다.

핵심 요구사항
- `itemType`으로 분기 + **공통 필드 유지**
- **티어 무한 확장**: `tierNumber`(정수) + `tierKey`(문자열)
- **조합 비용 다중 재화**: map `{ currencyKey: amount }`
- 장비(Equipment)는 LoL처럼 `buildsFrom/buildsInto`, `stats`, `effects`, `enhancement` 지원
- 소모품(Consumable), 퀘스트(Quest), 재료(Material), 키아이템(Key) 등은 타입별 블록으로 최소 필드만 유지

---

## Collections
- `items` (모든 아이템 템플릿)
- `itemTiers` (권장: 티어 무한 확장 관리)
- `currencies` (권장: 재화 키 중앙 관리)
- (선택) `enhancementProfiles` (강화 규칙 재사용 시)
- (선택) `recipes` (제작/합성 시스템을 별도로 둘 경우)

---

## 1) 공통 필드 (모든 itemType 공통)

`items/{itemId}` 문서는 아래 공통 필드를 항상 가질 수 있습니다.

### Common fields
- `id` (string): 외부/이관용 고정 id
- `slug` (string): 사람이 읽기 쉬운 key
- `name` (string)
- `itemType` (string): 아이템 타입
  - 권장 값: `"equipment" | "consumable" | "quest" | "material" | "key_item" | "currency_item"`
- `tierNumber` (number, 선택): 무한 확장 티어 정렬/필터링용
- `tierKey` (string, 선택): 무한 확장 티어 식별자
- `rarityKey` (string, 선택): `common/rare/epic/legendary/...`
- `tags` (array<string>, 선택): 분류/검색용 (`damage`, `healing`, `quest`, `crafting` 등)
- `stack` (object, 선택): 인벤토리 중첩 규칙
  - `stackable` (boolean)
  - `maxStack` (number)
- `shop` (object, 선택): 상점 규칙
  - `purchasable` (boolean)
  - `sellable` (boolean)
  - `sellValue` (map<string, number>, 선택): 판매 시 획득 재화(다중 재화 가능)
- `requirements` (object, 선택): 구매/사용/장착 조건
  - `levelMin` (number, 선택)
  - `uniqueGroupKey` (string, 선택): 고유 중복 제한 그룹(LoL UNIQUE 유사)
- `icon` (object, 선택)
- `metadata` (object, 선택): version, timestamps 등

> 원칙: **공통 필드는 얕게**, 타입별 기능은 **타입 블록**에 넣습니다.

---

## 2) itemType별 타입 블록

### 2.1 equipment (장비 아이템)
장비는 LoL 구조를 그대로 유지합니다.

#### equipment 블록 권장 필드
- `equipment.build` (object): 조합 트리 + 다중 재화 비용
- `equipment.stats` (object): 스탯
- `equipment.effects` (object): passives/actives
- `equipment.enhancement` (object, 선택): 강화

---

### 2.2 consumable (소모 아이템)
소모품은 “사용(onUse)”이 핵심입니다. **효과 실행 엔진을 공유**하려면 `effects` 구조를 재사용하는 것이 운영에 유리합니다.

#### consumable 블록 권장 필드
- `consumable.consumeOnUse` (boolean, 기본 true)
- `consumable.charges` (object, 선택): 충전형 소모품
  - `maxCharges` (number)
  - `startCharges` (number)
- `consumable.cooldownSeconds` (number, 선택)
- `consumable.useConditions` (object, 선택): 사용 가능 조건(게임 룰에 맞게 확장)
  - 예: `{ "combatOnly": true }`, `{ "hpBelowRatio": 0.5 }`
- `consumable.onUseEffects` (array<object>): 사용 시 발동 효과 목록
  - 내부적으로 `effects`와 동일한 포맷을 쓰거나, `effectKey + params` 형태로 참조하도록 통일

---

### 2.3 quest (퀘스트 아이템)
퀘스트 아이템은 전투 수치보다 “퀘스트 상태와의 연결”이 핵심입니다.

#### quest 블록 권장 필드
- `quest.bindQuestIds` (array<string>, 선택): 관련 퀘스트/단계 id
- `quest.unique` (boolean, 선택): 중복 보유 제한
- `quest.consumeOnTurnIn` (boolean, 선택): 반납/완료 시 소모 여부
- `quest.obtainRules` (object, 선택): 획득 규칙(드랍/지급 조건 등)

> 권장 운영: `shop.purchasable=false`, `shop.sellable=false` 기본.

---

### 2.4 material (재료 아이템)
제작/합성/강화 재료 등 “시스템 입력값”으로 쓰이는 아이템입니다.

#### material 블록 권장 필드
- `material.gradeKey` (string, 선택): `common/rare/epic/...`
- `material.sourceTags` (array<string>, 선택): 드랍처/컨텐츠 태그(운영 편의)
- `material.isCraftingIngredient` (boolean, 기본 true)

> 비추천: material 문서에 “어디 레시피에 쓰이는지”를 역정규화로 저장(관리 지옥).  
> 추천: `recipes`/`enhancementProfiles` 등에서 material을 참조.

---

### 2.5 key_item (키 아이템)
특정 지역/던전/기능 해금 등 “소유 여부/사용 1회 여부”가 중요합니다.

#### key_item 블록 권장 필드
- `keyItem.unlockKeys` (array<string>): 해금 대상 key 목록
- `keyItem.consumeOnUse` (boolean, 선택): 사용 시 소모 여부
- `keyItem.useConditions` (object, 선택)

---

### 2.6 currency_item (재화 아이템)
인벤토리에 들어오는 “재화 바우처/토큰” 같은 형태를 지원합니다.

#### currency_item 블록 권장 필드
- `currencyItem.grants` (map<string, number>): 사용/획득 시 지급되는 재화
  - 예: `{ "gold": 1000, "token_event": 5 }`
- `currencyItem.consumeOnUse` (boolean, 기본 true)

---

## 3) Equipment 상세 스키마

### 3.1 equipment.build (조합/가격)
- `buildsFrom`: array<{ itemId: string, count: number }>
- `buildsInto`: array<{ itemId: string }>|array<string> (팀 표준으로 통일 권장)
- `baseCost`: map<string, number>
- `recipeCost`: map<string, number>
- `totalCost`: map<string, number>

#### 비용 map 예시
- `{ "gold": 625, "token_event": 2, "shard": 10 }`

> 비용 map의 키는 `currencies/{currencyKey}`에 정의된 key만 사용하도록 검증을 권장합니다.

---

### 3.2 equipment.stats
정규화된 스탯 키를 사용합니다.
- 예: `attackDamage`, `abilityPower`, `armor`, `magicResist`, `attackSpeed`, `critChance`, `lifeSteal`, ...

---

### 3.3 equipment.effects
- `passives`: array<object>
- `actives`: array<object>

권장 passive/active 공통 필드 예시
- `key` (string)
- `name` (string)
- `unique` (boolean)
- `rulesText` (string): UI용 설명
- `scaling` (object, 선택): 수치 파라미터

---

## 4) Enhancement (강화) — equipment 전용

강화는 “아이템 템플릿에 강화 규칙”을 정의합니다.  
실제 플레이어가 가진 장비의 강화도는 가능하면 `inventoryItems` 같은 인스턴스 컬렉션에 저장하는 것을 권장합니다.

### equipment.enhancement 필드
- `enabled` (boolean)
- `levelMin` (number, 기본 0)
- `levelMax` (number): 최대 강화도(운영 중 확장 가능)
- `profileKey` (string, 선택): 규칙 재사용 시
- `rules` (object, 선택): 실패 패널티/보호/파괴 등
- `costByLevel` (map<string, map<string, number>>): 레벨별 다중 재화 비용
- `materialsByLevel` (map<string, map<string, number>>, 선택): 레벨별 아이템 재료 요구(아이템키-수량)
- `successRateByLevel` (map<string, number>, 선택)
- `statScaling` (object, 선택)
  - `perLevelAdd`: map<string, number>
  - `perLevelMul`: map<string, number>
- `effectUnlocks` (array<object>, 선택): 특정 강화도에서 효과 해금/교체/스케일 조정

#### statScaling 계산 규칙(권장)
- `finalStat = (baseStat + perLevelAdd[stat] * level) * (1 + perLevelMul[stat] * level)`

---

## 5) Example Documents

### 5.1 Equipment 예시 (LoL-style + 강화 + 다중 재화 조합비)
```json
{
  "id": "3031",
  "slug": "infinity-edge",
  "name": "Infinity Edge",
  "itemType": "equipment",

  "tierNumber": 3,
  "tierKey": "T3",
  "rarityKey": "legendary",

  "stack": { "stackable": false, "maxStack": 1 },
  "shop": { "purchasable": true, "sellable": true, "sellValue": { "gold": 2380 } },
  "requirements": { "levelMin": 0, "uniqueGroupKey": "crit_modifier" },

  "tags": ["damage", "crit"],

  "equipment": {
    "build": {
      "buildsFrom": [
        { "itemId": "1038", "count": 1 },
        { "itemId": "1018", "count": 1 }
      ],
      "buildsInto": [],
      "baseCost": { "gold": 3400 },
      "recipeCost": { "gold": 625, "token_event": 2 },
      "totalCost": { "gold": 3400, "token_event": 2 }
    },

    "stats": { "attackDamage": 70, "critChance": 0.25 },

    "effects": {
      "passives": [
        {
          "key": "ie_crit_amp",
          "name": "Perfection",
          "unique": true,
          "rulesText": "Critical strikes deal increased damage.",
          "scaling": { "critDamageMultiplierBonus": 0.4 }
        }
      ],
      "actives": []
    },

    "enhancement": {
      "enabled": true,
      "levelMin": 0,
      "levelMax": 15,
      "profileKey": "enh_weapon_v1",
      "rules": { "downgradeOnFail": false, "breakOnFail": false },
      "costByLevel": {
        "1": { "gold": 200, "shard": 1 },
        "2": { "gold": 300, "shard": 1 },
        "3": { "gold": 450, "shard": 2 }
      },
      "successRateByLevel": { "1": 1.0, "2": 0.9, "3": 0.8 },
      "statScaling": { "perLevelAdd": { "attackDamage": 2 }, "perLevelMul": { "attackDamage": 0.0 } },
      "effectUnlocks": [{ "atLevel": 7, "addPassiveKey": "ie_bonus_crit" }]
    }
  }
}
```

### 5.2 Consumable 예시 (포션)
```json
{
  "id": "potion_hp_small",
  "slug": "potion-hp-small",
  "name": "Small Health Potion",
  "itemType": "consumable",

  "tierKey": "T1",
  "rarityKey": "common",

  "stack": { "stackable": true, "maxStack": 99 },
  "shop": { "purchasable": true, "sellable": true, "sellValue": { "gold": 10 } },
  "tags": ["healing"],

  "consumable": {
    "consumeOnUse": true,
    "cooldownSeconds": 10,
    "useConditions": { "combatOnly": false },
    "onUseEffects": [
      {
        "key": "heal_over_time",
        "name": "Restore Health",
        "scaling": { "healTotal": 120, "durationSeconds": 15 }
      }
    ]
  }
}
```

### 5.3 Quest Item 예시
```json
{
  "id": "quest_relic_001",
  "slug": "ancient-relic",
  "name": "Ancient Relic",
  "itemType": "quest",

  "stack": { "stackable": false, "maxStack": 1 },
  "shop": { "purchasable": false, "sellable": false },
  "tags": ["quest"],

  "quest": {
    "bindQuestIds": ["q_main_07_step_2"],
    "unique": true,
    "consumeOnTurnIn": true
  }
}
```

### 5.4 Material 예시
```json
{
  "id": "mat_iron_ore",
  "slug": "iron-ore",
  "name": "Iron Ore",
  "itemType": "material",

  "stack": { "stackable": true, "maxStack": 999 },
  "shop": { "purchasable": false, "sellable": true, "sellValue": { "gold": 1 } },
  "tags": ["crafting"],

  "material": {
    "gradeKey": "common",
    "sourceTags": ["mine", "field_drop"],
    "isCraftingIngredient": true
  }
}
```

---

## 6) 운영 규칙 (권장)
- `itemType="equipment"` 인 경우에만 `equipment.*` 블록을 사용합니다.
- `itemType="consumable"` 인 경우에만 `consumable.*` 블록을 사용합니다.
- `itemType="quest"` 인 경우에만 `quest.*` 블록을 사용합니다.
- `itemType="material"` 인 경우에만 `material.*` 블록을 사용합니다.
- 비용 map의 키는 `currencies`에 정의된 key만 사용하도록 툴/검증을 권장합니다.
- 강화 레벨별 map key는 `"1"`, `"2"`처럼 **문자열**을 권장합니다.
