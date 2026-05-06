import { Globe, Menu } from "lucide-react";

export default function Header({ onToggleSidebar }) {
  return (
    <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors lg:hidden"
        >
          <Menu size={20} className="text-slate-600" />
        </button>
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-orange-500 to-red-500 p-2 rounded-lg shadow-sm">
            <Globe size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">
              AI 旅行规划助手
            </h1>
            <p className="text-xs text-slate-400">
              美团酒旅 · 智能出行
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
