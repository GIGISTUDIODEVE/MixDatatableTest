# Object Data Structure Specification
## Buildings / Plants / Islands (Firestore-first, Data-driven)

이 문서는 기존 프로젝트의 `items / monsters / quests / stats` 설계 방식(= **템플릿 Def + 인스턴스 State 분리**)을 그대로 확장하여,
**건물(buildings) / 식물(plants) / 섬(islands)** 을 운영하기 위한 공식 데이터 구조를 정의합니다.

> 핵심 원칙  
> - **Def(정의/템플릿)**: 밸런스/규칙/비용/효과(정적)  
> - **Instance(인스턴스/상태)**: 유저 소유물의 레벨/타이머/배치/진행도(동적)  
> - **Item은 “권리/재료”**(설계도/씨앗/섬 구매권/업그레이드 재료)로만 사용하고,  
>   월드에 존재하는 실체(건물/식물/섬)는 **독립 Entity(Instance)** 로 관리합니다.

---

## 1) Collections (권장)

### 1.1 Root template collections (정적)
- `buildingDefs` : 건물 템플릿(타입, 크기, 업그레이드 비용/효과, 생산/전력 등)
- `plantDefs` : 식물 템플릿(성장 단계, 조건, 수확물)
- `islandDefs` : 섬 템플릿(초기 구역, 확장 규칙, 환경 보너스)
- `upgradeDefs` (선택) : 업그레이드 규칙을 재사용하려면 분리
- `recipes` (선택) : 제작/합성/가공 시스템
- `items` : 기존 아이템 템플릿(여기에 deed/seed/license 타입을 추가)

### 1.2 User-owned state collections (동적)
Firestore에서는 아래 둘 중 하나를 추천합니다.

#### A안 (단순/관리 쉬움): **섬 중심 구조**
- `users/{uid}/islands/{islandInstanceId}`
- `users/{uid}/islands/{islandInstanceId}/worldObjects/{entityId}`

#### B안 (쿼리 편의): **유저 월드 오브젝트 전역**
- `users/{uid}/islands/{islandInstanceId}`
- `users/{uid}/worldObjects/{entityId}`  (필드에 `islandInstanceId` 포함)

> 추천: A안(섬 중심)으로 시작하고, 전역 조회가 필요해지면 B안을 병행(인덱스 컬렉션)합니다.

---

## 2) 공통 규칙

### 2.1 ID / slug / metadata
기존 문서들과 동일하게 권장:
- `id` (string): 외부/이관용 고정 id
- `slug` (string): 사람이 읽는 키
- `name` (string)
- `tags` (array<string>, 선택)
- `metadata` (object, 선택): 버전/타임스탬프/작성자 등

### 2.2 비용/재화 map
기존 `ItemSchema.md` 와 동일하게 비용은 **다중 재화 map**을 기본으로 합니다.
- `cost` : `map<string, number>`  
  예: `{ "gold": 1000, "token_event": 5 }`

---

## 3) buildingDefs/{buildingDefId} (정적 템플릿)

### 3.1 Common fields
- `id`, `slug`, `name`, `tags`, `metadata`

### 3.2 Building core
- `categoryKey` (string): `production | housing | utility | decoration | defense | road | ...`
- `size` (object)
  - `w` (number)
  - `h` (number)
- `placeRules` (object)
  - `allowedTileTags` (array<string>, 선택): 배치 가능한 타일 태그
  - `disallowOnWater` (boolean, 선택)
  - `requiresAdjacentTags` (array<string>, 선택): 인접 요구(도로/전력/본부 등)
  - `minDistanceFrom` (object, 선택): `{ "tag": "hq", "distance": 3 }` 같은 확장 가능 구조
- `maxPerIsland` (number, 선택): 섬 당 제한
- `power` (object, 선택)
  - `consumes` (number, 선택)
  - `produces` (number, 선택)

### 3.3 Upgrade (권장: level 기반)
- `upgrade` (object)
  - `levelMin` (number, 기본 1)
  - `levelMax` (number)
  - `mode` (string, 선택): `"linear" | "table"`
  - `timeSecondsByLevel` (map<string, number>, 선택): `"2": 3600` 처럼 레벨별 업그레이드 시간
  - `costByLevel` (map<string, map<string, number>>, 선택): 레벨별 다중 재화 비용
  - `itemsByLevel` (map<string, map<string, number>>, 선택): 레벨별 재료(아이템) 요구량
  - `effectsByLevel` (map<string, object>, 선택): 레벨별 효과(생산량/저장량/보너스)

> `upgradeDefs` 를 별도로 두는 경우  
> - `upgrade.upgradeDefId` 로 참조하고, buildingDef는 “어떤 upgradeDef를 쓰는지”만 적어도 됩니다.

### 3.4 Production (선택)
- `production` (object, 선택)
  - `enabled` (boolean)
  - `mode` (string): `"passive" | "queue" | "cycle"`
  - `inputs` (map<string, number>, 선택): 입력 아이템(아이템키-수량)
  - `outputs` (map<string, number>, 선택): 출력 아이템
  - `cycleSeconds` (number, 선택)
  - `storageCap` (map<string, number>, 선택): 생산물 저장 한도

---

## 4) plantDefs/{plantDefId} (정적 템플릿)

### 4.1 Common fields
- `id`, `slug`, `name`, `tags`, `metadata`

### 4.2 Plant core
- `plantTypeKey` (string): `crop | tree | flower | fungus | ...`
- `placeRules` (object)
  - `allowedTileTags` (array<string>, 선택)
  - `requiresSoil` (boolean, 선택)
- `growth` (object)
  - `stages` (array<object>): 성장 단계 테이블(필수)
    - 각 stage 권장 필드:
      - `stageKey` (string): `"seed" | "sprout" | "young" | "mature" | "withered"`
      - `durationSeconds` (number): 해당 단계 유지 시간
      - `needs` (object, 선택): 조건
        - `waterMin` (number, 선택)
        - `lightMin` (number, 선택)
        - `tempMin` / `tempMax` (number, 선택)
      - `visualKey` (string, 선택): 클라 렌더링용
  - `witherRules` (object, 선택): 물 부족/온도 등으로 위더링 규칙
- `harvest` (object, 선택)
  - `harvestStageKey` (string): 수확 가능 단계
  - `yields` (map<string, number>): 출력 아이템
  - `regrow` (object, 선택)
    - `enabled` (boolean)
    - `regrowSeconds` (number)
    - `regrowToStageKey` (string, 선택)

---

## 5) islandDefs/{islandDefId} (정적 템플릿)

### 5.1 Common fields
- `id`, `slug`, `name`, `tags`, `metadata`

### 5.2 Island core
- `tierNumber` (number, 선택)
- `capacity` (object, 선택)
  - `maxBuildings` (number, 선택)
  - `maxPlants` (number, 선택)
- `initialZones` (array<object>, 선택)
  - zone 예시: `{ "zoneKey": "core", "unlocked": true }`
- `expand` (object, 선택)
  - `zones` (array<object>): 확장 가능한 구역 목록
    - `zoneKey` (string)
    - `unlockCost` (map<string, number>, 선택)
    - `unlockItems` (map<string, number>, 선택)
    - `requiresZoneKeys` (array<string>, 선택): 선행 구역
- `environment` (object, 선택): 섬 패시브 보너스
  - `modifiers` (object, 선택): 키-값(예: `waterEfficiencyMul`, `growthSpeedMul` 등)

---

## 6) Instance Schemas (동적 상태)

### 6.1 users/{uid}/islands/{islandInstanceId}
- `islandDefId` (string)
- `level` (number, 기본 1)
- `createdAt` (timestamp)
- `nameOverride` (string, 선택)
- `unlockedZoneKeys` (array<string>, 선택)
- `economyState` (object, 선택): 섬 단위 버프/디버프/이벤트
- `metadata` (object, 선택)

### 6.2 world object instance (Building / Plant 공통)  
(추천 위치: `users/{uid}/islands/{islandInstanceId}/worldObjects/{entityId}`)

#### 공통 필드
- `type` (string): `"building" | "plant"`
- `defId` (string): buildingDefId 또는 plantDefId
- `level` (number, 선택): building용
- `stageIndex` (number, 선택): plant용 (growth.stages 인덱스)
- `position` (object)
  - `x` (number)
  - `y` (number)
  - `rot` (number, 선택)
- `state` (object, 선택): 상태 플래그
  - `placed` (boolean)
  - `paused` (boolean)
  - `broken` (boolean)
- `timers` (object, 선택)
  - `constructionEndTime` (timestamp, 선택)
  - `upgradeEndTime` (timestamp, 선택)
  - `nextTickTime` (timestamp, 선택): 이벤트 스케줄러용
- `productionState` (object, 선택): 건물 생산/큐
  - `queue` (array<object>, 선택)
  - `storedOutputs` (map<string, number>, 선택)
- `plantState` (object, 선택): 식물 수분/병충해 등
  - `water` (number, 선택)
  - `health` (number, 선택)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

> 원칙: **Def에 있는 정보(크기/효과/비용)를 Instance에 중복 저장하지 않습니다.**  
> Instance는 “지금 어떤 상태인가”만 저장합니다.

---

## 7) Item 확장 (deed / seed / island license)

기존 `items` 컬렉션을 유지하면서, 아래 타입을 추가하는 것을 권장합니다.

### 7.1 itemType 권장 추가값
- `building_deed` : 건물 생성/배치 권리
- `seed` : 식물 생성 권리
- `island_license` : 섬 구매 권리

### 7.2 공통: spawnsDefId
- `spawnsDefId` (string): 생성 대상 Def id  
  - building_deed → `buildingDefs/{id}`
  - seed → `plantDefs/{id}`
  - island_license → `islandDefs/{id}`

### 7.3 권장 예시
```json
{
  "id": "seed_tomato_01",
  "slug": "seed-tomato",
  "name": "Tomato Seed",
  "itemType": "seed",
  "spawnsDefId": "tomato_01",
  "stack": { "stackable": true, "maxStack": 999 },
  "shop": { "purchasable": true, "sellable": true, "sellValue": { "gold": 1 } }
}
```

---

## 8) 운영 체크리스트 (실무 기준)

- Def 수정(밸런스 패치)은 인스턴스에 영향 없이 즉시 반영 가능해야 함
- 업그레이드/성장/생산은 **절대시간(timestamp) 기반**으로 저장(오프라인 진행 지원)
- 인벤토리 아이템은 스택/수량 중심, 월드 오브젝트는 상태/타이머 중심
- 섬은 반드시 Entity(인스턴스)로 유지 (컨테이너 + 장기 상태 누적)
- 쿼리 성능 필요 시 `worldObjects` 전역 인덱스 컬렉션(B안) 병행

---
