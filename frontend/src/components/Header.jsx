import { Globe, Menu } from "lucide-react";

export default function Header({ onToggleSidebar }) {
  return (
    <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors lg:hidden"
        >
          <Menu size={20} className="text-slate-600" />
        </button>
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Globe size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">
              AI Travel Planner
            </h1>
            <p className="text-xs text-slate-500">
              Multi-Agent Powered
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
