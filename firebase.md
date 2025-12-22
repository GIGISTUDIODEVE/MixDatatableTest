# Firebase(파이어베이스) 기반 데이터베이스 설계 초안

이 문서는 **Host A(부모)** / **Client B(자식)** 2역할 구조의 “가족 협업형 섬 경영 & 디펜스 + 몬스터 확률 합성” 게임을 **Firebase**로 구현할 때의 권장 데이터 모델(주로 **Cloud Firestore**)과 보안/서버 로직(Cloud Functions) 설계를 정리합니다.

> 권장 구성
- 인증: **Firebase Auth** (부모/자식 계정, 가족(그룹) 연결)
- DB: **Cloud Firestore** (실시간 동기화, 문서/컬렉션)
- 서버 로직: **Cloud Functions** (퀘스트 보상 지급, 합성 RNG/천장, 결제 검증)
- 스토리지: **Cloud Storage** (이미지/리플레이/리소스)
- 분석/푸시: Analytics + FCM (선택)

---

## 1) 핵심 원칙(중요)

### 1.1 신뢰 경계(치트/오남용 방지)
- **보상 지급**, **합성 결과(RNG)**, **천장 게이지**, **A의 도움(시간 단축)**, **포인트 충전(광고/결제)** 는 **클라이언트가 직접 DB에 쓰지 않도록** 설계합니다.
- 클라이언트는 요청만 하고, 실제 반영은 **Cloud Functions(서버)** 가 수행합니다.

### 1.2 문서 크기/핫스팟 회피
- 한 문서에 모든 데이터를 몰아넣지 않습니다.
- 자주 바뀌는 데이터(예: 자원량, 타이머)는 **분리 문서**로 관리하거나 **샤딩**을 고려합니다.

### 1.3 타임 기반 로직
- 건설/업글/도움 단축은 **startAt, endAt**(서버 시간 기준)로 처리합니다.
- 클라이언트는 “남은 시간”을 계산만 하고, 확정 처리는 서버에서 검증합니다.

---

## 2) 인증/계정 모델

### 2.1 users
`users/{uid}`
- `uid: string`
- `role: 'HOST' | 'CLIENT'`
- `displayName: string`
- `familyId: string`  (가족 그룹)
- `createdAt: timestamp`
- `lastLoginAt: timestamp`
- `settings: { language, notifications... }`

> 이 프로젝트는 **Host 1명 + Client 다수(1:N)** 구조를 전제로 합니다.

### 2.2 families (1 Host : N Clients)
`families/{familyId}`
- `familyId: string`
- `hostUid: string`  (단일)
- `clientUids: string[]` (다수)
- `createdAt: timestamp`
- `status: 'ACTIVE' | 'SUSPENDED'`

#### familyInvites (초대/연결)
`families/{familyId}/invites/{inviteId}`
- `codeHash: string` (초대코드 해시)
- `expiresAt: timestamp`
- `createdByUid: string` (항상 hostUid 권장)
- `usedByUid: string | null` (client)
- `usedAt: timestamp | null`

> 권장: 초대코드는 **클라이언트 1명당 1회 사용**(사용 시 만료)로 운영.

---

## 3) 게임 월드(섬) 모델

### 3.1 islands
`islands/{islandId}` (보통 islandId = clientUid 추천)
- `ownerUid: string` (B)
- `familyId: string`
- `name: string`
- `level: number`
- `power: number` (캐시값, 서버가 주기적으로 갱신하거나 이벤트 기반 갱신)
- `createdAt: timestamp`
- `updatedAt: timestamp`

### 3.2 islandState (자주 바뀌는 상태 분리)
`islands/{islandId}/state/main`
- `softCurrency: number` (게임 내 일반 재화)
- `materials: { wood: number, stone: number, seed: number, ... }`
- `energy: number` (선택)
- `lastTickAt: timestamp`

> 자원 종류가 많고 변경이 잦다면 `materials`를 별도 문서/샤딩으로 분리

### 3.3 buildings
`islands/{islandId}/buildings/{buildingId}`
- `type: string` (farm, sawmill, wall, tower...)
- `level: number`
- `pos: {x:number,y:number}`
- `status: 'IDLE'|'BUILDING'|'UPGRADING'`
- `startAt: timestamp | null`
- `endAt: timestamp | null`
- `speedMultiplier: number` (도움/부스트 반영 캐시)
- `updatedAt: timestamp`

### 3.4 crops / trees (선택)
규모가 커지면 타일 단위는 비용이 커집니다.
- **MVP**: 작물/나무는 “시설 기반 생산량”으로 단순화 권장
- 확장 시: `tiles/{tileId}` 컬렉션으로 분리

---

## 4) 전투(디펜스) 모델

### 4.1 defenseRuns (런 기록)
`islands/{islandId}/defenseRuns/{runId}`
- `seasonId: string` (선택)
- `waveReached: number`
- `result: 'WIN'|'LOSE'|'QUIT'`
- `startedAt: timestamp`
- `endedAt: timestamp`
- `rewardsGranted: boolean`

> 보상 지급은 Cloud Functions에서 `rewardsGranted=false`를 확인 후 1회성 지급

### 4.2 dropTables (정적 데이터)
- 드랍테이블은 Firestore에 두기보다 **원격설정(Remote Config)** 또는 **서버 코드/배포 데이터**로 관리 권장

---

## 5) 퀘스트 시스템(Host A가 생성)

### 5.1 questTemplates (선택: 프리셋)
`questTemplates/{templateId}`
- `title`, `description`
- `type: string` (login, build, harvest, defend, realLifeTask...)
- `params: { ... }`

### 5.2 dailyQuests (A가 발행)
`families/{familyId}/dailyQuests/{dateKey}`  (예: `2025-12-22`)
- `dateKey: string`
- `createdByUid: string` (A)
- `createdAt: timestamp`
- `items: array` 또는 하위 컬렉션 권장

권장(하위 컬렉션):
`families/{familyId}/dailyQuests/{dateKey}/items/{questId}`
- `questId: string`
- `title: string`
- `type: string`
- `target: number | null`
- `status: 'ASSIGNED'|'CLAIMABLE'|'CLAIMED'|'EXPIRED'`
- `assignedToUid: string` (B)
- `progress: number`
- `verificationMode: 'TAP'|'PHOTO'|'HOST_APPROVAL'|'AUTO'` (운영 선택)
- `reward: { specialCurrency: number, synthesisItems: {...}, softCurrency: number }`
- `updatedAt: timestamp`

### 5.3 questClaims (보상 청구 로그)
`families/{familyId}/questClaims/{claimId}`
- `questRef: path`
- `claimedByUid: string` (B)
- `approvedByUid: string | null` (HOST_APPROVAL일 때)
- `status: 'PENDING'|'APPROVED'|'REJECTED'|'PAID'`
- `createdAt: timestamp`
- `paidAt: timestamp | null`

> **보상 지급은 Cloud Functions**에서 수행하고, `PAID`로 마킹

---

## 6) 몬스터/알/인벤토리

### 6.1 monstersOwned (B의 보유 몬스터)
`users/{uid}/monsters/{monsterUid}`
- `monsterUid: string` (소유 인스턴스 ID)
- `monsterTypeId: string` (정적 타입)
- `level: number`
- `rarity: string`
- `exp: number`
- `locked: boolean` (합성 재료로 사용 방지)
- `createdAt: timestamp`

### 6.2 eggs / gacha 결과
- “알 구매” 결과는 서버에서 결정 후 보유 몬스터로 지급
- 구매 요청: `users/{uid}/transactions/{txId}`

`users/{uid}/transactions/{txId}`
- `type: 'EGG_PURCHASE'|'POINT_TOPUP'|...`
- `status: 'REQUESTED'|'COMPLETED'|'FAILED'`
- `request: {...}`
- `result: {...}`
- `createdAt, updatedAt`

---

## 7) 확률 합성(핵심) 모델

### 7.1 synthesisRequests (합성 요청)
`users/{uid}/synthesisRequests/{reqId}`
- `status: 'REQUESTED'|'RESOLVED'|'APPLIED'|'FAILED'`
- `inputMonsterUids: string[]`
- `catalysts: { itemId: count }`
- `useProtection: boolean`
- `targetPoolId: string` (합성 풀)
- `createdAt: timestamp`
- `resolvedAt: timestamp | null`
- `result: { outcome: 'SUCCESS'|'PARTIAL'|'FAIL', monsterTypeId?: string, refunds?: {...}, pityDelta?: number }`

> **클라이언트는 REQUESTED만 생성**(또는 Callable Function으로 생성) → 서버가 RESOLVED로 업데이트

### 7.2 pity (천장 게이지)
`users/{uid}/pity/main`
- `value: number` (0~100)
- `updatedAt: timestamp`

### 7.3 synthesisInventory (정수/조각/촉매)
`users/{uid}/items/{itemId}`
- `count: number`
- `updatedAt: timestamp`

---

## 8) Host A의 포인트/충전/광고/결제

### 8.1 hostWallet (A 포인트)
`users/{hostUid}/wallet/main`
- `points: number`
- `updatedAt: timestamp`

### 8.2 topupEvents (충전 이벤트 로그)
`users/{hostUid}/wallet/topups/{topupId}`
- `type: 'AD'|'IAP'|'ATTENDANCE'`
- `status: 'PENDING'|'VERIFIED'|'CREDITED'|'REJECTED'`
- `providerData: {...}` (영수증/광고 리워드 토큰 등)
- `points: number`
- `createdAt, verifiedAt, creditedAt`

> IAP 영수증 검증/광고 리워드 검증은 **Cloud Functions**에서 처리

---

## 9) A의 섬 방문/도움(시간 단축)

### 9.1 helpActions
`islands/{islandId}/helpActions/{helpId}`
- `hostUid: string`
- `targetType: 'BUILDING'|'PRODUCTION'|'RECOVERY'`
- `targetId: string` (buildingId 등)
- `effect: { reduceSeconds: number }`
- `costPoints: number`
- `status: 'APPLIED'|'REJECTED'`
- `createdAt: timestamp`

> 실제 `endAt` 조정은 Cloud Functions에서 검증 후 적용

### 9.2 helpLimits (제한)
`users/{hostUid}/limits/help`
- `dailyCount: number`
- `dailyResetAt: timestamp`
- `weeklyCount: number` (선택)

---

## 10) 보안 규칙(요지)

### 10.1 기본
- 유저는 본인 `users/{uid}` 읽기 가능, 쓰기는 제한
- B는 본인 섬 데이터 쓰기 가능(단, 서버 소유 필드 제외)
- A는 같은 familyId의 섬을 읽기 가능, 쓰기는 **helpAction 요청 정도만**

### 10.2 서버 전용 필드(클라이언트 수정 금지)
- `wallet.points`, `pity.value`, `questClaims.status`, `transactions.result`, `buildings.endAt` 등은 **클라이언트 write 금지**

### 10.3 구현 방법
- Rules에서 `request.auth.uid`, `get(/databases/.../documents/users/{uid}).data.familyId` 등을 활용
- 중요한 변경(포인트/보상/합성 결과)은 **Callable Function만 허용**

---

## 11) Cloud Functions(필수 목록)

### 11.1 퀘스트
- `createDailyQuest(hostUid, dateKey, payload)`
- `submitQuestProgress(clientUid, questId, delta)` (AUTO 모드)
- `requestQuestClaim(clientUid, questId)`
- `approveQuestClaim(hostUid, claimId)` (HOST_APPROVAL)
- `payQuestReward(claimId)` (특수재화/아이템 지급)

### 11.2 알 구매/지급
- `buyEgg(clientUid, eggType, costSpecialCurrency)`
- 서버 RNG → 몬스터 지급 → 트랜잭션 로그

### 11.3 합성
- `requestSynthesis(clientUid, inputs, catalysts, useProtection)`
- 서버 RNG + 천장 게이지 계산 + 환급/보호권 처리
- 결과 몬스터 지급/인벤토리 차감/게이지 업데이트

### 11.4 도움
- `applyHelp(hostUid, islandId, target, effect)`
- family 검증 + 포인트 차감 + endAt 조정

### 11.5 결제/광고 검증
- `verifyIAPReceipt(hostUid, receipt)`
- `verifyAdReward(hostUid, token)`

---

## 12) 인덱스/쿼리 패턴(자주 쓰는 것)
- A가 B의 섬 목록: `families/{familyId}`에서 clientUids 참조
- 오늘 퀘스트: `dailyQuests/{dateKey}/items` `where assignedToUid == clientUid`
- 미지급 클레임: `questClaims where status in ['APPROVED']`
- 합성 요청 최신: `synthesisRequests orderBy createdAt desc limit 20`

---

## 13) MVP 권장 최소 컬렉션 세트
- `users`, `families`
- `islands`, `islands/{id}/state`, `buildings`
- `dailyQuests/{dateKey}/items`, `questClaims`
- `users/{uid}/monsters`, `users/{uid}/items`, `users/{uid}/pity`
- `users/{hostUid}/wallet`, `wallet/topups`
- `helpActions`

---

## 14) 다음에 바로 결정해야 할 것(체크리스트)
- ✅ 가족 구조: **Host 1 : Client N(다수)**
- 클라이언트 최대 인원 수(예: 2~6명 등) 및 초대 정책(코드 공유/개별코드)
- A(호스트)의 보기 범위: 모든 B의 섬/인벤토리/퀘스트를 어디까지 볼지(개인정보/통제 최소화)
- 퀘스트 배포 방식
  - (1) 가족 공통 퀘스트(모두에게 동일)
  - (2) 클라이언트별 개별 퀘스트(assignedToUid)
  - (3) 혼합(공통 + 개별)
- 퀘스트 검증 모드(탭/사진/호스트 승인/자동)
- 합성 결과 정책(성공/부분성공/실패 비율, 게이지 증가량, 환급량)
- 도움의 제한(일일 횟수/대상별 쿨타임/최대 단축 초/포인트 비용)
- 정적 데이터 관리 방식(Remote Config vs 서버 코드)
- 레이트리밋/남용 방지: 동일 클라이언트에 대한 과도한 도움/지급 방지 규칙
