import { useState, useRef, useCallback } from "react";

// UUID v4 fallback for non-HTTPS contexts (LAN IPs)
function generateUUID() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback for insecure contexts (http://192.168.x.x)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const WS_URL = `ws://${window.location.hostname}:8000/ws`;

export function useWebSocket() {
  const [status, setStatus] = useState("idle"); // idle | connecting | connected | processing | completed | error
  const [agents, setAgents] = useState([]);
  const [agentProgress, setAgentProgress] = useState({});
  const [itinerary, setItinerary] = useState(null);
  const [itineraryId, setItineraryId] = useState(null);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);

  const reset = useCallback(() => {
    setStatus("idle");
    setAgents([]);
    setAgentProgress({});
    setItinerary(null);
    setItineraryId(null);
    setError(null);
  }, []);

  const sendRequest = useCallback((message) => {
    reset();
    setStatus("connecting");
    setError(null);

    const sessionId = generateUUID();
    const ws = new WebSocket(`${WS_URL}/${sessionId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("processing");
      ws.send(JSON.stringify({ type: "plan_request", message }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case "started":
          setAgents(data.agents);
          setItineraryId(data.itinerary_id);
          // Initialize all agents as pending
          const initialProgress = {};
          data.agents.forEach((a) => {
            initialProgress[a.key] = "pending";
          });
          setAgentProgress(initialProgress);
          break;

        case "agent_progress":
          setAgentProgress((prev) => ({
            ...prev,
            [data.agent_key]: data.status,
          }));
          break;

        case "completed":
          setStatus("completed");
          setItinerary(data.itinerary);
          setItineraryId(data.itinerary_id);
          // Mark all agents as completed
          setAgentProgress((prev) => {
            const updated = { ...prev };
            Object.keys(updated).forEach((k) => (updated[k] = "completed"));
            return updated;
          });
          ws.close();
          break;

        case "error":
          setStatus("error");
          setError(data.message);
          ws.close();
          break;

        default:
          break;
      }
    };

    ws.onerror = () => {
      setStatus("error");
      setError("Connection failed. Make sure the backend server is running on port 8000.");
    };

    ws.onclose = () => {
      wsRef.current = null;
    };
  }, [reset]);

  return {
    status,
    agents,
    agentProgress,
    itinerary,
    itineraryId,
    error,
    sendRequest,
    reset,
  };
}
