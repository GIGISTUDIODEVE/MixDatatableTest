using System;
using UnityEngine;
using GIGISTUDIO.Data;

namespace GIGISTUDIO.Runtime
{
    /// <summary>
    /// AbilityExecutor에 IEffectRepository를 제공하기 위한 브릿지 컴포넌트
    /// </summary>
    public sealed class EffectRepositoryBehaviour : MonoBehaviour, IEffectRepository
    {
        public float cacheTtlSeconds = 30f;

        private FirestoreEffectRepository _repo;

        private void Awake()
        {
            _repo = new FirestoreEffectRepository(TimeSpan.FromSeconds(Mathf.Max(1f, cacheTtlSeconds)));
        }

        public System.Threading.Tasks.Task<System.Collections.Generic.IReadOnlyList<GIGISTUDIO.Effects.EffectSpec>> GetEffectsAsync(bool forceRefresh = false, System.Threading.CancellationToken ct = default)
            => _repo.GetEffectsAsync(forceRefresh, ct);

        public System.Threading.Tasks.Task<GIGISTUDIO.Effects.EffectSpec> GetEffectByIdAsync(string effectId, bool forceRefresh = false, System.Threading.CancellationToken ct = default)
            => _repo.GetEffectByIdAsync(effectId, forceRefresh, ct);
    }
}
