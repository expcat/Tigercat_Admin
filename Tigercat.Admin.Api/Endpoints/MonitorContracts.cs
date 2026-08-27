namespace Tigercat.Admin.Api.Endpoints;

public record MonitorEventStatusResponse(string Label, string Variant);

public record MonitorEventResponse(
    string Id,
    string Title,
    string Description,
    string Time,
    MonitorEventStatusResponse Status);

public record MonitorNodeResponse(
    string Id,
    string Name,
    string Zone,
    double Cpu,
    double Memory,
    string Status);

public record MonitorSnapshotResponse(
    double Cpu,
    double Memory,
    double Disk,
    double Qps,
    double Latency,
    MonitorNodeResponse[] Nodes,
    MonitorEventResponse[] Events,
    string ServerTime,
    int TickCount,
    string LastTickAt);
