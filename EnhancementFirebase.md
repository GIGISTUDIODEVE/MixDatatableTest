# EnhancementFirebase_RM.md
강화 시스템(Definition / Instance / Modifier / Context) 기반 **Firebase Firestore 데이터 구조 RM(Requirement/Reference Manual)**

> 목적: 강화 기능을 “추가형(플러그인)”으로 계속 늘릴 수 있도록 **정적 정의(Definition)** / **유저 상태(Instance, Context)** / **계산결과(캐시/로그)** 를 분리하고,
> 서버/클라가 동일한 파이프라인으로 계산할 수 있게 한다.

---

## 0) 설계 원칙(필수)
1. **정적/동적 분리**
   - 밸런스/룰/정책은 `gameData/{env}` 아래 **정적 데이터(Definition, Rules)** 로 관리
   - 유저 보유/활성/스택/만료 등은 `users/{uid}` 아래 **유저 데이터(Instance, Context)** 로 관리
2. **계산 파이프라인 고정**
   - `EARLY → MID → LATE → ACCUM(누적)` 순서로 적용(문서 설계 기준)
   - 동일 스탯/동일 계열 충돌은 `priority`, `exclusiveGroup`, `stackingPolicy` 로 제어
3. **추가형 강화(플러그인)**
   - 새로운 강화는 **Definition 한 장 추가**로 끝내고, 유저 적용은 **Instance 추가/토글**로 끝낸다.
   - 스키마 변경 없이 계속 확장 가능해야 한다.
4. **재현성/디버그 가능**
   - 필요 시 “왜 이 수치가 나왔는지” 추적 가능한 Explain 로그 구조를 둔다(운영 옵션)

---

## 1) 컬렉션/경로 요약

### 1.1 정적 데이터(전역)
- `gameData/{env}/enhancementDefinitions/{definitionId}` : 강화 정의(Definition)
- `gameData/{env}/statRules/{statId}` : 스탯 규칙(클램프/우선순위/형식)
- `gameData/{env}/meta/versions` : 버전/스키마/캐시 무효화 메타

### 1.2 유저 데이터(개별)
- `users/{uid}/enhancementInstances/{instanceId}` : 유저 강화 인스턴스(Instance)
- `users/{uid}/enhancementContext/global` : 유저 강화 컨텍스트(집계 입력값)
- `users/{uid}/characters/{cid}/enhancementContext` : (선택) 캐릭터별 컨텍스트
- `users/{uid}/characters/{cid}/computedStats/latest` : (선택) 최종 스탯 캐시
- `users/{uid}/debug/enhancementExplainLogs/{logId}` : (선택) 계산 근거 로그

> env 예시: `prod`, `stage`, `dev`

---

## 2) 정적 데이터 스키마

## 2.1 enhancementDefinitions
경로: `gameData/{env}/enhancementDefinitions/{definitionId}`

### 필드(권장)
- `definitionId: string` (doc id와 동일 권장)
- `name: string`
- `desc: string` (옵션)
- `stage: "EARLY" | "MID" | "LATE" | "ACCUM"`
- `tags: string[]`  
  - 예: `["family:levelUp", "mode:all", "class:any"]`
- `conditions: object[]`  
  - 컨텍스트를 보고 활성 여부를 판단하는 조건들(OR/AND 구조는 문서 설계에 맞춤)
- `stackingPolicy: "NONE" | "STACK" | "STACK_BY_OWNED_COUNT" | "STACK_BY_EQUIPPED_COUNT"`
- `maxStacks: number`
- `exclusiveGroup: string | null`  
  - 같은 그룹 내 “하나만 적용”이 필요하면 사용  
  - 예: `"LEVEL_UP"`
- `priority: number`  
  - 충돌 시 선택 우선순위(큰 값 우선 권장)
- `applyOrder: number` (옵션)  
  - stage 내부에서 더 세밀한 순서가 필요하면 사용
- `modifierTemplates: object[]`
  - 실제 스탯 변형 템플릿(아래 예시)
- `version: number`
- `updatedAt: Timestamp`

### modifierTemplates 예시(권장 형태)
- `statId: string` (예: `atk`, `hp`, `critRate`)
- `op: "ADD" | "MUL" | "OVERRIDE" | "CLAMP"`
- `value: number | object`
- `valueScale: "PER_STACK" | "FIXED" | "BY_CONTEXT_KEY"` (옵션)
- `contextKey: string` (옵션, BY_CONTEXT_KEY일 때)
- `debugLabel: string` (옵션)

---

## 2.2 statRules
경로: `gameData/{env}/statRules/{statId}`

### 필드(권장)
- `statId: string`
- `type: "number" | "int" | "ratio"`
- `min: number | null`
- `max: number | null`
- `default: number`
- `mergePolicy: "SUM" | "MULTIPLY" | "OVERRIDE_BY_PRIORITY"`
- `version: number`
- `updatedAt: Timestamp`

---

## 2.3 meta/versions
경로: `gameData/{env}/meta/versions`

### 필드(권장)
- `schemaVersion: number`
- `enhancementDefVersion: number`
- `statRuleVersion: number`
- `updatedAt: Timestamp`

> 클라/서버는 버전 변경을 감지하면 로컬 캐시 무효화/재계산 트리거에 활용한다.

---

## 3) 유저 데이터 스키마

## 3.1 enhancementInstances (유저 강화 인스턴스)
경로: `users/{uid}/enhancementInstances/{instanceId}`

### 필드(권장)
- `instanceId: string` (doc id와 동일 권장)
- `definitionId: string` (ref)
- `isEnabled: boolean` (기본 true)
- `state: "ACTIVE" | "PAUSED" | "EXPIRED"`
- `stacks: number`  
  - **권장:** `STACK_BY_OWNED_COUNT` 계열은 stacks를 저장하지 않고 Context로부터 계산(또는 서버만 기록)
- `sourceKey: string | null`  
  - 어디서 부여됐는지(예: `event:2026newyear`, `shop:packA`, `dup:heroX`)
- `createdAt: Timestamp`
- `expiresAt: Timestamp | null`
- `revision: number` (옵션, 동시성/갱신 추적)

### 인덱스/쿼리 패턴
- 유저 전투 진입 시: `where(isEnabled==true) AND where(state=="ACTIVE")`
- 만료 처리(서버 작업): `where(expiresAt <= now)`

---

## 3.2 enhancementContext (집계 입력값)
경로(전역): `users/{uid}/enhancementContext/global`
경로(캐릭터): `users/{uid}/characters/{cid}/enhancementContext`

### 필드(권장)
- `level: number`
- `stageUnlocked: { EARLY: boolean, MID: boolean, LATE: boolean, ACCUM: boolean }`
- `tags: string[]`  
  - 예: `["mode:pvp", "season:s12", "class:paladin"]`
- `ownedCounts: map<string, number>`  
  - 예: `{ "hero:paladin": 3, "gear:swordA": 2 }`
- `equippedCounts: map<string, number>` (옵션)
- `time: Timestamp` (서버기준)
- `updatedAt: Timestamp`

### 운영 규칙
- 인벤토리/장착/컬렉션 변경 시 이 문서를 갱신한다.
- `STACK_BY_OWNED_COUNT`는 여기의 `ownedCounts[key]`로 stacks를 결정한다.

---

## 3.3 computedStats (선택: 최종 스탯 캐시)
경로: `users/{uid}/characters/{cid}/computedStats/latest`

### 필드(권장)
- `finalStats: map<string, number>`
- `computedAt: Timestamp`
- `inputHash: string`  
  - (Context + Active Instances + DefVersion + RuleVersion) 기반 해시
- `defVersion: number`
- `ruleVersion: number`
- `explainRef: string | null` (디버그 로그 id)

### 사용 기준
- 매 전투마다 전체 계산이 비싸면 이 캐시를 사용.
- 입력이 바뀌면(컨텍스트/인스턴스/정의버전) 해시가 바뀌므로 재계산.

---

## 3.4 enhancementExplainLogs (선택: 디버그/재현)
경로: `users/{uid}/debug/enhancementExplainLogs/{logId}`

### 필드(권장)
- `createdAt: Timestamp`
- `contextSnapshot: object` (필요 최소만)
- `activeInstancesSnapshot: object[]`
- `definitionsSnapshot: object[]` (필요 최소만: id, stage, priority, templates)
- `appliedModifiers: object[]`
  - 예: `{ statId, op, value, stage, priority, sourceDefinitionId, sourceInstanceId, debugLabel }`
- `finalStats: map<string, number>`
- `versions: { schemaVersion, enhancementDefVersion, statRuleVersion }`

### 운영 팁
- 저장량을 줄이려면 최근 N개만 유지(예: 20개)
- 이상치/에러 발생 시에만 생성하도록 조건부 저장 권장

---

## 4) 계산 규약(서버/클라 공통)

## 4.1 활성 강화 결정
1. 유저 `enhancementContext` 로드
2. `enhancementInstances` 중 `ACTIVE && isEnabled` 로드
3. 각 Instance의 `definitionId`로 Definition 배치 로드
4. `conditions` 평가 + `stageUnlocked` 확인
5. `exclusiveGroup` 충돌 해결
   - 같은 그룹이면 `priority` 높은 것만 채택(권장)

## 4.2 stacks 결정 규칙
- `stackingPolicy == STACK`: instance.stacks 사용
- `STACK_BY_OWNED_COUNT`: `ownedCounts[sourceKeyOrTagKey]`를 기반으로 계산
  - 예시: `stacks = clamp(ownedCount - 1, 0, maxStacks)`
- `STACK_BY_EQUIPPED_COUNT`: `equippedCounts[...]` 기반
- `NONE`: 1로 처리

## 4.3 적용 순서
- stage 순서: `EARLY → MID → LATE → ACCUM`
- 동일 stage 내부 정렬: `(applyOrder asc, priority desc, definitionId asc)` 같은 **결정적(Deterministic)** 정렬 사용 권장

---

## 5) 보안/치팅 방지(권장)
- `enhancementInstances.stacks`는 클라가 임의 수정하지 못하게 한다.
  - OWNED_COUNT 기반은 stacks 저장 없이 Context 기반 계산 권장
- Context 갱신도 가능하면 서버(Cloud Functions/권한 검증)로 제한하거나,
  - 최소한 인벤토리 소스 데이터와 교차 검증 가능하도록 한다.

---

## 6) 예시(레벨업 강화 1/2 추가형)

### 6.1 Definition 2개 추가(정적)
- `levelUpBoost_v1` / `levelUpBoost_v2` 를 각각 `enhancementDefinitions`에 추가
- 둘 다 `tags: ["family:levelUp"]` 같은 패밀리 태그를 가질 수 있다.
- 둘 중 하나만 허용하려면 `exclusiveGroup: "LEVEL_UP"` 지정 + priority로 선택

### 6.2 유저 적용(동적)
- 유저에게 v2를 지급하면 `enhancementInstances/{newId}` 하나 추가
- 기존 v1은 그대로 유지 가능(공존/배타는 Definition 정책으로 결정)

---

## 7) 파일/문서 버전 갱신 체크리스트
- Definition 변경 시: `enhancementDefVersion` 증가
- statRules 변경 시: `statRuleVersion` 증가
- 구조 변경 시: `schemaVersion` 증가
- 클라: 버전 변경 감지 → 로컬 캐시 무효화 + 재계산

---

## 8) 명명 규칙(권장)
- `definitionId`: 기능/계열/버전 포함  
  - 예: `levelUpBoost_v2`, `dupHeroAtkBonus_v1`
- `sourceKey`: 지급 경로/원인 추적 가능하게  
  - 예: `dup:hero_paladin`, `event:2026_spring`, `shop:pack_gold_01`
