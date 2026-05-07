import { useState } from "react";
import { Clock, Trash2, MapPin, X, CheckCircle, AlertCircle, AlertTriangle, Search, Compass } from "lucide-react";

export default function Sidebar({ history, onSelect, onDelete, isOpen, onClose, searchTerm, onSearchChange, stats }) {
  const [confirmDelete, setConfirmDelete] = useState(null);

  const handleDelete = (id, e) => {
    e.stopPropagation();
    setConfirmDelete(id);
  };

  const confirmDeleteAction = (id, e) => {
    e.stopPropagation();
    onDelete(id);
    setConfirmDelete(null);
  };

  const cancelDelete = (e) => {
    e.stopPropagation();
    setConfirmDelete(null);
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 dark:bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white/90 dark:bg-gray-900/95 backdrop-blur-xl border-r border-white/20 dark:border-gray-700/30 flex flex-col transform transition-all duration-300 ease-out shadow-2xl lg:shadow-none ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-4 border-b border-slate-200/50 dark:border-gray-700/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-slate-400 dark:text-gray-500" />
              <h2 className="text-sm font-semibold text-slate-700 dark:text-gray-300">历史记录</h2>
              {stats && stats.total > 0 && (
                <span className="text-[11px] text-slate-400 dark:text-gray-600 bg-slate-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full">
                  {stats.total}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-lg lg:hidden transition-colors"
            >
              <X size={16} className="text-slate-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500" />
            <input
              type="text"
              value={searchTerm || ""}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="搜索行程..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200/50 dark:border-gray-700/30 bg-white/60 dark:bg-gray-800/60 text-slate-700 dark:text-gray-300 placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-400/50 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => onSearchChange?.("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-gray-200"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Top cities mini stats */}
          {stats?.top_cities?.length > 0 && !searchTerm && (
            <div className="flex flex-wrap gap-1 mt-2">
              {stats.top_cities.slice(0, 4).map((c) => (
                <span
                  key={c.city}
                  className="text-[10px] bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400 px-1.5 py-0.5 rounded-full flex items-center gap-1"
                >
                  <MapPin size={9} />
                  {c.city}
                  <span className="text-slate-300 dark:text-gray-600">×{c.count}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {history.length === 0 ? (
            <div className="text-center py-8 px-4">
              <MapPin size={32} className="text-slate-200 dark:text-gray-700 mx-auto mb-2" />
              <p className="text-sm text-slate-400 dark:text-gray-500">
                {searchTerm ? "未找到匹配的行程" : "暂无历史记录"}
              </p>
              <p className="text-xs text-slate-300 dark:text-gray-600 mt-1">
                {searchTerm ? "试试其他关键词" : "生成的行程会显示在这里"}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {history.map((item) => (
                <div key={item.id}>
                  <div
                    className="group flex items-start gap-2 p-2.5 rounded-xl hover:bg-white/60 dark:hover:bg-gray-800/60 cursor-pointer transition-all duration-200 hover:shadow-sm"
                    onClick={() => {
                      onSelect(item);
                      onClose();
                    }}
                  >
                    <div className="mt-0.5 shrink-0">
                      {item.status === "completed" ? (
                        <CheckCircle size={14} className="text-green-400" />
                      ) : item.status === "processing" ? (
                        <Clock size={14} className="text-blue-400" />
                      ) : (
                        <AlertCircle size={14} className="text-red-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 dark:text-gray-300 truncate font-medium">
                        {item.request.slice(0, 60)}
                        {item.request.length > 60 ? "..." : ""}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-gray-500 mt-0.5">
                        {new Date(item.created_at).toLocaleDateString("zh-CN")}
                        {" · "}
                        <span
                          className={
                            item.status === "completed"
                              ? "text-green-500 dark:text-green-400"
                              : item.status === "processing"
                              ? "text-blue-500 dark:text-blue-400"
                              : "text-red-500 dark:text-red-400"
                          }
                        >
                          {item.status === "completed"
                            ? "已完成"
                            : item.status === "processing"
                            ? "处理中"
                            : "失败"}
                        </span>
                        {item.city && ` · ${item.city}`}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDelete(item.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-slate-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-all active:scale-90"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Delete confirmation dialog */}
                  {confirmDelete === item.id && (
                    <div className="mx-2 mb-1 p-2.5 bg-red-50/80 dark:bg-red-900/20 border border-red-200/50 dark:border-red-800/30 rounded-xl animate-fade-in">
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-red-700 dark:text-red-300">
                            确认删除这条记录？
                          </p>
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={(e) => confirmDeleteAction(item.id, e)}
                              className="text-xs bg-red-500 hover:bg-red-600 text-white px-2.5 py-1 rounded-lg transition-colors"
                            >
                              删除
                            </button>
                            <button
                              onClick={cancelDelete}
                              className="text-xs bg-slate-200 dark:bg-gray-700 hover:bg-slate-300 dark:hover:bg-gray-600 text-slate-600 dark:text-gray-300 px-2.5 py-1 rounded-lg transition-colors"
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
