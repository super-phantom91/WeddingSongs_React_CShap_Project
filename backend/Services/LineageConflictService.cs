using WeddingSong.Api.Contracts;
using WeddingSong.Api.Models;

namespace WeddingSong.Api.Services;

public static class LineageConflictService
{
    public static HashSet<WeddingRole> ComputeConflictRoles(IReadOnlyList<LineageAssignmentDto> assignments)
    {
        var conflicts = new HashSet<WeddingRole>();
        var byPerson = new Dictionary<int, List<WeddingRole>>();
        var byNormalizedName = new Dictionary<string, List<WeddingRole>>(StringComparer.OrdinalIgnoreCase);

        foreach (var a in assignments)
        {
            var name = (a.DisplayName ?? "").Trim();
            if (a.PersonId is { } pid)
            {
                if (!byPerson.TryGetValue(pid, out var list))
                {
                    list = [];
                    byPerson[pid] = list;
                }
                list.Add(a.Role);
            }
            else if (!string.IsNullOrWhiteSpace(name))
            {
                var key = NormalizeName(name);
                if (!byNormalizedName.TryGetValue(key, out var list))
                {
                    list = [];
                    byNormalizedName[key] = list;
                }
                list.Add(a.Role);
            }
        }

        foreach (var g in byPerson.Values.Where(x => x.Count > 1))
            foreach (var r in g)
                conflicts.Add(r);

        foreach (var g in byNormalizedName.Values.Where(x => x.Count > 1))
            foreach (var r in g)
                conflicts.Add(r);

        return conflicts;
    }

    private static string NormalizeName(string name) =>
        string.Join(' ', name.Split(' ', StringSplitOptions.RemoveEmptyEntries)).ToLowerInvariant();
}
