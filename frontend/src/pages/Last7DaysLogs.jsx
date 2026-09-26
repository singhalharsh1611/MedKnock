import React, { useEffect, useState } from "react";
import axios from "axios";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

export default function Last7DaysLogs() {
  const { token } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${backendUrl}/api/v1/doseLogs/data`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setLogs(res.data.data || []);
      } catch (err) {
        console.error("Error fetching dose logs:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [token]);

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-semibold text-center">💊 Last 7 Days Dose Logs</h2>

      {loading ? (
        <p className="text-center text-gray-500">Loading...</p>
      ) : logs.length === 0 ? (
        <p className="text-center text-gray-500">No logs found</p>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <Card key={log.id} className="p-4 flex justify-between items-center">
              <div>
                <p className="font-semibold">{log.medicineName}</p>
                <p className="text-sm text-gray-500">{log.dosage}</p>
                <p className="text-sm text-gray-400">{log.date} at {log.time}</p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  log.status === "taken"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {log.status}
              </span>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
