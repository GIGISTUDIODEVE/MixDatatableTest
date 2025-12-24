# EffectSystemSpec.rm
Effect를 생성/정의하기 위한 **공통 골격 + 타입 카탈로그 + 템플릿** 명세서.

- 목적: 스킬(Ability)이 보유한 `effects[]`를 데이터로 정의하고, 런타임에서 동일 파이프라인으로 실행 가능하게 만든다.
- 원칙: **Effect는 모듈**이며, 스킬/아이템/룬/강화는 이벤트/트리거를 통해 Effect를 조립/주입한다.

---

## 0) 최상위 구성

### 0.1 AbilitySpec (스킬 정의)
- `abilityId: string`
- `slot: enum` = Passive | A | U
- `rankRules`
  - `maxRank: int`
  - `cooldownByRank: number[]`
  - `costByRank: number[]`
- `effects: EffectSpec[]`
- (선택) `deliverySpec` : Projectile/Zone 등 전달 방식(별도 문서로 분리 가능)

### 0.2 EffectSpec (효과 정의) — 핵심
모든 Effect는 아래 공통 블록을 가진다.

- `effectId: string` (유니크 키, 디버깅/툴팁/밸런스용)
- `type: EffectType`
- `enabled: bool = true`
- `tags: string[]`
- `trigger: TriggerSpec`
- `targeting: TargetingSpec`
- `conditions: ConditionSpec[]`
- `timing: TimingSpec`
- `calc: CalcSpec`
- `apply: ApplySpec`
- `stacking: StackingSpec`
- `procRules: ProcRules`
- `emit: EventEmitSpec`

---

## 1) Effect 공통 골격(기능별)

### 1.1 Identity & Meta
- `effectId`
- `type`
- `enabled`
- `tags[]` (예: Spell, Basic, AoE, DoT, CC, ItemProc, Periodic, Execute, NonProc 등)
  - 용도: 상호작용/중복방지/로그/툴팁 자동화

### 1.2 TriggerSpec (언제 발동?)
#### 1.2.1 triggerType (enum)
- `OnCastStart`
- `OnCastCommit`
- `OnCastEnd`
- `OnProjectileSpawn`
- `OnProjectileHit`
- `OnHit`
- `OnDamageDealt`
- `OnDamageTaken`
- `OnTick`
- `OnEnterZone`
- `OnExitZone`
- `WhileInZone`
- `OnBuffApplied`
- `OnBuffExpired`
- `AfterDelay`
- `OnKill`
- `OnAssist`
- `OnUnitDied`

#### 1.2.2 triggerFilters (선택)
- `sourceFilter: enum` = Ability | BasicAttack | Item | Rune | Modifier
- `damageTypeFilter: enum` = Physical | Magic | True | Any
- `targetTypeFilter: enum` = Champion | Minion | Monster | Structure | Summon | Any
- `hitResultFilter: enum` = Hit | Miss | Blocked | Immune | ShieldAbsorbed | Any

**TriggerSpec 구조**
- `triggerType: TriggerType`
- `filters?: TriggerFilters`

### 1.3 TargetingSpec (누구에게 적용?)
#### 1.3.1 selectorType (enum)
- `Self`
- `Caster`
- `HitTarget`
- `SelectedTarget`
- `Area` (원형)
- `Cone`
- `Line`
- `Chain`
- `NearestN`
- `LowestHP`
- `HighestMaxHP`
- `PriorityByTag`

#### 1.3.2 기본 필드
- `selectorType: TargetSelectorType`
- `teamFilter: enum` = Enemy | Ally | Both
- `unitFilter: enum[]` = Champion/Minion/Monster/Structure/Summon
- `maxTargets: int`
- `sortRule: enum` = None | Nearest | LowestHP | HighestMaxHP | Custom

#### 1.3.3 위치/형상 파라미터(선택)
- `centerRef: enum` = CasterPos | TargetPos | ImpactPos | CursorPos | ZoneCenter
- `radius: number` (Area)
- `angle: number, range: number` (Cone)
- `width: number, length: number` (Line)
- `bounces: int, searchRadius: number` (Chain)
- `excludeAlreadyHit: bool`
- `excludeSummons: bool`
- `excludeIds: string[]`

### 1.4 ConditionSpec (발동 조건)
- `Chance` : 확률
- `CooldownGate` : 내부쿨(ICD)
- `OnceRules` : oncePerCast / oncePerTarget / oncePerTimeWindow
- `Resource` : 스택/탄약/마나 조건
- `State` : 대상이 특정 상태/태그 보유 시
- `Stat` : 체력% 이하/이상, 방어력/MR 조건
- `Distance` : 거리 조건
- `Tag` : 대상/시전자 태그 조건

**ConditionSpec 공통**
- `type: ConditionType`
- `params: map<string, any>`

### 1.5 TimingSpec (지연/지속/틱/스냅샷)
- `delay: number` (초)
- `duration: number` (초)
- `tickInterval: number`
- `tickCount: int` (또는 duration 기반)
- `snapshotPolicy: enum`
  - `SnapshotOnCommit` (시전 순간 고정)
  - `RecalcEveryTick` (틱마다 재계산)
- `cancelPolicy: enum`
  - `NotCancelable`
  - `CancelableNoRefund`
  - `CancelableRefundCost`
  - `InterruptedStop`

### 1.6 CalcSpec (수치/공식)
#### 1.6.1 valueModel (enum)
- `Flat`
- `FlatByRank`
- `FlatByLevel`
- `Ratio` (AP/AD 등)
- `FlatPlusRatio`
- `PercentMaxHP`
- `PercentCurrentHP`
- `PercentMissingHP`
- `ByStacks`
- `ByTargetsHit`
- `ByTime`
- `Curve` (예: ExecuteCurve)

#### 1.6.2 공통 필드
- `model: ValueModel`
- `flat?: number`
- `flatByRank?: number[]`
- `flatByLevel?: number[]`
- `ratios?: { ap?: number, ad?: number, bonusAd?: number, hp?: number, armor?: number, mr?: number }`
- `percent?: number` (퍼뎀 계열)
- `levelScale?: number`
- `stackScale?: number`
- `min?: number`
- `max?: number`
- `capPerSecond?: number`

#### 1.6.3 데미지/회복 공통 속성(선택)
- `damageType?: enum` = Physical | Magic | True
- `element?: string` (게임별 확장)
- `critAllowed?: bool`
- `ampRules?: { sourceAmp?: number, targetAmp?: number, penetrationPolicy?: string }`

### 1.7 ApplySpec (적용/상호작용)
- `applicationMode: enum` = Instant | OverTime | Aura | Pulse | OnExpireExplode
- `hitRules`
  - `canMiss: bool`
  - `canBeDodged: bool`
  - `canBeBlocked: bool`
  - `collisionRule: enum` = FirstHit | Pierce | StopOnUnit | Reflectable
- `interactionRules`
  - `shieldInteraction: enum` = Normal | IgnoreShield | DestroyShieldFirst
  - `immunityInteraction: enum` = Ignore | ConvertToAlternateEffect | ApplyButNoResult
  - `spellShieldInteraction: enum` = BlockAndConsume | BlockNoConsume | NotBlockable

### 1.8 StackingSpec (중첩/갱신/유니크)
- `stackingRule: enum` = RefreshDuration | AddStacks | Replace | Unique
- `maxStacks: int`
- `stackDecay`
  - `decayType: enum` = None | Time | OnEvent
  - `decayValue?: number`
- `priority: int`
- `uniqueGroup: string` (같은 그룹은 1개만 유지)

### 1.9 ProcRules (폭주 방지/프로크 제어)
- `internalCooldown: number` (초)
- `procCoefficient: number` (0~1)
- `oncePerCast: bool`
- `oncePerTarget: bool`
- `sharedCooldownGroup: string`
- `procsAllowed`
  - `allowItemProcs: bool`
  - `allowRuneProcs: bool`
  - `allowLifesteal: bool`
  - `allowSpellVamp: bool`
- `sourceTag: enum` = SpellDamage | BasicDamage | ItemProc | PeriodicDamage | StatusTick

### 1.10 EventEmitSpec (연동 이벤트)
- `emitOnApply: bool`
- `emitOnHit: bool`
- `emitOnKill: bool`
- `payloadKeys: string[]` (예: damageAmount, statusId, targets, sourceId)

---

## 2) EffectType 카탈로그(기능별 enum)

### 2.1 Damage 계열
- `Damage`
- `DamagePercentHP`
- `ExecuteDamage`
- `DamageOverTime`
- (선택) `ConvertDamageType`

### 2.2 Status/CC 계열
- `ApplyStatus`
- `RemoveStatus`
- `DispelShield`
- `Interrupt`

### 2.3 Recovery 계열
- `Heal`
- `HealOverTime`
- `Shield`
- `GrantLifesteal`

### 2.4 Mobility/Position 계열
- `Dash`
- `Blink`
- `Knockback`
- `Knockup`
- `Pull`
- `SwapPosition`

### 2.5 Spawn/Zone/WorldObject 계열
- `SpawnObject`
- `CreateZone`
- `ModifyZone`
- `Trap`

### 2.6 Stat Modify 계열
- `ModifyStat`
- `ApplyMultiplier`
- `StealStat`

### 2.7 Info/Visibility 계열
- `Reveal`
- `Nearsight`
- `MarkTarget`

### 2.8 Resource/Stack 계열
- `GainResource`
- `SpendResource`
- `AddStack`
- `ConsumeStack`
- `ResetCooldown`
- `ReduceCooldown`
- `RefundCost`

### 2.9 Control Flow(조립용) 계열
- `Sequence`
- `Parallel`
- `Repeat`
- `RandomPick`
- `Conditional`
- `ScaleBy`
- `Link` (다른 effectId 참조)

---

## 3) Effect 정의 템플릿(작성 체크리스트)

Effect 하나를 정의할 때 최소 항목:

1. `effectId`, `type`, `tags[]`
2. `trigger.triggerType` (+ 필요 시 filters)
3. `targeting.selectorType` (+ team/unit/maxTargets/shape)
4. `conditions[]` (확률/ICD/상태/스택/거리 등)
5. `timing` (delay/duration/tick/snapshot/cancel)
6. `calc` (model/계수/퍼센트/상한/타입)
7. `apply` (hitRules/interactionRules)
8. `stacking` (버프/디버프면 필수)
9. `procRules` (프로크/옵션이면 사실상 필수)
10. `emit` (로그/옵션 연동용)

---

## 4) 예시(최소 2개)

### 4.1 단일 대상 마법 피해 + 속박
```json
{
  "effectId": "Q_HitDamage",
  "type": "Damage",
  "tags": ["Spell", "SingleTarget"],
  "trigger": { "triggerType": "OnHit" },
  "targeting": { "selectorType": "HitTarget", "teamFilter": "Enemy", "unitFilter": ["Champion","Minion","Monster"], "maxTargets": 1, "sortRule": "None" },
  "conditions": [{ "type":"OnceRules", "params": { "oncePerCast": true } }],
  "timing": { "delay": 0, "duration": 0, "tickInterval": 0, "tickCount": 0, "snapshotPolicy": "SnapshotOnCommit", "cancelPolicy": "NotCancelable" },
  "calc": { "model":"FlatPlusRatio", "flatByRank":[80,120,160,200,240], "ratios": { "ap": 0.6 }, "damageType":"Magic" },
  "apply": { "applicationMode":"Instant", "hitRules": { "canMiss": true, "canBeDodged": true, "canBeBlocked": true, "collisionRule":"FirstHit" },
             "interactionRules": { "shieldInteraction":"Normal", "immunityInteraction":"Ignore", "spellShieldInteraction":"BlockAndConsume" } },
  "stacking": { "stackingRule":"Unique", "maxStacks": 1, "priority": 0, "uniqueGroup": "" },
  "procRules": { "internalCooldown": 0, "procCoefficient": 1.0, "oncePerCast": true, "oncePerTarget": false, "sharedCooldownGroup": "", "procsAllowed": { "allowItemProcs": true, "allowRuneProcs": true, "allowLifesteal": false, "allowSpellVamp": true }, "sourceTag":"SpellDamage" },
  "emit": { "emitOnApply": true, "emitOnHit": true, "emitOnKill": false, "payloadKeys": ["damageAmount","targets","sourceId"] }
}
```

```json
{
  "effectId": "Q_Root",
  "type": "ApplyStatus",
  "tags": ["CC"],
  "trigger": { "triggerType": "OnHit" },
  "targeting": { "selectorType": "HitTarget", "teamFilter": "Enemy", "unitFilter": ["Champion","Minion","Monster"], "maxTargets": 1, "sortRule": "None" },
  "conditions": [],
  "timing": { "delay": 0, "duration": 0, "tickInterval": 0, "tickCount": 0, "snapshotPolicy": "SnapshotOnCommit", "cancelPolicy": "NotCancelable" },
  "calc": { "model":"Flat", "flat": 1.0 },
  "apply": { "applicationMode":"Instant", "hitRules": { "canMiss": false, "canBeDodged": false, "canBeBlocked": false, "collisionRule":"FirstHit" },
             "interactionRules": { "shieldInteraction":"Normal", "immunityInteraction":"Ignore", "spellShieldInteraction":"BlockAndConsume" } },
  "stacking": { "stackingRule":"RefreshDuration", "maxStacks": 1, "priority": 0, "uniqueGroup": "ROOT" },
  "procRules": { "internalCooldown": 0, "procCoefficient": 0, "oncePerCast": false, "oncePerTarget": true, "sharedCooldownGroup": "", "procsAllowed": { "allowItemProcs": false, "allowRuneProcs": false, "allowLifesteal": false, "allowSpellVamp": false }, "sourceTag":"StatusTick" },
  "emit": { "emitOnApply": true, "emitOnHit": false, "emitOnKill": false, "payloadKeys": ["statusId","duration","targets","sourceId"] }
}
```

---

## 5) 사용 가이드(한 문장)
Effect는 **Trigger/Target/Calc/Apply/Rules** 5세트를 데이터로 정의하고, 런타임이 동일 파이프라인으로 실행한다.
