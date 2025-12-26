# Item Schema Specification (LoL-style + 강화)

이 문서는 **리그 오브 레전드(LoL) 아이템 구조**를 참고하여 Firestore에 저장할 **아이템 데이터 스키마**를 정의합니다.

요구사항:
- **아이템 티어는 계속 늘어날 수 있어야 함** (고정 enum 금지)
- **조합 비용은 골드뿐 아니라 여러 재화를 지원** (키값-필요량 페어링)
- LoL처럼 **조합 트리(buildsFrom/buildsInto)** 와 **패시브/액티브 효과**를 표현
- **아이템 강화(강화도/강화 비용/강화 성공률/강화로 인한 스탯/효과 변화)** 를 고려한 구조

---

## Collections
- `items`
- `itemTiers` (권장: 티어 무한 확장을 데이터로 관리)
- `currencies` (권장: 재화 키를 중앙에서 정의)
- (선택) `enhancementProfiles` (권장: 강화 규칙을 재사용할 경우)

---

## items/{itemId} (Document)

### 최상위 필드
- `id` (string): 외부/이관을 위한 고정 id (예: `"3031"`)
- `slug` (string): 사람이 읽기 쉬운 key (예: `"infinity-edge"`)
- `name` (string)
- `tierNumber` (number): 무한 확장 가능한 티어 값 (정렬/필터링용)
- `tierKey` (string): 무한 확장 가능한 티어 식별자 (예: `T3`, `T5`, `Event_2026_T1`)
- `rarityKey` (string, 선택): `common/rare/epic/legendary` 등 내부 정책용
- `shop` (object): 구매/판매/소비성/중첩성 등
- `requirements` (object, 선택): 레벨 제한, 고유 중첩 그룹(LoL UNIQUE) 등
- `build` (object): 조합 트리와 비용(다중 재화)
- `tags` (array<string>): LoL 느낌의 태그 (`damage`, `crit`, `defense` ...)
- `categories` (array<string>, 선택): `starter/basic/epic/legendary/mythic` 등
- `stats` (object): 정규화된 스탯 키로 저장 (예: `attackDamage`, `armor`, `critChance`)
- `effects` (object): passives/actives 목록
- `enhancement` (object, 선택): 강화 시스템 정의 (아래 참고)
- `icon` (object, 선택)
- `metadata` (object, 선택): version, timestamps 등

---

## build (조합/가격)

### build 필드
- `buildsFrom`: array<{ itemId: string, count: number }>
- `buildsInto`: array<{ itemId: string }>|array<string> (운영 편한 형태로 통일 권장)
- `baseCost`: map<string, number>
  - 상점에서 직접 구매 가능한 “총 가격”을 표현하거나, 운영 정책에 따라 `totalCost`와 동일하게 둘 수 있음
- `recipeCost`: map<string, number>
  - “조합서 비용” (여기에 다중 재화가 들어갈 수 있음)
- `totalCost`: map<string, number>
  - 최종 필요 재화(조회 성능을 위해 저장 권장)
  - 권장 규칙: `totalCost = sum(buildsFrom의 totalCost) + recipeCost` (재화 키별로 합산)

### 비용 map 규칙
- 예: `{ "gold": 625, "token_event": 2, "shard": 10 }`
- map의 키는 `currencies/{currencyKey}`에 정의된 key만 쓰도록 관리 페이지/검증 로직을 둡니다.

---

## enhancement (강화)

강화는 “아이템 자체 강화”를 상정합니다.  
**강화로 인해 스탯이 스케일링**되거나, **특정 강화도에서 효과가 해금/강화**되거나, **강화 비용/성공률이 레벨별로 달라지는** 패턴을 지원합니다.

### enhancement 필드 (권장)
- `enabled` (boolean): 강화 가능 여부
- `levelMin` (number, 기본 0): 시작 강화도
- `levelMax` (number): 최대 강화도 (운영 중 확장 가능)
- `currentLevel` (number, 선택): “템플릿 아이템”에는 보통 없음  
  - **주의:** 아이템 인스턴스(장비 보유) 시스템이 있다면 `inventoryItems` 같은 별도 컬렉션에 강화도 보관을 권장
- `profileKey` (string, 선택): 강화 규칙을 재사용할 때 참조(예: `enh_basic_weapon_v1`)
- `rules` (object, 선택): 실패 패널티/보호 아이템/파괴 등

#### 강화 비용/성공률 (레벨별)
- `costByLevel` (map<string, map<string, number>>)
  - 키: `"1"`, `"2"` 같은 강화도(문자열 권장: Firestore map key 안정성)
  - 값: 재화 map (`{ "gold": 200, "shard": 1 }`)
- `materialsByLevel` (map<string, map<string, number>>, 선택)
  - 강화 재료를 “재화”가 아니라 “아이템”으로 요구할 때 사용
  - 예: `{ "5": { "enh_stone_small": 3, "enh_stone_big": 1 } }`
- `successRateByLevel` (map<string, number>, 선택)
  - 예: `{ "1": 1.0, "2": 0.9, "3": 0.8 }`

#### 강화로 인한 수치 변화
- `statScaling` (object, 선택): 강화도에 따라 스탯이 증가하는 규칙
  - 가장 단순: `perLevelAdd` / `perLevelMul`
  - 복합: 스탯별로 따로 정의

권장 형태:
- `statScaling.perLevelAdd`: map<string, number>
  - 예: `{ "attackDamage": 2, "armor": 1 }` (강화도 1당 +)
- `statScaling.perLevelMul`: map<string, number>
  - 예: `{ "attackDamage": 0.02 }` (강화도 1당 ×(1+0.02))
- 계산 예시(권장, 일관성 중요):
  - `finalStat = (baseStat + perLevelAdd[stat] * level) * (1 + perLevelMul[stat] * level)`

#### 강화도 구간 효과(해금/강화)
- `effectUnlocks` (array, 선택)
  - 강화도 조건을 만족하면 효과를 추가/교체/스케일업

예시 형태:
- `{ atLevel: 7, addPassiveKey: "lifesteal_bonus" }`
- `{ atLevel: 10, replacePassiveKey: "oldKey", withKey: "newKey" }`
- `{ atLevel: 12, scaleKey: "ie_crit_amp", addScaling: { "critDamageMultiplierBonus": 0.1 } }`

---

## Example: items/{itemId}

```json
{
  "id": "3031",
  "slug": "infinity-edge",
  "name": "Infinity Edge",
  "tierNumber": 3,
  "tierKey": "T3",

  "shop": {
    "purchasable": true,
    "sellable": true,
    "consumable": false,
    "stackable": false,
    "maxStack": 1
  },

  "requirements": {
    "levelMin": 0,
    "uniqueGroupKey": "crit_modifier"
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

    "rules": {
      "downgradeOnFail": false,
      "breakOnFail": false
    },

    "costByLevel": {
      "1": { "gold": 200, "shard": 1 },
      "2": { "gold": 300, "shard": 1 },
      "3": { "gold": 450, "shard": 2 }
    },

    "successRateByLevel": {
      "1": 1.0,
      "2": 0.9,
      "3": 0.8
    },

    "statScaling": {
      "perLevelAdd": { "attackDamage": 2 },
      "perLevelMul": { "attackDamage": 0.0 }
    },

    "effectUnlocks": [
      { "atLevel": 7, "addPassiveKey": "ie_bonus_crit" }
    ]
  }
}
```

---

## (선택) enhancementProfiles/{profileKey}

강화 규칙을 여러 아이템이 공유한다면, `items`에 전부 중복 저장하지 말고 프로필로 분리하는 것이 운영에 유리합니다.

예:
- `enhancement.profileKey = "enh_weapon_v1"`
- 실제 비용/확률/스케일링 규칙은 `enhancementProfiles/enh_weapon_v1`에 저장

---

## 운영 규칙 (권장)
- **템플릿 아이템(items)** 과 **보유 아이템(inventoryItems 등)** 을 분리할 계획이라면:
  - `items`: 스탯/효과/강화 규칙(프로필)
  - `inventoryItems`: `itemId` + `enhancementLevel` + 소유자/내구도/바인딩 등
- `tierKey`는 문자열로 확장 가능해야 합니다. 예) `T4`, `T5`, `Event_2026_T1` 등.
- 비용 map의 키는 `currencies`에 정의된 key만 사용하도록 관리 페이지/검증 로직을 둡니다.
- `build.buildsFrom`는 **재료 수량(count)** 을 포함하여 동일 재료 2개 같은 케이스를 지원합니다.
- 강화 레벨별 map key는 `"1"`, `"2"`처럼 **문자열**을 권장합니다(파싱/호환/정렬 안정성).
