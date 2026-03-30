import { useState } from "react";
import { Send, Loader2 } from "lucide-react";

const EXAMPLE_PROMPTS = [
  "Plan a 7-day luxury honeymoon in Italy with focus on food and history",
  "5-day solo trip to Paris for an art lover on a mid-range budget",
  "Family trip to Barcelona with 2 kids, mix of culture and beaches",
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

  const handleExample = (prompt) => {
    if (!disabled) {
      setMessage(prompt);
    }
  };

  return (
    <div className="bg-white border-t border-slate-200 p-4">
      {/* Example prompts */}
      {!disabled && !message && (
        <div className="mb-3 flex flex-wrap gap-2">
          {EXAMPLE_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleExample(prompt)}
              className="text-xs bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 px-3 py-1.5 rounded-full border border-slate-200 hover:border-blue-200 transition-colors"
            >
              {prompt.length > 50 ? prompt.slice(0, 50) + "..." : prompt}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          placeholder="Describe your dream trip... (e.g., 10-day luxury honeymoon in Italy)"
          disabled={disabled}
          rows={2}
          className="flex-1 resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={disabled || !message.trim()}
          className="self-end bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white p-3 rounded-xl transition-colors disabled:cursor-not-allowed"
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
