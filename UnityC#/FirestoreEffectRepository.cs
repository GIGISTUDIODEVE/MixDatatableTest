using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using GIGISTUDIO.Effects;
using GIGISTUDIO.Combat;
using GIGISTUDIO.Stats;

#if FIREBASE_INSTALLED
using Firebase.Firestore;
#endif

namespace GIGISTUDIO.Data
{
    public sealed class FirestoreEffectRepository : IEffectRepository
    {
        private readonly TimeSpan _ttl;
        private DateTime _lastFetchUtc = DateTime.MinValue;
        private readonly Dictionary<string, EffectSpec> _cache = new(StringComparer.Ordinal);

#if FIREBASE_INSTALLED
        private readonly CollectionReference _ref;
#endif

        public FirestoreEffectRepository(TimeSpan ttl)
        {
            _ttl = ttl;

#if FIREBASE_INSTALLED
            _ref = FirebaseFirestore.DefaultInstance.Collection("effectSpecs");
#endif
        }

        private bool IsFresh() => (DateTime.UtcNow - _lastFetchUtc) <= _ttl && _cache.Count > 0;

        public async Task<IReadOnlyList<EffectSpec>> GetEffectsAsync(bool forceRefresh = false, CancellationToken ct = default)
        {
            if (!forceRefresh && IsFresh())
                return _cache.Values.OrderBy(e => e.effectId).ToList();

#if !FIREBASE_INSTALLED
            throw new InvalidOperationException("FIREBASE_INSTALLED 심볼이 없어서 Firestore를 사용할 수 없습니다.");
#else
            var snap = await _ref.GetSnapshotAsync();
            ct.ThrowIfCancellationRequested();

            _cache.Clear();
            foreach (var doc in snap.Documents)
            {
                var spec = SafeToEffect(doc);
                if (spec == null || string.IsNullOrWhiteSpace(spec.effectId)) continue;
                _cache[spec.effectId] = spec;
            }

            _lastFetchUtc = DateTime.UtcNow;
            return _cache.Values.OrderBy(e => e.effectId).ToList();
#endif
        }

        public async Task<EffectSpec> GetEffectByIdAsync(string effectId, bool forceRefresh = false, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(effectId)) return null;
            var id = effectId.Trim();

            if (!forceRefresh && IsFresh() && _cache.TryGetValue(id, out var cached))
                return cached;

            await GetEffectsAsync(forceRefresh: true, ct: ct);
            return _cache.TryGetValue(id, out var found) ? found : null;
        }

#if FIREBASE_INSTALLED
        private static EffectSpec SafeToEffect(DocumentSnapshot doc)
        {
            try
            {
                var d = doc.ToDictionary();

                // MVP: effectId는 문서ID를 신뢰
                var spec = new EffectSpec
                {
                    effectId = doc.Id,
                    type = ParseEffectType(GetString(d, "type")),
                    trigger = ParseTrigger(GetString(d, "trigger")),
                    selector = ParseSelector(GetNestedString(d, "selector", "selectorType")),
                    damageType = ParseDamageType(GetNestedString(d, "apply", "damageType")),
                };

                // calc: flat/ref, ratio/ref 같은 구조가 있을 수 있어서 MVP는 "flat/ratio 숫자 직접"도 허용
                // 1) flat
                spec.flat = GetCalcFlat(d);

                // 2) ratio (기본은 AP 계수로 가정)
                spec.ratio = GetCalcRatio(d);
                spec.ratioStat = StatType.Ap;

                // tick (있으면)
                if (TryGetDict(d, "timing", out var timing))
                {
                    spec.tickInterval = GetFloat(timing, "tickInterval", 1f);
                    spec.duration = GetFloat(timing, "duration", 0f);
                }

                return spec;
            }
            catch
            {
                return null;
            }
        }

        private static float GetCalcFlat(Dictionary<string, object> root)
        {
            // root["calc"]["flat"] 가 숫자일 수도, dict일 수도 있음.
            if (!TryGetDict(root, "calc", out var calc)) return 0f;

            if (calc.TryGetValue("flat", out var flatObj))
            {
                if (flatObj is double dd) return (float)dd;
                if (flatObj is long ll) return ll;
                if (flatObj is int ii) return ii;

                // dict 형태면 MVP: byRank/ ref 등은 런타임 바인딩이 필요하니 0 처리(추후 확장)
                return 0f;
            }
            return 0f;
        }

        private static float GetCalcRatio(Dictionary<string, object> root)
        {
            if (!TryGetDict(root, "calc", out var calc)) return 0f;

            if (calc.TryGetValue("ratio", out var ratioObj))
            {
                if (ratioObj is double dd) return (float)dd;
                if (ratioObj is long ll) return ll;
                if (ratioObj is int ii) return ii;
                return 0f;
            }

            // 혹시 ratios.ap 같은 형태면 MVP로 ap만 읽기
            if (calc.TryGetValue("ratios", out var ratiosObj) && ratiosObj is Dictionary<string, object> ratios)
            {
                if (ratios.TryGetValue("ap", out var apObj))
                {
                    // ap가 숫자일 수도 있고 dict일 수도 있음. 숫자만 MVP로 처리
                    if (apObj is double dd) return (float)dd;
                    if (apObj is long ll) return ll;
                    if (apObj is int ii) return ii;
                }
            }

            return 0f;
        }

        private static bool TryGetDict(Dictionary<string, object> src, string key, out Dictionary<string, object> dict)
        {
            dict = null;
            if (src == null) return false;
            if (!src.TryGetValue(key, out var v) || v == null) return false;
            dict = v as Dictionary<string, object>;
            return dict != null;
        }

        private static string GetString(Dictionary<string, object> src, string key)
            => (src != null && src.TryGetValue(key, out var v) && v != null) ? v.ToString() : "";

        private static string GetNestedString(Dictionary<string, object> src, string dictKey, string key)
        {
            if (!TryGetDict(src, dictKey, out var d)) return "";
            return GetString(d, key);
        }

        private static float GetFloat(Dictionary<string, object> src, string key, float fallback)
        {
            if (src == null || !src.TryGetValue(key, out var v) || v == null) return fallback;
            if (v is double dd) return (float)dd;
            if (v is long ll) return ll;
            if (v is int ii) return ii;
            return float.TryParse(v.ToString(), out var parsed) ? parsed : fallback;
        }

        private static EffectType ParseEffectType(string s)
            => s?.Trim().Equals("Heal", StringComparison.OrdinalIgnoreCase) == true ? EffectType.Heal : EffectType.Damage;

        private static TriggerType ParseTrigger(string s)
            => s?.Trim().Equals("OnTick", StringComparison.OrdinalIgnoreCase) == true ? TriggerType.OnTick : TriggerType.OnHit;

        private static SelectorType ParseSelector(string s)
            => s?.Trim().Equals("Self", StringComparison.OrdinalIgnoreCase) == true ? SelectorType.Self : SelectorType.Target;

        private static DamageType ParseDamageType(string s)
        {
            if (string.Equals(s, "Magic", StringComparison.OrdinalIgnoreCase)) return DamageType.Magic;
            if (string.Equals(s, "True", StringComparison.OrdinalIgnoreCase)) return DamageType.True;
            return DamageType.Physical;
        }
#endif
    }
}
