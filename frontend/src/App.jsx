import React, { useState, useEffect, useRef, useCallback } from "react";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import ChatInput from "./components/ChatInput";
import AgentProgress from "./components/AgentProgress";
import WelcomeScreen from "./components/WelcomeScreen";
import FoodForm from "./components/FoodForm";
import HotelForm from "./components/HotelForm";
import AttractionForm from "./components/AttractionForm";
import TripPlannerForm from "./components/TripPlannerForm";
import FreeInputScreen from "./components/FreeInputScreen";
import KnowledgeChat from "./components/KnowledgeChat";
import ResultCards from "./components/ResultCards";
import { useWebSocket } from "./hooks/useWebSocket";
import { useItineraryHistory } from "./hooks/useItineraryHistory";
import { AlertCircle, RefreshCw, X } from "lucide-react";

// ---- Error Boundary ----
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-orange-50/30 dark:from-gray-950 dark:to-gray-900">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 shadow-lg shadow-black/5 rounded-2xl p-8 max-w-md text-center">
            <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-gray-100 mb-2">出了点问题</h2>
            <p className="text-sm text-slate-500 dark:text-gray-400 mb-4">
              {this.state.error?.message || "应用遇到了意外错误"}
            </p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95"
            >
              <RefreshCw size={16} />
              重新加载
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ---- Toast Component ----
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === "success"
    ? "bg-green-500"
    : type === "error"
    ? "bg-red-500"
    : "bg-slate-800 dark:bg-gray-700";

  return (
    <div className={`fixed top-4 right-4 z-[100] flex items-center gap-2 ${bgColor} text-white text-sm px-4 py-2.5 rounded-xl shadow-xl animate-fade-in`}>
      <span>{message}</span>
      <button onClick={onClose} className="ml-1 hover:opacity-70">
        <X size={14} />
      </button>
    </div>
  );
}

// ---- Main App ----
export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedItinerary, setSelectedItinerary] = useState(null);
  const [currentRequest, setCurrentRequest] = useState("");
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem("travel-dark-mode");
    if (stored !== null) return stored === "true";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const [toast, setToast] = useState(null);
  const [mode, setMode] = useState("menu"); // menu|food|hotel|attractions|itinerary|free|processing|result
  const [scenario, setScenario] = useState("free");

  // Apply dark class
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("travel-dark-mode", darkMode);
  }, [darkMode]);

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => !prev);
  }, []);

  const showToast = useCallback((message, type = "info") => {
    setToast({ message, type, key: Date.now() });
  }, []);

  const closeToast = useCallback(() => {
    setToast(null);
  }, []);

  const {
    status,
    agents,
    agentProgress,
    itinerary,
    error,
    scenario: wsScenario,
    sendRequest,
    reset,
  } = useWebSocket();

  const {
    history,
    loading: historyLoading,
    fetchHistory,
    deleteItinerary,
    searchTerm,
    setSearchTerm,
    fetchStats,
    fetchTopCities,
  } = useItineraryHistory();
  const [stats, setStats] = useState(null);

  // Fetch stats on mount
  useEffect(() => {
    fetchStats().then(setStats);
  }, [fetchStats]);

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

  // Sync scenario from WebSocket when completed
  useEffect(() => {
    if (status === "completed" && wsScenario) {
      setScenario(wsScenario);
    }
  }, [status, wsScenario]);

  // When status changes to completed, show result mode
  // Don't override user-selected mode with "connecting" — that's a transient WebSocket setup state
  useEffect(() => {
    if (status === "completed") {
      setMode("result");
    } else if (status === "error") {
      setMode("menu");
    } else if (status === "processing") {
      setMode("processing");
    }
  }, [status]);

  // Mode selection
  const handleSelectMode = (modeId) => {
    if (modeId === "free") {
      setMode("free");
    } else if (modeId === "knowledge") {
      setMode("knowledge");
    } else {
      setMode(modeId);
    }
  };

  // Form submit → send request
  const handleFormSubmit = (message, scenarioType) => {
    setSelectedItinerary(null);
    setCurrentRequest(message);
    setScenario(scenarioType);
    sendRequest(message, scenarioType);
    // Mode will be set to "processing" by the status effect
  };

  // Direct send from ChatInput (free mode)
  const handleSend = (message) => {
    handleFormSubmit(message, "free");
  };

  // Select from history
  const handleSelectHistory = (item) => {
    reset();
    setMode("menu");
    setSelectedItinerary(item);
    setCurrentRequest(item.request);
  };

  // New trip
  const handleNewTrip = () => {
    reset();
    setMode("menu");
    setSelectedItinerary(null);
    setCurrentRequest("");
    fetchHistory();
  };

  const isProcessing = status === "processing";

  return (
    <ErrorBoundary>
      <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-orange-50/30 dark:from-gray-950 dark:to-gray-900 transition-colors duration-300">
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} darkMode={darkMode} onToggleDarkMode={toggleDarkMode} />

        <div className="flex flex-1 overflow-hidden">
          <Sidebar
            history={history}
            onSelect={handleSelectHistory}
            onDelete={deleteItinerary}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            stats={stats}
          />

          <main className="flex-1 flex flex-col overflow-hidden ml-0 lg:ml-72">
            {/* Content area */}
            <div className="flex-1 overflow-y-auto">
              {/* Mode selection */}
              {mode === "menu" && (
                <div className="transition-opacity duration-300">
                  <WelcomeScreen onSelectMode={handleSelectMode} />
                </div>
              )}

              {/* Forms */}
              {mode === "food" && (
                <FoodForm onSubmit={handleFormSubmit} onBack={() => setMode("menu")} />
              )}
              {mode === "hotel" && (
                <HotelForm onSubmit={handleFormSubmit} onBack={() => setMode("menu")} />
              )}
              {mode === "attractions" && (
                <AttractionForm onSubmit={handleFormSubmit} onBack={() => setMode("menu")} />
              )}
              {mode === "itinerary" && (
                <TripPlannerForm onSubmit={handleFormSubmit} onBack={() => setMode("menu")} />
              )}

              {/* Free input mode — dedicated input screen */}
              {mode === "free" && (
                <FreeInputScreen onSubmit={handleFormSubmit} onBack={() => setMode("menu")} />
              )}

              {/* RAG knowledge chat */}
              {mode === "knowledge" && (
                <KnowledgeChat onBack={() => setMode("menu")} />
              )}

              {/* Processing */}
              {isProcessing && (
                <div className="transition-opacity duration-300 animate-fade-in">
                  <AgentProgress agents={agents} agentProgress={agentProgress} />
                </div>
              )}

              {/* Result */}
              {mode === "result" && itinerary && (
                <div ref={resultRef} className="transition-opacity duration-300 animate-fade-in">
                  <ResultCards
                    scenario={scenario}
                    itinerary={itinerary}
                    request={currentRequest}
                    onNewSearch={handleNewTrip}
                  />
                </div>
              )}

              {/* History result */}
              {selectedItinerary && selectedItinerary.status === "completed" && mode === "menu" && (
                <div className="transition-opacity duration-300 animate-fade-in">
                  <ResultCards
                    scenario={selectedItinerary.scenario || "free"}
                    itinerary={selectedItinerary.itinerary}
                    request={selectedItinerary.request}
                    onNewSearch={handleNewTrip}
                  />
                </div>
              )}

              {/* New trip button */}
              {mode === "result" && (
                <div className="text-center py-4 animate-fade-in">
                  <button
                    onClick={handleNewTrip}
                    className="inline-flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 hover:bg-white dark:hover:bg-gray-700/80 text-slate-600 dark:text-gray-300 text-sm font-medium px-5 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95"
                  >
                    <RefreshCw size={16} />
                    开始新的查询
                  </button>
                </div>
              )}

              {/* Error */}
              {status === "error" && error && (
                <div className="mx-4 mt-4 animate-fade-in">
                  <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-red-200/50 dark:border-red-800/30 rounded-2xl p-4 flex items-start gap-3 shadow-lg shadow-black/5">
                    <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                        查询出错了
                      </p>
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={handleNewTrip}
                          className="text-sm bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-800/40 text-red-700 dark:text-red-300 font-medium px-4 py-1.5 rounded-lg transition-colors"
                        >
                          重试
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Chat input — only in menu mode */}
            {mode === "menu" && (
              <ChatInput onSend={handleSend} disabled={isProcessing} showExamples={mode === "menu"} />
            )}
          </main>
        </div>

        {/* Toast notifications */}
        {toast && (
          <Toast key={toast.key} message={toast.message} type={toast.type} onClose={closeToast} />
        )}
      </div>
    </ErrorBoundary>
  );
}
