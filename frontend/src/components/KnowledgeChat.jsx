import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Send, Sparkles, Loader2, Bot, User, ChevronRight } from "lucide-react";

const EXAMPLE_QUESTIONS = [
  "故宫门票多少钱？怎么预约？",
  "成都必去的景点有哪些？",
  "三亚亲子游有什么推荐？",
  "西安三日游怎么安排最合理？",
];

export default function KnowledgeChat({ onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setHasStarted(true);

    // Add user message
    const userMsg = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/knowledge/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const reply = data.answer || data.reply || data.response || JSON.stringify(data);

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `😅 抱歉，查询时出了点问题：${err.message}。请稍后重试。`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleExampleClick = (example) => {
    sendMessage(example);
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="h-full flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 pt-6 pb-3 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 transition-colors bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/20 dark:border-gray-700/30 rounded-xl px-3 py-2 hover:bg-white/80 dark:hover:bg-gray-700/80"
        >
          <ArrowLeft size={16} />
          返回
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-sm">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-gray-100">
              🔍 知识问答
            </h2>
            <p className="text-xs text-slate-400 dark:text-gray-500">
              问任何关于中国旅行的问题
            </p>
          </div>
        </div>
      </div>

      {/* Decorative blur shapes */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-cyan-200/20 to-blue-200/20 dark:from-cyan-500/5 dark:to-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-gradient-to-br from-sky-200/20 to-indigo-200/20 dark:from-sky-500/5 dark:to-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Chat messages area */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-6 py-4 space-y-4 scroll-smooth"
      >
        {/* Example questions - shown before any messages */}
        {!hasStarted && (
          <div className="flex flex-col items-center justify-center h-full -mt-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 mb-4">
              <Bot size={28} className="text-white" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-gray-100 mb-1">
              知识问答
            </h3>
            <p className="text-sm text-slate-400 dark:text-gray-500 mb-6 text-center max-w-xs">
              关于中国旅行的任何问题，AI 知识库为你解答
            </p>
            <div className="flex flex-wrap justify-center gap-2.5 max-w-md">
              {EXAMPLE_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleExampleClick(q)}
                  className="group flex items-center gap-1.5 bg-white/70 dark:bg-gray-800/60 backdrop-blur-sm border border-white/30 dark:border-gray-700/30 hover:border-cyan-300/50 dark:hover:border-cyan-500/30 hover:bg-white/80 dark:hover:bg-gray-700/70 text-slate-600 dark:text-gray-300 text-sm px-4 py-2.5 rounded-xl transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-95"
                >
                  <span className="text-base">
                    {i === 0 ? "🎫" : i === 1 ? "🏛️" : i === 2 ? "🏖️" : "🗺️"}
                  </span>
                  <span>{q}</span>
                  <ChevronRight
                    size={14}
                    className="text-slate-300 dark:text-gray-600 group-hover:text-cyan-500 group-hover:translate-x-0.5 transition-all"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message bubbles */}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex gap-3 ${
              msg.role === "user"
                ? "justify-end"
                : "justify-start"
            } animate-fade-in`}
          >
            {/* AI avatar */}
            {msg.role === "assistant" && (
              <div className="shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-sm mt-0.5">
                <Bot size={16} className="text-white" />
              </div>
            )}

            {/* Message bubble */}
            <div
              className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                msg.role === "user"
                  ? "bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-tr-md shadow-md"
                  : "bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 text-slate-700 dark:text-gray-200 rounded-tl-md shadow-sm"
              }`}
            >
              {msg.content}
            </div>

            {/* User avatar */}
            {msg.role === "user" && (
              <div className="shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-sm mt-0.5">
                <User size={16} className="text-white" />
              </div>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex gap-3 justify-start animate-fade-in">
            <div className="shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-sm mt-0.5">
              <Bot size={16} className="text-white" />
            </div>
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 text-slate-500 dark:text-gray-400 rounded-2xl rounded-tl-md px-4 py-3 text-sm shadow-sm">
              <div className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-cyan-500" />
                <span>正在思考...</span>
              </div>
            </div>
          </div>
        )}

        {/* Invisible anchor for auto-scroll */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-white/20 dark:border-gray-700/30 px-4 pt-3 pb-4 shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入关于中国旅行的问题..."
              disabled={loading}
              rows={1}
              className="w-full resize-none rounded-2xl border border-slate-200/50 dark:border-gray-700/30 px-4 py-3 pr-12 text-sm text-slate-900 dark:text-gray-100 placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm transition-all"
              style={{ minHeight: "44px" }}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="shrink-0 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:from-slate-300 disabled:to-slate-300 dark:disabled:from-gray-600 dark:disabled:to-gray-600 text-white p-3 rounded-2xl transition-all disabled:cursor-not-allowed shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95"
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </form>

        {/* Example question chips when idle */}
        {!hasStarted && !input && !loading && (
          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLE_QUESTIONS.slice(0, 4).map((q, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleExampleClick(q)}
                className="flex items-center gap-1 text-xs bg-slate-50/80 dark:bg-gray-800/50 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 text-slate-500 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 px-3 py-1.5 rounded-full border border-slate-200/50 dark:border-gray-700/30 hover:border-cyan-200 dark:hover:border-cyan-700/50 transition-all hover:-translate-y-0.5"
              >
                <Sparkles size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                {q}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
