using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using GIGISTUDIO.Monsters;

namespace GIGISTUDIO.Data
{
    public interface IMonsterRepository
    {
        Task<IReadOnlyList<MonsterDef>> GetMonstersAsync(bool forceRefresh = false, CancellationToken ct = default);
        Task<IReadOnlyList<MonsterVariantDef>> GetVariantsAsync(bool forceRefresh = false, CancellationToken ct = default);

        Task<MonsterDef> GetMonsterByIdAsync(string monsterId, bool forceRefresh = false, CancellationToken ct = default);
        Task<MonsterVariantDef> GetVariantByIdAsync(string variantId, bool forceRefresh = false, CancellationToken ct = default);
    }
}
