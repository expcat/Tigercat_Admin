namespace Tigercat.Admin.Api.Endpoints;

internal sealed record MockContactUser(
    string Id,
    string Name,
    string Username,
    string DeptId,
    string[] RoleKeys,
    string[] GroupKeys,
    string? ManagerId);

internal sealed record MockContactDept(string Id, string Name, string LeaderId, string? ParentId);

internal static class MockDirectory
{
    internal static readonly MockContactUser[] Users =
    [
        new("admin", "管理员", "admin", "ops", ["admin", "staff"], ["ops"], "wang"),
        new("demo", "演示用户", "demo", "ops", ["staff"], ["ops"], "admin"),
        new("wang", "王经理", "wang", "ops", ["manager"], ["managers"], "li"),
        new("li", "李总监", "li", "ops", ["director"], ["managers"], null),
        new("chen", "陈财务", "chen", "finance", ["finance"], ["finance"], "zhao"),
        new("zhao", "赵主管", "zhao", "finance", ["manager", "finance"], ["managers", "finance"], "li"),
        new("fang", "方人事", "fang", "hr", ["hr"], ["hr"], "li"),
    ];

    internal static readonly MockContactDept[] Depts =
    [
        new("company", "公司", "li", null),
        new("ops", "运维部", "li", "company"),
        new("finance", "财务部", "zhao", "company"),
        new("hr", "人事部", "fang", "company"),
    ];

    internal static readonly (string Key, string Name)[] Roles =
    [
        ("admin", "系统管理员"),
        ("staff", "员工"),
        ("manager", "经理"),
        ("director", "总监"),
        ("finance", "财务"),
        ("hr", "人事"),
    ];

    internal static readonly (string Key, string Name)[] Groups =
    [
        ("ops", "运维组"),
        ("managers", "管理组"),
        ("finance", "财务组"),
        ("hr", "人事组"),
    ];

    private static readonly Dictionary<string, MockContactUser> UsersById =
        Users.ToDictionary(user => user.Id, StringComparer.OrdinalIgnoreCase);

    private static readonly Dictionary<string, MockContactDept> DeptsById =
        Depts.ToDictionary(dept => dept.Id, StringComparer.OrdinalIgnoreCase);

    public static MockContactUser? FindUser(string? idOrName)
    {
        if (string.IsNullOrWhiteSpace(idOrName))
        {
            return null;
        }

        var key = idOrName.Trim();
        if (UsersById.TryGetValue(key, out var byId))
        {
            return byId;
        }

        return Users.FirstOrDefault(user =>
            string.Equals(user.Username, key, StringComparison.OrdinalIgnoreCase) ||
            string.Equals(user.Name, key, StringComparison.OrdinalIgnoreCase));
    }

    public static ApprovalActorResponse ActorFromId(string? idOrName)
    {
        var user = FindUser(idOrName);
        if (user is not null)
        {
            return Actor(user);
        }

        var fallback = string.IsNullOrWhiteSpace(idOrName) ? "unknown" : idOrName.Trim();
        return new ApprovalActorResponse { Id = fallback, Name = fallback };
    }

    public static ApprovalActorResponse Actor(MockContactUser user)
        => new() { Id = user.Id, Name = user.Name };

    public static ApprovalContactsResponse ListContacts()
        => new()
        {
            Users =
            [
                .. Users.Select(user => new ApprovalContactUserResponse
                {
                    Id = user.Id,
                    Name = user.Name,
                    Username = user.Username,
                    DeptId = user.DeptId,
                    DeptName = DeptsById.TryGetValue(user.DeptId, out var dept) ? dept.Name : user.DeptId,
                    RoleKeys = [.. user.RoleKeys],
                    GroupKeys = [.. user.GroupKeys],
                    ManagerId = user.ManagerId,
                }),
            ],
            Depts =
            [
                .. Depts.Select(dept => new ApprovalContactDeptResponse
                {
                    Id = dept.Id,
                    Name = dept.Name,
                    LeaderId = dept.LeaderId,
                    ParentId = dept.ParentId,
                }),
            ],
            Roles = [.. Roles.Select(role => new ApprovalContactKeyResponse { Key = role.Key, Name = role.Name })],
            Groups = [.. Groups.Select(group => new ApprovalContactKeyResponse { Key = group.Key, Name = group.Name })],
        };

    public static ApprovalActorResponse[] Resolve(
        IEnumerable<ApproverSourceDto> sources,
        string? starterId,
        IReadOnlyDictionary<string, string>? formValues,
        IEnumerable<string>? starterPick)
    {
        var ctxPick = starterPick?.ToArray() ?? ReadStarterPick(formValues);
        var starter = ActorFromId(starterId);
        var actors = sources.SelectMany(source => ResolveOne(source, starter, ctxPick)).ToArray();
        return Unique(actors);
    }

    public static ApprovalActorResponse[] Resolve(
        ApproverSourceDto? source,
        ApproverSourceDto[]? sources,
        string? starterId,
        IReadOnlyDictionary<string, string>? formValues,
        IEnumerable<string>? starterPick)
    {
        var list = new List<ApproverSourceDto>();
        if (source is not null)
        {
            list.Add(source);
        }

        if (sources is { Length: > 0 })
        {
            list.AddRange(sources);
        }

        return Resolve(list, starterId, formValues, starterPick);
    }

    private static ApprovalActorResponse[] ResolveOne(
        ApproverSourceDto source,
        ApprovalActorResponse starter,
        string[] starterPick)
    {
        var type = source.Type?.Trim().ToLowerInvariant();
        return type switch
        {
            "fixed" => Unique((source.Actors ?? []).Select(actor => ActorFromId(actor.Id ?? actor.Name))),
            "self" => [ActorFromId(starter.Id ?? starter.Name)],
            "starter_pick" => Unique(starterPick.Select(ActorFromId)),
            "role" => Users.Where(user => user.RoleKeys.Contains(source.Key)).Select(Actor).ToArray(),
            "group" => Users.Where(user => user.GroupKeys.Contains(source.Key)).Select(Actor).ToArray(),
            "dept_leader" => ResolveDeptLeader(starter.Id ?? starter.Name, source.Level ?? 1),
            "manager_chain" => ResolveManagerChain(starter.Id ?? starter.Name, source.UpTo ?? 3),
            _ => [],
        };
    }

    private static ApprovalActorResponse[] ResolveDeptLeader(string? starterId, int level)
    {
        var starter = FindUser(starterId);
        if (starter is null || !DeptsById.TryGetValue(starter.DeptId, out var dept))
        {
            return [];
        }

        var climbs = Math.Max(level - 1, 0);
        for (var i = 0; i < climbs && !string.IsNullOrWhiteSpace(dept.ParentId); i++)
        {
            if (!DeptsById.TryGetValue(dept.ParentId, out var parent))
            {
                break;
            }

            dept = parent;
        }

        return string.IsNullOrWhiteSpace(dept.LeaderId) ? [] : [ActorFromId(dept.LeaderId)];
    }

    private static ApprovalActorResponse[] ResolveManagerChain(string? starterId, int upTo)
    {
        var starter = FindUser(starterId);
        if (starter is null)
        {
            return [];
        }

        var limit = Math.Max(upTo, 1);
        var chain = new List<ApprovalActorResponse>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { starter.Id };
        var current = starter.ManagerId is null ? null : FindUser(starter.ManagerId);
        while (current is not null && chain.Count < limit)
        {
            if (!seen.Add(current.Id))
            {
                break;
            }

            chain.Add(Actor(current));
            current = current.ManagerId is null ? null : FindUser(current.ManagerId);
        }

        return [.. chain];
    }

    private static string[] ReadStarterPick(IReadOnlyDictionary<string, string>? formValues)
    {
        if (formValues is null)
        {
            return [];
        }

        foreach (var key in new[] { "starterPick", "starterPicks", "pickedApprovers" })
        {
            if (!formValues.TryGetValue(key, out var raw) || string.IsNullOrWhiteSpace(raw))
            {
                continue;
            }

            return raw
                .Split([',', ';', '|'], StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
        }

        return [];
    }

    private static ApprovalActorResponse[] Unique(IEnumerable<ApprovalActorResponse> actors)
    {
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var next = new List<ApprovalActorResponse>();
        foreach (var actor in actors)
        {
            var id = actor.Id ?? actor.Name;
            if (string.IsNullOrWhiteSpace(id) || !seen.Add(id))
            {
                continue;
            }

            next.Add(actor);
        }

        return [.. next];
    }
}
