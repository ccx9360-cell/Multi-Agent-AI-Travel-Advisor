import { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  UtensilsCrossed,
  Loader2,
  Star,
  Lightbulb,
  X,
  Search,
  MapPin,
  ChefHat,
  Sparkles,
} from "lucide-react";

// ── 美食类型（任务需求） ──
const FOOD_TYPES = ["火锅", "烧烤", "小吃", "甜品", "海鲜", "本地菜"];

// ── 口味偏好 ──
const TASTES = ["辣", "清淡", "甜", "酸", "鲜"];

// ── 场景 ──
const SCENES = ["一人食", "约会", "聚餐", "必吃老字号", "夜市"];

// ── 预算 ──
const BUDGETS = ["不限", "人均50以下", "50-100", "100-200", "200+"];

// ── 评分 ──
const RATINGS = [
  { label: "★ ≥ 3.5", value: "3.5" },
  { label: "★ ≥ 4.0", value: "4.0" },
  { label: "★ ≥ 4.5", value: "4.5" },
];

// ── 标签选择器（白底多选/单选通用） ──
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

// ── 渐变 pill（单选） ──
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

// ── 知识气泡弹窗 ──
function KnowledgeBubble({ tips, onClose }) {
  return (
    <div className="relative mt-2 animate-fade-in">
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200/60 dark:border-amber-700/30 rounded-xl p-3 shadow-sm">
        <div className="flex items-start gap-2">
          <Lightbulb size={16} className="text-amber-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1">
              🎯 美食攻略小贴士
            </p>
            <p className="text-xs text-amber-800/80 dark:text-amber-200/80 leading-relaxed whitespace-pre-line">
              {tips}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-amber-400 hover:text-amber-600 dark:hover:text-amber-200 transition-colors shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── "正在搜索" 过渡动画 ──
function SearchingOverlay({ city, foodType, taste, scene }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm rounded-2xl animate-fade-in">
      <div className="relative">
        <Loader2 size={48} className="animate-spin text-red-400" />
        <UtensilsCrossed
          size={20}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-red-500"
        />
      </div>
      <p className="mt-4 text-base font-semibold text-slate-700 dark:text-gray-200">
        🔍 正在搜索美食...
      </p>
      <p className="mt-1 text-xs text-slate-400 dark:text-gray-500 max-w-[220px] text-center">
        {city && `正在为你探索${city}`}
        {foodType.length > 0 && `的${foodType.join("、")}`}
        {taste.length > 0 && `（${taste.join("、")}口味）`}
        {scene.length > 0 && ` · ${scene.join("、")}`}
      </p>
      <div className="mt-4 flex gap-1.5">
        <span className="w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
        <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
        <span className="w-2 h-2 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
      </div>
    </div>
  );
}

// ── 主组件 ──
export default function FoodForm({ onSubmit, onBack }) {
  // 表单状态
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [foodType, setFoodType] = useState([]);
  const [taste, setTaste] = useState([]);
  const [scene, setScene] = useState([]);
  const [rating, setRating] = useState("4.0");
  const [budget, setBudget] = useState("不限");
  const [avoidPitfalls, setAvoidPitfalls] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showSearching, setShowSearching] = useState(false);

  // 知识气泡状态
  const [knowledgeTips, setKnowledgeTips] = useState(null);
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const [showKnowledge, setShowKnowledge] = useState(false);

  const debounceRef = useRef(null);
  const cityInputRef = useRef(null);

  // ── 城市输入后自动获取 RAG 知识提示（防抖） ──
  useEffect(() => {
    if (!city.trim() || city.trim().length < 2) {
      setKnowledgeTips(null);
      setShowKnowledge(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setKnowledgeLoading(true);
      try {
        const res = await fetch("/api/knowledge/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `${city}美食推荐 必吃 特色小吃`,
            destination: city,
            top_k: 3,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const result = data.result || "";
          if (result && result.trim()) {
            // 提取关键信息，限制长度
            const cleaned = result
              .replace(/\n{3,}/g, "\n\n")
              .trim()
              .slice(0, 500);
            setKnowledgeTips(cleaned);
          } else {
            setKnowledgeTips(null);
          }
        }
      } catch {
        // 静默失败，知识提示不是关键功能
        setKnowledgeTips(null);
      } finally {
        setKnowledgeLoading(false);
      }
    }, 800);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [city]);

  // 切换多选
  const toggleArray = (arr, setter, item) => {
    setter((prev) =>
      prev.includes(item) ? prev.filter((t) => t !== item) : [...prev, item]
    );
  };

  // ── 提交 ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!city.trim()) return;

    setLoading(true);
    setShowSearching(true);

    // 合成自然语言查询
    const parts = [`推荐${city}的美食`];
    if (address.trim()) parts.push(`位于${address.trim()}附近`);
    if (foodType.length > 0) parts.push(`类型：${foodType.join("、")}`);
    if (taste.length > 0) parts.push(`口味：${taste.join("、")}`);
    if (scene.length > 0) parts.push(`场景：${scene.join("、")}`);
    if (budget !== "不限") parts.push(budget);
    parts.push(`评分${rating}分以上`);
    if (avoidPitfalls) parts.push("标注避坑提醒");

    const query = parts.join("，");

    // 给动画一些展现时间
    await new Promise((r) => setTimeout(r, 800));
    setShowSearching(false);
    setLoading(false);
    onSubmit(query, "food");
  };

  // ── 渲染 ──
  return (
    <div className="flex-1 overflow-y-auto p-4 animate-fade-in relative">
      <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-4">
        {/* 返回按钮 */}
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 transition-colors"
        >
          <ChevronLeft size={18} />
          返回
        </button>

        {/* 头部 */}
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-red-400 to-pink-500 p-2.5 rounded-xl shadow-sm">
            <UtensilsCrossed size={22} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-gray-100">美食探店</h2>
            <p className="text-xs text-slate-400 dark:text-gray-500">选好偏好，帮你发现地道美味</p>
          </div>
        </div>

        {/* ── 城市 + 位置 ── */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-2xl p-4 space-y-3 shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-semibold text-slate-700 dark:text-gray-300">
                <MapPin size={14} className="inline mr-1" />
                城市
              </label>
              {/* 知识提示按钮 */}
              {city.trim().length >= 2 && knowledgeTips && (
                <button
                  type="button"
                  onClick={() => setShowKnowledge(!showKnowledge)}
                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-all ${
                    showKnowledge
                      ? "bg-amber-100 dark:bg-amber-800/40 text-amber-700 dark:text-amber-300"
                      : "bg-slate-100 dark:bg-gray-700/50 text-slate-500 dark:text-gray-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-600 dark:hover:text-amber-300"
                  }`}
                >
                  {knowledgeLoading ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Lightbulb size={12} />
                  )}
                  美食攻略
                </button>
              )}
              {city.trim().length >= 2 && knowledgeLoading && !knowledgeTips && (
                <span className="text-xs text-slate-400 dark:text-gray-500 flex items-center gap-1">
                  <Loader2 size={12} className="animate-spin" />
                  查询攻略...
                </span>
              )}
            </div>
            <input
              ref={cityInputRef}
              type="text"
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setShowKnowledge(false);
              }}
              placeholder="如：北京、上海、成都、广州..."
              className="w-full rounded-xl border border-slate-200/50 dark:border-gray-700/30 px-3 py-2 text-sm bg-white/50 dark:bg-gray-900/50 text-slate-900 dark:text-gray-100 placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-400/50"
            />
            {/* 知识气泡 */}
            {showKnowledge && knowledgeTips && (
              <KnowledgeBubble
                tips={knowledgeTips}
                onClose={() => setShowKnowledge(false)}
              />
            )}
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700 dark:text-gray-300">
              具体位置
              <span className="text-xs text-slate-400 dark:text-gray-500 font-normal ml-1">（可选）</span>
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="如：三里屯、宽窄巷子、商圈名..."
              className="w-full rounded-xl border border-slate-200/50 dark:border-gray-700/30 px-3 py-2 text-sm bg-white/50 dark:bg-gray-900/50 text-slate-900 dark:text-gray-100 placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-400/50 mt-1"
            />
          </div>
        </div>

        {/* ── 美食类型 ── */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-2xl p-4 space-y-3 shadow-sm">
          <label className="text-sm font-semibold text-slate-700 dark:text-gray-300">
            <ChefHat size={14} className="inline mr-1" />
            美食类型
            <span className="text-xs text-slate-400 dark:text-gray-500 font-normal ml-1">（多选）</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {FOOD_TYPES.map((t) => (
              <Chip
                key={t}
                label={t}
                selected={foodType.includes(t)}
                onClick={() => toggleArray(foodType, setFoodType, t)}
              />
            ))}
          </div>
        </div>

        {/* ── 口味偏好 ── */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-2xl p-4 space-y-3 shadow-sm">
          <label className="text-sm font-semibold text-slate-700 dark:text-gray-300">
            🌶️ 口味偏好
            <span className="text-xs text-slate-400 dark:text-gray-500 font-normal ml-1">（多选）</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {TASTES.map((t) => (
              <Chip
                key={t}
                label={t}
                selected={taste.includes(t)}
                onClick={() => toggleArray(taste, setTaste, t)}
              />
            ))}
          </div>
        </div>

        {/* ── 场景 ── */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-2xl p-4 space-y-3 shadow-sm">
          <label className="text-sm font-semibold text-slate-700 dark:text-gray-300">
            <Sparkles size={14} className="inline mr-1" />
            用餐场景
            <span className="text-xs text-slate-400 dark:text-gray-500 font-normal ml-1">（多选）</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {SCENES.map((s) => (
              <Chip
                key={s}
                label={s}
                selected={scene.includes(s)}
                onClick={() => toggleArray(scene, setScene, s)}
              />
            ))}
          </div>
        </div>

        {/* ── 预算 ── */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-2xl p-4 space-y-3 shadow-sm">
          <label className="text-sm font-semibold text-slate-700 dark:text-gray-300">💰 预算</label>
          <div className="flex flex-wrap gap-2">
            {BUDGETS.map((b) => (
              <Pill key={b} label={b} selected={budget === b} onClick={() => setBudget(b)} />
            ))}
          </div>
        </div>

        {/* ── 最低评分 ── */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-2xl p-4 space-y-3 shadow-sm">
          <label className="text-sm font-semibold text-slate-700 dark:text-gray-300">
            <Star size={14} className="inline mr-1 text-yellow-500" />
            最低评分
          </label>
          <div className="flex flex-wrap gap-2">
            {RATINGS.map((r) => (
              <Pill
                key={r.value}
                label={r.label}
                selected={rating === r.value}
                onClick={() => setRating(r.value)}
              />
            ))}
          </div>
        </div>

        {/* ── 开关 ── */}
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
        </div>

        {/* ── 提交 ── */}
        <div className="relative">
          <button
            type="submit"
            disabled={loading || !city.trim()}
            className="w-full bg-gradient-to-r from-red-400 to-pink-500 hover:from-red-500 hover:to-pink-600 disabled:from-slate-300 disabled:to-slate-300 dark:disabled:from-gray-600 dark:disabled:to-gray-600 text-white font-semibold px-5 py-3 rounded-2xl transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95 disabled:cursor-not-allowed disabled:active:scale-100 disabled:hover:translate-y-0 disabled:hover:shadow-sm flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Search size={18} />
            )}
            {loading ? "搜索中..." : "✅ 选好了，帮我找美食"}
          </button>

          {/* 搜索过渡动画 */}
          {showSearching && (
            <SearchingOverlay
              city={city}
              foodType={foodType}
              taste={taste}
              scene={scene}
            />
          )}
        </div>
      </form>
    </div>
  );
}
