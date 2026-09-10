namespace Tigercat.Admin.Api.Endpoints;

public class ApprovalActorResponse
{
    public string? Id { get; set; }
    public string? Name { get; set; }
    public string? Status { get; set; }
}

public class ApproverSourceDto
{
    public required string Type { get; set; }
    public ApprovalActorResponse[]? Actors { get; set; }
    public bool? Multiple { get; set; }
    public string? SignMode { get; set; }
    public string? Key { get; set; }
    public int? Level { get; set; }
    public int? UpTo { get; set; }
}

public class ApprovalButtonConfigDto
{
    public required string Action { get; set; }
    public bool Enabled { get; set; } = true;
    public string? Label { get; set; }
    public bool? CommentRequired { get; set; }
    public string? Placement { get; set; }
}

public class ApprovalAddsignConfigDto
{
    public string[]? Positions { get; set; }
}

public class ApprovalButtonPolicyDto
{
    public ApprovalButtonConfigDto[]? Buttons { get; set; }
    public ApprovalAddsignConfigDto? Addsign { get; set; }
    public string? ReturnResume { get; set; }
}

public class ApprovalTimeoutDto
{
    public string? Action { get; set; }
    public string? DurationLabel { get; set; }
}

public class ApprovalAdvancedDto
{
    public string? EmptyApprover { get; set; }
    public string? AutoDecide { get; set; }
    public ApprovalTimeoutDto? Timeout { get; set; }
    public string? ReturnResume { get; set; }
}

public class ApprovalAddsignOriginDto
{
    public string Type { get; set; } = "addsign";
    public string? Position { get; set; }
    public string? FromNodeKey { get; set; }
    public string? FromTaskId { get; set; }
}

public class ApprovalPendingAfterAddsignDto
{
    public ApprovalActorResponse[] Assignees { get; set; } = [];
    public string? SignMode { get; set; }
    public string? Comment { get; set; }
    public string? FromTaskId { get; set; }
    public string? TempNodeKey { get; set; }
}

public class ApprovalTaskResponse
{
    public required string Id { get; set; }
    public required string NodeKey { get; set; }
    public required ApprovalActorResponse Assignee { get; set; }
    public required string Status { get; set; }
    public string? Action { get; set; }
    public string? Comment { get; set; }
    public string? ActedAt { get; set; }
    public string? Origin { get; set; }
}

public class ApprovalHistoryEntryResponse
{
    public required string At { get; set; }
    public required string ActorId { get; set; }
    public required string Action { get; set; }
    public string? Comment { get; set; }
    public string? NodeKey { get; set; }
    public string? TaskId { get; set; }
}

public class ApprovalReturnTargetResponse
{
    public required string Key { get; set; }
    public string? Title { get; set; }
    public string? Kind { get; set; }
    public string? ActorName { get; set; }
    public string? Status { get; set; }
}

public class ApprovalStepResponse
{
    public required string Key { get; set; }
    public string? Title { get; set; }
    public string? Status { get; set; }
    public ApprovalActorResponse? Actor { get; set; }
    public ApprovalActorResponse[]? Actors { get; set; }
    public string? Action { get; set; }
    public string? Comment { get; set; }
    public string? Time { get; set; }
    public int? Order { get; set; }
    public ApprovalStepResponse[]? Children { get; set; }
    public string? Kind { get; set; }
    public string? SignMode { get; set; }
    public bool RollbackPoint { get; set; }
    public bool ReturnTarget { get; set; }
    public bool Temporary { get; set; }
    public ApprovalAddsignOriginDto? Origin { get; set; }
    public ApproverSourceDto[]? ApproverPolicy { get; set; }
    public ApprovalButtonPolicyDto? ButtonPolicy { get; set; }
    public Dictionary<string, string>? FieldPermissions { get; set; }
    public ApprovalAdvancedDto? Advanced { get; set; }
    public ApprovalTaskResponse[]? Tasks { get; set; }
    public ApprovalPendingAfterAddsignDto? PendingAfterAddsign { get; set; }
}

public class ApprovalFormFieldResponse
{
    public required string Label { get; set; }
    public required string Value { get; set; }
}

public class ApprovalListItemResponse
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
    public string? CurrentStepTitle { get; set; }
    public required string CreatedAt { get; set; }
    public required string UpdatedAt { get; set; }
}

public class ApprovalDetailResponse
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
    public string? CurrentStepTitle { get; set; }
    public required string Reason { get; set; }
    public string? Amount { get; set; }
    public required ApprovalFormFieldResponse[] FormFields { get; set; }
    public required ApprovalStepResponse[] Steps { get; set; }
    public required string[] ActedBy { get; set; }
    public required string CreatedAt { get; set; }
    public required string UpdatedAt { get; set; }
    public ApprovalTaskResponse[]? Tasks { get; set; }
    public ApprovalHistoryEntryResponse[]? History { get; set; }
    public string? ResumeToNodeKey { get; set; }
    public ApprovalReturnTargetResponse[]? ReturnTargets { get; set; }
    public Dictionary<string, string>? FormValues { get; set; }
}

public class ApprovalContactUserResponse
{
    public required string Id { get; set; }
    public required string Name { get; set; }
    public required string Username { get; set; }
    public required string DeptId { get; set; }
    public required string DeptName { get; set; }
    public required string[] RoleKeys { get; set; }
    public required string[] GroupKeys { get; set; }
    public string? ManagerId { get; set; }
}

public class ApprovalContactDeptResponse
{
    public required string Id { get; set; }
    public required string Name { get; set; }
    public required string LeaderId { get; set; }
    public string? ParentId { get; set; }
}

public class ApprovalContactKeyResponse
{
    public required string Key { get; set; }
    public required string Name { get; set; }
}

public class ApprovalContactsResponse
{
    public required ApprovalContactUserResponse[] Users { get; set; }
    public required ApprovalContactDeptResponse[] Depts { get; set; }
    public required ApprovalContactKeyResponse[] Roles { get; set; }
    public required ApprovalContactKeyResponse[] Groups { get; set; }
}

public record CreateApprovalRequest(
    string? Title,
    string? Category,
    string? Reason,
    string? Amount,
    string? TicketId,
    string? Assignee,
    string[]? Cc,
    bool? UseTasks = null,
    string? Template = null,
    string[]? StarterPick = null);

public record ApprovalActionRequest(
    string? Action,
    string? Comment,
    string? TransferTo,
    string? TaskId = null,
    string? NodeKey = null,
    string? Position = null,
    string? SignMode = null,
    string? TargetNodeKey = null,
    string? Resume = null,
    string? TempNodeKey = null,
    ApprovalActorResponse? Assignee = null,
    ApprovalActorResponse[]? Assignees = null,
    string[]? AddsignTo = null,
    Dictionary<string, string>? FormValues = null);

public record ResolveApproversRequest(
    ApproverSourceDto? Source,
    ApproverSourceDto[]? Sources,
    string? Starter,
    Dictionary<string, string>? FormValues,
    string[]? StarterPick = null);

public class ResolveApproversResponse
{
    public required ApprovalActorResponse[] Actors { get; set; }
}
