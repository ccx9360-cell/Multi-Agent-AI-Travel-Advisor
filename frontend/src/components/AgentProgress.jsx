import {
  Search, Database, BookOpen, FileText,
  CheckCircle2, Loader2, Circle,
} from "lucide-react";

const AGENT_LABELS = {
  planning: { icon: Search, label: "正在理解你的需求...", color: "text-blue-600" },
  data_fetch: { icon: Database, label: "正在查询美团酒旅数据...", color: "text-orange-600" },
  knowledge: { icon: BookOpen, label: "正在获取旅行知识...", color: "text-green-600" },
  compilation: { icon: FileText, label: "正在生成行程方案...", color: "text-purple-600" },
};

function StatusIcon({ status }) {
  if (status === "completed") {
    return <CheckCircle2 size={18} className="text-green-500" />;
  }
  if (status === "running") {
    return <Loader2 size={18} className="text-blue-500 animate-spin" />;
  }
  return <Circle size={18} className="text-slate-300" />;
}

export default function AgentProgress({ agents, agentProgress }) {
  if (!agents.length) return null;

  return (
    <div className="mx-4 my-3">
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Loader2 size={14} className="animate-spin text-orange-500" />
          正在为您规划行程...
        </h3>
        <div className="space-y-2">
          {agents.map((agent, i) => {
            const status = agentProgress[agent.key] || "pending";
            const config = AGENT_LABELS[agent.key] || { icon: Circle, label: agent.label, color: "text-slate-500" };
            const Icon = config.icon;
            const isActive = status === "running";
            const isDone = status === "completed";

            return (
              <div key={agent.key}>
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    isActive
                      ? "bg-orange-50 border border-orange-200"
                      : isDone
                      ? "bg-green-50/60"
                      : "bg-slate-50"
                  }`}
                >
                  <div className={`${isActive ? config.color : isDone ? "text-green-500" : "text-slate-300"} transition-colors`}>
                    {isActive ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Icon size={16} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium truncate ${
                        isActive
                          ? "text-orange-900"
                          : isDone
                          ? "text-green-800"
                          : "text-slate-400"
                      }`}
                    >
                      {isDone ? agent.label : config.label}
                    </p>
                    {isActive && (
                      <p className="text-xs text-orange-600 mt-0.5">
                        {agent.description || "请稍候..."}
                      </p>
                    )}
                  </div>
                  <StatusIcon status={status} />
                </div>
                {/* Connector */}
                {i < agents.length - 1 && (
                  <div className="flex justify-center">
                    <div
                      className={`w-0.5 h-3 ${
                        isDone ? "bg-green-300" : "bg-slate-200"
                      }`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-slate-400 mt-3 text-center">
          查询美团酒旅数据约需 1-2 分钟，请耐心等待...
        </p>
      </div>
    </div>
  );
}
