import {
  Building2, Train, Ticket, Hotel,
  UtensilsCrossed, Mountain, Compass,
} from "lucide-react";

const QUICK_TRIPS = [
  {
    icon: Hotel, label: "酒店推荐",
    query: "推荐北京三里屯附近的五星级酒店，预算800以内",
    gradient: "from-orange-400 to-rose-500",
  },
  {
    icon: Ticket, label: "景点门票",
    query: "故宫门票多少钱？怎么预约？",
    gradient: "from-blue-400 to-cyan-500",
  },
  {
    icon: Mountain, label: "热门旅游",
    query: "北京三日游攻略，必去景点推荐",
    gradient: "from-green-400 to-emerald-500",
  },
  {
    icon: Train, label: "火车票查询",
    query: "明天北京到上海的高铁",
    gradient: "from-purple-400 to-violet-500",
  },
  {
    icon: UtensilsCrossed, label: "美食探店",
    query: "北京烤鸭哪家好吃？推荐几家老字号",
    gradient: "from-red-400 to-pink-500",
  },
  {
    icon: Building2, label: "城市漫游",
    query: "上海三日游，外滩迪士尼田子坊路线",
    gradient: "from-indigo-400 to-blue-500",
  },
];

const staggerClass = (i) => {
  const classes = ["stagger-1", "stagger-2", "stagger-3", "stagger-4", "stagger-5", "stagger-6"];
  return classes[i] || "stagger-6";
};

export default function WelcomeScreen({ onQuickSelect }) {
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

      {/* Quick select cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-xl w-full">
        {QUICK_TRIPS.map(({ icon: Icon, label, query, gradient }, i) => (
          <button
            key={label}
            onClick={() => onQuickSelect(query)}
            className={`${staggerClass(i)} group relative rounded-2xl border border-white/20 dark:border-gray-700/30 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-3 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/10 active:scale-95`}
          >
            {/* Gradient icon background */}
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} mb-2 shadow-sm transition-transform duration-300 group-hover:scale-110`}>
              <Icon size={20} className="text-white" />
            </div>
            <p className="text-xs font-semibold text-slate-700 dark:text-gray-300">
              {label}
            </p>
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-400 dark:text-gray-500 mt-6">
        或在下方输入框直接描述你的需求
      </p>
    </div>
  );
}
