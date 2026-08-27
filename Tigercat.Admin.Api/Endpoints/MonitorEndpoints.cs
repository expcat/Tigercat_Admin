using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Common;
using Tigercat.Admin.Api.Serialization;

namespace Tigercat.Admin.Api.Endpoints;

public class MonitorEndpoints : IEndpointDefinition
{
    internal static readonly string[] AllowedNodeStatuses = ["healthy", "warning", "critical"];
    private const int FeedCap = 20;
    private static readonly MonitorSnapshotWalker Walker = new();

    public void DefineEndpoints(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/monitor")
            .WithTags("Monitor");

        group.MapGet("/snapshot", GetSnapshot)
            .RequireLogin()
            .WithName("GetMonitorSnapshot");
    }

    private static IResult GetSnapshot()
    {
        return Results.Json(
            ApiResult.Ok(Walker.Next()),
            AppJsonContext.Default.ApiResponseMonitorSnapshotResponse);
    }

    private sealed class MonitorSnapshotWalker
    {
        private static readonly (string Title, string Description, string Label, string Variant)[] EventTemplates =
        [
            ("API 网关流量升高", "入口 QPS 超过近窗均值", "告警", "warning"),
            ("工作节点恢复", "心跳已恢复，流量重新接入", "恢复", "success"),
            ("缓存命中率回升", "热点 key 预热完成", "正常", "success"),
            ("CPU 水位抖动", "瞬时计算任务推高水位", "抖动", "info"),
            ("磁盘清理完成", "临时文件回收，可用空间回升", "运维", "primary"),
            ("延迟回落到基线", "P95 延迟已回到滚动窗口中位", "正常", "success"),
            ("节点探活超时", "单次探活未响应，已自动重试", "异常", "danger"),
            ("自动扩容触发", "副本数 +1，等待就绪", "扩容", "info")
        ];

        private readonly object _gate = new();
        private readonly Random _rng = new();
        private double _cpu = 54;
        private double _memory = 61;
        private double _disk = 67;
        private double _qps = 1056;
        private double _latency = 45;
        private int _tickCount = 3;
        private readonly List<NodeState> _nodes =
        [
            new("api-hz-1", "api-hz-1", "华东", 46, 58),
            new("api-bj-1", "api-bj-1", "华北", 62, 71),
            new("worker-hz-1", "worker-hz-1", "华东", 38, 44),
            new("cache-hz-1", "cache-hz-1", "华东", 51, 63)
        ];
        private readonly List<MonitorEventResponse> _events = [];

        public MonitorSnapshotWalker()
        {
            var now = DateTime.UtcNow;
            _events.Add(CreateEvent(1, now.AddSeconds(-9), EventTemplates[0]));
            _events.Add(CreateEvent(2, now.AddSeconds(-6), EventTemplates[1]));
            _events.Add(CreateEvent(3, now.AddSeconds(-3), EventTemplates[2]));
        }

        public MonitorSnapshotResponse Next()
        {
            lock (_gate)
            {
                Step();
                var now = DateTime.UtcNow;
                var serverTime = now.ToString("O");
                return new MonitorSnapshotResponse(
                    _cpu,
                    _memory,
                    _disk,
                    _qps,
                    _latency,
                    _nodes.Select(ToNodeResponse).ToArray(),
                    _events.ToArray(),
                    serverTime,
                    _tickCount,
                    serverTime);
            }
        }

        private void Step()
        {
            _tickCount++;
            _cpu = Round0(Walk(_cpu, 18, 96, 5));
            _memory = Round0(Walk(_memory, 28, 92, 4));
            _disk = Round0(Walk(_disk, 40, 88, 2));
            _qps = Round0(Walk(_qps, 720, 1480, 48));
            _latency = Round1(Walk(_latency, 18, 86, 3.5));

            for (var i = 0; i < _nodes.Count; i++)
            {
                var node = _nodes[i];
                node.Cpu = Round0(Walk(node.Cpu, 16, 96, 6 + i));
                node.Memory = Round0(Walk(node.Memory, 24, 94, 5));
            }

            var template = _tickCount < EventTemplates.Length
                ? EventTemplates[_tickCount % EventTemplates.Length]
                : EventTemplates[_rng.Next(EventTemplates.Length)];
            _events.Insert(0, CreateEvent(_tickCount, DateTime.UtcNow, template));
            if (_events.Count > FeedCap)
            {
                _events.RemoveRange(FeedCap, _events.Count - FeedCap);
            }
        }

        private double Walk(double current, double min, double max, double step) =>
            Math.Clamp(current + (_rng.NextDouble() * 2 - 1) * step, min, max);

        private static double Round0(double value) => Math.Round(value);

        private static double Round1(double value) => Math.Round(value * 10) / 10;

        private static string HealthFromLoad(double cpu, double memory)
        {
            var load = Math.Max(cpu, memory);
            if (load >= 85) return "critical";
            if (load >= 70) return "warning";
            return "healthy";
        }

        private static MonitorNodeResponse ToNodeResponse(NodeState node) =>
            new(node.Id, node.Name, node.Zone, node.Cpu, node.Memory, HealthFromLoad(node.Cpu, node.Memory));

        private static MonitorEventResponse CreateEvent(
            int tickCount,
            DateTime at,
            (string Title, string Description, string Label, string Variant) template) =>
            new(
                $"evt-{tickCount}-{at.Ticks}",
                template.Title,
                template.Description,
                at.ToString("O"),
                new MonitorEventStatusResponse(template.Label, template.Variant));

        private sealed class NodeState
        {
            public NodeState(string id, string name, string zone, double cpu, double memory)
            {
                Id = id;
                Name = name;
                Zone = zone;
                Cpu = cpu;
                Memory = memory;
            }

            public string Id { get; }
            public string Name { get; }
            public string Zone { get; }
            public double Cpu { get; set; }
            public double Memory { get; set; }
        }
    }
}
