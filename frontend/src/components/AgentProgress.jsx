import {
  Search, Database, BookOpen, FileText,
  CheckCircle2, Loader2, Circle,
} from "lucide-react";

const AGENT_LABELS = {
  planning: { icon: Search, label: "正在理解你的需求...", color: "text-blue-500" },
  data_fetch: { icon: Database, label: "正在查询美团酒旅数据...", color: "text-orange-500" },
  knowledge: { icon: BookOpen, label: "正在获取旅行知识...", color: "text-green-500" },
  compilation: { icon: FileText, label: "正在生成行程方案...", color: "text-purple-500" },
};

function StatusIcon({ status }) {
  if (status === "completed") {
    return (
      <div className="animate-fade-in">
        <CheckCircle2 size={18} className="text-green-400" />
      </div>
    );
  }
  if (status === "running") {
    return <Loader2 size={18} className="text-blue-400 animate-spin" />;
  }
  return <Circle size={18} className="text-slate-400 dark:text-gray-600" />;
}

export default function AgentProgress({ agents, agentProgress }) {
  if (!agents.length) return null;

  // Calculate progress percentage
  const total = agents.length;
  const completed = agents.filter((a) => agentProgress[a.key] === "completed").length;
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="mx-4 my-3 animate-fade-in">
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 shadow-lg shadow-black/5 rounded-2xl p-5">
        {/* Animated progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-gray-300 flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-orange-500" />
              正在为您规划行程...
            </h3>
            <span className="text-xs font-medium text-slate-400 dark:text-gray-500">
              {completed}/{total} 完成
            </span>
          </div>
          <div className="w-full h-2 bg-slate-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-rose-500 transition-all duration-500 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Agent steps with connecting line */}
        <div className="space-y-0">
          {agents.map((agent, i) => {
            const status = agentProgress[agent.key] || "pending";
            const config = AGENT_LABELS[agent.key] || { icon: Circle, label: agent.label, color: "text-slate-400" };
            const Icon = config.icon;
            const isActive = status === "running";
            const isDone = status === "completed";

            return (
              <div key={agent.key}>
                <div
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-500 ${
                    isActive
                      ? "bg-orange-50/80 dark:bg-orange-900/20 border border-orange-200/50 dark:border-orange-700/30 animate-pulse-glow"
                      : isDone
                      ? "bg-green-50/50 dark:bg-green-900/10"
                      : "bg-transparent"
                  }`}
                >
                  {/* Icon container */}
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-500 ${
                      isActive
                        ? "bg-orange-100 dark:bg-orange-900/30"
                        : isDone
                        ? "bg-green-100 dark:bg-green-900/30"
                        : "bg-slate-100 dark:bg-gray-700/50"
                    }`}
                  >
                    <div className={`${isActive ? config.color : isDone ? "text-green-400" : "text-slate-400 dark:text-gray-500"} transition-colors duration-500`}>
                      {isActive ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Icon size={16} />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium truncate transition-all duration-500 ${
                        isActive
                          ? "text-orange-800 dark:text-orange-300"
                          : isDone
                          ? "text-green-700 dark:text-green-300"
                          : "text-slate-500 dark:text-gray-400"
                      }`}
                    >
                      {isDone ? agent.label : config.label}
                    </p>
                    {isActive && (
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5 animate-fade-in">
                        {agent.description || "请稍候..."}
                      </p>
                    )}
                  </div>
                  <StatusIcon status={status} />
                </div>
                {/* Connector line */}
                {i < agents.length - 1 && (
                  <div className="flex justify-center pl-4">
                    <div
                      className={`w-0.5 h-4 transition-all duration-500 ${
                        isDone ? "bg-green-300 dark:bg-green-600" : "bg-slate-200 dark:bg-gray-700"
                      }`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-xs text-slate-400 dark:text-gray-500 mt-4 text-center">
          查询美团酒旅数据约需 1-2 分钟，请耐心等待...
        </p>
      </div>
    </div>
  );
}
