# Item Schema Specification (LoL-style)

이 문서는 **리그 오브 레전드(LoL) 아이템 구조**를 참고하여 Firestore에 저장할 **아이템 데이터 스키마**를 정의합니다.

요구사항:
- **아이템 티어는 계속 늘어날 수 있어야 함** (고정 enum 금지)
- **조합 비용은 골드뿐 아니라 여러 재화를 지원** (키값-필요량 페어링)
- LoL처럼 **조합 트리(buildsFrom/buildsInto)** 와 **패시브/액티브 효과**를 표현

---

## Collections
- `items`
- `itemTiers` (권장: 티어 무한 확장을 데이터로 관리)
- `currencies` (권장: 재화 키를 중앙에서 정의)

---

## currencies/{currencyKey}
재화 키의 오타/분기(예: `gold`/`Gold`/`GOLD`)를 막기 위해 별도 컬렉션으로 정의합니다.

### Fields
- `key` (string, doc id와 동일 권장)
- `name` (string)
- `iconKey` (string, optional)
- `precision` (number, optional) : 소수 허용 여부(기본 0)
- `enabled` (boolean)

### Example
```json
{
  "key": "gold",
  "name": "Gold",
  "iconKey": "gold",
  "precision": 0,
  "enabled": true
}
```

---

## itemTiers/{tierKey}
티어는 enum으로 고정하지 않고 **데이터로 관리**하여 계속 확장 가능하게 합니다.

### Fields
- `tierKey` (string, doc id와 동일 권장) : 예) `T1`, `T2`, `T3`, `T4`...
- `tierNumber` (number) : 정렬/필터링용. 예) 1, 2, 3, 4...
- `name` (string)
- `sortOrder` (number, optional)
- `uiColorKey` (string, optional)

### Example
```json
{
  "tierKey": "T3",
  "tierNumber": 3,
  "name": "Tier 3",
  "sortOrder": 300,
  "uiColorKey": "purple"
}
```

---

## items/{itemId}
LoL의 핵심 구조인 `buildsFrom / buildsInto` 조합 트리를 유지합니다.

### Top-level Fields
- `id` (string) : 아이템 고유 ID (doc id와 동일 권장)
- `slug` (string) : URL/검색용 키
- `name` (string)
- `tierKey` (string) : `itemTiers/{tierKey}` 참조
- `tierNumber` (number, optional) : 쿼리/정렬 편의를 위해 중복 저장 가능
- `rarityKey` (string, optional) : 예) `basic`, `epic`, `legendary`, `mythic`

### shop
- `shop.purchasable` (boolean)
- `shop.sellable` (boolean)
- `shop.consumable` (boolean)
- `shop.stackable` (boolean)
- `shop.maxStack` (number)

### build (조합 트리 + 비용)
- `build.buildsFrom` (array)
  - `{ itemId: string, count: number }`
- `build.buildsInto` (array, optional)
  - `{ itemId: string }`

#### 비용 구조 (다중 재화 map)
모든 비용은 **키값-필요량 페어링(map)** 으로 정의합니다.
- `build.baseCost` (map<string, number>)
- `build.recipeCost` (map<string, number>) : 조합서 비용(골드 외 재화 포함 가능)
- `build.totalCost` (map<string, number>, optional) : 총 필요 재화(저장 or 런타임 계산)

### tags / categories
- `tags` (array<string>) : 예) `damage`, `crit`, `tank`, `support`...
- `categories` (array<string>) : 예) `starter`, `basic`, `epic`, `legendary`, `mythic`...

### stats
- `stats` (map<string, number>) : 예) `attackDamage`, `abilityPower`, `armor`, `magicResist`, `attackSpeed`, `critChance`...

### effects
- `effects.passives` (array)
- `effects.actives` (array)

각 effect 권장 필드:
- `key` (string) : 로직 연결용
- `name` (string)
- `unique` (boolean) : UNIQUE 적용 여부
- `uniqueGroupKey` (string, optional) : 동일 그룹 중복 제한
- `rulesText` (string) : UI 표시용 설명
- `scaling` (object, optional) : 수치/계수(게임 로직에서 해석)

---

## items/{itemId} Example (다중 재화 조합 비용 포함)
```json
{
  "id": "3031",
  "slug": "infinity-edge",
  "name": "Infinity Edge",

  "tierKey": "T3",
  "tierNumber": 3,
  "rarityKey": "legendary",

  "shop": {
    "purchasable": true,
    "sellable": true,
    "consumable": false,
    "stackable": false,
    "maxStack": 1
  },

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

  "tags": ["damage", "crit"],
  "categories": ["legendary"],

  "stats": {
    "attackDamage": 70,
    "critChance": 0.25
  },

  "effects": {
    "passives": [
      {
        "key": "ie_crit_amp",
        "name": "Perfection",
        "unique": true,
        "uniqueGroupKey": "crit_modifier",
        "rulesText": "Critical strikes deal increased damage.",
        "scaling": { "critDamageMultiplierBonus": 0.4 }
      }
    ],
    "actives": []
  }
}
```

---

## 운영 규칙 (권장)
- `tierKey`는 문자열로 확장 가능해야 합니다. 예) `T4`, `T5`, `Event_2026_T1` 등.
- 비용 map의 키는 `currencies`에 정의된 key만 사용하도록 관리 페이지/검증 로직을 둡니다.
- `build.buildsFrom`는 **재료 수량(count)** 을 포함하여 동일 재료 2개 같은 케이스를 지원합니다.
- `uniqueGroupKey`로 LoL의 "고유 효과 중첩 제한"을 구현할 수 있습니다.
