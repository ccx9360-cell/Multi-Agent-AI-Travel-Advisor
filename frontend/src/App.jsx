import { useState, useEffect, useRef } from "react";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import ChatInput from "./components/ChatInput";
import AgentProgress from "./components/AgentProgress";
import ItineraryDisplay from "./components/ItineraryDisplay";
import WelcomeScreen from "./components/WelcomeScreen";
import { useWebSocket } from "./hooks/useWebSocket";
import { useItineraryHistory } from "./hooks/useItineraryHistory";
import { AlertCircle, RefreshCw, Loader2 } from "lucide-react";

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedItinerary, setSelectedItinerary] = useState(null);
  const [currentRequest, setCurrentRequest] = useState("");

  const {
    status,
    agents,
    agentProgress,
    itinerary,
    error,
    sendRequest,
    reset,
  } = useWebSocket();

  const { history, loading: historyLoading, fetchHistory, deleteItinerary } = useItineraryHistory();

  const resultRef = useRef(null);

  // Fetch history on mount and after completion
  useEffect(() => {
    if (status === "completed") {
      fetchHistory();
    }
  }, [status, fetchHistory]);

  // Auto-scroll to results when they arrive
  useEffect(() => {
    if (status === "completed" && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [status]);

  // Direct send - no intermediate form
  const handleSend = (message) => {
    setSelectedItinerary(null);
    setCurrentRequest(message);
    sendRequest(message);
  };

  // Quick select from welcome screen
  const handleQuickSelect = (query) => {
    handleSend(query);
  };

  // Select from history
  const handleSelectHistory = (item) => {
    reset();
    setSelectedItinerary(item);
    setCurrentRequest(item.request);
  };

  // New trip
  const handleNewTrip = () => {
    reset();
    setSelectedItinerary(null);
    setCurrentRequest("");
    fetchHistory();
  };

  const isProcessing = status === "processing" || status === "connecting";
  const showWelcome = status === "idle" && !selectedItinerary;
  const showResult =
    (status === "completed" && itinerary) ||
    (selectedItinerary && selectedItinerary.status === "completed");

  const displayedItinerary = selectedItinerary
    ? selectedItinerary.itinerary
    : itinerary;
  const displayedRequest = selectedItinerary
    ? selectedItinerary.request
    : currentRequest;

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-orange-50/30">
      <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          history={history}
          onSelect={handleSelectHistory}
          onDelete={deleteItinerary}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Content area */}
          <div className="flex-1 overflow-y-auto">
            {/* Welcome */}
            {showWelcome && (
              <WelcomeScreen onQuickSelect={handleQuickSelect} />
            )}

            {/* Processing */}
            {isProcessing && (
              <AgentProgress agents={agents} agentProgress={agentProgress} />
            )}

            {/* Result */}
            {showResult && (
              <div ref={resultRef}>
                <ItineraryDisplay
                  itinerary={displayedItinerary}
                  request={displayedRequest}
                />
              </div>
            )}

            {/* New trip button */}
            {(showResult) && (
              <div className="text-center py-4">
                <button
                  onClick={handleNewTrip}
                  className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-600 text-sm font-medium px-5 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 transition-all shadow-sm hover:shadow"
                >
                  <RefreshCw size={16} />
                  开始新的查询
                </button>
              </div>
            )}

            {/* Error */}
            {status === "error" && error && (
              <div className="mx-4 mt-4">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 shadow-sm">
                  <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-800">
                      查询出错了
                    </p>
                    <p className="text-sm text-red-600 mt-1">{error}</p>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={handleNewTrip}
                        className="text-sm bg-red-100 hover:bg-red-200 text-red-700 font-medium px-4 py-1.5 rounded-lg transition-colors"
                      >
                        重试
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Chat input — always visible when idle */}
          <ChatInput onSend={handleSend} disabled={isProcessing} showExamples={showWelcome} />
        </main>
      </div>
    </div>
  );
}
