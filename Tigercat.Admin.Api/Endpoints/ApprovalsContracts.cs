namespace Tigercat.Admin.Api.Endpoints;

public class ApprovalActorResponse
{
    public string? Id { get; set; }
    public string? Name { get; set; }
}

public class ApprovalStepResponse
{
    public required string Key { get; set; }
    public string? Title { get; set; }
    public string? Status { get; set; }
    public ApprovalActorResponse? Actor { get; set; }
    public string? Action { get; set; }
    public string? Comment { get; set; }
    public string? Time { get; set; }
    public int? Order { get; set; }
    public ApprovalStepResponse[]? Children { get; set; }
    public string? Kind { get; set; }
    public string? SignMode { get; set; }
    public bool RollbackPoint { get; set; }
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
}

public record CreateApprovalRequest(
    string? Title,
    string? Category,
    string? Reason,
    string? Amount,
    string? TicketId,
    string? Assignee,
    string[]? Cc);

public record ApprovalActionRequest(
    string? Action,
    string? Comment,
    string? TransferTo);
