import React, { useEffect, useState, useRef } from "react";
// import { MedicineCard } from '../components/MedicineCard';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Share, BookOpen, Sparkles, EyeOff, Eye } from "lucide-react";
import { ScheduleFormModal } from "../components/ScheduleFormModal";
import { toast } from "sonner";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { MedicineCardActive } from "@/components/MedicineCardActive";
import Loader from "@/components/Loader";
import ReportDocument from "./ShareableReport";
import { PDFDownloadLink } from "@react-pdf/renderer";
const backendUrl = import.meta.env.VITE_BACKEND_URL;
import { useNavigate } from "react-router-dom";

const Medications = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState(null);

  const { token, user } = useAuth();
  const [medicines, setMedicines] = useState([]);
  const [showOnlyActive, setShowOnlyActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [reportData, setReportData] = useState(null);
  const navigate = useNavigate();

  const handleAddMedicine = () => {
    setEditingMedicine(null);
    setIsModalOpen(true);
  };

  const handleEditMedicine = (id) => {
    console.log(id);
    setEditingMedicine(id);
    setIsModalOpen(true);
  };

  const fetchAllData = async () => {
    if (!token) return;
    setLoading(true);
    setReportData(null);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [medicinesRes, overviewRes, dailyRes, medsRes] = await Promise.all([
        axios.get(`${backendUrl}/api/v1/schedules`, { headers }),
        axios.get(`${backendUrl}/api/v1/stats/overview`, { headers }),
        axios.get(`${backendUrl}/api/v1/stats/daily`, { headers }),
        axios.get(`${backendUrl}/api/v1/stats/medications?limit=10`, {
          headers,
        }),
      ]);

      setMedicines(medicinesRes.data.items || []);
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
    if (user && medicines && stats) {
      const activeMedicines = medicines.filter((e) => e.isActive);
      const adherenceData = stats.daily.map((d) => ({
        date: d.date,
        adherence:
          d.taken + d.missed > 0
            ? Math.round((d.taken / (d.taken + d.missed)) * 100)
            : 0,
      }));

      setReportData({
        userName: user?.firstName || "Valued User",
        medicines: activeMedicines,
        stats: { ...stats, adherenceData },
      });
    }
  }, [medicines, user, stats]);

  const handleDeleteMedicine = async (id) => {
    setLoading(true);
    try {
      await axios.delete(`${backendUrl}/api/v1/schedules/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Medicine Removed");
      await fetchAllData();
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("Failed to delete schedule.");
      setLoading(false);
    }
  };

  const countDosesByTime = (medicines, startHour, endHour) => {
    let count = 0;

    medicines.forEach((medicine) => {
      if (!medicine.times) return;
      if (!medicine.isActive) return;

      medicine.times.forEach((time) => {
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
        <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <BookOpen className="h-8 w-8 text-medical-purple medicine-glow" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                My Medications
              </h1>
              <p className="text-muted-foreground">
                Your collection of healing medicines
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {reportData && !loading ? (
              <PDFDownloadLink
                key={reportData?.medicines?.length}
                document={<ReportDocument data={reportData} />}
                fileName={`MedKnock_Report_${
                  new Date().toISOString().split("T")[0]
                }.pdf`}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 gap-2 flex-grow sm:flex-grow-0"
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
              <Button
                variant="outline"
                disabled
                className="flex-grow sm:flex-grow-0"
              >
                <Share className="h-4 w-4 mr-2" /> Generating Report...
              </Button>
            )}
            <Button
              onClick={handleAddMedicine}
              className="medical-button flex items-center gap-2 flex-grow sm:flex-grow-0"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add New Medicine</span>
              <span className="sm:hidden">Add Medicine</span>
            </Button>
            <Button
              onClick={() => navigate("/add-by-image")}
              className="medical-button flex items-center gap-2 flex-grow sm:flex-grow-0"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add By Prescription</span>
              <span className="sm:hidden">Add by Rx</span>
            </Button>
          </div>
        </div>

        {/* Stats - Row 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <Card className="p-6 bg-gradient-to-br from-medical-purple/20 to-medical-blue/20">
            <div className="flex items-center gap-3">
              <Sparkles className="h-6 w-6 text-medical-purple" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {medicines.reduce((sum, e) => sum + (e.isActive ? 1 : 0), 0)}
                </p>
                <p className="text-sm text-muted-foreground">Active Medicines</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-medical-green/20 to-medical-teal/20">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-medical-green rounded-full"></div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {medicines.reduce(
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
                  {medicines.filter((e) => e.quantity < 4).length}
                </p>
                <p className="text-sm text-muted-foreground">Refills Due</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Stats - Row 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <Card className="p-6 bg-gradient-to-br from-yellow-200/20 to-yellow-400/20">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-yellow-400 rounded-full"></div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {countDosesByTime(medicines, 0, 14)}
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
                  {countDosesByTime(medicines, 14, 20)}
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
                  {countDosesByTime(medicines, 20, 24)}
                </p>
                <p className="text-sm text-muted-foreground">Night Doses</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Medicines Grid */}
        <section>
          <div className="flex flex-col items-start gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-semibold text-foreground">
              Your Medicines
            </h2>
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

          {medicines.length === 0 ? (
            <Card className="p-12 text-center">No Medicines found</Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {medicines
                .filter((medicine) => (showOnlyActive ? medicine.isActive : true))
                .map((medicine) => (
                  <MedicineCardActive
                    key={medicine.id}
                    id={medicine.id}
                    pillName={medicine.pillName}
                    dosage={medicine.dosage}
                    times={medicine.times}
                    quantity={medicine.quantity}
                    isActive={medicine.isActive}
                    isRefillDue={medicine.quantity < 4}
                    onEdit={handleEditMedicine}
                    onDelete={handleDeleteMedicine}
                    onToggleActive={handleToggleActive}
                  />
                ))}
            </div>
          )}
        </section>

        <ScheduleFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          editingId={editingMedicine}
          onSuccess={fetchAllData}
        />
      </div>
    </>
  );
};

export default Medications;
