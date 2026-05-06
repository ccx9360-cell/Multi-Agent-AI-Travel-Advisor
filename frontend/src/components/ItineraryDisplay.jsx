import ReactMarkdown from "react-markdown";
import { Download, Copy, Check, Clock, MessageSquare, ChevronDown, FileText } from "lucide-react";
import { useState } from "react";

export default function ItineraryDisplay({ itinerary, request }) {
  const [copied, setCopied] = useState(false);
  const [expandedRequest, setExpandedRequest] = useState(false);

  if (!itinerary) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(itinerary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([`# 旅行行程\n\n## 查询内容\n\n${request}\n\n## 完整行程\n\n${itinerary}`], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `旅行计划_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Render images from markdown — avoid <p><div> nesting
  const components = {
    img: ({ src, alt }) => (
      <span className="block my-3 rounded-xl overflow-hidden bg-slate-100 dark:bg-gray-800">
        <img
          src={src}
          alt={alt || ""}
          className="w-full h-48 object-cover"
          loading="lazy"
          onError={(e) => {
            e.target.style.display = "none";
          }}
        />
      </span>
    ),
    // Suppress <p> wrapping around images
    p: ({ children, ...props }) => {
      const hasOnlyImage =
        Array.isArray(children) && children.every(
          (c) => typeof c === "object" && c?.type === "img"
        );
      if (hasOnlyImage) return <>{children}</>;
      return <p {...props}>{children}</p>;
    },
  };

  return (
    <div className="mx-4 my-3 space-y-3">
      {/* Action bar - glassmorphism */}
      <div className="flex items-center justify-between bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 shadow-lg shadow-black/5 rounded-2xl p-3">
        <div className="flex items-center gap-2">
          <div className="bg-green-100 dark:bg-green-900/30 p-1.5 rounded-lg">
            <Check size={16} className="text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-gray-100">行程方案</h3>
            <p className="text-xs text-slate-400 dark:text-gray-500">
              基于美团酒旅实时数据
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="p-2 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg transition-all text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 hover:scale-105 active:scale-95"
            title="复制内容"
          >
            {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
          </button>
          <button
            onClick={handleDownload}
            className="p-2 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg transition-all text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 hover:scale-105 active:scale-95"
            title="下载为 Markdown"
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* Original request (collapsible) */}
      <button
        onClick={() => setExpandedRequest(!expandedRequest)}
        className="w-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 shadow-lg shadow-black/5 rounded-2xl p-3 text-left hover:bg-white/90 dark:hover:bg-gray-800/90 transition-all duration-300 group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare size={14} className="text-orange-500" />
            <p className="text-xs font-semibold text-orange-700 dark:text-orange-400">你的查询</p>
          </div>
          <ChevronDown size={14} className={`text-orange-400 dark:text-orange-500 transition-transform duration-300 ${expandedRequest ? "rotate-180" : ""}`} />
        </div>
        <div
          className={`overflow-hidden transition-all duration-300 ${
            expandedRequest ? "max-h-40 opacity-100 mt-2" : "max-h-0 opacity-0"
          }`}
        >
          <p className="text-sm text-slate-700 dark:text-gray-300">{request}</p>
        </div>
      </button>

      {/* Itinerary content */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 shadow-lg shadow-black/5 rounded-2xl p-5 itinerary-content">
        <ReactMarkdown components={components}>{itinerary}</ReactMarkdown>
      </div>
    </div>
  );
}
