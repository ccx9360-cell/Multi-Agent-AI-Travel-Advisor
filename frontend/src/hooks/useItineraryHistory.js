import { useState, useEffect, useCallback } from "react";

const API_BASE = "";

export function useItineraryHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const url = searchTerm
        ? `${API_BASE}/api/itineraries/search?q=${encodeURIComponent(searchTerm)}`
        : `${API_BASE}/api/itineraries`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.itineraries || []);
      }
    } catch {
      // Server might not be running yet
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  const deleteItinerary = useCallback(async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/itineraries/${id}`, { method: "DELETE" });
      if (res.ok) {
        setHistory((prev) => prev.filter((item) => item.id !== id));
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/itineraries/stats`);
      if (res.ok) return await res.json();
    } catch {
      return null;
    }
  }, []);

  const fetchTopCities = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/itineraries/top-cities`);
      if (res.ok) {
        const data = await res.json();
        return data.cities || [];
      }
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { history, loading, fetchHistory, deleteItinerary, searchTerm, setSearchTerm, fetchStats, fetchTopCities };
}
