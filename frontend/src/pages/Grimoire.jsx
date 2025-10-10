import React, { useEffect, useState, useRef } from "react";
// import { PotionCard } from '../components/PotionCard';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Share, BookOpen, Sparkles, EyeOff, Eye } from "lucide-react";
import { ScheduleFormModal } from "../components/ScheduleFormModal";
import { toast } from "sonner";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { PotionCardActive } from "@/components/PotionCardActive";
import Loader from "@/components/Loader";
import ReportDocument from "./ShareableReport";
import { PDFDownloadLink } from "@react-pdf/renderer";
const backendUrl = import.meta.env.VITE_BACKEND_URL;
import { useNavigate } from "react-router-dom";

const Grimoire = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingElixir, setEditingElixir] = useState(null);

  const { token, user } = useAuth();
  const [elixirs, setElixirs] = useState([]);
  const [showOnlyActive, setShowOnlyActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [reportData, setReportData] = useState(null);
  const navigate = useNavigate();

  const handleAddElixir = () => {
    setEditingElixir(null);
    setIsModalOpen(true);
  };

  const handleEditElixir = (id) => {
    console.log(id);
    setEditingElixir(id);
    setIsModalOpen(true);
  };

  const fetchAllData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [elixirsRes, overviewRes, dailyRes, medsRes] = await Promise.all([
        axios.get(`${backendUrl}/api/v1/schedules`, { headers }),
        axios.get(`${backendUrl}/api/v1/stats/overview`, { headers }),
        axios.get(`${backendUrl}/api/v1/stats/daily`, { headers }),
        axios.get(`${backendUrl}/api/v1/stats/medications?limit=10`, {
          headers,
        }),
      ]);

      setElixirs(elixirsRes.data.items || []);
      setStats({
        overview: overviewRes.data,
        daily: dailyRes.data.series || [],
        meds: medsRes.data.meds || [],
      });
    } catch (err) {
      console.error("Failed to fetch data:", err);
      toast.error("Failed to load page data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchAllData();
  }, [token]);

  useEffect(() => {
    if (user && elixirs && stats) {
      const activeElixirs = elixirs.filter((e) => e.isActive);
      const adherenceData = stats.daily.map((d) => ({
        date: d.date,
        adherence:
          d.taken + d.missed > 0
            ? Math.round((d.taken / (d.taken + d.missed)) * 100)
            : 0,
      }));

      setReportData({
        userName: user?.firstName || "Valued User",
        elixirs: activeElixirs,
        stats: { ...stats, adherenceData },
      });
    }
  }, [elixirs, user, stats]);

  const handleDeleteElixir = async (id) => {
    setLoading(true);
    try {
      await axios.delete(`${backendUrl}/api/v1/schedules/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Elixir Removed");
      await fetchAllData(); 
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("Failed to delete schedule.");
      setLoading(false);
    }
  };

  const countDosesByTime = (elixirs, startHour, endHour) => {
    let count = 0;

    elixirs.forEach((elixir) => {
      if (!elixir.times) return;
      if (!elixir.isActive) return;

      elixir.times.forEach((time) => {
        const [hour, minute] = time.split(":").map(Number);
        const totalMinutes = hour * 60 + minute;
        const startMinutes = startHour * 60;
        const endMinutes = endHour * 60;

        if (totalMinutes >= startMinutes && totalMinutes < endMinutes) {
          count++;
        }
      });
    });

    return count;
  };

  const handleToggleActive = async (id) => {
    setLoading(true);
    try {
      await axios.patch(
        `${backendUrl}/api/v1/schedules/${id}/toggle-active`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast.success("Schedule Updated");
      await fetchAllData(); // This is the crucial step to refresh the page state
    } catch (err) {
      console.error(err);
      toast.error("Failed to update schedule.");
      setLoading(false);
    }
  };
  return (
    <>
      {loading && <Loader />}
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BookOpen className="h-8 w-8 text-magical-purple elixir-glow" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                My Grimoire
              </h1>
              <p className="text-muted-foreground">
                Your collection of healing elixirs
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            {reportData && !loading ? (
              <PDFDownloadLink
                key={reportData?.elixirs?.length} 
                document={<ReportDocument data={reportData} />}
                fileName={`MedKnock_Report_${
                  new Date().toISOString().split("T")[0]
                }.pdf`}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 gap-2"
              >
                {({ loading }) =>
                  loading ? (
                    "Generating..."
                  ) : (
                    <>
                      <Share className="h-4 w-4" /> Share Report
                    </>
                  )
                }
              </PDFDownloadLink>
            ) : (
              <Button variant="outline" disabled>
                <Share className="h-4 w-4 mr-2" /> Generating Report...
              </Button>
            )}
            <Button
              onClick={handleAddElixir}
              className="magical-button flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add New Elixir
            </Button>
            <Button
              onClick={() => navigate("/add-by-image")}
              className="magical-button flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add By Prescription Page
            </Button>
          </div>
        </div>

        {/* Stats - Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 bg-gradient-to-br from-magical-purple/20 to-magical-blue/20">
            <div className="flex items-center gap-3">
              <Sparkles className="h-6 w-6 text-magical-purple" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {elixirs.reduce((sum, e) => sum + (e.isActive ? 1 : 0), 0)}
                </p>
                <p className="text-sm text-muted-foreground">Active Elixirs</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-magical-green/20 to-magical-teal/20">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-magical-green rounded-full"></div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {elixirs.reduce(
                    (sum, e) => sum + ((e.isActive && e.times?.length) || 0),
                    0
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  Total Daily Doses
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-red-400/20 to-orange-400/20">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-red-400 rounded-full"></div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {elixirs.filter((e) => e.isRefillDue).length}
                </p>
                <p className="text-sm text-muted-foreground">Refills Due</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Stats - Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <Card className="p-6 bg-gradient-to-br from-yellow-200/20 to-yellow-400/20">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-yellow-400 rounded-full"></div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {countDosesByTime(elixirs, 0, 14)}
                </p>
                <p className="text-sm text-muted-foreground">Morning Doses</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-orange-200/20 to-orange-400/20">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-orange-400 rounded-full"></div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {countDosesByTime(elixirs, 14, 20)}
                </p>
                <p className="text-sm text-muted-foreground">Evening Doses</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-200/20 to-purple-400/20">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-purple-400 rounded-full"></div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {countDosesByTime(elixirs, 20, 24)}
                </p>
                <p className="text-sm text-muted-foreground">Night Doses</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Elixirs Grid */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-foreground">
              Your Elixirs
            </h2>

            {/* Toggle Button */}
            <Button
              onClick={() => setShowOnlyActive((prev) => !prev)}
              variant="outline"
              className="flex items-center gap-2 w-fit px-3 py-1 text-sm"
            >
              {showOnlyActive ? (
                <>
                  <EyeOff className="h-4 w-4" />
                  Show All
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  Show Active
                </>
              )}
            </Button>
          </div>

          {elixirs.length === 0 ? (
            <Card className="p-12 text-center">
              <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Your grimoire is empty
              </h3>
              <p className="text-muted-foreground mb-6">
                Start by adding your first elixir to begin your wellness journey
              </p>
              <Button onClick={handleAddElixir} className="magical-button">
                Add Your First Elixir
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {elixirs
                .filter((elixir) => (showOnlyActive ? elixir.isActive : true))
                .map((elixir) => (
                  <PotionCardActive
                    key={elixir._id}
                    id={elixir._id}
                    pillName={elixir.pillName}
                    dosage={elixir.dosage}
                    times={elixir.times}
                    quantity={elixir.quantity}
                    isActive={elixir.isActive}
                    isRefillDue={elixir.quantity < 4}
                    onEdit={handleEditElixir}
                    onDelete={handleDeleteElixir}
                    onToggleActive={handleToggleActive}
                  />
                ))}
            </div>
          )}
        </section>

        <ScheduleFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          editingId={editingElixir}
          onSuccess={fetchAllData}
        />
      </div>
    </>
  );
};

export default Grimoire;
