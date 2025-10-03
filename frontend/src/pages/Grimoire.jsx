import React, { useEffect, useState } from 'react';
// import { PotionCard } from '../components/PotionCard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Share, BookOpen, Sparkles } from 'lucide-react';
import { ScheduleFormModal } from '../components/ScheduleFormModal';
import { useToast } from '@/hooks/use-toast';

import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/Layout';
import { PotionCardActive } from '@/components/PotionCardActive';




const Grimoire = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingElixir, setEditingElixir] = useState(null);
  const { toast } = useToast();
  const { token } = useAuth();
  const [elixirs, setElixirs] = useState([]);

  // Mock data
  // const elixirs = [
  //   {
  //     id: '1',
  //     pillName: 'Healing Potion',
  //     dosage: '500mg',
  //     times: ['8:00 AM', '2:00 PM'],
  //     quantity: 28,
  //   },
  //   {
  //     id: '2',
  //     pillName: 'Strength Elixir',
  //     dosage: '250mg',
  //     times: ['9:00 AM'],
  //     quantity: 5,
  //     isRefillDue: true,
  //   },
  //   {
  //     id: '3',
  //     pillName: 'Wisdom Brew',
  //     dosage: '100mg',
  //     times: ['7:00 AM', '12:00 PM', '7:00 PM'],
  //     quantity: 42,
  //   },
  // ];


  const handleAddElixir = () => {
    setEditingElixir(null);
    setIsModalOpen(true);
  };

  const handleEditElixir = (id) => {
    console.log(id);
    setEditingElixir(id);
    setIsModalOpen(true);
  };

  const handleDeleteElixir = (id) => {
    toast({
      title: "Elixir Removed",
      description: "The elixir has been removed from your grimoire.",
      variant: "destructive",
    });
  };

  const handleShareReport = () => {
    const reportLink = `${window.location.origin}/report/xyz123`;
    navigator.clipboard.writeText(reportLink);
    toast({
      title: "Report Link Copied! 📋",
      description: "Share this link to show your wellness progress.",
    });
  };


  const fetchElixirs = async () => {
    if (!token) return;

    try {
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/v1/schedules`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setElixirs(response.data.items); //  backend returns { items, total }
    } catch (err) {
      console.error('Failed to fetch elixirs:', err);
    }
  };
  useEffect(() => {
    fetchElixirs();
  }, [token]);

  const countDosesByTime = (elixirs, startHour, endHour) => {
    let count = 0;

    elixirs.forEach((elixir) => {
      if (!elixir.times) return;
      if(!elixir.isActive) return;

      elixir.times.forEach((time) => {
        const [hour, minute] = time.split(':').map(Number);
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
    try {
      await axios.patch(
        `${import.meta.env.VITE_BACKEND_URL}/api/v1/schedules/${id}/toggle-active`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast({
        title: 'Schedule Updated',
        description: 'Schedule status has been updated.',
      });
      fetchElixirs(); // refresh list
    } catch (err) {
      console.error(err);
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to update schedule',
        variant: 'destructive',
      });
    }
  };



  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BookOpen className="h-8 w-8 text-magical-purple elixir-glow" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Grimoire</h1>
            <p className="text-muted-foreground">Your collection of healing elixirs</p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={handleShareReport} variant="outline" className="flex items-center gap-2">
            <Share className="h-4 w-4" />
            Share Report
          </Button>
          <Button onClick={handleAddElixir} className="magical-button flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add New Elixir
          </Button>
        </div>
      </div>

      {/* Stats */}
      {/* <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 bg-gradient-to-br from-magical-purple/20 to-magical-blue/20">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-magical-purple" />
            <div>
              <p className="text-2xl font-bold text-foreground">{elixirs.length}</p>
              <p className="text-sm text-muted-foreground">Active Elixirs</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-magical-gold/20 to-magical-green/20">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-magical-gold rounded-full"></div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {elixirs.reduce((sum, e) => sum + (e.quantity || 0), 0)}
              </p>
              <p className="text-sm text-muted-foreground">Total Doses</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-red-400/20 to-orange-400/20">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-red-400 rounded-full"></div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {elixirs.filter(e => e.isRefillDue).length}
              </p>
              <p className="text-sm text-muted-foreground">Refills Due</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-magical-green/20 to-magical-teal/20">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-magical-green rounded-full"></div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {elixirs.reduce((sum, e) => sum + (e.times?.length || 0), 0)}
              </p>
              <p className="text-sm text-muted-foreground">Total Daily Doses</p>
            </div>
          </div>
        </Card>

      </div> */}
      {/* Stats - Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-gradient-to-br from-magical-purple/20 to-magical-blue/20">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-magical-purple" />
            <div>
              <p className="text-2xl font-bold text-foreground">{elixirs.reduce((sum, e) => sum + (e.isActive ? 1 : 0), 0)}</p>
              <p className="text-sm text-muted-foreground">Active Elixirs</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-magical-green/20 to-magical-teal/20">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-magical-green rounded-full"></div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {elixirs.reduce((sum, e) => sum + (e.isActive && e.times?.length || 0), 0)}
              </p>
              <p className="text-sm text-muted-foreground">Total Daily Doses</p>
            </div>
          </div>
        </Card>


        <Card className="p-6 bg-gradient-to-br from-red-400/20 to-orange-400/20">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-red-400 rounded-full"></div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {elixirs.filter(e => e.isRefillDue).length}
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
              <p className="text-2xl font-bold text-foreground">{countDosesByTime(elixirs, 0, 14)}</p>
              <p className="text-sm text-muted-foreground">Morning Doses</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-orange-200/20 to-orange-400/20">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-orange-400 rounded-full"></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{countDosesByTime(elixirs, 14, 20)}</p>
              <p className="text-sm text-muted-foreground">Evening Doses</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-200/20 to-purple-400/20">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-purple-400 rounded-full"></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{countDosesByTime(elixirs, 20, 24)}</p>
              <p className="text-sm text-muted-foreground">Night Doses</p>
            </div>
          </div>
        </Card>
      </div>


      {/* Elixirs Grid */}
      <section>
        <h2 className="text-2xl font-semibold text-foreground mb-6">Your Elixirs</h2>

        {elixirs.length === 0 ? (
          <Card className="p-12 text-center">
            <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">Your grimoire is empty</h3>
            <p className="text-muted-foreground mb-6">Start by adding your first elixir to begin your wellness journey</p>
            <Button onClick={handleAddElixir} className="magical-button">
              Add Your First Elixir
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {elixirs.map((elixir) => (
              <PotionCardActive
                key={elixir._id}  
                id={elixir._id}         
                pillName={elixir.pillName}
                dosage={elixir.dosage}
                times={elixir.times}
                quantity={elixir.quantity}
                isActive={elixir.isActive}
                isRefillDue={elixir.isRefillDue}
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
        onSuccess={() => fetchElixirs()}
      />
    </div>
  );
};

export default Grimoire;
