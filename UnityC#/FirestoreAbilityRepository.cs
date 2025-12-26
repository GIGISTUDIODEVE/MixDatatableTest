using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using GIGISTUDIO.Abilities;

#if FIREBASE_INSTALLED
using Firebase.Firestore;
#endif

namespace GIGISTUDIO.Data
{
    public sealed class FirestoreAbilityRepository : IAbilityRepository
    {
        private readonly Dictionary<string, AbilitySpec> _cache = new(StringComparer.Ordinal);
        private DateTime _lastFetchUtc = DateTime.MinValue;
        private readonly TimeSpan _ttl;

#if FIREBASE_INSTALLED
        private readonly CollectionReference _ref;
#endif

        public FirestoreAbilityRepository(TimeSpan ttl)
        {
            _ttl = ttl;
#if FIREBASE_INSTALLED
            _ref = FirebaseFirestore.DefaultInstance.Collection("abilitySpecs");
#endif
        }

        private bool IsFresh() => (DateTime.UtcNow - _lastFetchUtc) <= _ttl && _cache.Count > 0;

        public async Task<IReadOnlyList<AbilitySpec>> GetAbilitiesAsync(bool forceRefresh = false, CancellationToken ct = default)
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
                var a = SafeToAbility(doc);
                if (a != null)
                    _cache[a.abilityId] = a;
            }

            _lastFetchUtc = DateTime.UtcNow;
            return _cache.Values.ToList();
#endif
        }

        public async Task<AbilitySpec> GetAbilityByIdAsync(string abilityId, bool forceRefresh = false, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(abilityId)) return null;

            if (!forceRefresh && IsFresh() && _cache.TryGetValue(abilityId, out var cached))
                return cached;

            await GetAbilitiesAsync(true, ct);
            return _cache.TryGetValue(abilityId, out var found) ? found : null;
        }

#if FIREBASE_INSTALLED
        private static AbilitySpec SafeToAbility(DocumentSnapshot doc)
        {
            var d = doc.ToDictionary();

            var spec = new AbilitySpec
            {
                abilityId = doc.Id,
                deliveryType = ParseDelivery(GetString(d, "deliveryType")),
            };

            if (d.TryGetValue("effects", out var eff) && eff is IEnumerable<object> arr)
            {
                foreach (var e in arr)
                    spec.effectIds.Add(e.ToString());
            }

            return spec;
        }

        private static string GetString(Dictionary<string, object> d, string k)
            => d != null && d.TryGetValue(k, out var v) ? v?.ToString() : "";

        private static AbilityDeliveryType ParseDelivery(string s)
        {
            if (Enum.TryParse<AbilityDeliveryType>(s, true, out var t))
                return t;
            return AbilityDeliveryType.Instant;
        }
#endif
    }
}
