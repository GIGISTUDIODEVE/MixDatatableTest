using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using GIGISTUDIO.Effects;

namespace GIGISTUDIO.Data
{
    public interface IEffectRepository
    {
        Task<IReadOnlyList<EffectSpec>> GetEffectsAsync(bool forceRefresh = false, CancellationToken ct = default);
        Task<EffectSpec> GetEffectByIdAsync(string effectId, bool forceRefresh = false, CancellationToken ct = default);
    }
}
