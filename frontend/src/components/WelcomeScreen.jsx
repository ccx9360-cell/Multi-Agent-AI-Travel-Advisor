import {
  UtensilsCrossed, Hotel, Ticket, Route,
  MessageSquareText, Compass,
} from "lucide-react";

const MODES = [
  {
    id: "food",
    icon: UtensilsCrossed,
    label: "美食探店",
    desc: "找附近热门美食，避坑推荐",
    gradient: "from-red-400 to-pink-500",
  },
  {
    id: "hotel",
    icon: Hotel,
    label: "酒店推荐",
    desc: "比价评分，精选好房",
    gradient: "from-orange-400 to-rose-500",
  },
  {
    id: "attractions",
    icon: Ticket,
    label: "景点门票",
    desc: "门票价格、开放时间、攻略",
    gradient: "from-blue-400 to-cyan-500",
  },
  {
    id: "itinerary",
    icon: Route,
    label: "行程规划",
    desc: "AI定制专属旅游路线",
    gradient: "from-green-400 to-emerald-500",
  },
  {
    id: "free",
    icon: MessageSquareText,
    label: "自由输入",
    desc: "直接描述你的旅行需求",
    gradient: "from-purple-400 to-violet-500",
  },
];

const staggerClass = (i) => {
  const classes = ["stagger-1", "stagger-2", "stagger-3", "stagger-4", "stagger-5"];
  return classes[i] || "stagger-5";
};

export default function WelcomeScreen({ onSelectMode }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      {/* Decorative shapes */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-orange-200/20 to-rose-200/20 dark:from-orange-500/5 dark:to-rose-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-gradient-to-br from-blue-200/20 to-cyan-200/20 dark:from-blue-500/5 dark:to-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Logo */}
      <div className="bg-gradient-to-br from-orange-500 to-red-500 p-4 rounded-2xl mb-4 shadow-lg shadow-orange-500/20 dark:shadow-orange-500/10">
        <Compass size={44} className="text-white" />
      </div>

      <h2 className="text-2xl font-bold text-slate-900 dark:text-gray-100 mb-2">
        想去哪里玩？告诉我吧
      </h2>
      <p className="text-slate-500 dark:text-gray-400 max-w-md mb-6 text-sm">
        美团酒旅数据实时查询 · 酒店 / 景点 / 门票 / 交通一站式搞定
      </p>

      {/* Mode selection cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-xl w-full">
        {MODES.map(({ id, icon: Icon, label, desc, gradient }, i) => (
          <button
            key={id}
            onClick={() => onSelectMode(id)}
            className={`${staggerClass(i)} group relative rounded-2xl border border-white/20 dark:border-gray-700/30 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-4 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/10 active:scale-95`}
          >
            {/* Gradient icon background */}
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} mb-2 shadow-sm transition-transform duration-300 group-hover:scale-110`}>
              <Icon size={20} className="text-white" />
            </div>
            <p className="text-sm font-bold text-slate-800 dark:text-gray-200 mb-0.5">
              {label}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-gray-500 leading-tight">
              {desc}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
