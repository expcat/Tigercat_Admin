namespace Tigercat.Admin.Api.Endpoints;

internal readonly record struct ApprovalMutation(
    bool Ok,
    int Status,
    string Message,
    ApprovalDetailResponse? Detail,
    string? TicketId,
    string? TicketStatus);

internal sealed class ApprovalInstance
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
    public ApprovalTaskResponse[]? Tasks { get; set; }
    public ApprovalHistoryEntryResponse[]? History { get; set; }
    public string? ResumeToNodeKey { get; set; }
    public Dictionary<string, string>? FormValues { get; set; }
}

internal sealed class ApprovalStore
{
    internal static readonly string[] AllowedLanes = ["todo", "done", "cc", "started"];
    internal static readonly string[] AllowedActions =
    [
        "approve", "reject", "transfer", "addsign", "return", "cancel", "withdraw", "comment", "request_changes",
    ];

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
                "todo" => query.Where(item => InTodo(item, username)),
                "done" => query.Where(item => item.ActedBy.Any(actor => WorkflowRuntime.SameActor(actor, username))),
                "cc" => query.Where(item => item.Cc.Any(actor => WorkflowRuntime.SameActor(actor, username))),
                "started" => query.Where(item => WorkflowRuntime.SameActor(item.Starter, username)),
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

    public ApprovalContactsResponse ListContacts() => MockDirectory.ListContacts();

    public ResolveApproversResponse ResolveApprovers(ResolveApproversRequest request)
        => new()
        {
            Actors = MockDirectory.Resolve(
                request.Source,
                request.Sources,
                request.Starter,
                request.FormValues,
                request.StarterPick),
        };

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
        var starterPick = (request.StarterPick ?? [])
            .Select(item => item?.Trim())
            .Where(item => !string.IsNullOrWhiteSpace(item))
            .Select(item => item!)
            .ToArray();
        var useTasks = request.UseTasks == true || string.Equals(request.Template, "countersign", StringComparison.OrdinalIgnoreCase);
        var template = string.IsNullOrWhiteSpace(request.Template) ? "ticket" : request.Template.Trim().ToLowerInvariant();

        lock (_gate)
        {
            var now = FormatTime(DateTime.Now);
            var id = $"AP-{_nextNumber++}";
            var formValues = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            if (starterPick.Length > 0)
            {
                formValues["starterPick"] = string.Join(",", starterPick);
            }

            if (!string.IsNullOrWhiteSpace(amount))
            {
                formValues["amount"] = amount;
            }

            var (steps, tasks, currentStepKey, resolvedAssignee) = BuildCreatedFlow(
                template,
                starter,
                assignee,
                now,
                useTasks,
                starterPick,
                formValues);

            var instance = new ApprovalInstance
            {
                Id = id,
                Title = title.Value!,
                Category = category,
                TicketId = ticketId,
                Starter = starter,
                Assignee = resolvedAssignee,
                Cc = cc,
                Status = "pending",
                CurrentStepKey = currentStepKey,
                Reason = reason,
                Amount = string.IsNullOrWhiteSpace(amount) ? null : amount,
                ActedBy = [],
                CreatedAt = now,
                UpdatedAt = now,
                Steps = steps,
                Tasks = tasks,
                History =
                [
                    new ApprovalHistoryEntryResponse
                    {
                        At = now,
                        ActorId = starter,
                        Action = "approve",
                        Comment = "提交申请",
                        NodeKey = "start",
                    },
                ],
                FormValues = formValues.Count == 0 ? null : formValues,
            };
            _items.Insert(0, instance);
            return new ApprovalMutation(true, 201, "Success", ToDetail(instance), instance.TicketId, null);
        }
    }

    public ApprovalMutation ApplyAction(string id, ApprovalActionRequest request, string username)
    {
        var actionName = request.Action?.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(actionName) || !AllowedActions.Contains(actionName))
        {
            return Fail(400, "无效的审批动作");
        }

        var comment = request.Comment is null ? null : Clamp(request.Comment, CommentMaxLength, "");
        var actor = string.IsNullOrWhiteSpace(username) ? "unknown" : username.Trim();

        if (actionName == "comment" && string.IsNullOrWhiteSpace(comment))
        {
            return Fail(400, "评论内容不能为空");
        }

        lock (_gate)
        {
            var item = Find(id);
            if (item is null)
            {
                return Fail(404, "审批实例不存在");
            }

            var runtimeAction = BuildRuntimeAction(request, actionName, comment, actor, FormatTime(DateTime.Now));
            if (actionName is "transfer" && runtimeAction.Assignee is null)
            {
                return Fail(400, "转交对象不能为空");
            }

            if (actionName == "addsign" && (runtimeAction.Assignees is null || runtimeAction.Assignees.Length == 0))
            {
                return Fail(400, "加签对象不能为空");
            }

            if (actionName == "return" && string.IsNullOrWhiteSpace(runtimeAction.TargetNodeKey))
            {
                return Fail(400, "请选择退回节点");
            }

            var formStep = WorkflowRuntime.FindStep(item.Steps, item.CurrentStepKey)
                ?? WorkflowRuntime.FindActive(item.Steps);
            if (!WorkflowRuntime.TryApply(item, runtimeAction, out var error))
            {
                return Fail(400, error ?? "当前动作无法执行");
            }

            ApplySubmittedFormValues(item, request.FormValues, formStep);

            var now = runtimeAction.At!;
            if (actionName is not "comment")
            {
                RememberActor(item, actor);
            }
            else
            {
                var active = WorkflowRuntime.FindActive(item.Steps) ?? WorkflowRuntime.FindStep(item.Steps, item.CurrentStepKey);
                if (active is not null)
                {
                    active.Comment = string.IsNullOrWhiteSpace(active.Comment) ? comment : $"{active.Comment}\n{comment}";
                    active.Time = now;
                }
            }

            item.UpdatedAt = now;
            var ticketStatus = ResolveTicketStatus(item, actionName);
            return new ApprovalMutation(true, 200, "Success", ToDetail(item), item.TicketId, ticketStatus);
        }
    }

    private static WorkflowRuntimeAction BuildRuntimeAction(
        ApprovalActionRequest request,
        string actionName,
        string? comment,
        string actor,
        string now)
    {
        var transferTo = request.TransferTo?.Trim();
        var assignee = request.Assignee is not null
            ? MockDirectory.ActorFromId(request.Assignee.Id ?? request.Assignee.Name)
            : string.IsNullOrWhiteSpace(transferTo)
                ? null
                : MockDirectory.ActorFromId(Clamp(transferTo, ActorMaxLength, transferTo));

        var addsignIds = (request.AddsignTo ?? [])
            .Select(item => item?.Trim())
            .Where(item => !string.IsNullOrWhiteSpace(item))
            .Select(item => item!)
            .ToArray();
        var assignees = request.Assignees is { Length: > 0 }
            ? request.Assignees.Select(item => MockDirectory.ActorFromId(item.Id ?? item.Name)).ToArray()
            : addsignIds.Select(MockDirectory.ActorFromId).ToArray();

        return new WorkflowRuntimeAction
        {
            Action = actionName,
            ActorId = actor,
            TaskId = request.TaskId,
            NodeKey = request.NodeKey,
            Comment = comment,
            At = now,
            Assignee = assignee,
            Assignees = assignees.Length == 0 ? null : assignees,
            Position = request.Position,
            SignMode = request.SignMode,
            TargetNodeKey = request.TargetNodeKey,
            Resume = request.Resume,
            TempNodeKey = request.TempNodeKey,
        };
    }

    private static bool InTodo(ApprovalInstance item, string username)
    {
        if (item.Status is not "pending")
        {
            return false;
        }

        if (WorkflowRuntime.UsesTasks(item))
        {
            return WorkflowRuntime.HasOpenTaskFor(item, username);
        }

        return WorkflowRuntime.SameActor(item.Assignee, username);
    }

    private ApprovalInstance? Find(string id)
        => _items.FirstOrDefault(item => string.Equals(item.Id, id, StringComparison.OrdinalIgnoreCase));

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

        if (action is "transfer" or "comment" or "addsign" or "return" or "cancel" or "withdraw" or "request_changes")
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

    private static void RememberActor(ApprovalInstance item, string actor)
    {
        if (item.ActedBy.Any(existing => WorkflowRuntime.SameActor(existing, actor)))
        {
            return;
        }

        item.ActedBy = [.. item.ActedBy, actor];
    }

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
            Tasks = item.Tasks?.Select(CloneTask).ToArray(),
            History = item.History?.Select(CloneHistory).ToArray(),
            ResumeToNodeKey = item.ResumeToNodeKey,
            ReturnTargets = WorkflowRuntime.ReturnTargets(item),
            FormValues = BuildFormValues(item),
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
            Actor = WorkflowRuntime.CloneActor(step.Actor),
            Actors = step.Actors?.Select(item => WorkflowRuntime.CloneActor(item)!).ToArray(),
            Action = step.Action,
            Comment = step.Comment,
            Time = step.Time,
            Order = step.Order,
            Children = step.Children?.Select(CloneStep).ToArray(),
            Kind = step.Kind,
            SignMode = step.SignMode,
            RollbackPoint = step.RollbackPoint,
            ReturnTarget = step.ReturnTarget,
            Temporary = step.Temporary,
            Origin = step.Origin is null
                ? null
                : new ApprovalAddsignOriginDto
                {
                    Type = step.Origin.Type,
                    Position = step.Origin.Position,
                    FromNodeKey = step.Origin.FromNodeKey,
                    FromTaskId = step.Origin.FromTaskId,
                },
            ApproverPolicy = step.ApproverPolicy?.Select(CloneSource).ToArray(),
            ButtonPolicy = CloneButtonPolicy(step.ButtonPolicy),
            FieldPermissions = step.FieldPermissions is null ? null : new Dictionary<string, string>(step.FieldPermissions),
            Advanced = step.Advanced is null
                ? null
                : new ApprovalAdvancedDto
                {
                    EmptyApprover = step.Advanced.EmptyApprover,
                    AutoDecide = step.Advanced.AutoDecide,
                    ReturnResume = step.Advanced.ReturnResume,
                    Timeout = step.Advanced.Timeout is null
                        ? null
                        : new ApprovalTimeoutDto
                        {
                            Action = step.Advanced.Timeout.Action,
                            DurationLabel = step.Advanced.Timeout.DurationLabel,
                        },
                },
            Tasks = step.Tasks?.Select(CloneTask).ToArray(),
            PendingAfterAddsign = step.PendingAfterAddsign is null
                ? null
                : new ApprovalPendingAfterAddsignDto
                {
                    Assignees = [.. step.PendingAfterAddsign.Assignees.Select(item => WorkflowRuntime.CloneActor(item)!)],
                    SignMode = step.PendingAfterAddsign.SignMode,
                    Comment = step.PendingAfterAddsign.Comment,
                    FromTaskId = step.PendingAfterAddsign.FromTaskId,
                    TempNodeKey = step.PendingAfterAddsign.TempNodeKey,
                },
        };

    private static ApproverSourceDto CloneSource(ApproverSourceDto source)
        => new()
        {
            Type = source.Type,
            Actors = source.Actors?.Select(item => WorkflowRuntime.CloneActor(item)!).ToArray(),
            Multiple = source.Multiple,
            SignMode = source.SignMode,
            Key = source.Key,
            Level = source.Level,
            UpTo = source.UpTo,
        };

    private static ApprovalButtonPolicyDto? CloneButtonPolicy(ApprovalButtonPolicyDto? policy)
    {
        if (policy is null)
        {
            return null;
        }

        return new ApprovalButtonPolicyDto
        {
            Buttons = policy.Buttons?.Select(button => new ApprovalButtonConfigDto
            {
                Action = button.Action,
                Enabled = button.Enabled,
                Label = button.Label,
                CommentRequired = button.CommentRequired,
                Placement = button.Placement,
            }).ToArray(),
            Addsign = policy.Addsign is null ? null : new ApprovalAddsignConfigDto { Positions = policy.Addsign.Positions is null ? null : [.. policy.Addsign.Positions] },
            ReturnResume = policy.ReturnResume,
        };
    }

    private static ApprovalTaskResponse CloneTask(ApprovalTaskResponse task)
        => new()
        {
            Id = task.Id,
            NodeKey = task.NodeKey,
            Assignee = WorkflowRuntime.CloneActor(task.Assignee)!,
            Status = task.Status,
            Action = task.Action,
            Comment = task.Comment,
            ActedAt = task.ActedAt,
            Origin = task.Origin,
        };

    private static ApprovalHistoryEntryResponse CloneHistory(ApprovalHistoryEntryResponse entry)
        => new()
        {
            At = entry.At,
            ActorId = entry.ActorId,
            Action = entry.Action,
            Comment = entry.Comment,
            NodeKey = entry.NodeKey,
            TaskId = entry.TaskId,
        };

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

    private static (ApprovalStepResponse[] Steps, ApprovalTaskResponse[]? Tasks, string CurrentStepKey, string Assignee) BuildCreatedFlow(
        string template,
        string starter,
        string assignee,
        string now,
        bool useTasks,
        string[] starterPick,
        Dictionary<string, string> formValues)
    {
        if (template == "countersign")
        {
            var actors = new[]
            {
                MockDirectory.ActorFromId("admin"),
                MockDirectory.ActorFromId("demo"),
                MockDirectory.ActorFromId("wang"),
            };
            var names = starterPick.Length >= 2
                ? starterPick
                : ["admin", "demo", "wang"];
            var resolved = names.Select(MockDirectory.ActorFromId).ToArray();
            var steps = CountersignPendingSteps(starter, resolved, now);
            var node = steps.First(step => step.Key == "countersign");
            var tasks = useTasks ? WorkflowRuntime.SeedTasksForNode(node) : null;
            return (steps, tasks, "countersign", ActorIdOr(resolved[0], assignee));
        }

        if (template == "sources")
        {
            var ctxStarter = starter;
            var steps = SourceDemoSteps(starter, now, formValues, starterPick);
            ApprovalTaskResponse[]? tasks = null;
            if (useTasks)
            {
                var lead = steps.First(step => step.Key == "self");
                tasks = WorkflowRuntime.SeedTasksForNode(lead);
            }

            return (steps, tasks, "self", ctxStarter);
        }

        var ticketSteps = PendingTicketSteps(starter, assignee, now);
        ApprovalTaskResponse[]? ticketTasks = null;
        if (useTasks)
        {
            var lead = ticketSteps.First(step => step.Key == "lead");
            ticketTasks = WorkflowRuntime.SeedTasksForNode(lead);
        }

        return (ticketSteps, ticketTasks, "lead", assignee);
    }

    private static string ActorIdOr(ApprovalActorResponse actor, string fallback)
        => actor.Id ?? actor.Name ?? fallback;

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
            SeedCountersignDemo(),
            SeedFinancePurchaseDemo(),
        ];
    }

    private static ApprovalInstance SeedCountersignDemo()
    {
        var now = "2026-09-10 09:00";
        var actors = new[]
        {
            MockDirectory.ActorFromId("admin"),
            MockDirectory.ActorFromId("demo"),
            MockDirectory.ActorFromId("wang"),
        };
        actors[0].Status = "approved";
        actors[1].Status = "pending";
        actors[2].Status = "pending";
        var steps = CountersignPendingSteps("admin", actors, now);
        var node = steps.First(step => step.Key == "countersign");
        node.Status = "active";
        var tasks = WorkflowRuntime.SeedTasksForNode(node);
        tasks[0].Status = "approved";
        tasks[0].Action = "approve";
        tasks[0].ActedAt = now;
        tasks[0].Comment = "先签一票";
        return new ApprovalInstance
        {
            Id = "AP-1006",
            Title = "会签演示：采购权限开通 1/3",
            Category = "采购",
            TicketId = null,
            Starter = "admin",
            Assignee = "demo",
            Cc = ["fang"],
            Status = "pending",
            CurrentStepKey = "countersign",
            Reason = "按人会签演示：管理员已同意，待 demo / 王经理。",
            Amount = "8600",
            ActedBy = ["admin"],
            CreatedAt = now,
            UpdatedAt = now,
            Steps = steps,
            Tasks = tasks,
            History =
            [
                new ApprovalHistoryEntryResponse
                {
                    At = now,
                    ActorId = "admin",
                    Action = "approve",
                    Comment = "先签一票",
                    NodeKey = "countersign",
                    TaskId = tasks[0].Id,
                },
            ],
            FormValues = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                ["amount"] = "8600",
                ["reason"] = "按人会签演示：管理员已同意，待 demo / 王经理。",
            },
        };
    }

    private static ApprovalInstance SeedFinancePurchaseDemo()
    {
        var submit = "2026-09-10 10:00";
        var managerDone = "2026-09-10 10:20";
        var financeActors = new[]
        {
            MockDirectory.ActorFromId("chen"),
            MockDirectory.ActorFromId("zhao"),
        };
        financeActors[0].Status = "pending";
        financeActors[1].Status = "pending";
        var finance = new ApprovalStepResponse
        {
            Key = "finance",
            Title = "财务会签",
            Status = "active",
            Kind = "approve",
            SignMode = "countersign",
            Actor = financeActors[0],
            Actors = financeActors,
            ApproverPolicy =
            [
                new ApproverSourceDto { Type = "group", Key = "finance" },
            ],
            ButtonPolicy = FullButtonPolicy(),
            FieldPermissions = DemoFieldPermissions(amountEditable: true),
            Order = 3,
        };
        var tasks = WorkflowRuntime.SeedTasksForNode(finance);
        foreach (var task in tasks)
        {
            task.Status = "active";
        }

        return new ApprovalInstance
        {
            Id = "AP-1007",
            Title = "采购：显示器与扩展坞",
            Category = "采购",
            TicketId = null,
            Starter = "admin",
            Assignee = "chen",
            Cc = ["fang"],
            Status = "pending",
            CurrentStepKey = "finance",
            Reason = "金额字段仅财务节点可编。经理已过，待陈财务 / 赵主管会签。",
            Amount = "4800",
            ActedBy = ["admin", "wang"],
            CreatedAt = submit,
            UpdatedAt = managerDone,
            Steps =
            [
                StartStep("admin", submit, 1),
                new()
                {
                    Key = "manager",
                    Title = "经理或签",
                    Status = "approved",
                    Kind = "approve",
                    SignMode = "orsign",
                    Action = "approve",
                    Actor = Actor("wang"),
                    Actors = [Actor("wang"), Actor("li")],
                    ApproverPolicy = [new ApproverSourceDto { Type = "role", Key = "manager" }],
                    ButtonPolicy = FullButtonPolicy(),
                    FieldPermissions = DemoFieldPermissions(amountEditable: false),
                    Comment = "规格可以，交给财务。",
                    Time = managerDone,
                    Order = 2,
                },
                finance,
                new()
                {
                    Key = "cc-hr",
                    Title = "抄送人事",
                    Status = "pending",
                    Kind = "cc",
                    Actor = Actor("fang"),
                    Order = 4,
                },
                ArchiveStep("pending", null, 5),
            ],
            Tasks = tasks,
            History =
            [
                new ApprovalHistoryEntryResponse
                {
                    At = submit,
                    ActorId = "admin",
                    Action = "approve",
                    Comment = "提交申请",
                    NodeKey = "start",
                },
                new ApprovalHistoryEntryResponse
                {
                    At = managerDone,
                    ActorId = "wang",
                    Action = "approve",
                    Comment = "规格可以，交给财务。",
                    NodeKey = "manager",
                },
            ],
            FormValues = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                ["amount"] = "4800",
                ["reason"] = "金额字段仅财务节点可编。经理已过，待陈财务 / 赵主管会签。",
            },
        };
    }

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
                ApproverPolicy = [new ApproverSourceDto { Type = "fixed", Actors = [Actor(assignee)] }],
                ButtonPolicy = FullButtonPolicy(),
                FieldPermissions = DemoFieldPermissions(amountEditable: false),
                Order = 2,
            },
            ManagerStep("pending", null, null, 3),
            ArchiveStep("pending", null, 4),
        ];

    private static ApprovalStepResponse[] CountersignPendingSteps(string starter, ApprovalActorResponse[] actors, string time)
        =>
        [
            StartStep(starter, time, 1),
            new()
            {
                Key = "countersign",
                Title = "会签审批",
                Status = "active",
                Kind = "approve",
                SignMode = "countersign",
                Actor = actors[0],
                Actors = actors,
                ApproverPolicy =
                [
                    new ApproverSourceDto { Type = "fixed", Actors = actors },
                ],
                ButtonPolicy = FullButtonPolicy(),
                FieldPermissions = DemoFieldPermissions(amountEditable: false),
                Order = 2,
            },
        ];

    private static ApprovalStepResponse[] SourceDemoSteps(
        string starter,
        string time,
        Dictionary<string, string> formValues,
        string[] starterPick)
    {
        var ctx = new Dictionary<string, string>(formValues, StringComparer.OrdinalIgnoreCase);
        var self = MockDirectory.Resolve(new ApproverSourceDto { Type = "self" }, null, starter, ctx, starterPick);
        var role = MockDirectory.Resolve(new ApproverSourceDto { Type = "role", Key = "manager" }, null, starter, ctx, starterPick);
        var group = MockDirectory.Resolve(new ApproverSourceDto { Type = "group", Key = "finance" }, null, starter, ctx, starterPick);
        var leader = MockDirectory.Resolve(new ApproverSourceDto { Type = "dept_leader" }, null, starter, ctx, starterPick);
        var chain = MockDirectory.Resolve(new ApproverSourceDto { Type = "manager_chain", UpTo = 2 }, null, starter, ctx, starterPick);
        var pick = MockDirectory.Resolve(new ApproverSourceDto { Type = "starter_pick" }, null, starter, ctx, starterPick);
        return
        [
            StartStep(starter, time, 1),
            SourceStep("self", "提交人本人", "sequential", self, 2, "active"),
            SourceStep("role", "角色：经理", "orsign", role, 3, "pending"),
            SourceStep("group", "用户组：财务", "countersign", group, 4, "pending"),
            SourceStep("dept_leader", "部门负责人", "sequential", leader, 5, "pending"),
            SourceStep("manager_chain", "连续上级", "sequential", chain, 6, "pending"),
            SourceStep("starter_pick", "提交人自选", "sequential", pick.Length == 0 ? [Actor(starter)] : pick, 7, "pending"),
            ArchiveStep("pending", null, 8),
        ];
    }

    private static ApprovalStepResponse SourceStep(
        string key,
        string title,
        string signMode,
        ApprovalActorResponse[] actors,
        int order,
        string status)
        => new()
        {
            Key = key,
            Title = title,
            Status = status,
            Kind = "approve",
            SignMode = signMode,
            Actor = actors.FirstOrDefault() ?? Actor("admin"),
            Actors = actors,
            ApproverPolicy = [new ApproverSourceDto { Type = key == "starter_pick" ? "starter_pick" : key, Key = key is "role" ? "manager" : key is "group" ? "finance" : null, UpTo = key == "manager_chain" ? 2 : null }],
            Order = order,
        };

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
                ButtonPolicy = FullButtonPolicy(),
                FieldPermissions = DemoFieldPermissions(amountEditable: false),
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
                ButtonPolicy = FullButtonPolicy(),
                FieldPermissions = DemoFieldPermissions(amountEditable: false),
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
                ButtonPolicy = FullButtonPolicy(),
                FieldPermissions = DemoFieldPermissions(amountEditable: true),
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
                ButtonPolicy = FullButtonPolicy(),
                FieldPermissions = DemoFieldPermissions(amountEditable: false),
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
                ButtonPolicy = FullButtonPolicy(),
                FieldPermissions = DemoFieldPermissions(amountEditable: false),
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
            ButtonPolicy = FullButtonPolicy(),
            FieldPermissions = DemoFieldPermissions(amountEditable: true, initiate: true),
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
            ApproverPolicy =
            [
                new ApproverSourceDto { Type = "role", Key = "manager" },
            ],
            ButtonPolicy = FullButtonPolicy(),
            FieldPermissions = DemoFieldPermissions(amountEditable: false),
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
            ButtonPolicy = FullButtonPolicy(),
            FieldPermissions = DemoFieldPermissions(amountEditable: false),
        };

    private static Dictionary<string, string> DemoFieldPermissions(bool amountEditable, bool initiate = false)
    {
        var rest = initiate ? "editable" : "readonly";
        return new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["title"] = rest,
            ["category"] = rest,
            ["reason"] = rest,
            ["amount"] = amountEditable ? "editable" : rest,
            ["ticketId"] = rest,
            ["starter"] = "readonly",
        };
    }

    private static Dictionary<string, string> BuildFormValues(ApprovalInstance item)
    {
        var values = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["title"] = item.Title,
            ["category"] = item.Category,
            ["starter"] = item.Starter,
            ["reason"] = item.Reason,
            ["amount"] = item.Amount ?? "",
            ["ticketId"] = item.TicketId ?? "",
        };
        if (item.FormValues is null)
        {
            return values;
        }

        foreach (var pair in item.FormValues)
        {
            values[pair.Key] = pair.Value;
        }

        values["title"] = item.Title;
        values["category"] = item.Category;
        values["starter"] = item.Starter;
        values["reason"] = item.Reason;
        values["amount"] = item.Amount ?? values.GetValueOrDefault("amount") ?? "";
        values["ticketId"] = item.TicketId ?? values.GetValueOrDefault("ticketId") ?? "";
        return values;
    }

    private static void ApplySubmittedFormValues(
        ApprovalInstance item,
        Dictionary<string, string>? submitted,
        ApprovalStepResponse? step)
    {
        if (submitted is null || submitted.Count == 0)
        {
            return;
        }

        var initiate = string.Equals(step?.Kind, "start", StringComparison.OrdinalIgnoreCase);
        item.FormValues ??= new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var pair in submitted)
        {
            if (!IsFieldEditable(pair.Key, step?.FieldPermissions, initiate))
            {
                continue;
            }

            var value = pair.Value?.Trim() ?? "";
            item.FormValues[pair.Key] = value;
            if (string.Equals(pair.Key, "amount", StringComparison.OrdinalIgnoreCase))
            {
                item.Amount = string.IsNullOrWhiteSpace(value) ? null : Clamp(value, AmountMaxLength, value);
            }
            else if (string.Equals(pair.Key, "reason", StringComparison.OrdinalIgnoreCase))
            {
                item.Reason = Clamp(value, ReasonMaxLength, item.Reason);
            }
            else if (string.Equals(pair.Key, "title", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(value))
            {
                item.Title = Clamp(value, TitleMaxLength, item.Title);
            }
            else if (string.Equals(pair.Key, "category", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(value))
            {
                item.Category = Clamp(value, CategoryMaxLength, item.Category);
            }
        }
    }

    private static bool IsFieldEditable(string name, Dictionary<string, string>? permissions, bool initiate)
    {
        if (permissions is not null && permissions.TryGetValue(name, out var mapped))
        {
            return string.Equals(mapped, "editable", StringComparison.OrdinalIgnoreCase);
        }

        return initiate;
    }

    private static ApprovalButtonPolicyDto FullButtonPolicy()
        => new()
        {
            Buttons =
            [
                new() { Action = "approve", Enabled = true, Placement = "bar" },
                new() { Action = "reject", Enabled = true, Placement = "bar", CommentRequired = true },
                new() { Action = "transfer", Enabled = true, Placement = "more" },
                new() { Action = "addsign", Enabled = true, Placement = "more" },
                new() { Action = "return", Enabled = true, Placement = "more", CommentRequired = true },
                new() { Action = "cancel", Enabled = true, Placement = "bar" },
                new() { Action = "comment", Enabled = true, Placement = "bar" },
                new() { Action = "request_changes", Enabled = true, Placement = "more", CommentRequired = true },
            ],
            Addsign = new ApprovalAddsignConfigDto { Positions = ["before", "after"] },
            ReturnResume = "resequence",
        };

    private static ApprovalActorResponse Actor(string name)
        => MockDirectory.ActorFromId(name);
}

internal sealed class ApprovalStoreException(int status, string message) : Exception(message)
{
    public int Status { get; } = status;
}
