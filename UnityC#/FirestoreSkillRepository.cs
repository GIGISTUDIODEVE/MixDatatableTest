using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using GIGISTUDIO.Skills;

#if FIREBASE_INSTALLED
using Firebase.Firestore;
#endif

namespace GIGISTUDIO.Data
{
    public sealed class FirestoreSkillRepository : ISkillRepository
    {
        private readonly Dictionary<string, SkillSpec> _cache = new(StringComparer.Ordinal);
        private DateTime _lastFetchUtc = DateTime.MinValue;
        private readonly TimeSpan _ttl;

#if FIREBASE_INSTALLED
        private readonly CollectionReference _ref;
#endif

        public FirestoreSkillRepository(TimeSpan ttl)
        {
            _ttl = ttl;
#if FIREBASE_INSTALLED
            _ref = FirebaseFirestore.DefaultInstance.Collection("skillSpecs");
#endif
        }

        private bool IsFresh() => (DateTime.UtcNow - _lastFetchUtc) <= _ttl && _cache.Count > 0;

        public async Task<IReadOnlyList<SkillSpec>> GetSkillsAsync(bool forceRefresh = false, CancellationToken ct = default)
        {
            if (!forceRefresh && IsFresh())
                return _cache.Values.ToList();

#if !FIREBASE_INSTALLED
            throw new InvalidOperationException("Firebase SDK ÇÊ¿ä");
#else
            var snap = await _ref.GetSnapshotAsync();
            ct.ThrowIfCancellationRequested();

            _cache.Clear();
            foreach (var doc in snap.Documents)
            {
                var s = SafeToSkill(doc);
                if (s != null)
                    _cache[s.skillId] = s;
            }

            _lastFetchUtc = DateTime.UtcNow;
            return _cache.Values.ToList();
#endif
        }

        public async Task<SkillSpec> GetSkillByIdAsync(string skillId, bool forceRefresh = false, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(skillId)) return null;

            if (!forceRefresh && IsFresh() && _cache.TryGetValue(skillId, out var cached))
                return cached;

            await GetSkillsAsync(true, ct);
            return _cache.TryGetValue(skillId, out var found) ? found : null;
        }

#if FIREBASE_INSTALLED
        private static SkillSpec SafeToSkill(DocumentSnapshot doc)
        {
            var d = doc.ToDictionary();

            var spec = new SkillSpec
            {
                skillId = doc.Id
            };

            if (TryGetDict(d, "rankRules", out var rank))
            {
                spec.maxRank = GetInt(rank, "maxRank", 1);
                spec.cooldownByRank = GetFloatList(rank, "cooldownByRank");
                spec.costByRank = GetFloatList(rank, "costByRank");
            }

            if (d.TryGetValue("abilities", out var arr) && arr is IEnumerable<object> a)
            {
                foreach (var o in a)
                {
                    if (o is Dictionary<string, object> e)
                    {
                        spec.abilities.Add(new SkillSpec.SkillAbilityEntry
                        {
                            abilityId = GetString(e, "abilityId"),
                            key = GetString(e, "key"),
                            priority = GetInt(e, "priority", 0)
                        });
                    }
                }
            }

            return spec;
        }

        private static bool TryGetDict(Dictionary<string, object> s, string k, out Dictionary<string, object> d)
        {
            d = null;
            return s != null && s.TryGetValue(k, out var v) && (d = v as Dictionary<string, object>) != null;
        }

        private static string GetString(Dictionary<string, object> d, string k)
            => d != null && d.TryGetValue(k, out var v) ? v?.ToString() : "";

        private static int GetInt(Dictionary<string, object> d, string k, int f)
            => d != null && d.TryGetValue(k, out var v) && int.TryParse(v.ToString(), out var i) ? i : f;

        private static List<float> GetFloatList(Dictionary<string, object> d, string k)
        {
            var list = new List<float>();
            if (d != null && d.TryGetValue(k, out var v) && v is IEnumerable<object> arr)
            {
                foreach (var o in arr)
                    if (float.TryParse(o.ToString(), out var f))
                        list.Add(f);
            }
            return list;
        }
#endif
    }
}
