import React, { useState } from 'react';
import { PotionCard } from '../components/PotionCard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Share, BookOpen, Sparkles } from 'lucide-react';
import { ScheduleFormModal } from '../components/ScheduleFormModal';
import { useToast } from '@/hooks/use-toast';

const Grimoire = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingElixir, setEditingElixir] = useState(null);
  const { toast } = useToast();

  // Mock data
  const elixirs = [
    {
      id: '1',
      pillName: 'Healing Potion',
      dosage: '500mg',
      times: ['8:00 AM', '2:00 PM'],
      quantity: 28,
    },
    {
      id: '2',
      pillName: 'Strength Elixir',
      dosage: '250mg',
      times: ['9:00 AM'],
      quantity: 5,
      isRefillDue: true,
    },
    {
      id: '3',
      pillName: 'Wisdom Brew',
      dosage: '100mg',
      times: ['7:00 AM', '12:00 PM', '7:00 PM'],
      quantity: 42,
    },
  ];

  const handleAddElixir = () => {
    setEditingElixir(null);
    setIsModalOpen(true);
  };

  const handleEditElixir = (id) => {
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              <PotionCard
                key={elixir.id}
                {...elixir}
                onLogTaken={(id) => console.log('Logged:', id)}
                onEdit={handleEditElixir}
                onDelete={handleDeleteElixir}
              />
            ))}
          </div>
        )}
      </section>

      <ScheduleFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingId={editingElixir}
      />
    </div>
  );
};

export default Grimoire;
