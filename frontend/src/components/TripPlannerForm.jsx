import { useState } from "react";
import { ChevronLeft, Route, Loader2, ChevronRight, Check } from "lucide-react";

const INTERESTS = [
  "美食之旅", "文化历史", "自然风光", "城市漫游",
  "购物休闲", "拍照打卡", "亲子游", "蜜月/情侣",
];

const BUDGETS = ["穷游", "经济型", "舒适型", "奢华"];
const TRANSPORTS = ["飞机", "高铁", "自驾", "混合"];
const HOTEL_TYPES = ["经济连锁", "精品民宿", "星级酒店"];

function StepDot({ step, current, label }) {
  const isDone = step < current;
  const isActive = step === current;
  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
          isDone
            ? "bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-sm"
            : isActive
            ? "bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-md shadow-green-400/30 scale-110"
            : "bg-slate-200 dark:bg-gray-700 text-slate-500 dark:text-gray-400"
        }`}
      >
        {isDone ? <Check size={14} /> : step}
      </div>
      <span className={`text-[10px] mt-1 hidden sm:block ${isActive ? "text-green-600 dark:text-green-400 font-semibold" : "text-slate-400 dark:text-gray-500"}`}>
        {label}
      </span>
    </div>
  );
}

function Chip({ label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
        selected
          ? "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 shadow-sm"
          : "bg-slate-50/80 dark:bg-gray-800/50 border-slate-200/50 dark:border-gray-700/30 text-slate-600 dark:text-gray-400 hover:border-green-200 dark:hover:border-green-700/50 hover:text-green-600 dark:hover:text-green-300"
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
          ? "bg-gradient-to-r from-green-400 to-emerald-500 text-white border-transparent shadow-sm"
          : "bg-slate-50/80 dark:bg-gray-800/50 border-slate-200/50 dark:border-gray-700/30 text-slate-600 dark:text-gray-400 hover:border-green-200 dark:hover:border-green-700/50"
      }`}
    >
      {label}
    </button>
  );
}

export default function TripPlannerForm({ onSubmit, onBack }) {
  const [step, setStep] = useState(1);
  // Step 1
  const [origin, setOrigin] = useState("北京");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [days, setDays] = useState(3);
  const [travelers, setTravelers] = useState(2);
  // Step 2
  const [interests, setInterests] = useState([]);
  const [pace, setPace] = useState(50);
  const [budget, setBudget] = useState("舒适型");
  // Step 3
  const [transport, setTransport] = useState("高铁");
  const [hotelPreference, setHotelPreference] = useState("精品民宿");
  // Step 4
  const [specialNeeds, setSpecialNeeds] = useState("");
  const [dietaryRestrictions, setDietaryRestrictions] = useState("");
  const [loading, setLoading] = useState(false);

  const toggleInterest = (i) => {
    setInterests((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
    );
  };

  const canProceed = () => {
    if (step === 1) return destination.trim().length > 0;
    if (step === 2) return interests.length > 0;
    return true;
  };

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const paceLabel = pace < 33 ? "悠闲" : pace < 66 ? "适中" : "紧凑";
    const query =
      `从${origin}到${destination}的${days}天旅游行程` +
      `，${travelers}人` +
      (startDate ? `，${startDate}出发` : "") +
      (interests.length ? `，兴趣${interests.join("、")}` : "") +
      `，节奏${paceLabel}` +
      `，预算${budget}` +
      `，交通${transport}` +
      `，住宿${hotelPreference}` +
      (specialNeeds ? `，特殊需求：${specialNeeds}` : "") +
      (dietaryRestrictions ? `，饮食限制：${dietaryRestrictions}` : "");

    await new Promise((r) => setTimeout(r, 100));
    onSubmit(query, "itinerary");
  };

  const steps = ["基本信息", "兴趣偏好", "交通住宿", "特殊需求"];

  return (
    <div className="flex-1 overflow-y-auto p-4 animate-fade-in">
      <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-4">
        {/* Back */}
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
          <div className="bg-gradient-to-br from-green-400 to-emerald-500 p-2.5 rounded-xl shadow-sm">
            <Route size={22} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-gray-100">行程规划</h2>
            <p className="text-xs text-slate-400 dark:text-gray-500">AI定制专属旅游路线</p>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-between px-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center flex-1">
              <StepDot step={i} current={step} label={steps[i - 1]} />
              {i < 4 && (
                <div
                  className={`flex-1 h-0.5 mx-1 transition-colors duration-300 ${
                    i < step ? "bg-gradient-to-r from-green-400 to-emerald-500" : "bg-slate-200 dark:bg-gray-700"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-2xl p-4 space-y-3 shadow-sm animate-fade-in">
            <h3 className="text-sm font-bold text-slate-800 dark:text-gray-200 mb-2">📍 基本信息</h3>
            <label className="text-sm font-semibold text-slate-700 dark:text-gray-300">出发地</label>
            <input
              type="text"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className="w-full rounded-xl border border-slate-200/50 dark:border-gray-700/30 px-3 py-2 text-sm bg-white/50 dark:bg-gray-900/50 text-slate-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-400/50"
            />
            <label className="text-sm font-semibold text-slate-700 dark:text-gray-300">目的地</label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="如：大理、成都、日本..."
              className="w-full rounded-xl border border-slate-200/50 dark:border-gray-700/30 px-3 py-2 text-sm bg-white/50 dark:bg-gray-900/50 text-slate-900 dark:text-gray-100 placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-400/50"
            />
            <label className="text-sm font-semibold text-slate-700 dark:text-gray-300">出发日期（可选）</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200/50 dark:border-gray-700/30 px-3 py-2 text-sm bg-white/50 dark:bg-gray-900/50 text-slate-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-400/50"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-gray-300">天数</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={days}
                  onChange={(e) => setDays(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full rounded-xl border border-slate-200/50 dark:border-gray-700/30 px-3 py-2 text-sm bg-white/50 dark:bg-gray-900/50 text-slate-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-400/50"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-gray-300">人数</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={travelers}
                  onChange={(e) => setTravelers(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full rounded-xl border border-slate-200/50 dark:border-gray-700/30 px-3 py-2 text-sm bg-white/50 dark:bg-gray-900/50 text-slate-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-400/50"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Interests & Style */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-2xl p-4 space-y-3 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 dark:text-gray-200 mb-2">🎯 兴趣偏好（多选）</h3>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map((i) => (
                  <Chip key={i} label={i} selected={interests.includes(i)} onClick={() => toggleInterest(i)} />
                ))}
              </div>
            </div>

            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-2xl p-4 space-y-3 shadow-sm">
              <label className="text-sm font-semibold text-slate-700 dark:text-gray-300">🏃 旅行节奏</label>
              <input
                type="range"
                min="0"
                max="100"
                value={pace}
                onChange={(e) => setPace(parseInt(e.target.value))}
                className="w-full accent-green-500"
              />
              <div className="flex justify-between text-xs text-slate-400 dark:text-gray-500">
                <span>悠闲</span>
                <span className={pace < 33 ? "text-green-600 font-semibold" : ""}>↔</span>
                <span className={pace >= 33 && pace < 66 ? "text-green-600 font-semibold" : ""}>适中</span>
                <span className={pace >= 66 ? "text-green-600 font-semibold" : ""}>↔</span>
                <span>紧凑</span>
              </div>
            </div>

            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-2xl p-4 space-y-3 shadow-sm">
              <label className="text-sm font-semibold text-slate-700 dark:text-gray-300">💰 预算</label>
              <div className="flex flex-wrap gap-2">
                {BUDGETS.map((b) => (
                  <Pill key={b} label={b} selected={budget === b} onClick={() => setBudget(b)} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Transport & Accommodation */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-2xl p-4 space-y-3 shadow-sm">
              <label className="text-sm font-semibold text-slate-700 dark:text-gray-300">🚄 交通方式</label>
              <div className="flex flex-wrap gap-2">
                {TRANSPORTS.map((t) => (
                  <Pill key={t} label={t} selected={transport === t} onClick={() => setTransport(t)} />
                ))}
              </div>
            </div>

            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-2xl p-4 space-y-3 shadow-sm">
              <label className="text-sm font-semibold text-slate-700 dark:text-gray-300">🏨 住宿偏好</label>
              <div className="flex flex-wrap gap-2">
                {HOTEL_TYPES.map((h) => (
                  <Pill key={h} label={h} selected={hotelPreference === h} onClick={() => setHotelPreference(h)} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Special Needs & Review */}
        {step === 4 && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-2xl p-4 space-y-3 shadow-sm">
              <label className="text-sm font-semibold text-slate-700 dark:text-gray-300">📝 特殊需求（可选）</label>
              <textarea
                value={specialNeeds}
                onChange={(e) => setSpecialNeeds(e.target.value)}
                placeholder="如：带老人小孩、需要轮椅通道..."
                rows={3}
                className="w-full rounded-xl border border-slate-200/50 dark:border-gray-700/30 px-3 py-2 text-sm bg-white/50 dark:bg-gray-900/50 text-slate-900 dark:text-gray-100 placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-400/50 resize-none"
              />
            </div>

            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-2xl p-4 space-y-3 shadow-sm">
              <label className="text-sm font-semibold text-slate-700 dark:text-gray-300">🥘 饮食禁忌（可选）</label>
              <input
                type="text"
                value={dietaryRestrictions}
                onChange={(e) => setDietaryRestrictions(e.target.value)}
                placeholder="如：素食、不吃辣、过敏..."
                className="w-full rounded-xl border border-slate-200/50 dark:border-gray-700/30 px-3 py-2 text-sm bg-white/50 dark:bg-gray-900/50 text-slate-900 dark:text-gray-100 placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-400/50"
              />
            </div>

            {/* Summary */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-green-200/50 dark:border-green-700/30 rounded-2xl p-4 space-y-2 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 dark:text-gray-200 mb-2">📋 行程概览</h3>
              <div className="space-y-1 text-xs text-slate-600 dark:text-gray-400">
                <p>📍 {origin} → {destination}</p>
                <p>📅 {days}天{travelers}人{startDate ? ` · ${startDate}出发` : ""}</p>
                <p>🎯 兴趣：{interests.join("、")}</p>
                <p>🏃 节奏：{pace < 33 ? "悠闲" : pace < 66 ? "适中" : "紧凑"}</p>
                <p>💰 预算：{budget}</p>
                <p>🚄 交通：{transport}</p>
                <p>🏨 住宿：{hotelPreference}</p>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 disabled:from-slate-300 disabled:to-slate-300 dark:disabled:from-gray-600 dark:disabled:to-gray-600 text-white font-semibold px-5 py-3 rounded-2xl transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Route size={18} />}
              {loading ? "生成中..." : "🚀 生成专属行程"}
            </button>
          </div>
        )}

        {/* Navigation buttons */}
        {step < 4 && (
          <div className="flex gap-2">
            {step > 1 && (
              <button
                type="button"
                onClick={handlePrev}
                className="flex-1 bg-white/80 dark:bg-gray-800/80 border border-white/20 dark:border-gray-700/30 text-slate-600 dark:text-gray-300 font-medium px-5 py-3 rounded-2xl transition-all hover:bg-white dark:hover:bg-gray-700/80 hover:shadow-sm active:scale-95 flex items-center justify-center gap-1"
              >
                <ChevronLeft size={18} />
                上一步
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceed()}
              className={`flex-1 font-medium px-5 py-3 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-1 ${
                canProceed()
                  ? "bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-sm hover:shadow-md hover:-translate-y-0.5"
                  : "bg-slate-200 dark:bg-gray-700 text-slate-400 dark:text-gray-500 cursor-not-allowed"
              }`}
            >
              下一步
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
