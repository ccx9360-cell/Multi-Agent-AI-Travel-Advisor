import ReactMarkdown from "react-markdown";
import { Download, Copy, Check, Clock, MessageSquare } from "lucide-react";
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
      <span className="block my-3 rounded-xl overflow-hidden bg-slate-100">
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
    <div className="mx-4 my-3">
      {/* Action bar */}
      <div className="flex items-center justify-between mb-3 bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-green-100 p-1.5 rounded-lg">
            <Check size={16} className="text-green-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">行程方案</h3>
            <p className="text-xs text-slate-400">
              基于美团酒旅实时数据
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={handleCopy}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
            title="复制内容"
          >
            {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
          </button>
          <button
            onClick={handleDownload}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
            title="下载为 Markdown"
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* Original request (collapsible) */}
      <button
        onClick={() => setExpandedRequest(!expandedRequest)}
        className="w-full bg-orange-50 border border-orange-200 rounded-xl p-3 mb-3 text-left hover:bg-orange-100/50 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare size={14} className="text-orange-600" />
            <p className="text-xs font-semibold text-orange-800">你的查询</p>
          </div>
          <Clock size={14} className={`text-orange-400 transition-transform ${expandedRequest ? "rotate-180" : ""}`} />
        </div>
        {expandedRequest && (
          <p className="text-sm text-orange-900 mt-2">{request}</p>
        )}
      </button>

      {/* Itinerary content */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 itinerary-content shadow-sm">
        <ReactMarkdown components={components}>{itinerary}</ReactMarkdown>
      </div>
    </div>
  );
}
