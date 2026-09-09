namespace Tigercat.Admin.Api.Endpoints;

internal readonly record struct ApprovalMutation(
    bool Ok,
    int Status,
    string Message,
    ApprovalDetailResponse? Detail,
    string? TicketId,
    string? TicketStatus);

internal sealed class ApprovalStore
{
    internal static readonly string[] AllowedLanes = ["todo", "done", "cc", "started"];
    internal static readonly string[] AllowedActions = ["approve", "reject", "transfer", "comment"];

    private const int TitleMaxLength = 120;
    private const int CategoryMaxLength = 40;
    private const int ReasonMaxLength = 2000;
    private const int AmountMaxLength = 32;
    private const int ActorMaxLength = 40;
    private const int CommentMaxLength = 500;
    private const int DefaultPageSize = 50;
    private const int MaxPageSize = 200;

    private readonly object _gate = new();
    private readonly List<ApprovalInstance> _items;
    private int _nextNumber = 1100;

    public ApprovalStore()
    {
        _items = Seed();
    }

    public (ApprovalListItemResponse[] Items, int Total, int Page, int PageSize) List(
        string username,
        string? lane,
        string? keyword,
        int? page,
        int? pageSize)
    {
        var p = Math.Max(page ?? 1, 1);
        var ps = Math.Clamp(pageSize ?? DefaultPageSize, 1, MaxPageSize);
        var normalizedLane = string.IsNullOrWhiteSpace(lane) ? "todo" : lane.Trim().ToLowerInvariant();
        if (!AllowedLanes.Contains(normalizedLane))
        {
            throw new ApprovalStoreException(400, "无效的审批列表类型");
        }

        lock (_gate)
        {
            IEnumerable<ApprovalInstance> query = _items;
            query = normalizedLane switch
            {
                "todo" => query.Where(item =>
                    item.Status == "pending" && SameUser(item.Assignee, username)),
                "done" => query.Where(item => item.ActedBy.Any(actor => SameUser(actor, username))),
                "cc" => query.Where(item => item.Cc.Any(actor => SameUser(actor, username))),
                "started" => query.Where(item => SameUser(item.Starter, username)),
                _ => query,
            };

            if (!string.IsNullOrWhiteSpace(keyword))
            {
                var kw = keyword.Trim().ToLowerInvariant();
                query = query.Where(item =>
                    item.Title.ToLowerInvariant().Contains(kw) ||
                    item.Id.ToLowerInvariant().Contains(kw) ||
                    item.Starter.ToLowerInvariant().Contains(kw) ||
                    item.Assignee.ToLowerInvariant().Contains(kw) ||
                    (item.TicketId?.ToLowerInvariant().Contains(kw) ?? false));
            }

            var filtered = query
                .OrderByDescending(item => item.UpdatedAt)
                .ThenByDescending(item => item.Id, StringComparer.Ordinal)
                .ToArray();
            var total = filtered.Length;
            var pageItems = filtered
                .Skip((p - 1) * ps)
                .Take(ps)
                .Select(ToListItem)
                .ToArray();
            return (pageItems, total, p, ps);
        }
    }

    public ApprovalDetailResponse? Get(string id)
    {
        lock (_gate)
        {
            var item = Find(id);
            return item is null ? null : ToDetail(item);
        }
    }

    public ApprovalMutation Create(CreateApprovalRequest request, string username)
    {
        var title = NormalizeRequired(request.Title, "审批标题不能为空", TitleMaxLength);
        if (title.Error is not null)
        {
            return Fail(400, title.Error);
        }

        var category = Clamp(request.Category, CategoryMaxLength, "工单");
        var reason = Clamp(request.Reason, ReasonMaxLength, "（无说明）");
        var amount = string.IsNullOrWhiteSpace(request.Amount) ? null : Clamp(request.Amount, AmountMaxLength, "");
        var assignee = string.IsNullOrWhiteSpace(request.Assignee)
            ? "admin"
            : Clamp(request.Assignee, ActorMaxLength, "admin");
        var starter = string.IsNullOrWhiteSpace(username) ? "unknown" : username.Trim();
        var ticketId = string.IsNullOrWhiteSpace(request.TicketId) ? null : request.TicketId.Trim();
        var cc = (request.Cc ?? [])
            .Select(item => item?.Trim())
            .Where(item => !string.IsNullOrWhiteSpace(item))
            .Select(item => Clamp(item, ActorMaxLength, item!))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        lock (_gate)
        {
            var now = FormatTime(DateTime.Now);
            var id = $"AP-{_nextNumber++}";
            var instance = new ApprovalInstance
            {
                Id = id,
                Title = title.Value!,
                Category = category,
                TicketId = ticketId,
                Starter = starter,
                Assignee = assignee,
                Cc = cc,
                Status = "pending",
                CurrentStepKey = "lead",
                Reason = reason,
                Amount = string.IsNullOrWhiteSpace(amount) ? null : amount,
                ActedBy = [],
                CreatedAt = now,
                UpdatedAt = now,
                Steps = DefaultPendingSteps(starter, assignee, now),
            };
            _items.Insert(0, instance);
            return new ApprovalMutation(true, 201, "Success", ToDetail(instance), instance.TicketId, null);
        }
    }

    public ApprovalMutation ApplyAction(string id, ApprovalActionRequest request, string username)
    {
        var action = request.Action?.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(action) || !AllowedActions.Contains(action))
        {
            return Fail(400, "无效的审批动作");
        }

        var comment = request.Comment is null ? null : Clamp(request.Comment, CommentMaxLength, "");
        var actor = string.IsNullOrWhiteSpace(username) ? "unknown" : username.Trim();

        lock (_gate)
        {
            var item = Find(id);
            if (item is null)
            {
                return Fail(404, "审批实例不存在");
            }

            if (item.Status is "approved" or "rejected" or "canceled")
            {
                return Fail(400, "当前审批已结束，不能再操作");
            }

            var active = FindActiveTopLevel(item.Steps);
            if (active is null)
            {
                return Fail(400, "当前没有可处理的审批步骤");
            }

            var now = FormatTime(DateTime.Now);
            switch (action)
            {
                case "approve":
                    MarkStep(active, "approved", "approve", comment, actor, now, rollback: false);
                    RememberActor(item, actor);
                    Advance(item, now);
                    break;
                case "reject":
                    MarkStep(active, "rejected", "reject", comment ?? "驳回", actor, now, rollback: true);
                    RememberActor(item, actor);
                    item.Status = "rejected";
                    item.UpdatedAt = now;
                    break;
                case "transfer":
                    var target = request.TransferTo?.Trim();
                    if (string.IsNullOrWhiteSpace(target))
                    {
                        return Fail(400, "转交对象不能为空");
                    }

                    target = Clamp(target, ActorMaxLength, target);
                    active.Actor = new ApprovalActorResponse { Id = target, Name = target };
                    active.Comment = string.IsNullOrWhiteSpace(comment) ? $"转交给 {target}" : comment;
                    active.Time = now;
                    active.Action = "transfer";
                    item.Assignee = target;
                    RememberActor(item, actor);
                    item.UpdatedAt = now;
                    break;
                case "comment":
                    if (string.IsNullOrWhiteSpace(comment))
                    {
                        return Fail(400, "评论内容不能为空");
                    }

                    active.Comment = string.IsNullOrWhiteSpace(active.Comment)
                        ? comment
                        : $"{active.Comment}\n{comment}";
                    active.Time = now;
                    item.UpdatedAt = now;
                    break;
            }

            var ticketStatus = ResolveTicketStatus(item, action);
            return new ApprovalMutation(true, 200, "Success", ToDetail(item), item.TicketId, ticketStatus);
        }
    }

    private ApprovalInstance? Find(string id)
        => _items.FirstOrDefault(item => string.Equals(item.Id, id, StringComparison.OrdinalIgnoreCase));

    private static void Advance(ApprovalInstance item, string now)
    {
        var remaining = item.Steps
            .OrderBy(step => step.Order ?? int.MaxValue)
            .FirstOrDefault(step => step.Status is "pending" or null);
        if (remaining is null)
        {
            item.Status = "approved";
            item.CurrentStepKey = item.Steps.LastOrDefault()?.Key;
            item.UpdatedAt = now;
            return;
        }

        remaining.Status = "active";
        if (remaining.Kind == "cc" || remaining.Children is { Length: > 0 })
        {
            MarkChildren(remaining, "active");
        }

        item.Assignee = remaining.Actor?.Id ?? remaining.Actor?.Name ?? item.Assignee;
        item.CurrentStepKey = remaining.Key;
        item.UpdatedAt = now;
    }

    internal static bool ShouldAdvanceTicketStatus(string current, string next)
    {
        if (string.Equals(current, next, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        return TicketStatusRank(next) > TicketStatusRank(current);
    }

    private static int TicketStatusRank(string status) => status.Trim().ToLowerInvariant() switch
    {
        "open" => 0,
        "accepted" => 1,
        "progress" => 2,
        "resolved" or "closed" => 3,
        _ => -1,
    };

    private static string? ResolveTicketStatus(ApprovalInstance item, string action)
    {
        if (string.IsNullOrWhiteSpace(item.TicketId))
        {
            return null;
        }

        if (action is "transfer" or "comment")
        {
            return null;
        }

        return item.Status switch
        {
            "approved" => "resolved",
            "rejected" => "closed",
            "pending" => item.CurrentStepKey is "lead" or "start" ? "accepted" : "progress",
            _ => null,
        };
    }

    private static void MarkStep(
        ApprovalStepResponse step,
        string status,
        string action,
        string? comment,
        string actor,
        string now,
        bool rollback)
    {
        step.Status = status;
        step.Action = action;
        step.Time = now;
        step.RollbackPoint = rollback;
        if (!string.IsNullOrWhiteSpace(comment))
        {
            step.Comment = comment;
        }

        step.Actor ??= new ApprovalActorResponse();
        step.Actor.Id = actor;
        step.Actor.Name = actor;
        if (status is "approved" or "rejected")
        {
            MarkChildren(step, status);
        }
    }

    private static void MarkChildren(ApprovalStepResponse step, string status)
    {
        if (step.Children is null)
        {
            return;
        }

        foreach (var child in step.Children)
        {
            child.Status = status;
            if (status is "approved" or "rejected" or "active")
            {
                child.Time ??= step.Time;
            }
        }
    }

    private static ApprovalStepResponse? FindActiveTopLevel(IEnumerable<ApprovalStepResponse> steps)
        => steps.FirstOrDefault(step => step.Status == "active");

    private static void RememberActor(ApprovalInstance item, string actor)
    {
        if (item.ActedBy.Any(existing => SameUser(existing, actor)))
        {
            return;
        }

        item.ActedBy = [.. item.ActedBy, actor];
    }

    private static bool SameUser(string? left, string? right)
        => !string.IsNullOrWhiteSpace(left) &&
           !string.IsNullOrWhiteSpace(right) &&
           string.Equals(left.Trim(), right.Trim(), StringComparison.OrdinalIgnoreCase);

    private static ApprovalListItemResponse ToListItem(ApprovalInstance item)
        => new()
        {
            Id = item.Id,
            Title = item.Title,
            Category = item.Category,
            TicketId = item.TicketId,
            Starter = item.Starter,
            Assignee = item.Assignee,
            Cc = [.. item.Cc],
            Status = item.Status,
            CurrentStepKey = item.CurrentStepKey,
            CurrentStepTitle = CurrentTitle(item),
            CreatedAt = item.CreatedAt,
            UpdatedAt = item.UpdatedAt,
        };

    private static ApprovalDetailResponse ToDetail(ApprovalInstance item)
        => new()
        {
            Id = item.Id,
            Title = item.Title,
            Category = item.Category,
            TicketId = item.TicketId,
            Starter = item.Starter,
            Assignee = item.Assignee,
            Cc = [.. item.Cc],
            Status = item.Status,
            CurrentStepKey = item.CurrentStepKey,
            CurrentStepTitle = CurrentTitle(item),
            Reason = item.Reason,
            Amount = item.Amount,
            FormFields = BuildFormFields(item),
            Steps = CloneSteps(item.Steps),
            ActedBy = [.. item.ActedBy],
            CreatedAt = item.CreatedAt,
            UpdatedAt = item.UpdatedAt,
        };

    private static string? CurrentTitle(ApprovalInstance item)
        => item.Steps.FirstOrDefault(step => step.Key == item.CurrentStepKey)?.Title
           ?? item.Steps.FirstOrDefault(step => step.Status == "active")?.Title;

    private static ApprovalFormFieldResponse[] BuildFormFields(ApprovalInstance item)
    {
        var fields = new List<ApprovalFormFieldResponse>
        {
            new() { Label = "标题", Value = item.Title },
            new() { Label = "类型", Value = item.Category },
            new() { Label = "发起人", Value = item.Starter },
            new() { Label = "当前处理人", Value = item.Assignee },
            new() { Label = "说明", Value = item.Reason },
        };
        if (!string.IsNullOrWhiteSpace(item.Amount))
        {
            fields.Add(new() { Label = "金额 / 天数", Value = item.Amount });
        }

        if (!string.IsNullOrWhiteSpace(item.TicketId))
        {
            fields.Add(new() { Label = "关联工单", Value = item.TicketId });
        }

        if (item.Cc.Length > 0)
        {
            fields.Add(new() { Label = "抄送", Value = string.Join("、", item.Cc) });
        }

        return [.. fields];
    }

    private static ApprovalStepResponse[] CloneSteps(ApprovalStepResponse[] steps)
        => steps.Select(CloneStep).ToArray();

    private static ApprovalStepResponse CloneStep(ApprovalStepResponse step)
        => new()
        {
            Key = step.Key,
            Title = step.Title,
            Status = step.Status,
            Actor = CloneActor(step.Actor),
            Actors = step.Actors?.Select(item => CloneActor(item)!).ToArray(),
            Action = step.Action,
            Comment = step.Comment,
            Time = step.Time,
            Order = step.Order,
            Children = step.Children?.Select(CloneStep).ToArray(),
            Kind = step.Kind,
            SignMode = step.SignMode,
            RollbackPoint = step.RollbackPoint,
        };

    private static ApprovalActorResponse? CloneActor(ApprovalActorResponse? actor)
        => actor is null
            ? null
            : new ApprovalActorResponse { Id = actor.Id, Name = actor.Name, Status = actor.Status };

    private static (string? Value, string? Error) NormalizeRequired(string? value, string emptyMessage, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return (null, emptyMessage);
        }

        var trimmed = value.Trim();
        if (trimmed.Length > maxLength)
        {
            return (null, $"长度不能超过 {maxLength}");
        }

        return (trimmed, null);
    }

    private static string Clamp(string? value, int maxLength, string fallback)
    {
        var trimmed = string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();
        return trimmed.Length <= maxLength ? trimmed : trimmed[..maxLength];
    }

    private static ApprovalMutation Fail(int status, string message)
        => new(false, status, message, null, null, null);

    internal static string FormatTime(DateTime value) => value.ToString("yyyy-MM-dd HH:mm");

    private static List<ApprovalInstance> Seed()
    {
        var submit = "2026-06-28 10:24";
        var leadDone = "2026-06-26 17:40";
        var managerDone = "2026-06-26 17:50";
        return
        [
            new ApprovalInstance
            {
                Id = "AP-1001",
                Title = "工单升级：导出报表偶发 500",
                Category = "工单",
                TicketId = "TK-2048",
                Starter = "admin",
                Assignee = "admin",
                Cc = ["demo"],
                Status = "pending",
                CurrentStepKey = "lead",
                Reason = "数据分析页导出近 90 天报表约 1/5 概率 500，申请升级处理。",
                Amount = null,
                ActedBy = [],
                CreatedAt = submit,
                UpdatedAt = "2026-06-29 09:02",
                Steps = PendingTicketSteps("admin", "admin", submit),
            },
            new ApprovalInstance
            {
                Id = "AP-1002",
                Title = "工单结案：登录后跳回登录页",
                Category = "工单",
                TicketId = "TK-2041",
                Starter = "admin",
                Assignee = "admin",
                Cc = ["demo"],
                Status = "approved",
                CurrentStepKey = "archive",
                Reason = "token 续期已修复，申请归档。",
                Amount = null,
                ActedBy = ["admin"],
                CreatedAt = "2026-06-25 08:12",
                UpdatedAt = managerDone,
                Steps = ApprovedTicketSteps("admin", leadDone, managerDone),
            },
            new ApprovalInstance
            {
                Id = "AP-1003",
                Title = "请假：周五下午调休",
                Category = "请假",
                TicketId = null,
                Starter = "demo",
                Assignee = "demo",
                Cc = ["admin"],
                Status = "pending",
                CurrentStepKey = "lead",
                Reason = "周五下午处理个人事务，调休 0.5 天。",
                Amount = "0.5 天",
                ActedBy = [],
                CreatedAt = "2026-06-27 11:00",
                UpdatedAt = "2026-06-27 11:00",
                Steps = PendingLeaveSteps("demo", "demo", "2026-06-27 11:00"),
            },
            new ApprovalInstance
            {
                Id = "AP-1004",
                Title = "报销：线上会议软件年费",
                Category = "报销",
                TicketId = null,
                Starter = "admin",
                Assignee = "demo",
                Cc = ["demo"],
                Status = "pending",
                CurrentStepKey = "lead",
                Reason = "协作会议软件续费，请财务审核。",
                Amount = "1280",
                ActedBy = [],
                CreatedAt = "2026-06-27 16:40",
                UpdatedAt = "2026-06-28 09:15",
                Steps = PendingExpenseSteps("admin", "demo", "2026-06-27 16:40"),
            },
            new ApprovalInstance
            {
                Id = "AP-1005",
                Title = "工单升级：按部门筛选用户",
                Category = "工单",
                TicketId = "TK-2050",
                Starter = "admin",
                Assignee = "admin",
                Cc = ["admin"],
                Status = "rejected",
                CurrentStepKey = "lead",
                Reason = "用户列表增加部门筛选，申请排期。",
                Amount = null,
                ActedBy = ["admin"],
                CreatedAt = "2026-06-27 16:40",
                UpdatedAt = "2026-06-28 09:15",
                Steps = RejectedTicketSteps("admin", "2026-06-27 16:40", "2026-06-28 09:15"),
            },
        ];
    }

    private static ApprovalStepResponse[] DefaultPendingSteps(string starter, string assignee, string time)
        => PendingTicketSteps(starter, assignee, time);

    private static ApprovalStepResponse[] PendingTicketSteps(string starter, string assignee, string time)
        =>
        [
            StartStep(starter, time, 1),
            new()
            {
                Key = "lead",
                Title = "组长审批",
                Status = "active",
                Kind = "approve",
                SignMode = "sequential",
                Actor = Actor(assignee),
                Order = 2,
            },
            ManagerStep("pending", null, null, 3),
            ArchiveStep("pending", null, 4),
        ];

    private static ApprovalStepResponse[] PendingLeaveSteps(string starter, string assignee, string time)
        =>
        [
            StartStep(starter, time, 1),
            new()
            {
                Key = "lead",
                Title = "直属审批",
                Status = "active",
                Kind = "approve",
                SignMode = "sequential",
                Actor = Actor(assignee),
                Order = 2,
            },
            new()
            {
                Key = "hr",
                Title = "人事备案",
                Status = "pending",
                Kind = "cc",
                Actor = Actor("admin"),
                Order = 3,
                Children =
                [
                    new()
                    {
                        Key = "cc-hr",
                        Title = "抄送人事",
                        Status = "pending",
                        Kind = "cc",
                        Actor = Actor("admin"),
                    },
                ],
            },
        ];

    private static ApprovalStepResponse[] PendingExpenseSteps(string starter, string assignee, string time)
        =>
        [
            StartStep(starter, time, 1),
            new()
            {
                Key = "lead",
                Title = "直属审批",
                Status = "active",
                Kind = "approve",
                SignMode = "sequential",
                Actor = Actor(assignee),
                Order = 2,
            },
            new()
            {
                Key = "finance",
                Title = "财务审核",
                Status = "pending",
                Kind = "approve",
                SignMode = "orsign",
                Actor = Actor("admin"),
                Order = 3,
                Children =
                [
                    new()
                    {
                        Key = "cc-finance",
                        Title = "抄送财务",
                        Status = "pending",
                        Kind = "cc",
                        Actor = Actor("demo"),
                    },
                ],
            },
            new()
            {
                Key = "condition",
                Title = "金额大于 1000 需加签",
                Status = "pending",
                Kind = "condition",
                Order = 4,
            },
        ];

    private static ApprovalStepResponse[] ApprovedTicketSteps(string actor, string leadTime, string archiveTime)
        =>
        [
            StartStep(actor, "2026-06-25 08:12", 1),
            new()
            {
                Key = "lead",
                Title = "组长审批",
                Status = "approved",
                Kind = "approve",
                SignMode = "sequential",
                Action = "approve",
                Actor = Actor(actor),
                Comment = "已核实续期问题。",
                Time = leadTime,
                Order = 2,
            },
            ManagerStep("approved", actor, archiveTime, 3, "同意归档。"),
            ArchiveStep("approved", archiveTime, 4, "工单已归档。"),
        ];

    private static ApprovalStepResponse[] RejectedTicketSteps(string actor, string submitTime, string rejectTime)
        =>
        [
            StartStep(actor, submitTime, 1),
            new()
            {
                Key = "lead",
                Title = "组长审批",
                Status = "rejected",
                Kind = "approve",
                SignMode = "sequential",
                Action = "reject",
                Actor = Actor(actor),
                Comment = "本迭代不做，先记需求池。",
                Time = rejectTime,
                RollbackPoint = true,
                Order = 2,
            },
            ManagerStep("pending", null, null, 3),
            ArchiveStep("pending", null, 4),
        ];

    private static ApprovalStepResponse StartStep(string actor, string time, int order)
        => new()
        {
            Key = "start",
            Title = "提交申请",
            Status = "approved",
            Kind = "start",
            Action = "approve",
            Actor = Actor(actor),
            Comment = "请协助处理。",
            Time = time,
            Order = order,
        };

    private static ApprovalStepResponse ManagerStep(
        string status,
        string? actor,
        string? time,
        int order,
        string? comment = null)
        => new()
        {
            Key = "manager",
            Title = "经理审批",
            Status = status,
            Kind = "approve",
            SignMode = "countersign",
            Action = status == "approved" ? "approve" : null,
            Actor = Actor(actor ?? "admin"),
            Actors = ManagerActors(status),
            Comment = comment,
            Time = time,
            Order = order,
            Children =
            [
                new()
                {
                    Key = "cc-ops",
                    Title = "抄送运维",
                    Status = status == "approved" ? "approved" : status,
                    Kind = "cc",
                    Actor = Actor("demo"),
                    Time = time,
                },
            ],
        };

    private static ApprovalActorResponse[] ManagerActors(string status)
        =>
        [
            new() { Id = "wang", Name = "王经理", Status = "approved" },
            new() { Id = "li", Name = "李总监", Status = status == "approved" ? "approved" : "pending" },
        ];

    private static ApprovalStepResponse ArchiveStep(string status, string? time, int order, string? comment = null)
        => new()
        {
            Key = "archive",
            Title = "归档",
            Status = status,
            Kind = "approve",
            Action = status == "approved" ? "approve" : null,
            Actor = Actor("系统"),
            Comment = comment,
            Time = time,
            Order = order,
        };

    private static ApprovalActorResponse Actor(string name)
        => new() { Id = name, Name = name };

    private sealed class ApprovalInstance
    {
        public required string Id { get; set; }
        public required string Title { get; set; }
        public required string Category { get; set; }
        public string? TicketId { get; set; }
        public required string Starter { get; set; }
        public required string Assignee { get; set; }
        public required string[] Cc { get; set; }
        public required string Status { get; set; }
        public string? CurrentStepKey { get; set; }
        public required string Reason { get; set; }
        public string? Amount { get; set; }
        public required string[] ActedBy { get; set; }
        public required string CreatedAt { get; set; }
        public required string UpdatedAt { get; set; }
        public required ApprovalStepResponse[] Steps { get; set; }
    }
}

internal sealed class ApprovalStoreException(int status, string message) : Exception(message)
{
    public int Status { get; } = status;
}
