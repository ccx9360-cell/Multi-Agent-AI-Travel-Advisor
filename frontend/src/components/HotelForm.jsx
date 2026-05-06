import { useState } from "react";
import { ChevronLeft, Hotel, Loader2, Star } from "lucide-react";

const BUDGETS = ["不限", "<200", "200-400", "400-800", "800+"];
const RATINGS = [
  { label: "★ ≥ 3.5", value: "3.5" },
  { label: "★ ≥ 4.0", value: "4.0" },
  { label: "★ ≥ 4.5", value: "4.5" },
];
const PREFERENCES = [
  "近景点", "近地铁", "含早餐", "免费取消", "亲子友好", "商务", "情侣/浪漫",
];

function Chip({ label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
        selected
          ? "bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300 shadow-sm"
          : "bg-slate-50/80 dark:bg-gray-800/50 border-slate-200/50 dark:border-gray-700/30 text-slate-600 dark:text-gray-400 hover:border-orange-200 dark:hover:border-orange-700/50 hover:text-orange-600 dark:hover:text-orange-300"
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
          ? "bg-gradient-to-r from-orange-400 to-rose-500 text-white border-transparent shadow-sm"
          : "bg-slate-50/80 dark:bg-gray-800/50 border-slate-200/50 dark:border-gray-700/30 text-slate-600 dark:text-gray-400 hover:border-orange-200 dark:hover:border-orange-700/50"
      }`}
    >
      {label}
    </button>
  );
}

export default function HotelForm({ onSubmit, onBack }) {
  const [city, setCity] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);
  const [budget, setBudget] = useState("不限");
  const [rating, setRating] = useState("4.0");
  const [preferences, setPreferences] = useState([]);
  const [loading, setLoading] = useState(false);

  const togglePreference = (p) => {
    setPreferences((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!city.trim()) return;
    setLoading(true);

    const query =
      `推荐${city}的酒店` +
      (checkIn ? `，入住${checkIn}` : "") +
      (checkOut ? `，退房${checkOut}` : "") +
      `，${guests}人` +
      (budget !== "不限" ? `，预算${budget}元` : "") +
      `，评分${rating}分以上` +
      (preferences.length ? `，偏好${preferences.join("、")}` : "");

    await new Promise((r) => setTimeout(r, 100));
    onSubmit(query, "hotel");
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
          <div className="bg-gradient-to-br from-orange-400 to-rose-500 p-2.5 rounded-xl shadow-sm">
            <Hotel size={22} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-gray-100">酒店推荐</h2>
            <p className="text-xs text-slate-400 dark:text-gray-500">比价评分，精选好房</p>
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
            className="w-full rounded-xl border border-slate-200/50 dark:border-gray-700/30 px-3 py-2 text-sm bg-white/50 dark:bg-gray-900/50 text-slate-900 dark:text-gray-100 placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-400/50"
          />
        </div>

        {/* Dates */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-2xl p-4 space-y-3 shadow-sm">
          <label className="text-sm font-semibold text-slate-700 dark:text-gray-300">📅 入住日期</label>
          <input
            type="date"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            className="w-full rounded-xl border border-slate-200/50 dark:border-gray-700/30 px-3 py-2 text-sm bg-white/50 dark:bg-gray-900/50 text-slate-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-400/50"
          />
          <label className="text-sm font-semibold text-slate-700 dark:text-gray-300">📅 退房日期</label>
          <input
            type="date"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            className="w-full rounded-xl border border-slate-200/50 dark:border-gray-700/30 px-3 py-2 text-sm bg-white/50 dark:bg-gray-900/50 text-slate-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-400/50"
          />
        </div>

        {/* Guests */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-2xl p-4 space-y-3 shadow-sm">
          <label className="text-sm font-semibold text-slate-700 dark:text-gray-300">👥 人数</label>
          <input
            type="number"
            min="1"
            max="20"
            value={guests}
            onChange={(e) => setGuests(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full rounded-xl border border-slate-200/50 dark:border-gray-700/30 px-3 py-2 text-sm bg-white/50 dark:bg-gray-900/50 text-slate-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-400/50"
          />
        </div>

        {/* Budget */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-2xl p-4 space-y-3 shadow-sm">
          <label className="text-sm font-semibold text-slate-700 dark:text-gray-300">💰 预算（每晚）</label>
          <div className="flex flex-wrap gap-2">
            {BUDGETS.map((b) => (
              <Pill key={b} label={b} selected={budget === b} onClick={() => setBudget(b)} />
            ))}
          </div>
        </div>

        {/* Rating */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-2xl p-4 space-y-3 shadow-sm">
          <label className="text-sm font-semibold text-slate-700 dark:text-gray-300">
            <Star size={14} className="inline mr-1 text-yellow-500" />
            最低评分
          </label>
          <div className="flex flex-wrap gap-2">
            {RATINGS.map((r) => (
              <Pill key={r.value} label={r.label} selected={rating === r.value} onClick={() => setRating(r.value)} />
            ))}
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-2xl p-4 space-y-3 shadow-sm">
          <label className="text-sm font-semibold text-slate-700 dark:text-gray-300">🏷️ 偏好（多选）</label>
          <div className="flex flex-wrap gap-2">
            {PREFERENCES.map((p) => (
              <Chip key={p} label={p} selected={preferences.includes(p)} onClick={() => togglePreference(p)} />
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !city.trim()}
          className="w-full bg-gradient-to-r from-orange-400 to-rose-500 hover:from-orange-500 hover:to-rose-600 disabled:from-slate-300 disabled:to-slate-300 dark:disabled:from-gray-600 dark:disabled:to-gray-600 text-white font-semibold px-5 py-3 rounded-2xl transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Hotel size={18} />}
          {loading ? "搜索中..." : "🔍 搜索酒店"}
        </button>
      </form>
    </div>
  );
}
