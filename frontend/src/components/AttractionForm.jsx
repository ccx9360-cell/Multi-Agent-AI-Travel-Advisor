import { useState } from "react";
import { ChevronLeft, Ticket, Loader2 } from "lucide-react";

const ATTRACTION_TYPES = [
  "古迹/历史", "博物馆", "自然风光", "主题乐园",
  "网红打卡", "寺庙/宗教", "购物街区",
];

const DURATIONS = ["半天", "全天", "2-3天"];

function Chip({ label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
        selected
          ? "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 shadow-sm"
          : "bg-slate-50/80 dark:bg-gray-800/50 border-slate-200/50 dark:border-gray-700/30 text-slate-600 dark:text-gray-400 hover:border-blue-200 dark:hover:border-blue-700/50 hover:text-blue-600 dark:hover:text-blue-300"
      }`}
    >
      {label}
    </button>
  );
}

function Pill({ label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
        selected
          ? "bg-gradient-to-r from-blue-400 to-cyan-500 text-white border-transparent shadow-sm"
          : "bg-slate-50/80 dark:bg-gray-800/50 border-slate-200/50 dark:border-gray-700/30 text-slate-600 dark:text-gray-400 hover:border-blue-200 dark:hover:border-blue-700/50"
      }`}
    >
      {label}
    </button>
  );
}

export default function AttractionForm({ onSubmit, onBack }) {
  const [city, setCity] = useState("");
  const [date, setDate] = useState("");
  const [people, setPeople] = useState(2);
  const [attractionType, setAttractionType] = useState([]);
  const [duration, setDuration] = useState("全天");
  const [loading, setLoading] = useState(false);

  const toggleType = (t) => {
    setAttractionType((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!city.trim()) return;
    setLoading(true);

    const query =
      `推荐${city}的景点` +
      (date ? `，日期${date}` : "") +
      `，${people}人` +
      (attractionType.length ? `，类型${attractionType.join("、")}` : "") +
      `，游玩${duration}`;

    await new Promise((r) => setTimeout(r, 100));
    onSubmit(query, "attractions");
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 animate-fade-in">
      <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 transition-colors"
        >
          <ChevronLeft size={18} />
          返回
        </button>

        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-400 to-cyan-500 p-2.5 rounded-xl shadow-sm">
            <Ticket size={22} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-gray-100">景点门票</h2>
            <p className="text-xs text-slate-400 dark:text-gray-500">门票价格、开放时间、攻略</p>
          </div>
        </div>

        {/* City */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-2xl p-4 space-y-3 shadow-sm">
          <label className="text-sm font-semibold text-slate-700 dark:text-gray-300">📍 城市</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="如：北京、上海、成都..."
            className="w-full rounded-xl border border-slate-200/50 dark:border-gray-700/30 px-3 py-2 text-sm bg-white/50 dark:bg-gray-900/50 text-slate-900 dark:text-gray-100 placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
          />
        </div>

        {/* Date (optional) */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-2xl p-4 space-y-3 shadow-sm">
          <label className="text-sm font-semibold text-slate-700 dark:text-gray-300">📅 游玩日期（可选）</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl border border-slate-200/50 dark:border-gray-700/30 px-3 py-2 text-sm bg-white/50 dark:bg-gray-900/50 text-slate-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
          />
        </div>

        {/* People */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-2xl p-4 space-y-3 shadow-sm">
          <label className="text-sm font-semibold text-slate-700 dark:text-gray-300">👥 人数</label>
          <input
            type="number"
            min="1"
            max="50"
            value={people}
            onChange={(e) => setPeople(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full rounded-xl border border-slate-200/50 dark:border-gray-700/30 px-3 py-2 text-sm bg-white/50 dark:bg-gray-900/50 text-slate-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
          />
        </div>

        {/* Attraction type */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-2xl p-4 space-y-3 shadow-sm">
          <label className="text-sm font-semibold text-slate-700 dark:text-gray-300">🏛️ 景点类型（多选）</label>
          <div className="flex flex-wrap gap-2">
            {ATTRACTION_TYPES.map((t) => (
              <Chip key={t} label={t} selected={attractionType.includes(t)} onClick={() => toggleType(t)} />
            ))}
          </div>
        </div>

        {/* Duration */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-2xl p-4 space-y-3 shadow-sm">
          <label className="text-sm font-semibold text-slate-700 dark:text-gray-300">⏱️ 游玩时长</label>
          <div className="flex flex-wrap gap-2">
            {DURATIONS.map((d) => (
              <Pill key={d} label={d} selected={duration === d} onClick={() => setDuration(d)} />
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !city.trim()}
          className="w-full bg-gradient-to-r from-blue-400 to-cyan-500 hover:from-blue-500 hover:to-cyan-600 disabled:from-slate-300 disabled:to-slate-300 dark:disabled:from-gray-600 dark:disabled:to-gray-600 text-white font-semibold px-5 py-3 rounded-2xl transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Ticket size={18} />}
          {loading ? "搜索中..." : "🔍 搜索景点"}
        </button>
      </form>
    </div>
  );
}
