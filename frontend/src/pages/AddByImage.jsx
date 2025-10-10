import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { X, Plus } from 'lucide-react';

const AddByImage = () => {
  const { token } = useAuth();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [medicines, setMedicines] = useState([]);

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const handleAnalyze = async () => {
    if (!file) return toast.error("Please select a file!");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/v1/prescriptions/analyze-prescription`,
        formData,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } }
      );

      if (res.data.success) {
        // Ensure each medicine has a times array
        const medsWithTimes = res.data.data.map(m => ({ ...m, times: m.times || [] }));
        setMedicines(medsWithTimes);
        toast.success("Prescription analyzed!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to analyze prescription");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (index, field, value) => {
    setMedicines(prev =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m))
    );
  };

  const handleTimeChange = (medIndex, timeIndex, value) => {
    setMedicines(prev =>
      prev.map((m, i) => {
        if (i === medIndex) {
          const updatedTimes = [...m.times];
          updatedTimes[timeIndex] = value;
          return { ...m, times: updatedTimes };
        }
        return m;
      })
    );
  };

  const handleAddTime = (medIndex) => {
    setMedicines(prev =>
      prev.map((m, i) => i === medIndex ? { ...m, times: [...m.times, ""] } : m)
    );
  };

  const handleRemoveTime = (medIndex, timeIndex) => {
    setMedicines(prev =>
      prev.map((m, i) => {
        if (i === medIndex) {
          const updatedTimes = m.times.filter((_, tIdx) => tIdx !== timeIndex);
          return { ...m, times: updatedTimes };
        }
        return m;
      })
    );
  };

  const handleDelete = (index) => {
    setMedicines(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (medicines.length === 0) return toast.error("No medicines to submit!");
    setLoading(true);

    try {
    await Promise.all(
      medicines.map(m =>
        axios.post(
          `${import.meta.env.VITE_BACKEND_URL}/api/v1/schedules`,
          {
            pillName: m.pillName,
            dosage: m.dosage || "",
            quantity: m.quantity ? Number(m.quantity) : 0,
            times: m.times || [],
            startDate: m.startDate || new Date(),
          },
          { headers: { Authorization: `Bearer ${token}` } }
        )
      )
    );

    toast.success("Schedules added successfully!");
    setMedicines([]);
  } catch (err) {
    console.error(err.response?.data || err);
    toast.error("Failed to add schedules");
  } finally {
    setLoading(false);
  }
  };

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold text-foreground">Add Prescription</h1>
      <Card className="p-6">
        <div className="flex gap-4 items-center">
          <Input type="file" accept="image/*" onChange={handleFileChange}  />
          <Button onClick={handleAnalyze} className="magical-button">
            {loading ? "Analyzing..." : "Analyze Prescription"}
          </Button>
        </div>
      </Card>

      {medicines.length > 0 && (
        <div className="space-y-4">
          {medicines.map((med, index) => (
            <Card key={index} className="p-4 flex flex-col gap-2">
              <div className="flex gap-2 items-center">
                <Input
                  value={med.pillName}
                  onChange={(e) => handleChange(index, "pillName", e.target.value)}
                  className="flex-1"
                  placeholder="Medicine Name"
                />
                <Input
                  value={med.dosage}
                  onChange={(e) => handleChange(index, "dosage", e.target.value)}
                  className="w-24"
                  placeholder="Dosage"
                />
                <Input
                  type="number"
                  value={med.quantity}
                  onChange={(e) => handleChange(index, "quantity", e.target.value)}
                  className="w-20"
                  placeholder="Qty"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Times Section */}
              <div className="flex flex-wrap gap-2 items-center mt-2">
                {med.times.map((time, tIdx) => (
                  <div key={tIdx} className="flex gap-1 items-center">
                    <Input
                      type="time"
                      value={time}
                      onChange={(e) => handleTimeChange(index, tIdx, e.target.value)}
                      className="w-24"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveTime(index, tIdx)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAddTime(index)}
                  className="ml-2"
                >
                  <Plus className="h-4 w-4" /> Add Time
                </Button>
              </div>
            </Card>
          ))}

          <Button onClick={handleSubmit} className="magical-button w-full">
            {loading ? "Submitting..." : "Submit All to Schedule"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default AddByImage;
