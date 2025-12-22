# MonsterDataTable.md

몬스터 데이터 테이블(마스터/인스턴스) 구조 정의서입니다.

## 0) 설계 원칙

* **정적/동적 분리**: 타입(종) 데이터는 `monsterTypes`, 유저가 가진 개체 데이터는 `users/{uid}/monsters`.
* **계산 표준화**: 스탯 키/공식/관통 순서/쿨감 공식은 서버·클라 모두 동일하게 구현.
* **스킬 슬롯 고정**: 모든 몬스터는 **기본 공격 1개 + 특수 스킬 3개**(총 4개 슬롯).

> 운영 팁: `monsterTypes` 같은 정적 데이터는 Firestore에 둘 수도 있지만, 잦은 밸런스 패치/롤백/AB 테스트가 있으면 **Remote Config / 서버 배포 데이터(버전 관리되는 JSON)** 형태가 운영에 유리합니다.

---

## 1) 컬렉션/경로 요약

### 1.1 monsterTypes (정적 타입 데이터)

* 경로: `monsterTypes/{monsterTypeId}`
* 용도: 도감/밸런스/스킬 정의/기본 스탯/성장치/**속성(element)**

### 1.2 user monsters (유저 소유 인스턴스)

* 경로: `users/{uid}/monsters/{monsterUid}`
* 용도: 레벨/exp/돌파/잠금/개체값/장비/스킬 레벨/스탯 스냅샷

---

## 2) 스탯 표준 키

### 2.1 기본 스탯 키 (baseStats / growthPerLevel)

**생존**

* `hp` : 체력
* `hpRegen` : 초당 체력 회복

**공격**

* `ad` : 공격력(물리 기반)
* `ap` : 주문력(마법 기반)
* `as` : 공격속도(초당 공격 횟수 계열로 사용 권장; 아래 공식 참고)
* `critChance` : 치명 확률(0~1)
* `critDamage` : 치명 배율(기본 2.0 권장)

**방어/유틸**

* `armor` : 방어력(물리 피해 감소)
* `mr` : 마법저항(마법 피해 감소)
* `tenacity` : 강인함(군중제어 지속시간 감소, 0~1)
* `moveSpeed` : 이동속도(선택)
* `range` : 사거리(선택; 근접이면 1~2 같은 값)

**쿨/자원**

* `abilityHaste` : 스킬 가속(쿨감은 아래 공식)

> 주의: 어떤 스탯을 쓰든 **키는 전 프로젝트에서 고정**하세요(서버/클라/툴/밸런스 문서 모두).

### 2.2 파생 스탯 키 (finalStats / statsSnapshot에 저장 권장)

* `hpMax` : 최종 최대 체력(= hp 기반 계산 결과)
* `damageReductionPhysical`, `damageReductionMagic` : 피해감소율(선택, 계산값 캐시용)
* `attackInterval` : 공격 간격(초) (선택, `as`로부터 계산)

---

## 3) 계산 규칙 (권장 표준)

### 3.1 레벨 스탯 성장

* 기본: `stat(level) = base + growthPerLevel * (level - 1)`
* 성장치가 없는 키는 growthPerLevel을 0으로 둡니다.

### 3.2 돌파/진화(ascension) 처리

게임 기획에 따라 두 가지 중 하나로 통일하세요.

* **A안(가산형)**: 돌파당 특정 스탯을 추가로 +X
* **B안(배율형)**: `final = raw * (1 + ascensionBonus)`

> 추천: 밸런스가 자주 바뀌면 배율형(B)이 휠씬 관리하기 쉽습니다.

### 3.3 개체값(IV) 적용

* IV는 일반적으로 **가산형(+ )**으로 적용 권장
* 예: `hpFinal = hpRaw + ivs.hp`

### 3.4 장비/버프 적용 순서(권장)

최종 스탯 산출 파이프라인(표준):

1. 타입 기본 + 레벨 성장 → `rawStats`
2. 돌파/IV → `midStats`
3. 장비/룬/버프(가산) → `addStats`
4. 장비/룬/버프(배율) → `finalStats`

### 3.5 치명타

* 기대 피해를 쓰지 말고, 전투에서는 확률로 처리:

  * `isCrit`가 true면 `damage *= critDamage`
  * critChance는 0~1로 클램프

### 3.6 방어력/마저 피해 감소(LoL 스타일 권장)

* 물리: `mult = 100 / (100 + armor')`
* 마법: `mult = 100 / (100 + mr')`
* `armor'`, `mr'`는 관통 적용 후 값

### 3.7 관통/감소 적용 순서(권장 표준)

방어력/마저 계산용으로 아래 순서를 고정:

1. %감소 또는 %관통 적용
2. 고정 감소/고정 관통 적용
3. 최소 0으로 클램프

### 3.8 쿨타임(Ability Haste) 공식

* `cdr = abilityHaste / (100 + abilityHaste)`
* `cooldownFinal = cooldownBase * (1 - cdr)`

### 3.9 공격속도(as) → 공격 간격

둘 중 하나로 프로젝트 표준을 정하세요.

* **A안(직관형)**: `attackInterval = 1 / as` (as는 초당 공격 횟수)
* **B안(기본속도형)**: `attackInterval = baseInterval / (1 + asBonus)`

---

## 4) 속성(Element) (추가)

### 4.1 목적

* 몬스터의 **주 속성**을 정의하여 도감/상성/연출/AI에 사용
* 속성은 **정적 타입 데이터**로 관리하는 것을 표준으로 함

### 4.2 허용 값(5가지 고정)

* `WATER` : 물
* `FIRE` : 불
* `FOREST` : 숲
* `DARK` : 어둠
* `LIGHT` : 빛

### 4.3 저장 위치(표준)

* `monsterTypes/{monsterTypeId}.element`에 저장
* `users/{uid}/monsters` 인스턴스에는 **기본적으로 저장하지 않음**(타입 참조)

> 예외(기획 확장): 각성/변이 등으로 개체별 속성 변경이 필요하면
> `users/{uid}/monsters/{monsterUid}.overrideElement?: Element` 같은 **옵션 필드**로 확장.

---

## 5) 스킬 구조 (기본 공격 1 + 특수 3)

### 5.1 슬롯 규칙(고정)

* `slot: 0` → 기본 공격(BASIC) (항상 존재)
* `slot: 1` → 특수 스킬 1 (SPECIAL)
* `slot: 2` → 특수 스킬 2 (SPECIAL)
* `slot: 3` → 특수 스킬 3 (SPECIAL)

> UI/단축키/자동전투/AI는 slot 기준으로 통일하면 유지보수가 쉬워집니다.

### 5.2 monsterTypes에 스킬 정의 저장 (권장)

`monsterTypes/{monsterTypeId}/kit.skills`는 길이 4 고정 배열 권장.

#### skill 오브젝트 권장 필드

* `skillId: string` : 전역 고유 ID
* `slot: number` : 0~3
* `category: "BASIC" | "SPECIAL"`
* `nameKey: string` / `descKey: string` : 로컬라이징 키
* `cooldown: number` : 기본 쿨타임(초). 기본 공격은 0 또는 공격속도에 의해 결정
* `castTime: number` : 시전 시간(초)
* `range: number` : 사거리
* `targeting: "SELF" | "ENEMY_SINGLE" | "ENEMY_AOE" | "ALLY_SINGLE" | "ALLY_AOE" | "GROUND"`
* `cost?: { type: string, amount: number }` : 자원 소모(선택)
* `tags?: string[]` : 예) `damage`, `heal`, `buff`, `debuff`, `cc`
* `scaling` : 계수/레벨 테이블
* `effects` : 실제 효과 리스트(데미지/힐/상태이상 등)
* `unlock?: { ascension: number }` : 특정 돌파에서 해금되는 스킬이면 사용(선택)

##### (추가) 스킬 속성 권장 필드

* `skillElement?: "WATER" | "FIRE" | "FOREST" | "DARK" | "LIGHT"`

  * 미지정 시: 기본값으로 `monsterTypes.element`를 사용(권장)
  * 지정 시: 속성 상성/연출을 스킬 기준으로 적용 가능

#### scaling 권장 형태(예시)

* `scaling.kind`: `FLAT` | `AD_RATIO` | `AP_RATIO` | `HP_RATIO` | `LEVEL_TABLE`
* `scaling.value`: 숫자 또는 레벨별 배열

#### effects 권장 형태(예시)

* `type`: `DAMAGE` | `HEAL` | `SHIELD` | `BUFF` | `DEBUFF` | `STUN` | `DOT` | `HOT`
* `element`: `physical` | `magic` | `true` (데미지일 때)
* `amount`: 숫자 또는 "scaling" 참조
* `duration?`: 지속시간(초)
* `tickInterval?`: DOT/HOT 틱 간격

### 5.3 유저 인스턴스에는 스킬 레벨만 저장 (권장)

`users/{uid}/monsters/{monsterUid}`:

* `skillLevels?: { [skillId: string]: number }`
* 스킬 정의(효과/계수)는 monsterTypes에만 존재하도록 유지

---

## 6) monsterTypes 스키마 (정적 타입 데이터)

### 6.1 필수 필드

* `name: string`
* `element: "WATER" | "FIRE" | "FOREST" | "DARK" | "LIGHT"`  **(추가: 필수)**
* `tags: string[]` : 예) `FIGHTER`, `MAGE`, `TANK`, `SUPPORT`
* `rarityTier: number` : 예) 1~5
* `baseStats: { [statKey: string]: number }`
* `growthPerLevel: { [statKey: string]: number }`
* `kit: { skills: SkillDef[4] }` : 기본공격 1 + 특수 3

### 6.2 선택 필드(권장)

* `dataVersion: number` : 밸런스/데이터 버전
* `iconKey: string` / `modelKey: string` : 리소스 키
* `notes?: string` : 밸런스 메모(내부용)

---

## 7) users/{uid}/monsters 스키마 (유저 소유 인스턴스)

### 7.1 필수 필드

* `monsterUid: string` : 소유 인스턴스 ID (문서 ID와 동일하게 쓰는 것 권장)
* `monsterTypeId: string` : 정적 타입 참조
* `level: number`
* `exp: number`
* `ascension: number`
* `locked: boolean` : 재료/합성 실수 방지
* `createdAt: timestamp`

### 7.2 선택 필드(성장/커스터마이징)

* `rarity?: string` : 타입과 별개로 개체 희귀도가 존재하면 사용
* `skillLevels?: { [skillId: string]: number }`
* `ivs?: { hp?: number, ad?: number, ap?: number, armor?: number, mr?: number, as?: number }`
* `equipment?: { slots: { [slot: string]: string } }` : itemId 참조
* `statsSnapshot?: { [statKey: string]: number }` : 최종 전투 스탯 캐시
* `snapshotVersion?: number`
* `snapshotAt?: timestamp`
* `updatedAt?: timestamp`

#### (추가) 개체별 속성 변경이 필요한 경우(옵션)

* `overrideElement?: "WATER" | "FIRE" | "FOREST" | "DARK" | "LIGHT"`

  * 없으면 타입의 `monsterTypes.element`를 사용

> 권장: `statsSnapshot`을 쓰면 전투 진입/매칭에서 계산 비용이 줄고, 서버 검증도 단순해집니다.

---

## 8) statsSnapshot (최종 전투 스탯 캐시) 권장 규칙

### 8.1 저장하는 값

* 최종 전투에 직접 쓰이는 값만 저장 권장(필요 시 확장):

  * `hpMax`, `hpRegen`, `ad`, `ap`, `as`, `critChance`, `critDamage`, `armor`, `mr`, `tenacity`, `moveSpeed`, `abilityHaste`

### 8.2 버전 관리(매우 중요)

* `monsterTypes.dataVersion` 또는 글로벌 `formulaVersion`이 바뀌면 기존 스냅샷은 **무효**가 될 수 있음
* 권장 정책:

  * `snapshotVersion`을 `(formulaVersion * 100000) + monsterTypes.dataVersion` 같은 방식으로 합성하거나
  * 별도 필드로 `formulaVersion`, `typeDataVersion`을 저장

### 8.3 갱신 타이밍(권장)

* 장비 변경/돌파/레벨업/스킬업 발생 시 즉시 갱신
* 또는 전투 진입 시 `snapshotVersion` 불일치면 재계산 후 저장

---

## 9) 데이터 검증 규칙(서버/파이프라인)

### 9.1 monsterTypes 검증

* `element`는 허용된 값(5종)만 사용
* `baseStats`/`growthPerLevel`는 허용된 statKey만 사용
* `kit.skills.length == 4`
* slot 0~3이 각각 정확히 1개씩 존재
* `slot==0 => category==BASIC`, `slot in 1..3 => category==SPECIAL`
* `skillId` 중복 금지
* 수치: `cooldown >= 0`, `castTime >= 0`, `range >= 0`

### 9.2 user monsters 검증

* `level >= 1`
* `ascension >= 0`
* `critChance` 등 확률 스탯은 0~1로 클램프(계산 결과도 동일)
* `skillLevels[skillId]`는 1 이상 (기획에 따라 상한 적용)
* `overrideElement`가 있다면 허용된 값(5종)만 사용

---

## 10) Firestore 운영/보안 권장(요약)

* `monsterTypes`: 클라 읽기 가능, 쓰기는 서버/어드민만
* `users/{uid}/monsters`: 해당 `uid`만 읽기/쓰기
* 서버에서 전투용 스탯을 신뢰하려면:

  * (A) 서버가 스냅샷 재계산/검증하거나
  * (B) 서버 authoritative로 전투를 진행
