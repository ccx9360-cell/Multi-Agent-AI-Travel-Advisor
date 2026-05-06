import { useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import {
  Star, MapPin, AlertTriangle, UtensilsCrossed, Hotel,
  Ticket, Route, Copy, Check, MessageSquare, ChevronDown,
  RefreshCw,
} from "lucide-react";

// ---- Star rating display ----
function StarRating({ rating }) {
  const num = parseFloat(rating);
  if (isNaN(num)) return null;
  const full = Math.floor(num);
  const half = num - full >= 0.5;
  return (
    <span className="inline-flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          size={12}
          className={
            i < full
              ? "text-yellow-400 fill-yellow-400"
              : i === full && half
              ? "text-yellow-400 fill-yellow-400/50"
              : "text-slate-300 dark:text-gray-600"
          }
        />
      ))}
      <span className="ml-1 text-xs font-medium text-yellow-600 dark:text-yellow-400">{rating}</span>
    </span>
  );
}

// ---- Food result card ----
function FoodCard({ name, rating, price, address, tags, pitfalls, rawText }) {
  return (
    <div className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border ${pitfalls ? "border-red-200/50 dark:border-red-800/30" : "border-white/20 dark:border-gray-700/30"} rounded-2xl p-4 shadow-sm hover:shadow-md transition-all`}>
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-bold text-slate-900 dark:text-gray-100 text-sm">{name}</h3>
        {rating && <StarRating rating={rating} />}
      </div>
      {price && <p className="text-xs text-slate-500 dark:text-gray-400 mb-1">💰 {price}</p>}
      {address && (
        <p className="text-xs text-slate-400 dark:text-gray-500 flex items-center gap-1 mb-2">
          <MapPin size={10} /> {address}
        </p>
      )}
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {tags.map((tag, i) => (
            <span key={i} className="text-[10px] bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>
      )}
      {pitfalls && (
        <div className="mt-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 rounded-xl p-2 flex items-start gap-1.5">
          <AlertTriangle size={12} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-red-700 dark:text-red-300">{pitfalls}</p>
        </div>
      )}
    </div>
  );
}

// ---- Hotel result card ----
function HotelCard({ name, rating, price, address, tags, rawText }) {
  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-bold text-slate-900 dark:text-gray-100 text-sm">{name}</h3>
        {rating && <StarRating rating={rating} />}
      </div>
      {price && <p className="text-xs text-slate-500 dark:text-gray-400 mb-1">💰 {price}</p>}
      {address && (
        <p className="text-xs text-slate-400 dark:text-gray-500 flex items-center gap-1">
          <MapPin size={10} /> {address}
        </p>
      )}
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {tags.map((tag, i) => (
            <span key={i} className="text-[10px] bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Attraction result card ----
function AttractionCard({ name, rating, price, openingHours, address, tags, rawText }) {
  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-bold text-slate-900 dark:text-gray-100 text-sm">{name}</h3>
        {rating && <StarRating rating={rating} />}
      </div>
      {price && <p className="text-xs text-slate-500 dark:text-gray-400 mb-1">🎫 {price}</p>}
      {openingHours && <p className="text-xs text-slate-500 dark:text-gray-400 mb-1">🕐 {openingHours}</p>}
      {address && (
        <p className="text-xs text-slate-400 dark:text-gray-500 flex items-center gap-1">
          <MapPin size={10} /> {address}
        </p>
      )}
    </div>
  );
}

// ---- Parse markdown into entries ----
function parseFoodEntries(markdown) {
  const entries = [];
  const lines = markdown.split("\n");
  let current = null;

  for (const line of lines) {
    const nameMatch = line.match(/\*\*(.+?)\*\*/);
    if (nameMatch) {
      if (current) entries.push(current);
      current = { name: nameMatch[1], rating: "", price: "", address: "", tags: [], pitfalls: "", rawText: line };
      // Try to extract rating/price from same line
      const ratingMatch = line.match(/(\d\.\d)/);
      if (ratingMatch) current.rating = ratingMatch[1];
    } else if (current) {
      const ratingMatch = line.match(/(?:评分|★|Rating)[：:\s]*(\d[\d.]*\d?)/i);
      if (ratingMatch) current.rating = ratingMatch[1];
      const priceMatch = line.match(/(?:价格|人均|price|budget|预算)[：:\s]*([^，。,.\n]+)/i);
      if (priceMatch) current.price = priceMatch[1].trim();
      const addrMatch = line.match(/(?:地址|location|位置)[：:\s]*([^，。,.\n]+)/i);
      if (addrMatch) current.address = addrMatch[1].trim();
      const tagMatch = line.match(/(?:标签|tags|类型)[：:\s]*([^，。,.\n]+)/i);
      if (tagMatch) current.tags = tagMatch[1].split(/[,、\/]/).map((t) => t.trim()).filter(Boolean);
      const pitMatch = line.match(/(?:避坑|⚠|注意|pitfall)[：:\s]*([^，。,.\n]+)/i);
      if (pitMatch) current.pitfalls = pitMatch[1].trim();
    }
  }
  if (current) entries.push(current);
  return entries;
}

function parseHotelEntries(markdown) {
  const entries = [];
  const lines = markdown.split("\n");
  let current = null;

  for (const line of lines) {
    const nameMatch = line.match(/\*\*(.+?)\*\*/);
    if (nameMatch) {
      if (current) entries.push(current);
      current = { name: nameMatch[1], rating: "", price: "", address: "", tags: [] };
    } else if (current) {
      const ratingMatch = line.match(/(\d[\d.]*\d?)\s*[★/]/);
      if (ratingMatch) current.rating = ratingMatch[1];
      const priceMatch = line.match(/(?:价格|房价|price|每晚)[：:\s]*([^，。,.\n]+)/i);
      if (priceMatch) current.price = priceMatch[1].trim();
      const addrMatch = line.match(/(?:地址|location|位置)[：:\s]*([^，。,.\n]+)/i);
      if (addrMatch) current.address = addrMatch[1].trim();
      const tagMatch = line.match(/(?:标签|tags|特色)[：:\s]*([^，。,.\n]+)/i);
      if (tagMatch) current.tags = tagMatch[1].split(/[,、\/]/).map((t) => t.trim()).filter(Boolean);
    }
  }
  if (current) entries.push(current);
  return entries;
}

function parseAttractionEntries(markdown) {
  const entries = [];
  const lines = markdown.split("\n");
  let current = null;

  for (const line of lines) {
    const nameMatch = line.match(/\*\*(.+?)\*\*/);
    if (nameMatch) {
      if (current) entries.push(current);
      current = { name: nameMatch[1], rating: "", price: "", openingHours: "", address: "", tags: [] };
    } else if (current) {
      const ratingMatch = line.match(/(\d[\d.]*\d?)\s*[★/]/);
      if (ratingMatch) current.rating = ratingMatch[1];
      const priceMatch = line.match(/(?:价格|门票|ticket|price)[：:\s]*([^，。,.\n]+)/i);
      if (priceMatch) current.price = priceMatch[1].trim();
      const hoursMatch = line.match(/(?:开放|时间|hours)[：:\s]*([^，。,.\n]+)/i);
      if (hoursMatch) current.openingHours = hoursMatch[1].trim();
      const addrMatch = line.match(/(?:地址|location|位置)[：:\s]*([^，。,.\n]+)/i);
      if (addrMatch) current.address = addrMatch[1].trim();
    }
  }
  if (current) entries.push(current);
  return entries;
}

// ---- Sub-results ----
function FoodResult({ itinerary }) {
  const entries = useMemo(() => parseFoodEntries(itinerary), [itinerary]);
  if (entries.length === 0) return <DefaultResult itinerary={itinerary} />;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-gray-300 mb-1">
        <UtensilsCrossed size={16} className="text-red-500" />
        推荐美食
      </div>
      {entries.map((e, i) => (
        <FoodCard key={i} {...e} />
      ))}
    </div>
  );
}

function HotelResult({ itinerary }) {
  const entries = useMemo(() => parseHotelEntries(itinerary), [itinerary]);
  if (entries.length === 0) return <DefaultResult itinerary={itinerary} />;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-gray-300 mb-1">
        <Hotel size={16} className="text-orange-500" />
        推荐酒店
      </div>
      {entries.map((e, i) => (
        <HotelCard key={i} {...e} />
      ))}
    </div>
  );
}

function AttractionResult({ itinerary }) {
  const entries = useMemo(() => parseAttractionEntries(itinerary), [itinerary]);
  if (entries.length === 0) return <DefaultResult itinerary={itinerary} />;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-gray-300 mb-1">
        <Ticket size={16} className="text-blue-500" />
        推荐景点
      </div>
      {entries.map((e, i) => (
        <AttractionCard key={i} {...e} />
      ))}
    </div>
  );
}

function ItineraryResult({ itinerary }) {
  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-2xl p-5 itinerary-content shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-gray-300 mb-3">
        <Route size={16} className="text-green-500" />
        专属行程
      </div>
      <ReactMarkdown>{itinerary}</ReactMarkdown>
    </div>
  );
}

function DefaultResult({ itinerary }) {
  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-2xl p-5 itinerary-content shadow-sm">
      <ReactMarkdown>{itinerary}</ReactMarkdown>
    </div>
  );
}

// ---- Main ResultCards component ----
export default function ResultCards({ scenario, itinerary, request, onNewSearch }) {
  const [copied, setCopied] = useState(false);
  const [expandedRequest, setExpandedRequest] = useState(false);

  if (!itinerary) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(itinerary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderResult = () => {
    switch (scenario) {
      case "food":
        return <FoodResult itinerary={itinerary} />;
      case "hotel":
        return <HotelResult itinerary={itinerary} />;
      case "attractions":
        return <AttractionResult itinerary={itinerary} />;
      case "itinerary":
        return <ItineraryResult itinerary={itinerary} />;
      default:
        return <DefaultResult itinerary={itinerary} />;
    }
  };

  return (
    <div className="mx-4 my-3 space-y-3">
      {/* Action bar */}
      <div className="flex items-center justify-between bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 shadow-lg shadow-black/5 rounded-2xl p-3">
        <div className="flex items-center gap-2">
          <div className="bg-green-100 dark:bg-green-900/30 p-1.5 rounded-lg">
            <Check size={16} className="text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-gray-100">查询结果</h3>
            <p className="text-xs text-slate-400 dark:text-gray-500">基于美团酒旅实时数据</p>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={handleCopy}
            className="p-2 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg transition-all text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 hover:scale-105 active:scale-95"
            title="复制内容"
          >
            {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
          </button>
          {onNewSearch && (
            <button
              onClick={onNewSearch}
              className="p-2 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg transition-all text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 hover:scale-105 active:scale-95"
              title="重新搜索"
            >
              <RefreshCw size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Original request (collapsible) */}
      {request && (
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
      )}

      {/* Result content */}
      {renderResult()}
    </div>
  );
}
