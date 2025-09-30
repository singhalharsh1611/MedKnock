import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const ScheduleFormModal = ({ isOpen, onClose, editingId }) => {
  const [formData, setFormData] = useState({
    pillName: '',
    dosage: '',
    quantity: '',
    prescriptionDate: '',
  });
  const [times, setTimes] = useState(['']);
  const { toast } = useToast();

  const handleAddTime = () => {
    setTimes([...times, '']);
  };

  const handleRemoveTime = (index) => {
    setTimes(times.filter((_, i) => i !== index));
  };

  const handleTimeChange = (index, value) => {
    const newTimes = [...times];
    newTimes[index] = value;
    setTimes(newTimes);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.pillName || !formData.dosage || times.some((t) => !t)) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: editingId ? 'Elixir Updated! ✨' : 'New Elixir Added! ✨',
      description: `${formData.pillName} has been ${editingId ? 'updated' : 'added to'} your grimoire.`,
    });

    // Reset form
    setFormData({
      pillName: '',
      dosage: '',
      quantity: '',
      prescriptionDate: '',
    });
    setTimes(['']);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-magical-purple" />
            {editingId ? 'Edit Elixir' : 'Add New Elixir'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="pillName">Elixir Name *</Label>
              <Input
                id="pillName"
                value={formData.pillName}
                onChange={(e) => setFormData({ ...formData, pillName: e.target.value })}
                placeholder="e.g., Healing Potion"
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor="dosage">Dosage *</Label>
              <Input
                id="dosage"
                value={formData.dosage}
                onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                placeholder="e.g., 500mg"
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label>Reminder Times *</Label>
              <div className="space-y-2 mt-1">
                {times.map((time, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      type="time"
                      value={time}
                      onChange={(e) => handleTimeChange(index, e.target.value)}
                      className="flex-1"
                      required
                    />
                    {times.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveTime(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddTime}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Time
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity">Quantity (Optional)</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="30"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="prescriptionDate">Prescription Date</Label>
                <Input
                  id="prescriptionDate"
                  type="date"
                  value={formData.prescriptionDate}
                  onChange={(e) => setFormData({ ...formData, prescriptionDate: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="magical-button flex-1">
              {editingId ? 'Update Elixir' : 'Add Elixir'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
