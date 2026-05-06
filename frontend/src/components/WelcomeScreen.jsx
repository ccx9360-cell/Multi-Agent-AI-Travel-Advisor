import {
  Building2, Train, Ticket, Hotel,
  UtensilsCrossed, Mountain, Compass, Sparkles,
} from "lucide-react";

const QUICK_TRIPS = [
  {
    icon: Hotel, label: "酒店推荐",
    query: "推荐北京三里屯附近的五星级酒店，预算800以内",
    color: "bg-orange-50 border-orange-200 text-orange-700",
  },
  {
    icon: Ticket, label: "景点门票",
    query: "故宫门票多少钱？怎么预约？",
    color: "bg-blue-50 border-blue-200 text-blue-700",
  },
  {
    icon: Mountain, label: "热门旅游",
    query: "北京三日游攻略，必去景点推荐",
    color: "bg-green-50 border-green-200 text-green-700",
  },
  {
    icon: Train, label: "火车票查询",
    query: "明天北京到上海的高铁",
    color: "bg-purple-50 border-purple-200 text-purple-700",
  },
  {
    icon: UtensilsCrossed, label: "美食探店",
    query: "北京烤鸭哪家好吃？推荐几家老字号",
    color: "bg-red-50 border-red-200 text-red-700",
  },
  {
    icon: Building2, label: "城市漫游",
    query: "上海三日游，外滩迪士尼田子坊路线",
    color: "bg-indigo-50 border-indigo-200 text-indigo-700",
  },
];

export default function WelcomeScreen({ onQuickSelect }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      {/* Logo */}
      <div className="bg-gradient-to-br from-orange-500 to-red-500 p-4 rounded-2xl mb-4 shadow-md">
        <Compass size={44} className="text-white" />
      </div>

      <h2 className="text-2xl font-bold text-slate-900 mb-2">
        想去哪里玩？告诉我吧
      </h2>
      <p className="text-slate-400 max-w-md mb-6 text-sm">
        美团酒旅数据实时查询 · 酒店 / 景点 / 门票 / 交通一站式搞定
      </p>

      {/* Quick select cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-xl w-full">
        {QUICK_TRIPS.map(({ icon: Icon, label, query, color }) => (
          <button
            key={label}
            onClick={() => onQuickSelect(query)}
            className={`rounded-xl border-2 p-3 text-center transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-95 ${color}`}
          >
            <Icon size={22} className="mx-auto mb-1.5" />
            <p className="text-xs font-semibold">{label}</p>
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-300 mt-6">
        或在下方输入框直接描述你的需求
      </p>
    </div>
  );
}
