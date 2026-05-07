import React, { useState, useRef, useEffect } from "react";
import { ArrowLeft, Send, Sparkles, MapPin, UtensilsCrossed, Hotel, Compass, Sun, Train, BookOpen } from "lucide-react";

const EXAMPLE_QUESTIONS = [
  "成都三日自由行，预算3000，学生党",
  "广州有什么必吃的老字号美食？推荐几家",
  "带父母去北京玩5天，行程不要太赶",
  "三亚亲子酒店推荐，预算500-800一晚",
  "杭州上海周末两日游攻略",
  "重庆洪崖洞附近有什么值得住的民宿？",
  "大理洱海骑行路线推荐",
  "西安兵马俑+华山三日游怎么安排",
];

// ── 快捷查询按钮 ──
const QUICK_TOOLS = [
  { label: "查天气", key: "weather", icon: Sun, color: "from-blue-400 to-cyan-500", desc: "目的地实时天气" },
  { label: "查攻略", key: "knowledge", icon: BookOpen, color: "from-emerald-400 to-teal-500", desc: "景点美食攻略知识" },
  { label: "查火车", key: "trains", icon: Train, color: "from-violet-400 to-purple-500", desc: "城际列车车次查询" },
];

export default function FreeInputScreen({ onSubmit, onBack }) {
  const [question, setQuestion] = useState("");
  const textareaRef = useRef(null);
  const [showExamples, setShowExamples] = useState(true);

  // Auto focus textarea on mount
  useEffect(() => {
    setTimeout(() => textareaRef.current?.focus(), 300);
  }, []);

  const handleSubmit = (e) => {
    e?.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || trimmed.length < 3) return;
    onSubmit(trimmed, "free");
    setShowExamples(false);
  };

  const handleExampleClick = (example) => {
    setQuestion(example);
    setShowExamples(false);
    // Auto submit after a brief moment so the user sees it filled in
    setTimeout(() => {
      onSubmit(example, "free");
    }, 300);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const charCount = question.trim().length;
  const canSubmit = charCount >= 3;

  return (
    <div className="h-full flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 pt-6 pb-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 transition-colors bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/20 dark:border-gray-700/30 rounded-xl px-3 py-2 hover:bg-white/80 dark:hover:bg-gray-700/80"
        >
          <ArrowLeft size={16} />
          返回
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-sm">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-gray-100">
              自由输入
            </h2>
            <p className="text-xs text-slate-400 dark:text-gray-500">
              用你的话说出旅行需求
            </p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-6 -mt-12">
        <div className="w-full max-w-2xl">
          {/* Input card */}
          <form
            onSubmit={handleSubmit}
            className="relative group"
          >
            <div className="bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl border border-white/30 dark:border-gray-700/30 rounded-2xl shadow-lg shadow-black/5 transition-all duration-300 group-focus-within:shadow-xl group-focus-within:border-orange-300/50 dark:group-focus-within:border-orange-500/30 group-focus-within:-translate-y-0.5 overflow-hidden">
              <textarea
                ref={textareaRef}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="说说你想去哪里玩、预算多少、几天时间…"
                rows={4}
                className="w-full bg-transparent text-slate-800 dark:text-gray-100 text-base placeholder:text-slate-300 dark:placeholder:text-gray-600 resize-none px-5 pt-5 pb-3 outline-none leading-relaxed"
              />
              <div className="flex items-center justify-between px-5 pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 dark:text-gray-500">
                    {canSubmit ? (
                      <span className="text-emerald-500">✓ 可以发送</span>
                    ) : (
                      <span>{charCount > 0 ? "至少输入3个字符" : "输入你的旅行问题"}</span>
                    )}
                  </span>
                </div>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-all ${
                    canSubmit
                      ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-sm hover:shadow-md active:scale-95"
                      : "bg-slate-100 dark:bg-gray-700 text-slate-400 dark:text-gray-500 cursor-not-allowed"
                  }`}
                >
                  <Send size={15} />
                  发送
                </button>
              </div>
            </div>
          </form>

          {/* 快捷工具 */}
          <div className="mt-5 animate-fade-in">
            <p className="text-xs text-slate-400 dark:text-gray-500 mb-2.5 text-center">
              ⚡ 快捷查询
            </p>
            <div className="flex justify-center gap-3">
              {QUICK_TOOLS.map((tool) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.key}
                    type="button"
                    onClick={() => {
                      const msg = question.trim() || "北京";
                      onSubmit(`快速查询:${tool.key}:${msg}`, tool.key);
                    }}
                    className="group flex flex-col items-center gap-1.5 bg-white/60 dark:bg-gray-800/50 backdrop-blur-sm border border-white/30 dark:border-gray-700/30 hover:border-white/50 dark:hover:border-gray-600/50 rounded-xl px-4 py-3 transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-95 min-w-[90px]"
                  >
                    <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${tool.color} flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow`}>
                      <Icon size={16} className="text-white" />
                    </div>
                    <span className="text-xs font-semibold text-slate-600 dark:text-gray-300">{tool.label}</span>
                    <span className="text-[10px] text-slate-400 dark:text-gray-500 leading-tight text-center">{tool.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Example questions */}
          {showExamples && (
            <div className="mt-8 animate-fade-in">
              <p className="text-xs text-slate-400 dark:text-gray-500 mb-3 text-center">
                试试这些例子，或输入你自己的问题
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {EXAMPLE_QUESTIONS.map((example, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleExampleClick(example)}
                    className="group relative bg-white/60 dark:bg-gray-800/50 backdrop-blur-sm border border-white/30 dark:border-gray-700/30 hover:border-orange-300/50 dark:hover:border-orange-500/30 hover:bg-white/80 dark:hover:bg-gray-700/70 text-slate-600 dark:text-gray-300 text-sm px-4 py-2 rounded-xl transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-95"
                  >
                    <span className="mr-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                      {idx % 4 === 0 ? "🗺️" : idx % 4 === 1 ? "🍜" : idx % 4 === 2 ? "🏨" : "🎫"}
                    </span>
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
