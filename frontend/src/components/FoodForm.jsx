import { useState } from "react";
import { ChevronLeft, UtensilsCrossed, Loader2, Star } from "lucide-react";

const FOOD_TYPES = [
  "本地小吃", "火锅/串串", "老字号/经典", "网红探店",
  "甜品/茶饮", "烧烤/烤肉", "海鲜", "咖啡/酒吧", "日料", "西餐",
];

const BUDGETS = ["不限", "人均50以下", "50-100", "100-200", "200+"];

const RATINGS = [
  { label: "★ ≥ 3.5", value: "3.5" },
  { label: "★ ≥ 4.0", value: "4.0" },
  { label: "★ ≥ 4.5", value: "4.5" },
];

function Chip({ label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
        selected
          ? "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 shadow-sm"
          : "bg-slate-50/80 dark:bg-gray-800/50 border-slate-200/50 dark:border-gray-700/30 text-slate-600 dark:text-gray-400 hover:border-red-200 dark:hover:border-red-700/50 hover:text-red-600 dark:hover:text-red-300"
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
          ? "bg-gradient-to-r from-red-400 to-pink-500 text-white border-transparent shadow-sm"
          : "bg-slate-50/80 dark:bg-gray-800/50 border-slate-200/50 dark:border-gray-700/30 text-slate-600 dark:text-gray-400 hover:border-red-200 dark:hover:border-red-700/50"
      }`}
    >
      {label}
    </button>
  );
}

export default function FoodForm({ onSubmit, onBack }) {
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [foodType, setFoodType] = useState([]);
  const [rating, setRating] = useState("4.0");
  const [budget, setBudget] = useState("不限");
  const [avoidPitfalls, setAvoidPitfalls] = useState(true);
  const [useDianping, setUseDianping] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleFoodType = (type) => {
    setFoodType((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!city.trim()) return;
    setLoading(true);

    const query =
      `推荐${city}${address ? "·" + address + "附近" : ""}的美食` +
      (foodType.length ? `，${foodType.join("、")}类` : "") +
      (budget !== "不限" ? `，${budget}` : "") +
      `，评分${rating}分以上` +
      (avoidPitfalls ? "，标注避坑提醒" : "");

    await new Promise((r) => setTimeout(r, 100));
    onSubmit(query, "food");
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 animate-fade-in">
      <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-4">
        {/* Back button */}
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 transition-colors"
        >
          <ChevronLeft size={18} />
          返回
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-red-400 to-pink-500 p-2.5 rounded-xl shadow-sm">
            <UtensilsCrossed size={22} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-gray-100">美食探店</h2>
            <p className="text-xs text-slate-400 dark:text-gray-500">找附近热门美食，避坑推荐</p>
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
            className="w-full rounded-xl border border-slate-200/50 dark:border-gray-700/30 px-3 py-2 text-sm bg-white/50 dark:bg-gray-900/50 text-slate-900 dark:text-gray-100 placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-400/50"
          />

          <label className="text-sm font-semibold text-slate-700 dark:text-gray-300">📍 具体位置（可选）</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="如：三里屯、宽窄巷子..."
            className="w-full rounded-xl border border-slate-200/50 dark:border-gray-700/30 px-3 py-2 text-sm bg-white/50 dark:bg-gray-900/50 text-slate-900 dark:text-gray-100 placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-400/50"
          />
        </div>

        {/* Food type */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-2xl p-4 space-y-3 shadow-sm">
          <label className="text-sm font-semibold text-slate-700 dark:text-gray-300">🍽️ 美食类型（多选）</label>
          <div className="flex flex-wrap gap-2">
            {FOOD_TYPES.map((t) => (
              <Chip key={t} label={t} selected={foodType.includes(t)} onClick={() => toggleFoodType(t)} />
            ))}
          </div>
        </div>

        {/* Budget */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-2xl p-4 space-y-3 shadow-sm">
          <label className="text-sm font-semibold text-slate-700 dark:text-gray-300">💰 预算</label>
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

        {/* Toggles */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-2xl p-4 space-y-3 shadow-sm">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm font-medium text-slate-700 dark:text-gray-300">⚠️ 避坑提醒</span>
            <button
              type="button"
              onClick={() => setAvoidPitfalls(!avoidPitfalls)}
              className={`relative w-10 h-6 rounded-full transition-colors ${
                avoidPitfalls ? "bg-red-500" : "bg-slate-300 dark:bg-gray-600"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                  avoidPitfalls ? "translate-x-4" : ""
                }`}
              />
            </button>
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700 dark:text-gray-300">📊 大众点评评分优先</span>
              {!useDianping && (
                <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full">
                  即将接入
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setUseDianping(!useDianping)}
              className={`relative w-10 h-6 rounded-full transition-colors ${
                useDianping ? "bg-red-500" : "bg-slate-300 dark:bg-gray-600"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                  useDianping ? "translate-x-4" : ""
                }`}
              />
            </button>
          </label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !city.trim()}
          className="w-full bg-gradient-to-r from-red-400 to-pink-500 hover:from-red-500 hover:to-pink-600 disabled:from-slate-300 disabled:to-slate-300 dark:disabled:from-gray-600 dark:disabled:to-gray-600 text-white font-semibold px-5 py-3 rounded-2xl transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <UtensilsCrossed size={18} />
          )}
          {loading ? "搜索中..." : "🔍 开始搜索美食"}
        </button>
      </form>
    </div>
  );
}
