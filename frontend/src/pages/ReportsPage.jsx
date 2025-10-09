import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Upload,
  FileText,
  BrainCircuit,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import StructuredAnalysis from "@/components/StructuredAnalysis";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const ReportItem = ({ report, onAnalyze, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleAnalyzeClick = () => {
    setIsExpanded(true);
    // Only call analyze for new, un-analyzed files
    if (report.status === "idle") {
      onAnalyze(report.id);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="bg-card p-4 rounded-xl border border-border shadow-sm"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <FileText className="h-5 w-5 flex-shrink-0 text-primary" />
          <p className="font-medium truncate" title={report.fileName}>
            {report.fileName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleAnalyzeClick}
            disabled={report.status === "loading"}
          >
            {report.status === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <BrainCircuit className="h-4 w-4" />
            )}
            <span className="ml-2 hidden sm:inline">
              {report.status === "success"
                ? "View Analysis"
                : "Upload & Analyze"}
            </span>
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onDelete(report.id)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginTop: 0 }}
            animate={{ height: "auto", opacity: 1, marginTop: "16px" }}
            exit={{ height: 0, opacity: 0, marginTop: 0 }}
            className="overflow-hidden"
          >
            <div
              className={`p-4 rounded-md border bg-background/50 relative ${
                report.status === "error"
                  ? "border-red-500/50"
                  : "border-border"
              }`}
            >
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6"
                onClick={() => setIsExpanded(false)}
              >
                <X className="h-4 w-4" />
              </Button>
              {report.status === "loading" && (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <p>Uploading and analyzing, please wait...</p>
                </div>
              )}
              {report.status === "error" && (
                <div className="flex items-center gap-3 text-red-500">
                  <AlertCircle className="h-5 w-5" />
                  <p>{report.analysis}</p>
                </div>
              )}
              {report.status === "success" && (
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <h4 className="font-bold text-2xl mb-3 text-center text-primary">
                      AI Analysis Result
                    </h4>
                    <StructuredAnalysis analysis={report.analysis} />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
export const ReportsPage = () => {
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef(null);

  //FETCH REPORTS ON PAGE LOAD ---
  useEffect(() => {
    const fetchReports = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setIsLoading(false);
          return;
        }
        const res = await fetch(`${backendUrl}/api/v1/reports`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          // Map DB data to the state structure
          const formatted = data.reports.map((r) => ({
            id: r._id,
            fileName: r.fileName,
            status: "success", // Already analyzed
            analysis: r.summary,
            url: r.cloudinaryUrl,
            file: null, // No local file object for existing reports
          }));
          setReports(formatted);
        }
      } catch (err) {
        console.error("Failed to load reports:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReports();
  }, []);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      // This is a temporary object for a newly added file
      const newReport = {
        id: `temp-${Date.now()}`, // Temporary ID
        fileName: file.name,
        status: "idle",
        analysis: null,
        url: null,
        file: file, // Keep the file object for upload
      };
      setReports((prev) => [newReport, ...prev]);
    }
    if (event.target) event.target.value = null;
  };

  //HANDLE ANALYSIS FOR *NEW* FILES ---
  const handleAnalyze = async (reportId) => {
    const reportToAnalyze = reports.find((r) => r.id === reportId);
    if (!reportToAnalyze || !reportToAnalyze.file) return;

    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, status: "loading" } : r))
    );

    const formData = new FormData();
    formData.append("report", reportToAnalyze.file);

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication token not found.");

      const res = await fetch(`${backendUrl}/api/v1/reports/analyze`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Analysis failed.");
      }

      // --- REPLACE TEMPORARY REPORT WITH FINAL DB DATA ---
      const finalReport = {
        id: data.report._id, // Use the real DB ID
        fileName: data.report.fileName,
        status: "success",
        analysis: data.report.summary,
        url: data.report.cloudinaryUrl,
        file: null,
      };

      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? finalReport : r))
      );
    } catch (err) {
      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId
            ? { ...r, status: "error", analysis: err.message }
            : r
        )
      );
    }
  };

  //HANDLE DELETE FROM UI AND DB ---
  const handleDelete = async (reportId) => {
    // Optimistically remove from UI
    const originalReports = [...reports];
    setReports((prev) => prev.filter((r) => r.id !== reportId));

    // Avoid deleting temporary new files from DB
    if (String(reportId).startsWith("temp-")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication token not found.");

      const res = await fetch(`${backendUrl}/api/v1/reports/${reportId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        // If API call fails, revert the UI change
        setReports(originalReports);
        throw new Error("Failed to delete report.");
      }
    } catch (err) {
      console.error(err.message);
      // Revert UI on error
      setReports(originalReports);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold">Analyze Your Reports</h2>
        <Button onClick={() => fileInputRef.current.click()}>
          <Upload className="h-4 w-4 mr-2" /> Add Report
        </Button>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".pdf,.png,.jpg,.jpeg"
      />

      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
          <p className="text-muted-foreground">
            Upload a medical report to get started.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <AnimatePresence>
            {reports.map((report) => (
              <ReportItem
                key={report.id}
                report={report}
                onAnalyze={handleAnalyze}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
