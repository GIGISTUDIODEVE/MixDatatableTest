using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using GIGISTUDIO.Monsters;

#if FIREBASE_INSTALLED
using Firebase.Firestore;
#endif

namespace GIGISTUDIO.Data
{
    public sealed class FirestoreMonsterRepository : IMonsterRepository
    {
        private readonly MonsterCache _cache = new();
        private readonly TimeSpan _ttl;

#if FIREBASE_INSTALLED
        private readonly FirebaseFirestore _db;
        private readonly CollectionReference _monstersRef;
        private readonly CollectionReference _variantsRef;
#endif

        public FirestoreMonsterRepository(TimeSpan ttl)
        {
            _ttl = ttl;

#if FIREBASE_INSTALLED
            _db = FirebaseFirestore.DefaultInstance;
            _monstersRef = _db.Collection("monsters");
            _variantsRef = _db.Collection("monsterVariants");
#endif
        }

        public async Task<IReadOnlyList<MonsterDef>> GetMonstersAsync(bool forceRefresh = false, CancellationToken ct = default)
        {
            if (!forceRefresh && _cache.HasFreshMonsters(_ttl))
                return _cache.monstersById.Values.OrderBy(m => m.monsterId).ToList();

#if !FIREBASE_INSTALLED
            throw new InvalidOperationException("FIREBASE_INSTALLED 심볼이 없어서 Firestore를 사용할 수 없습니다. Firebase SDK 설치/심볼 설정이 필요합니다.");
#else
            var snapshot = await _monstersRef.GetSnapshotAsync();
            ct.ThrowIfCancellationRequested();

            var list = new List<MonsterDef>(snapshot.Count);
            foreach (var doc in snapshot.Documents)
            {
                var m = SafeToMonster(doc);
                if (m != null) list.Add(m);
            }

            _cache.SetMonsters(list);
            return _cache.monstersById.Values.OrderBy(m => m.monsterId).ToList();
#endif
        }

        public async Task<IReadOnlyList<MonsterVariantDef>> GetVariantsAsync(bool forceRefresh = false, CancellationToken ct = default)
        {
            if (!forceRefresh && _cache.HasFreshVariants(_ttl))
                return _cache.variantsById.Values.OrderBy(v => v.variantId).ToList();

#if !FIREBASE_INSTALLED
            throw new InvalidOperationException("FIREBASE_INSTALLED 심볼이 없어서 Firestore를 사용할 수 없습니다. Firebase SDK 설치/심볼 설정이 필요합니다.");
#else
            var snapshot = await _variantsRef.GetSnapshotAsync();
            ct.ThrowIfCancellationRequested();

            var list = new List<MonsterVariantDef>(snapshot.Count);
            foreach (var doc in snapshot.Documents)
            {
                var v = SafeToVariant(doc);
                if (v != null) list.Add(v);
            }

            _cache.SetVariants(list);
            return _cache.variantsById.Values.OrderBy(v => v.variantId).ToList();
#endif
        }

        public async Task<MonsterDef> GetMonsterByIdAsync(string monsterId, bool forceRefresh = false, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(monsterId)) return null;
            var id = monsterId.Trim();

            if (!forceRefresh && _cache.HasFreshMonsters(_ttl) && _cache.monstersById.TryGetValue(id, out var cached))
                return cached;

            await GetMonstersAsync(forceRefresh: true, ct: ct);
            return _cache.monstersById.TryGetValue(id, out var found) ? found : null;
        }

        public async Task<MonsterVariantDef> GetVariantByIdAsync(string variantId, bool forceRefresh = false, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(variantId)) return null;
            var id = variantId.Trim();

            if (!forceRefresh && _cache.HasFreshVariants(_ttl) && _cache.variantsById.TryGetValue(id, out var cached))
                return cached;

            await GetVariantsAsync(forceRefresh: true, ct: ct);
            return _cache.variantsById.TryGetValue(id, out var found) ? found : null;
        }

#if FIREBASE_INSTALLED
        private static MonsterDef SafeToMonster(DocumentSnapshot doc)
        {
            try
            {
                var dict = doc.ToDictionary();

                // monsterId는 문서 ID를 신뢰하는 쪽이 안전(HTML도 ID로 저장) :contentReference[oaicite:3]{index=3}
                var m = new MonsterDef
                {
                    monsterId = doc.Id,
                    displayName = GetString(dict, "displayName"),
                    basePresetId = GetString(dict, "basePresetId"),
                    growthPresetId = GetString(dict, "growthPresetId"),
                    defaultLevel = GetInt(dict, "defaultLevel", 1),
                    tags = GetStringList(dict, "tags"),
                };

                // 필수 필드 최소 검증
                if (string.IsNullOrWhiteSpace(m.basePresetId) || string.IsNullOrWhiteSpace(m.growthPresetId))
                    return null;

                if (m.defaultLevel < 1) m.defaultLevel = 1;
                return m;
            }
            catch
            {
                return null;
            }
        }

        private static MonsterVariantDef SafeToVariant(DocumentSnapshot doc)
        {
            try
            {
                var dict = doc.ToDictionary();
                var overrides = GetDict(dict, "overrides");

                var v = new MonsterVariantDef
                {
                    variantId = doc.Id,
                    monsterId = GetString(dict, "monsterId"),
                    displayName = GetString(dict, "displayName"),
                    tags = GetStringList(dict, "tags"),
                };

                v.overrides.basePresetId = GetString(overrides, "basePresetId");
                v.overrides.growthPresetId = GetString(overrides, "growthPresetId");
                v.overrides.defaultLevel = GetNullableInt(overrides, "defaultLevel");

                return v;
            }
            catch
            {
                return null;
            }
        }

        private static Dictionary<string, object> GetDict(Dictionary<string, object> src, string key)
            => (src != null && src.TryGetValue(key, out var v) && v is Dictionary<string, object> d) ? d : null;

        private static string GetString(Dictionary<string, object> src, string key)
            => (src != null && src.TryGetValue(key, out var v) && v != null) ? v.ToString() : "";

        private static int GetInt(Dictionary<string, object> src, string key, int fallback)
        {
            if (src == null || !src.TryGetValue(key, out var v) || v == null) return fallback;
            if (v is long l) return (int)l;
            if (v is int i) return i;
            if (int.TryParse(v.ToString(), out var parsed)) return parsed;
            return fallback;
        }

        private static int? GetNullableInt(Dictionary<string, object> src, string key)
        {
            if (src == null || !src.TryGetValue(key, out var v) || v == null) return null;
            if (v is long l) return (int)l;
            if (v is int i) return i;
            if (int.TryParse(v.ToString(), out var parsed)) return parsed;
            return null;
        }

        private static List<string> GetStringList(Dictionary<string, object> src, string key)
        {
            var list = new List<string>();
            if (src == null || !src.TryGetValue(key, out var v) || v == null) return list;

            if (v is IEnumerable<object> arr)
            {
                foreach (var item in arr)
                {
                    var s = item?.ToString()?.Trim();
                    if (!string.IsNullOrEmpty(s)) list.Add(s);
                }
            }
            return list;
        }
#endif
    }
}
