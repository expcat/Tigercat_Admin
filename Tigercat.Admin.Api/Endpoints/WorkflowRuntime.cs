namespace Tigercat.Admin.Api.Endpoints;

internal sealed class WorkflowRuntimeAction
{
    public required string Action { get; init; }
    public string? ActorId { get; init; }
    public string? TaskId { get; init; }
    public string? NodeKey { get; init; }
    public string? Comment { get; init; }
    public string? At { get; init; }
    public ApprovalActorResponse? Assignee { get; init; }
    public ApprovalActorResponse[]? Assignees { get; init; }
    public string? Position { get; init; }
    public string? SignMode { get; init; }
    public string? TargetNodeKey { get; init; }
    public string? Resume { get; init; }
    public string? TempNodeKey { get; init; }
}

internal static class WorkflowRuntime
{
    private static readonly HashSet<string> TerminalInstance = new(StringComparer.OrdinalIgnoreCase)
    {
        "approved", "rejected", "canceled",
    };

    private static readonly HashSet<string> OpenTask = new(StringComparer.OrdinalIgnoreCase)
    {
        "pending", "active",
    };

    public static bool UsesTasks(ApprovalInstance item) => item.Tasks is not null;

    public static bool TryApply(ApprovalInstance item, WorkflowRuntimeAction action, out string? error)
    {
        error = null;
        if (item.Steps.Length == 0)
        {
            error = "当前没有可处理的审批步骤";
            return false;
        }

        var name = NormalizeAction(action.Action);
        if (name is null)
        {
            error = "无效的审批动作";
            return false;
        }

        if (TerminalInstance.Contains(item.Status ?? "") && name != "comment")
        {
            error = "当前审批已结束，不能再操作";
            return false;
        }

        var node = CurrentNode(item, action);
        if (node is null && name is not "cancel" and not "comment")
        {
            error = "当前没有可处理的审批步骤";
            return false;
        }

        var usesTasks = UsesTasks(item);
        var task = node is not null && usesTasks ? CurrentTask(item, node, action) : null;

        var ok = name switch
        {
            "approve" => node is not null && (usesTasks
                ? task is not null && ApplyApproveTask(item, node, task, action)
                : ApplyApproveNode(item, node, action)),
            "reject" => node is not null && ApplyReject(item, node, usesTasks ? task : null, action),
            "transfer" => node is not null && ApplyTransfer(item, node, usesTasks ? task : null, action),
            "addsign" => node is not null && ApplyAddsign(item, node, usesTasks ? task : null, action),
            "return" => node is not null && ApplyReturn(item, action, node),
            "request_changes" => ApplyRequestChanges(item, action, node),
            "cancel" => ApplyCancel(item, node, action),
            "comment" => true,
            _ => false,
        };

        if (!ok)
        {
            error = ErrorFor(name);
            return false;
        }

        PushHistory(item, action, node?.Key, task?.Id);
        SyncInstanceCursor(item);
        return true;
    }

    public static ApprovalReturnTargetResponse[] ReturnTargets(ApprovalInstance item)
    {
        var currentKey = item.CurrentStepKey ?? FindActive(item.Steps)?.Key;
        if (string.IsNullOrWhiteSpace(currentKey))
        {
            return [];
        }

        return [.. GetReturnCandidates(item, currentKey).Select(step =>
        {
            var actors = ResolveActors(step);
            var names = actors
                .Select(actor => actor.Name)
                .Where(name => !string.IsNullOrWhiteSpace(name))
                .ToArray();
            return new ApprovalReturnTargetResponse
            {
                Key = step.Key,
                Title = step.Title,
                Kind = ResolveKind(step),
                ActorName = names.Length == 0 ? null : string.Join("、", names),
                Status = ResolveStatus(step),
            };
        })];
    }

    public static ApprovalTaskResponse[] SeedTasksForNode(ApprovalStepResponse node, string origin = "definition")
    {
        var actors = ResolveActors(node);
        var signMode = ResolveSignMode(node);
        return
        [
            .. actors.Select((actor, index) => new ApprovalTaskResponse
            {
                Id = $"{node.Key}:{ActorId(actor) ?? index.ToString()}",
                NodeKey = node.Key,
                Assignee = CloneActor(actor)!,
                Status = signMode == "sequential" && index == 0 ? "active" : "pending",
                Origin = origin,
            }),
        ];
    }

    private static string? NormalizeAction(string? action)
    {
        var name = action?.Trim().ToLowerInvariant();
        if (name is "withdraw")
        {
            return "cancel";
        }

        return name is "approve" or "reject" or "transfer" or "addsign" or "return"
            or "cancel" or "comment" or "request_changes"
            ? name
            : null;
    }

    private static string ErrorFor(string action) => action switch
    {
        "transfer" => "转交对象不能为空",
        "addsign" => "加签对象不能为空",
        "return" or "request_changes" => "没有可退回的节点",
        "cancel" => "只有发起人可以撤回",
        "approve" => "当前用户没有可处理的审批任务",
        "reject" => "当前用户没有可处理的审批任务",
        _ => "当前动作无法执行",
    };

    private static ApprovalStepResponse? CurrentNode(ApprovalInstance item, WorkflowRuntimeAction action)
    {
        if (!string.IsNullOrWhiteSpace(action.NodeKey))
        {
            return FindStep(item.Steps, action.NodeKey);
        }

        if (!string.IsNullOrWhiteSpace(item.CurrentStepKey))
        {
            var byCursor = FindStep(item.Steps, item.CurrentStepKey);
            if (byCursor is not null)
            {
                return byCursor;
            }
        }

        return FindActive(item.Steps) ?? Flatten(item.Steps).FirstOrDefault(step => ResolveStatus(step) is "pending" or "active");
    }

    private static ApprovalTaskResponse? CurrentTask(
        ApprovalInstance item,
        ApprovalStepResponse node,
        WorkflowRuntimeAction action)
    {
        var tasks = NodeTasks(item, node.Key);
        if (!string.IsNullOrWhiteSpace(action.TaskId))
        {
            return tasks.FirstOrDefault(task => task.Id == action.TaskId);
        }

        if (!string.IsNullOrWhiteSpace(action.ActorId))
        {
            var match = tasks.FirstOrDefault(task =>
                SameActor(task.Assignee.Id, action.ActorId) &&
                (IsOpen(task) || string.Equals(task.Status, "blocked", StringComparison.OrdinalIgnoreCase)));
            if (match is not null)
            {
                return match;
            }
        }

        if (ResolveSignMode(node) == "sequential")
        {
            return tasks.FirstOrDefault(task => task.Status == "active") ?? tasks.FirstOrDefault(IsOpen);
        }

        return tasks.FirstOrDefault(IsOpen);
    }

    private static bool IsTaskActionable(ApprovalStepResponse node, ApprovalTaskResponse task, IEnumerable<ApprovalTaskResponse>? all)
    {
        if (!IsOpen(task))
        {
            return false;
        }

        if (ResolveSignMode(node) != "sequential")
        {
            return true;
        }

        if (task.Status == "active")
        {
            return true;
        }

        var open = (all ?? []).Where(item => item.NodeKey == node.Key && IsOpen(item)).ToArray();
        var active = open.FirstOrDefault(item => item.Status == "active") ?? open.FirstOrDefault();
        return active?.Id == task.Id;
    }

    private static void PushHistory(ApprovalInstance item, WorkflowRuntimeAction action, string? nodeKey, string? taskId)
    {
        item.History =
        [
            .. item.History ?? [],
            new ApprovalHistoryEntryResponse
            {
                At = action.At ?? "",
                ActorId = action.ActorId ?? "",
                Action = NormalizeAction(action.Action) ?? action.Action,
                Comment = action.Comment,
                NodeKey = nodeKey,
                TaskId = taskId,
            },
        ];
    }

    private static void CancelOpenTasks(ApprovalInstance item)
    {
        if (item.Tasks is null)
        {
            return;
        }

        foreach (var task in item.Tasks)
        {
            if (IsOpen(task) || string.Equals(task.Status, "blocked", StringComparison.OrdinalIgnoreCase))
            {
                task.Status = "canceled";
            }
        }
    }

    private static void SyncActorStatuses(ApprovalInstance item, string nodeKey)
    {
        var tasks = NodeTasks(item, nodeKey);
        if (tasks.Length == 0)
        {
            return;
        }

        var byId = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var task in tasks)
        {
            var id = ActorId(task.Assignee);
            if (id is null)
            {
                continue;
            }

            var status = task.Status is "blocked" or "active" ? "pending" : task.Status;
            byId[id] = ToStepStatus(status);
        }

        PatchStep(item, nodeKey, step =>
        {
            if (step.Actors is { Length: > 0 })
            {
                foreach (var actor in step.Actors)
                {
                    var id = ActorId(actor);
                    if (id is not null && byId.TryGetValue(id, out var status))
                    {
                        actor.Status = status;
                    }
                }
            }

            if (step.Actor is not null)
            {
                var id = ActorId(step.Actor);
                var status = id is not null && byId.TryGetValue(id, out var mapped)
                    ? mapped
                    : ToStepStatus(tasks[0].Status);
                step.Actor.Status = status;
            }
        });
    }

    private static string ToStepStatus(string? status)
        => status is "approved" or "rejected" or "canceled" or "active" or "pending" ? status : "pending";

    private static void MarkNode(ApprovalInstance item, string nodeKey, string status, Action<ApprovalStepResponse>? extra = null)
    {
        PatchStep(item, nodeKey, step =>
        {
            step.Status = status;
            extra?.Invoke(step);
        });
    }

    private static string? NextActionableKey(ApprovalInstance item, string fromKey)
    {
        var flat = Flatten(item.Steps);
        var index = flat.FindIndex(step => step.Key == fromKey);
        if (index < 0)
        {
            return null;
        }

        for (var i = index + 1; i < flat.Count; i++)
        {
            var step = flat[i];
            var kind = ResolveKind(step);
            var status = ResolveStatus(step);
            if (kind == "condition")
            {
                continue;
            }

            if (kind == "cc")
            {
                return step.Key;
            }

            if (kind is "start" or "approve" && status is "pending" or "active")
            {
                return step.Key;
            }
        }

        return null;
    }

    private static void EnterNode(ApprovalInstance item, string nodeKey, WorkflowRuntimeAction action, int depth)
    {
        if (depth > 32)
        {
            return;
        }

        var node = FindStep(item.Steps, nodeKey);
        if (node is null)
        {
            return;
        }

        var kind = ResolveKind(node);
        item.CurrentStepKey = nodeKey;
        item.Status = "pending";

        if (kind == "cc")
        {
            MarkNode(item, nodeKey, "approved");
            CompleteNode(item, nodeKey, action, depth + 1);
            return;
        }

        if (kind == "condition")
        {
            var child = node.Children?.FirstOrDefault(itemChild =>
            {
                var childKind = ResolveKind(itemChild);
                var childStatus = ResolveStatus(itemChild);
                return childKind is "approve" or "start" or "cc" && childStatus is "pending" or "active";
            });
            if (child is not null)
            {
                EnterNode(item, child.Key, action, depth + 1);
                return;
            }

            CompleteNode(item, nodeKey, action, depth + 1);
            return;
        }

        var autoDecide = node.Advanced?.AutoDecide;
        if (autoDecide == "auto_pass")
        {
            MarkNode(item, nodeKey, "approved", step => step.Action = "approve");
            CompleteNode(item, nodeKey, action, depth + 1);
            return;
        }

        if (autoDecide == "auto_reject")
        {
            MarkNode(item, nodeKey, "rejected", step =>
            {
                step.Action = "reject";
                step.RollbackPoint = true;
            });
            item.Status = "rejected";
            CancelOpenTasks(item);
            return;
        }

        MarkNode(item, nodeKey, "active");
        if (!UsesTasks(item))
        {
            return;
        }

        var tasks = NodeTasks(item, nodeKey);
        if (tasks.Length == 0)
        {
            var seeded = SeedTasksForNode(node);
            if (seeded.Length == 0)
            {
                if (node.Advanced?.EmptyApprover == "skip_pass")
                {
                    MarkNode(item, nodeKey, "approved");
                    CompleteNode(item, nodeKey, action, depth + 1);
                }

                return;
            }

            ReplaceNodeTasks(item, nodeKey, seeded);
        }
        else
        {
            var signMode = ResolveSignMode(node);
            for (var i = 0; i < tasks.Length; i++)
            {
                var task = tasks[i];
                if (task.Status is "approved" or "rejected" or "canceled")
                {
                    continue;
                }

                task.Status = signMode == "sequential" && i == 0 ? "active" : "pending";
            }

            if (!tasks.Any(task => IsOpen(task) || task.Status == "blocked"))
            {
                var seeded = SeedTasksForNode(node, "return");
                if (seeded.Length > 0)
                {
                    ReplaceNodeTasks(item, nodeKey, seeded);
                }
                else
                {
                    MarkNode(item, nodeKey, "approved");
                    CompleteNode(item, nodeKey, action, depth + 1);
                    return;
                }
            }
        }

        SyncActorStatuses(item, nodeKey);
    }

    private static void CompleteNode(ApprovalInstance item, string nodeKey, WorkflowRuntimeAction action, int depth)
    {
        if (depth > 32)
        {
            return;
        }

        var node = FindStep(item.Steps, nodeKey);
        if (node is null)
        {
            return;
        }

        MarkNode(item, nodeKey, "approved", step => step.PendingAfterAddsign = null);

        if (node.PendingAfterAddsign is { Assignees.Length: > 0 } pending)
        {
            InsertAddsignNode(
                item,
                nodeKey,
                "after",
                pending.Assignees,
                pending.SignMode ?? ResolveSignMode(node),
                new WorkflowRuntimeAction
                {
                    Action = action.Action,
                    ActorId = action.ActorId,
                    At = action.At,
                    Comment = action.Comment,
                    TempNodeKey = pending.TempNodeKey ?? action.TempNodeKey,
                },
                pending.FromTaskId);
            return;
        }

        if (node.Temporary && node.Origin?.Type == "addsign" && node.Origin.Position == "before")
        {
            RestoreBeforeAddsign(item, node.Origin.FromNodeKey, node.Origin.FromTaskId);
            return;
        }

        if (!string.IsNullOrWhiteSpace(item.ResumeToNodeKey) && item.ResumeToNodeKey != nodeKey)
        {
            var resumeKey = item.ResumeToNodeKey;
            item.ResumeToNodeKey = null;
            EnterNode(item, resumeKey, action, depth + 1);
            return;
        }

        var nextKey = NextActionableKey(item, nodeKey);
        if (nextKey is null)
        {
            item.Status = "approved";
            item.CurrentStepKey = nodeKey;
            return;
        }

        EnterNode(item, nextKey, action, depth + 1);
    }

    private static void RestoreBeforeAddsign(ApprovalInstance item, string? fromNodeKey, string? fromTaskId)
    {
        if (string.IsNullOrWhiteSpace(fromNodeKey))
        {
            return;
        }

        var origin = FindStep(item.Steps, fromNodeKey);
        MarkNode(item, fromNodeKey, "active");
        item.CurrentStepKey = fromNodeKey;
        item.Status = "pending";
        if (!UsesTasks(item) || string.IsNullOrWhiteSpace(fromTaskId))
        {
            return;
        }

        var signMode = ResolveSignMode(origin);
        PatchTask(item, fromTaskId, task => task.Status = signMode == "sequential" ? "active" : "pending");
        SyncActorStatuses(item, fromNodeKey);
    }

    private static bool InsertAddsignNode(
        ApprovalInstance item,
        string relativeKey,
        string position,
        ApprovalActorResponse[] assignees,
        string? signMode,
        WorkflowRuntimeAction action,
        string? fromTaskId)
    {
        var preferred = string.IsNullOrWhiteSpace(action.TempNodeKey)
            ? $"addsign-{position}-{relativeKey}-{StampFrom(action)}"
            : action.TempNodeKey;
        var key = UniqueKey(item.Steps, preferred);
        var temp = new ApprovalStepResponse
        {
            Key = key,
            Kind = "approve",
            Status = "active",
            SignMode = signMode,
            Title = position == "before" ? "前加签" : "后加签",
            Actors = [.. assignees.Select(actor => new ApprovalActorResponse { Id = actor.Id, Name = actor.Name, Status = "pending" })],
            Temporary = true,
            Origin = new ApprovalAddsignOriginDto
            {
                Type = "addsign",
                Position = position,
                FromNodeKey = relativeKey,
                FromTaskId = fromTaskId,
            },
        };

        var inserted = InsertRelative(item.Steps, relativeKey, temp, position);
        if (inserted is null)
        {
            return false;
        }

        item.Steps = inserted;

        item.CurrentStepKey = key;
        item.Status = "pending";
        if (UsesTasks(item))
        {
            item.Tasks = [.. item.Tasks ?? [], .. SeedTasksForNode(temp, "addsign")];
        }

        return true;
    }

    private static ApprovalActorResponse[] FilterAddsignAssignees(ApprovalActorResponse[]? assignees, string? operatorId)
    {
        if (assignees is null || assignees.Length == 0)
        {
            return [];
        }

        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var next = new List<ApprovalActorResponse>();
        foreach (var actor in assignees)
        {
            var id = ActorId(actor);
            if (id is null || SameActor(id, operatorId) || !seen.Add(id))
            {
                continue;
            }

            next.Add(new ApprovalActorResponse { Id = actor.Id, Name = actor.Name, Status = actor.Status });
        }

        return [.. next];
    }

    public static bool IsAddsignAfterAllowed(ApprovalStepResponse node, IEnumerable<ApprovalTaskResponse>? tasks, string? operatorTaskId)
    {
        var mode = ResolveSignMode(node);
        var nodeTasks = (tasks ?? node.Tasks ?? []).Where(task => task.NodeKey == node.Key).ToArray();
        if (mode == "orsign")
        {
            var countable = nodeTasks.Where(task => task.Status != "canceled").ToArray();
            if (countable.Length >= 2)
            {
                return false;
            }

            var actors = ResolveActors(node);
            if (tasks is null && actors.Length >= 2)
            {
                return false;
            }

            return true;
        }

        if (mode == "countersign")
        {
            if (nodeTasks.Length == 0)
            {
                return true;
            }

            var open = nodeTasks.Where(IsOpen).ToArray();
            if (open.Length != 1)
            {
                return false;
            }

            return operatorTaskId is null || open[0].Id == operatorTaskId;
        }

        return true;
    }

    private static bool EligibleReturnNode(ApprovalStepResponse step, string currentKey)
    {
        if (step.Key == currentKey)
        {
            return false;
        }

        var kind = ResolveKind(step);
        if (kind is "cc" or "condition")
        {
            return false;
        }

        if (step.Temporary && ResolveStatus(step) != "approved")
        {
            return false;
        }

        if (kind == "start")
        {
            return true;
        }

        return kind == "approve" && ResolveStatus(step) == "approved";
    }

    private static ApprovalStepResponse[] GetReturnCandidates(ApprovalInstance item, string currentKey)
        => [.. Flatten(item.Steps).Where(step => EligibleReturnNode(step, currentKey))];

    private static void ResetNodeForReturn(ApprovalInstance item, string nodeKey, string origin)
    {
        var node = FindStep(item.Steps, nodeKey);
        if (node is null)
        {
            return;
        }

        PatchStep(item, nodeKey, step =>
        {
            step.Status = "pending";
            step.Action = null;
            step.Comment = null;
            step.RollbackPoint = false;
            step.ReturnTarget = true;
        });

        if (!UsesTasks(item))
        {
            return;
        }

        var existing = NodeTasks(item, nodeKey);
        var actors = existing.Length > 0 ? existing.Select(task => task.Assignee).ToArray() : ResolveActors(node);
        var reset = actors.Select((actor, index) => new ApprovalTaskResponse
        {
            Id = index < existing.Length ? existing[index].Id : $"{nodeKey}:{ActorId(actor) ?? index.ToString()}",
            NodeKey = nodeKey,
            Assignee = CloneActor(actor)!,
            Status = "pending",
            Origin = origin,
        }).ToArray();
        ReplaceNodeTasks(item, nodeKey, reset);
    }

    private static bool ApplyReturn(ApprovalInstance item, WorkflowRuntimeAction action, ApprovalStepResponse current)
    {
        var targetKey = action.TargetNodeKey;
        if (string.IsNullOrWhiteSpace(targetKey) || targetKey == current.Key)
        {
            return false;
        }

        var candidates = GetReturnCandidates(item, current.Key);
        if (!candidates.Any(step => step.Key == targetKey))
        {
            return false;
        }

        var resume = action.Resume
            ?? current.ButtonPolicy?.ReturnResume
            ?? current.Advanced?.ReturnResume
            ?? "resequence";
        var flat = Flatten(item.Steps);
        var targetIndex = flat.FindIndex(step => step.Key == targetKey);
        var currentIndex = flat.FindIndex(step => step.Key == current.Key);
        if (targetIndex < 0 || currentIndex < 0 || targetIndex >= currentIndex)
        {
            return false;
        }

        if (resume == "direct")
        {
            item.ResumeToNodeKey = current.Key;
            ResetNodeForReturn(item, targetKey, "return");
        }
        else
        {
            item.ResumeToNodeKey = null;
            for (var i = targetIndex; i <= currentIndex; i++)
            {
                var step = flat[i];
                if (ResolveKind(step) == "condition")
                {
                    continue;
                }

                ResetNodeForReturn(item, step.Key, "return");
            }
        }

        EnterNode(item, targetKey, action, 0);
        return true;
    }

    private static bool ApplyRequestChanges(ApprovalInstance item, WorkflowRuntimeAction action, ApprovalStepResponse? node)
    {
        if (node is null)
        {
            return false;
        }

        var start = Flatten(item.Steps).FirstOrDefault(step => ResolveKind(step) == "start") ?? item.Steps[0];
        return ApplyReturn(
            item,
            new WorkflowRuntimeAction
            {
                Action = "return",
                ActorId = action.ActorId,
                TaskId = action.TaskId,
                Comment = action.Comment,
                At = action.At,
                TargetNodeKey = start.Key,
                Resume = "direct",
            },
            node);
    }

    private static bool ApplyApproveTask(
        ApprovalInstance item,
        ApprovalStepResponse node,
        ApprovalTaskResponse task,
        WorkflowRuntimeAction action)
    {
        if (!IsTaskActionable(node, task, item.Tasks))
        {
            return false;
        }

        PatchTask(item, task.Id, current =>
        {
            current.Status = "approved";
            current.Action = "approve";
            current.Comment = action.Comment;
            current.ActedAt = action.At;
        });
        SyncActorStatuses(item, node.Key);
        var signMode = ResolveSignMode(node);
        var remaining = NodeTasks(item, node.Key).Where(IsOpen).ToArray();
        if (signMode == "orsign")
        {
            foreach (var open in NodeTasks(item, node.Key).Where(IsOpen))
            {
                open.Status = "canceled";
            }

            CompleteNode(item, node.Key, action, 0);
            return true;
        }

        if (signMode == "sequential")
        {
            var next = NodeTasks(item, node.Key).FirstOrDefault(current => current.Status == "pending");
            if (next is not null)
            {
                next.Status = "active";
                MarkNode(item, node.Key, "active");
                item.CurrentStepKey = node.Key;
                return true;
            }

            CompleteNode(item, node.Key, action, 0);
            return true;
        }

        if (remaining.Length == 0)
        {
            CompleteNode(item, node.Key, action, 0);
        }
        else
        {
            MarkNode(item, node.Key, "active");
            item.CurrentStepKey = node.Key;
        }

        return true;
    }

    private static bool ApplyApproveNode(ApprovalInstance item, ApprovalStepResponse node, WorkflowRuntimeAction action)
    {
        MarkNode(item, node.Key, "approved", step =>
        {
            step.Action = "approve";
            step.Comment = action.Comment;
            step.Time = action.At;
            if (!string.IsNullOrWhiteSpace(action.ActorId))
            {
                step.Actor ??= new ApprovalActorResponse();
                step.Actor.Id = action.ActorId;
                step.Actor.Name = MockDirectory.ActorFromId(action.ActorId).Name ?? action.ActorId;
            }
        });
        CompleteNode(item, node.Key, action, 0);
        return true;
    }

    private static bool ApplyReject(
        ApprovalInstance item,
        ApprovalStepResponse node,
        ApprovalTaskResponse? task,
        WorkflowRuntimeAction action)
    {
        if (task is not null && !IsTaskActionable(node, task, item.Tasks))
        {
            return false;
        }

        if (task is not null)
        {
            PatchTask(item, task.Id, current =>
            {
                current.Status = "rejected";
                current.Action = "reject";
                current.Comment = action.Comment;
                current.ActedAt = action.At;
            });
        }

        MarkNode(item, node.Key, "rejected", step =>
        {
            step.Action = "reject";
            step.Comment = string.IsNullOrWhiteSpace(action.Comment) ? "驳回" : action.Comment;
            step.Time = action.At;
            step.RollbackPoint = true;
            if (!string.IsNullOrWhiteSpace(action.ActorId))
            {
                step.Actor ??= new ApprovalActorResponse();
                step.Actor.Id = action.ActorId;
                step.Actor.Name = MockDirectory.ActorFromId(action.ActorId).Name ?? action.ActorId;
            }
        });
        CancelOpenTasks(item);
        item.Status = "rejected";
        item.CurrentStepKey = node.Key;
        return true;
    }

    private static bool ApplyTransfer(
        ApprovalInstance item,
        ApprovalStepResponse node,
        ApprovalTaskResponse? task,
        WorkflowRuntimeAction action)
    {
        var assignee = action.Assignee;
        if (assignee is null || ActorId(assignee) is null)
        {
            return false;
        }

        if (task is not null)
        {
            if (!IsTaskActionable(node, task, item.Tasks))
            {
                return false;
            }

            if (SameActor(task.Assignee.Id, assignee.Id))
            {
                return false;
            }

            var previousId = task.Assignee.Id;
            PatchTask(item, task.Id, current =>
            {
                current.Assignee = CloneActor(assignee)!;
                current.Origin = "transfer";
                current.Comment = action.Comment;
                current.ActedAt = action.At;
            });
            SyncActorStatuses(item, node.Key);
            PatchStep(item, node.Key, step =>
            {
                if (step.Actor is not null && SameActor(step.Actor.Id, previousId))
                {
                    step.Actor = CloneActor(assignee);
                }

                if (step.Actors is { Length: > 0 })
                {
                    step.Actors =
                    [
                        .. step.Actors.Select(actor =>
                            SameActor(actor.Id, previousId)
                                ? new ApprovalActorResponse { Id = assignee.Id, Name = assignee.Name, Status = actor.Status }
                                : actor),
                    ];
                }

                step.Action = "transfer";
                step.Comment = string.IsNullOrWhiteSpace(action.Comment) ? $"转交给 {assignee.Name ?? assignee.Id}" : action.Comment;
                step.Time = action.At;
            });
            item.CurrentStepKey = node.Key;
            return true;
        }

        PatchStep(item, node.Key, step =>
        {
            step.Actor = CloneActor(assignee);
            if (step.Actors is { Length: > 0 })
            {
                var replaced = false;
                step.Actors =
                [
                    .. step.Actors.Select(actor =>
                    {
                        if (!replaced && (action.ActorId is null || SameActor(actor.Id, action.ActorId)))
                        {
                            replaced = true;
                            return new ApprovalActorResponse { Id = assignee.Id, Name = assignee.Name, Status = actor.Status };
                        }

                        return actor;
                    }),
                ];
            }

            step.Action = "transfer";
            step.Comment = string.IsNullOrWhiteSpace(action.Comment) ? $"转交给 {assignee.Name ?? assignee.Id}" : action.Comment;
            step.Time = action.At;
        });
        item.CurrentStepKey = node.Key;
        return true;
    }

    private static bool ApplyAddsign(
        ApprovalInstance item,
        ApprovalStepResponse node,
        ApprovalTaskResponse? task,
        WorkflowRuntimeAction action)
    {
        var operatorId = ActorId(task?.Assignee) ?? action.ActorId;
        var assignees = FilterAddsignAssignees(action.Assignees, operatorId);
        if (assignees.Length == 0)
        {
            return false;
        }

        var position = action.Position == "after" ? "after" : "before";
        var signMode = action.SignMode ?? (assignees.Length >= 2 ? ResolveSignMode(node) : "sequential");

        if (position == "after")
        {
            if (ResolveSignMode(node) == "orsign" && !IsAddsignAfterAllowed(node, item.Tasks, task?.Id))
            {
                return false;
            }

            if (task is not null)
            {
                if (!IsTaskActionable(node, task, item.Tasks))
                {
                    return false;
                }

                PatchTask(item, task.Id, current =>
                {
                    current.Status = "approved";
                    current.Action = "addsign";
                    current.Comment = action.Comment;
                    current.ActedAt = action.At;
                });
                SyncActorStatuses(item, node.Key);
                var stillOpen = NodeTasks(item, node.Key).Where(IsOpen).ToArray();
                if (stillOpen.Length > 0)
                {
                    PatchStep(item, node.Key, step =>
                    {
                        step.PendingAfterAddsign = new ApprovalPendingAfterAddsignDto
                        {
                            Assignees = assignees,
                            SignMode = signMode,
                            Comment = action.Comment,
                            FromTaskId = task.Id,
                            TempNodeKey = action.TempNodeKey,
                        };
                    });
                    MarkNode(item, node.Key, "active");
                    item.CurrentStepKey = node.Key;
                    return true;
                }

                MarkNode(item, node.Key, "approved", step =>
                {
                    step.Action = "addsign";
                    step.Comment = action.Comment;
                });
                return InsertAddsignNode(item, node.Key, "after", assignees, signMode, action, task.Id);
            }

            MarkNode(item, node.Key, "approved", step =>
            {
                step.Action = "addsign";
                step.Comment = action.Comment;
                step.Time = action.At;
            });
            return InsertAddsignNode(item, node.Key, "after", assignees, signMode, action, null);
        }

        if (task is not null)
        {
            if (!IsTaskActionable(node, task, item.Tasks))
            {
                return false;
            }

            PatchTask(item, task.Id, current =>
            {
                current.Status = "blocked";
                current.Action = "addsign";
                current.Comment = action.Comment;
                current.ActedAt = action.At;
            });
            SyncActorStatuses(item, node.Key);
            MarkNode(item, node.Key, "active");
            return InsertAddsignNode(item, node.Key, "before", assignees, signMode, action, task.Id);
        }

        MarkNode(item, node.Key, "pending");
        return InsertAddsignNode(item, node.Key, "before", assignees, signMode, action, null);
    }

    private static bool ApplyCancel(ApprovalInstance item, ApprovalStepResponse? node, WorkflowRuntimeAction action)
    {
        if (!string.IsNullOrWhiteSpace(item.Starter) &&
            !string.IsNullOrWhiteSpace(action.ActorId) &&
            !SameActor(item.Starter, action.ActorId))
        {
            return false;
        }

        CancelOpenTasks(item);
        if (node is not null)
        {
            MarkNode(item, node.Key, "canceled", step =>
            {
                step.Action = "cancel";
                step.Comment = action.Comment;
                step.Time = action.At;
            });
        }

        item.Status = "canceled";
        return true;
    }

    private static void SyncInstanceCursor(ApprovalInstance item)
    {
        var current = string.IsNullOrWhiteSpace(item.CurrentStepKey)
            ? FindActive(item.Steps)
            : FindStep(item.Steps, item.CurrentStepKey) ?? FindActive(item.Steps);
        if (current is not null)
        {
            item.CurrentStepKey = current.Key;
        }

        item.Assignee = DeriveAssignee(item, current);
    }

    internal static string DeriveAssignee(ApprovalInstance item, ApprovalStepResponse? current)
    {
        if (UsesTasks(item))
        {
            var open = (item.Tasks ?? [])
                .Where(IsOpen)
                .Select(task => ActorId(task.Assignee))
                .FirstOrDefault(id => !string.IsNullOrWhiteSpace(id));
            if (!string.IsNullOrWhiteSpace(open))
            {
                return open;
            }
        }

        return ActorId(current?.Actor) ?? current?.Actor?.Name ?? item.Assignee;
    }

    private static ApprovalTaskResponse[] NodeTasks(ApprovalInstance item, string nodeKey)
        => [.. (item.Tasks ?? []).Where(task => task.NodeKey == nodeKey)];

    private static void ReplaceNodeTasks(ApprovalInstance item, string nodeKey, ApprovalTaskResponse[] next)
    {
        item.Tasks = [.. (item.Tasks ?? []).Where(task => task.NodeKey != nodeKey), .. next];
    }

    private static void PatchTask(ApprovalInstance item, string taskId, Action<ApprovalTaskResponse> update)
    {
        var task = (item.Tasks ?? []).FirstOrDefault(current => current.Id == taskId);
        if (task is not null)
        {
            update(task);
        }
    }

    private static void PatchStep(ApprovalInstance item, string key, Action<ApprovalStepResponse> update)
    {
        var step = FindStep(item.Steps, key);
        if (step is not null)
        {
            update(step);
        }
    }

    private static ApprovalStepResponse[]? InsertRelative(
        ApprovalStepResponse[] steps,
        string targetKey,
        ApprovalStepResponse node,
        string position)
    {
        var index = Array.FindIndex(steps, step => step.Key == targetKey);
        if (index >= 0)
        {
            var list = steps.ToList();
            list.Insert(position == "before" ? index : index + 1, node);
            return [.. list];
        }

        var found = false;
        var mapped = steps.Select(step =>
        {
            if (!found && step.Children is { Length: > 0 })
            {
                var children = InsertRelative(step.Children, targetKey, node, position);
                if (children is not null)
                {
                    found = true;
                    step.Children = children;
                }
            }

            return step;
        }).ToArray();
        return found ? mapped : null;
    }

    private static string UniqueKey(IEnumerable<ApprovalStepResponse> steps, string preferred)
    {
        var used = new HashSet<string>(Flatten(steps).Select(step => step.Key), StringComparer.Ordinal);
        if (used.Add(preferred))
        {
            return preferred;
        }

        var n = 2;
        while (used.Contains($"{preferred}-{n}"))
        {
            n++;
        }

        return $"{preferred}-{n}";
    }

    private static string StampFrom(WorkflowRuntimeAction action)
    {
        if (!string.IsNullOrWhiteSpace(action.At))
        {
            return new string(action.At.Where(ch => char.IsLetterOrDigit(ch) || ch is '-' or '_').ToArray());
        }

        return action.ActorId ?? "tmp";
    }

    internal static ApprovalStepResponse? FindStep(IEnumerable<ApprovalStepResponse> steps, string? key)
    {
        if (string.IsNullOrWhiteSpace(key))
        {
            return null;
        }

        foreach (var step in Flatten(steps))
        {
            if (step.Key == key)
            {
                return step;
            }
        }

        return null;
    }

    internal static ApprovalStepResponse? FindActive(IEnumerable<ApprovalStepResponse> steps)
        => Flatten(steps).FirstOrDefault(step => step.Status == "active");

    internal static List<ApprovalStepResponse> Flatten(IEnumerable<ApprovalStepResponse> steps)
    {
        var result = new List<ApprovalStepResponse>();
        void Visit(IEnumerable<ApprovalStepResponse> list)
        {
            foreach (var step in list)
            {
                result.Add(step);
                if (step.Children is { Length: > 0 })
                {
                    Visit(step.Children);
                }
            }
        }

        Visit(steps);
        return result;
    }

    internal static string ResolveKind(ApprovalStepResponse? step)
        => step?.Kind is "start" or "approve" or "cc" or "condition" or "end" ? step.Kind : "approve";

    internal static string ResolveSignMode(ApprovalStepResponse? step)
        => step?.SignMode is "sequential" or "countersign" or "orsign" ? step.SignMode : "sequential";

    internal static string ResolveStatus(ApprovalStepResponse? step)
        => step?.Status is "pending" or "active" or "approved" or "rejected" or "canceled" ? step.Status : "pending";

    internal static ApprovalActorResponse[] ResolveActors(ApprovalStepResponse? step)
    {
        if (step?.Actors is { Length: > 0 })
        {
            return step.Actors;
        }

        return step?.Actor is null ? [] : [step.Actor];
    }

    internal static bool HasOpenTaskFor(ApprovalInstance item, string username)
        => (item.Tasks ?? []).Any(task =>
            IsOpen(task) &&
            (SameActor(task.Assignee.Id, username) || SameActor(task.Assignee.Name, username)));

    internal static bool IsOpen(ApprovalTaskResponse task) => OpenTask.Contains(task.Status ?? "");

    internal static string? ActorId(ApprovalActorResponse? actor)
        => string.IsNullOrWhiteSpace(actor?.Id) ? (string.IsNullOrWhiteSpace(actor?.Name) ? null : actor.Name) : actor.Id;

    internal static bool SameActor(string? left, string? right)
        => !string.IsNullOrWhiteSpace(left) &&
           !string.IsNullOrWhiteSpace(right) &&
           string.Equals(left.Trim(), right.Trim(), StringComparison.OrdinalIgnoreCase);

    internal static ApprovalActorResponse? CloneActor(ApprovalActorResponse? actor)
        => actor is null ? null : new ApprovalActorResponse { Id = actor.Id, Name = actor.Name, Status = actor.Status };
}
