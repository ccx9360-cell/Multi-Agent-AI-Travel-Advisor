import { Globe, Menu, Sun, Moon } from "lucide-react";

export default function Header({ onToggleSidebar, darkMode, onToggleDarkMode }) {
  return (
    <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-white/20 dark:border-gray-700/30 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-lg shadow-black/5">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-lg transition-colors lg:hidden"
        >
          <Menu size={20} className="text-slate-600 dark:text-gray-400" />
        </button>
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-orange-500 to-red-500 p-2 rounded-xl shadow-sm">
            <Globe size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-gray-100 leading-tight">
              AI 旅行规划助手
            </h1>
            <p className="text-xs text-slate-400 dark:text-gray-500">
              美团酒旅 · 智能出行
            </p>
          </div>
        </div>
      </div>
      <button
        onClick={onToggleDarkMode}
        className="p-2 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-xl transition-all text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200"
        title={darkMode ? "切换到浅色模式" : "切换到深色模式"}
      >
        {darkMode ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </header>
  );
}
