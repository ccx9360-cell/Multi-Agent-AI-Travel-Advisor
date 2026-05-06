import { useState } from "react";
import { Send, Loader2, Sparkles } from "lucide-react";

const EXAMPLE_PROMPTS = [
  "北京三日游攻略，帮我规划路线和酒店",
  "上海迪士尼门票多少钱？附近有什么酒店推荐？",
  "成都美食推荐，火锅串串哪家正宗？",
  "昆明大理丽江七日游，带爸妈去",
];

export default function ChatInput({ onSend, disabled }) {
  const [message, setMessage] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage("");
    }
  };

  return (
    <div className="bg-white border-t border-slate-200 px-4 pt-3 pb-4">
      {/* Example prompts - only when idle */}
      {!disabled && !message && (
        <div className="mb-3 flex flex-wrap gap-2">
          {EXAMPLE_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              onClick={() => {
                onSend(prompt);
              }}
              className="group flex items-center gap-1 text-xs bg-slate-50 hover:bg-orange-50 text-slate-500 hover:text-orange-600 px-3 py-1.5 rounded-full border border-slate-200 hover:border-orange-200 transition-all"
            >
              <Sparkles size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              {prompt}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2 items-end">
        <div className="flex-1 relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="描述你的旅行需求，比如：推荐北京三里屯附近的五星级酒店..."
            disabled={disabled}
            rows={1}
            className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 pr-12 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
        <button
          type="submit"
          disabled={disabled || !message.trim()}
          className="shrink-0 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-slate-300 disabled:to-slate-300 text-white p-3 rounded-xl transition-all disabled:cursor-not-allowed shadow-sm hover:shadow-md active:scale-95"
        >
          {disabled ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Send size={20} />
          )}
        </button>
      </form>
    </div>
  );
}
