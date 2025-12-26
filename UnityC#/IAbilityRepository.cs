using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using GIGISTUDIO.Abilities;

namespace GIGISTUDIO.Data
{
    public interface IAbilityRepository
    {
        Task<IReadOnlyList<AbilitySpec>> GetAbilitiesAsync(bool forceRefresh = false, CancellationToken ct = default);
        Task<AbilitySpec> GetAbilityByIdAsync(string abilityId, bool forceRefresh = false, CancellationToken ct = default);
    }
}
