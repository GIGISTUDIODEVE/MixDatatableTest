using System.Collections.Generic;
using UnityEngine;
using GIGISTUDIO.Data;

namespace GIGISTUDIO.Skills
{
    public static class SkillLoadHelper
    {
        public static async void LoadSkills(
            SkillController controller,
            ISkillRepository skillRepo,
            IEnumerable<string> skillIds)
        {
            controller.skills.Clear();

            foreach (var id in skillIds)
            {
                var spec = await skillRepo.GetSkillByIdAsync(id);
                if (spec == null) continue;

                controller.skills.Add(new SkillRuntimeSlot
                {
                    spec = spec,
                    rank = 1,
                    state = SkillState.Ready
                });
            }
        }
    }
}
