using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using GIGISTUDIO.Skills;

namespace GIGISTUDIO.Data
{
    public interface ISkillRepository
    {
        Task<IReadOnlyList<SkillSpec>> GetSkillsAsync(bool forceRefresh = false, CancellationToken ct = default);
        Task<SkillSpec> GetSkillByIdAsync(string skillId, bool forceRefresh = false, CancellationToken ct = default);
    }
}
