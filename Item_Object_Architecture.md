# Item vs Object Architecture
## Buildings / Plants / Islands (Purchase & Upgrade Analysis)

---

## 1. 목적

본 문서는 다음과 같은 게임 오브젝트들을 설계할 때  
**아이템(Item)으로 처리할 것인지**,  
아니면 **독립적인 오브젝트(Object / Entity)** 로 처리할 것인지에 대한
분석과 최종 권장 아키텍처를 정리한다.

대상 오브젝트:
- Buildings (건물)
- Plants (식물)
- Islands (섬)

공통 특성:
- 구매 가능
- 소유 가능
- 업그레이드 가능
- 시간 기반 진행(건설, 성장, 생산 등)
- 상태(State)를 가짐

---

## 2. 핵심 질문

> 구매 후 업그레이드 가능한 오브젝트를  
> **아이템(Item)** 으로 처리할 것인가,  
> 아니면 **독립적인 오브젝트(Object)** 로 취급할 것인가?

---

## 3. 선택지별 분석

### 3.1 모든 것을 아이템(Item)으로 처리하는 경우

#### 장점
- 인벤토리 / 상점 / 구매 시스템 재사용 가능
- 초기 구조 단순
- 구현 속도 빠름

#### 단점 (치명적)
- 위치, 타이머, 성장 단계, 생산 큐 표현에 부적합
- 상태가 늘어날수록 아이템 정의가 비대해짐
- “월드에 배치됨” 개념과 충돌
- 업그레이드가 아이템 교체 로직으로 왜곡됨
- 세이브 / 동기화 / 확장 난이도 급상승

**결론**  
> 월드에 존재하는 실체를 아이템으로만 처리하는 구조는  
> 중·장기적으로 유지 불가능에 가깝다.

---

### 3.2 모든 것을 독립 오브젝트(Object)로 처리하는 경우

#### 장점
- 상태 / 타이머 / 업그레이드 / 생산 처리에 최적
- 월드 시뮬레이션과 자연스럽게 결합
- 확장성 매우 높음

#### 단점
- 구매 / 소유 / 거래 개념 표현이 애매해짐
- 설계도, 씨앗, 구매권 같은 개념 표현이 불편
- 인벤토리 시스템과의 연결성이 떨어짐

**결론**  
> “소유·거래 단위”까지 오브젝트로 처리하면 UX와 구조가 복잡해진다.

---

## 4. 최종 권장 아키텍처

### 4.1 핵심 원칙

> **Item = 권리 / 재료 / 트리거**  
> **Object(Entity) = 월드에 존재하는 실체**

아이템과 오브젝트는 **역할이 다르며, 섞지 않는다.**

---

## 5. 역할 정의

### 5.1 Item (아이템)

아이템은 다음 역할만 담당한다.

- 생성 권한 (구매권, 설계도, 씨앗)
- 업그레이드 재료
- 소모성 트리거

#### 예시
- Building Deed (건물 설계도)
- Seed (식물 씨앗)
- Island License (섬 구매권)
- Upgrade Material (업그레이드 재료)

**아이템은 절대 가지지 않는 것**
- 위치
- 타이머
- 성장 단계
- 생산 상태

---

### 5.2 Object / Entity (독립 오브젝트)

월드에 실제로 존재하며 다음을 가진다.

- 위치 또는 소속 섬
- 레벨 / 성장 단계
- 업그레이드 진행 상태
- 생산 / 성장 / 건설 타이머
- 인접 보너스, 연결성, 환경 영향

#### 대상
- BuildingEntity
- PlantEntity
- IslandEntity

---

## 6. 데이터 구조 권장안

### 6.1 정적 정의 데이터 (Defs)

```text
buildingDefs/{buildingDefId}
plantDefs/{plantDefId}
islandDefs/{islandDefId}
itemDefs/{itemDefId}
upgradeDefs/{upgradeDefId}
```

- Def는 **절대 상태를 가지지 않는다**
- 비용, 시간, 조건, 효과는 모두 Def에 정의

---

### 6.2 동적 상태 데이터 (User-owned)

```text
users/{uid}/inventory/{inventoryId}
  - itemDefId
  - quantity

users/{uid}/islands/{islandInstanceId}
  - islandDefId
  - level
  - unlockedZones

users/{uid}/worldObjects/{entityId}
  - type: building | plant
  - defId
  - level or stage
  - position
  - timers
  - productionState
```

---

## 7. 아이템 → 오브젝트 흐름

### 7.1 구매 및 사용 플로우

1. 상점에서 아이템 구매
2. 인벤토리에 아이템 추가
3. 아이템 사용(use)
4. 대응되는 Def 기반으로 Entity 생성
5. 월드에 배치 또는 섬에 귀속
6. 아이템은 소모되거나 소유권 토큰으로 유지

---

## 8. 업그레이드 처리 방식

- 업그레이드는 **아이템 교체가 아님**
- 기존 Entity의 상태 변화로 처리

```text
Entity.level += 1
Entity.upgradeEndTime = now + upgradeDef.time
```

- 필요 재료는 인벤토리 아이템 차감
- 조건 만족 시 업그레이드 진행

---

## 9. 섬(Island)에 대한 특별 규칙

섬은 다음 이유로 **반드시 독립 오브젝트여야 한다.**

- 다른 오브젝트들의 컨테이너 역할
- 경제 / 환경 / 보너스의 기준 단위
- 장기적인 상태 누적(해금 구역, 개발도)

권장 구조:
- Island = 항상 Entity
- Island 구매권만 Item

---

## 10. 최종 결론 요약

| 구분 | Item | Object |
|----|----|----|
| 구매 / 소유 | O | △ |
| 거래 / 소모 | O | X |
| 월드 배치 | X | O |
| 업그레이드 상태 | X | O |
| 타이머 / 생산 | X | O |

### 최종 추천

> **건물 / 식물 / 섬은 모두 독립 오브젝트(Entity)로 처리한다.**  
> **아이템은 생성·업그레이드에 관여하는 권리와 재료로만 사용한다.**

이 구조는:
- 확장에 강하고
- 밸런싱이 쉽고
- Firestore / JSON 기반 데이터 드리븐 구조와 매우 잘 맞는다.

---
